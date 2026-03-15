import { useState, useRef, useEffect, useCallback } from "react";
import LumaAvatar from "@/components/landing/LumaAvatar";
import { useVoiceInput, useTTS } from "@/hooks/useSpeech";
import { useLanguage } from "@/contexts/LanguageContext";
import { SA466_FIELDS, type FormField } from "@/lib/sa466FormFields";
import { prefillSA466, downloadPdf } from "@/lib/prefillSA466";
import { toast } from "sonner";

type Msg = {
  role: "user" | "assistant";
  content: string;
  buttons?: { label: string; value: string }[];
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/luma-form-chat`;

async function streamResponse({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: { role: string; content: string }[];
  onDelta: (t: string) => void;
  onDone: () => void;
  onError: (e: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({ error: "Request failed" }));
    onError(body.error || `Error ${resp.status}`);
    return;
  }
  if (!resp.body) { onError("No stream"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch { /* partial */ }
    }
  }
  onDone();
}

interface FormFillingChatProps {
  serviceSlug: string;
}

const LANG_NAMES: Record<string, string> = {
  EN: "English", AR: "Arabic", NP: "Nepali", IT: "Italian", VN: "Vietnamese",
};

const FormFillingChat = ({ serviceSlug }: FormFillingChatProps) => {
  const { lang, dir } = useLanguage();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [fieldIndex, setFieldIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef(-1);
  const { speak, muted, toggleMute } = useTTS();
  const handleVoice = useCallback((t: string) => setInput(t), []);
  const { listening, toggle: toggleMic, supported: micSupported } = useVoiceInput(handleVoice);
  const initRef = useRef(false);

  const fields = SA466_FIELDS; // Currently only SA466; extend later
  const currentField = fields[fieldIndex] as FormField | undefined;

  // Scroll on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Auto-speak
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && messages.length - 1 > lastSpokenRef.current) {
      lastSpokenRef.current = messages.length - 1;
      speak(last.content);
    }
  }, [messages, speak]);

  // Init: ask Claude to greet and ask first question
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const field = fields[0];
    const langName = LANG_NAMES[lang] || "English";
    const prompt = `The user wants to fill out their Disability Support Pension (SA466) form. Greet them warmly in ${langName}, explain you'll ask questions one at a time, then ask for their "${field.label}". ${field.type === "select" ? `Options: ${field.options?.join(", ")}` : ""} Keep it to 2-3 short sentences.`;

    setIsLoading(true);
    let text = "";
    const buttons = field.type === "select" && field.options
      ? field.options.map(o => ({ label: o, value: o }))
      : field.type === "yesno"
        ? [{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }]
        : undefined;

    streamResponse({
      messages: [{ role: "user", content: prompt }],
      onDelta: (chunk) => {
        text += chunk;
        setMessages([{ role: "assistant", content: text, buttons }]);
      },
      onDone: () => {
        setMessages([{ role: "assistant", content: text, buttons }]);
        setIsLoading(false);
      },
      onError: (err) => {
        // Fallback to pre-written question
        setMessages([{ role: "assistant", content: `Hi! I'm Luma ✨ Let's fill out your DSP form together.\n\n${field.question}`, buttons }]);
        setIsLoading(false);
      },
    });
  }, []);

  const processAnswer = (answerText: string) => {
    if (!currentField || isLoading || isComplete) return;

    const cleanAnswer = answerText.trim();
    if (!cleanAnswer) return;

    // Store answer
    const newAnswers = { ...answers, [currentField.id]: cleanAnswer };
    setAnswers(newAnswers);

    const nextIdx = fieldIndex + 1;
    const isLast = nextIdx >= fields.length;

    // Add user message
    setMessages(prev => [...prev, { role: "user", content: cleanAnswer }]);
    setIsLoading(true);
    setInput("");

    if (isLast) {
      // All done — ask Claude for a completion message
      const langName = LANG_NAMES[lang] || "English";
      const prompt = `The user has finished answering all questions for their Disability Support Pension form. Congratulate them warmly in ${langName}. Tell them their form is complete and ready to download. Keep it to 2-3 sentences. End with something encouraging.`;

      let text = "";
      streamResponse({
        messages: [
          ...messages.filter(m => !m.buttons).map(m => ({ role: m.role, content: m.content })),
          { role: "user", content: cleanAnswer },
          { role: "user", content: prompt },
        ],
        onDelta: (chunk) => {
          text += chunk;
          setMessages(prev => {
            const withUser = prev.filter(m => m.role === "user" || !m.content.startsWith(text.slice(0, 10)));
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && prev.length > messages.length + 1) {
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: text } : m);
            }
            return [...prev, { role: "assistant", content: text }];
          });
        },
        onDone: () => {
          setIsLoading(false);
          setIsComplete(true);
        },
        onError: () => {
          setMessages(prev => [...prev, { role: "assistant", content: "🎉 Your form is complete and ready to download! You've done a great job." }]);
          setIsLoading(false);
          setIsComplete(true);
        },
      });
    } else {
      // Ask next question via Claude
      const nextField = fields[nextIdx];
      const langName = LANG_NAMES[lang] || "English";
      const prompt = `The user answered "${cleanAnswer}" for "${currentField.label}". Acknowledge warmly in ${langName}, then ask for their "${nextField.label}". ${nextField.type === "select" ? `Options: ${nextField.options?.join(", ")}` : ""} ${!nextField.required ? 'This field is optional — let them know they can say "none" if not applicable.' : ""} Keep it to 1-2 short sentences.`;

      const buttons = nextField.type === "select" && nextField.options
        ? nextField.options.map(o => ({ label: o, value: o }))
        : nextField.type === "yesno"
          ? [{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }]
          : undefined;

      let text = "";
      streamResponse({
        messages: [
          ...messages.filter(m => !m.buttons).map(m => ({ role: m.role, content: m.content })).slice(-6),
          { role: "user", content: prompt },
        ],
        onDelta: (chunk) => {
          text += chunk;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && prev.length > messages.length + 1) {
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: text, buttons } : m);
            }
            return [...prev, { role: "assistant", content: text, buttons }];
          });
        },
        onDone: () => {
          setFieldIndex(nextIdx);
          setIsLoading(false);
        },
        onError: () => {
          // Fallback to pre-written question
          setMessages(prev => [...prev, { role: "assistant", content: `${currentField.acknowledgment} ${nextField.question}`, buttons }]);
          setFieldIndex(nextIdx);
          setIsLoading(false);
        },
      });
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // Normalize "same" for postal address
      const data = { ...answers };
      if (data.postalAddress?.toLowerCase() === "same" || data.postalAddress?.toLowerCase() === "yes") {
        data.postalAddress = data.permanentAddress || "";
      }
      const pdfBytes = await prefillSA466(data);
      const today = new Date().toLocaleDateString("en-AU");
      downloadPdf(pdfBytes, `SA466-DSP-prefilled-${today}.pdf`);
      toast.success("Your pre-filled DSP form has been downloaded! 🎉");
    } catch (err) {
      console.error("PDF error:", err);
      toast.error("Could not generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const send = () => {
    const text = input.trim();
    if (!text || isLoading || isComplete) return;
    processAnswer(text);
  };

  const progress = Math.round((fieldIndex / fields.length) * 100);

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3 bg-primary px-4 py-3">
        <LumaAvatar size={32} />
        <div className="flex-1 text-left">
          <div className="font-serif text-sm font-bold text-primary-foreground">
            Luma ✨ <span className="ml-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px]">Form Assistant</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-primary-foreground/70">
            <span className="animate-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--mint))]" />
            Disability Support Pension
          </div>
        </div>
        <button onClick={toggleMute} className="rounded-full p-1 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground" title={muted ? "Unmute" : "Mute"}>
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${isComplete ? 100 : progress}%` }}
        />
      </div>
      <div className="px-4 py-1.5 text-[11px] text-muted-foreground text-center">
        {isComplete
          ? "✅ All questions answered"
          : `Question ${fieldIndex + 1} of ${fields.length}`
        }
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-h-[400px] min-h-[280px]">
        {messages.map((msg, i) => (
          <div key={i}>
            <div className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && <LumaAvatar size={28} />}
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary border border-border text-foreground"
                }`}
              >
                <div className="whitespace-pre-line">{msg.content}</div>
              </div>
            </div>
            {/* Buttons for select/yesno — only show on the last assistant message */}
            {msg.role === "assistant" && msg.buttons && i === messages.length - 1 && !isLoading && !isComplete && (
              <div className="flex flex-wrap gap-2 mt-2 ml-9">
                {msg.buttons.map((btn) => (
                  <button
                    key={btn.value}
                    onClick={() => processAnswer(btn.value)}
                    className="rounded-xl border border-primary bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2">
            <LumaAvatar size={28} />
            <div className="rounded-2xl border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground">
              Luma is thinking…
            </div>
          </div>
        )}
      </div>

      {/* Input / Download */}
      <div className="border-t border-border bg-card px-3 py-2.5">
        {isComplete ? (
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            {isGenerating ? "⏳ Generating PDF…" : "📥 Download your pre-filled SA466 form"}
          </button>
        ) : (
          <>
            {/* Only show text input for text/date fields (not select/yesno which use buttons) */}
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder={currentField?.type === "date" ? "DD/MM/YYYY" : "Type your answer…"}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                dir={lang === "AR" ? "rtl" : "ltr"}
                disabled={isLoading}
              />
              {micSupported && (
                <button
                  onClick={toggleMic}
                  className={`rounded-xl px-3 py-2 text-sm transition-all ${
                    listening
                      ? "bg-destructive text-destructive-foreground animate-pulse"
                      : "border border-border bg-background text-foreground hover:bg-muted"
                  }`}
                  title={listening ? "Stop recording" : "Voice input"}
                >
                  🎤
                </button>
              )}
              <button
                onClick={send}
                disabled={isLoading || !input.trim()}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-[hsl(var(--forest-hover))] disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </>
        )}
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          🔒 Private · Not stored · Not connected to immigration
        </p>
      </div>
    </div>
  );
};

export default FormFillingChat;
