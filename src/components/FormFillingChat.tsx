import { useState, useRef, useEffect, useCallback } from "react";
import LumaAvatar from "@/components/landing/LumaAvatar";
import { useVoiceInput, useTTS } from "@/hooks/useSpeech";
import { useLanguage } from "@/contexts/LanguageContext";
import { SA466_FIELDS, type FormField } from "@/lib/sa466FormFields";

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
  prefilled?: Record<string, string>;
  onAnswersChange?: (answers: Record<string, string>) => void;
  onComplete?: () => void;
}

const LANG_NAMES: Record<string, string> = {
  EN: "English", AR: "Arabic", NP: "Nepali", IT: "Italian", VN: "Vietnamese",
};

const FormFillingChat = ({ serviceSlug, prefilled, onAnswersChange, onComplete }: FormFillingChatProps) => {
  const { lang, dir } = useLanguage();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>(prefilled || {});
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef(-1);
  const { speak, muted, toggleMute } = useTTS();
  const handleVoice = useCallback((t: string) => setInput(t), []);
  const { listening, toggle: toggleMic, supported: micSupported } = useVoiceInput(handleVoice);
  const [input, setInput] = useState("");
  const initRef = useRef(false);

  const fields = SA466_FIELDS;

  // Find first unanswered field
  const findFirstUnanswered = useCallback(() => {
    for (let i = 0; i < fields.length; i++) {
      if (!prefilled?.[fields[i].id]) return i;
    }
    return fields.length; // all answered
  }, [prefilled, fields]);

  const [fieldIndex, setFieldIndex] = useState(() => findFirstUnanswered());
  const currentField = fields[fieldIndex] as FormField | undefined;

  // Notify parent of answer changes
  useEffect(() => {
    onAnswersChange?.(answers);
  }, [answers, onAnswersChange]);

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

  // Init
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const startIdx = findFirstUnanswered();
    setFieldIndex(startIdx);

    if (startIdx >= fields.length) {
      // All pre-filled
      setMessages([{ role: "assistant", content: "All your details have been filled from your ID! 🎉 Your form is ready to download." }]);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    const field = fields[startIdx];
    const prefilledCount = Object.keys(prefilled || {}).length;
    const langName = LANG_NAMES[lang] || "English";

    const greeting = prefilledCount > 0
      ? `I've filled in ${prefilledCount} fields from your ID! ✨ I just need a few more details. Let's start with your "${field.label}".`
      : `Let's fill out your Disability Support Pension form together! I'll ask one question at a time. First up — your "${field.label}".`;

    const prompt = `The user wants to fill out their DSP (SA466) form. ${prefilledCount > 0 ? `${prefilledCount} fields were already pre-filled from their ID scan.` : ""} Greet them warmly in ${langName}, ${prefilledCount > 0 ? `tell them you've pre-filled ${prefilledCount} fields and just need a few more details,` : "explain you'll ask questions one at a time,"} then ask for their "${field.label}". ${field.type === "select" ? `Options: ${field.options?.join(", ")}` : ""} Keep it to 2-3 short sentences.`;

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
      onError: () => {
        setMessages([{ role: "assistant", content: greeting, buttons }]);
        setIsLoading(false);
      },
    });
  }, []);

  const processAnswer = (answerText: string) => {
    if (!currentField || isLoading || isComplete) return;
    const cleanAnswer = answerText.trim();
    if (!cleanAnswer) return;

    const newAnswers = { ...answers, [currentField.id]: cleanAnswer };
    setAnswers(newAnswers);

    // Find next unanswered field
    let nextIdx = fieldIndex + 1;
    while (nextIdx < fields.length && newAnswers[fields[nextIdx].id]) {
      nextIdx++;
    }
    const isLast = nextIdx >= fields.length;

    setMessages(prev => [...prev, { role: "user", content: cleanAnswer }]);
    setIsLoading(true);
    setInput("");

    if (isLast) {
      const langName = LANG_NAMES[lang] || "English";
      const prompt = `The user has finished all questions for their DSP form. Congratulate them warmly in ${langName}. Tell them their form is complete and ready to download — they can see it in the preview. Keep it to 2-3 sentences.`;

      let text = "";
      streamResponse({
        messages: [
          ...messages.filter(m => !m.buttons).map(m => ({ role: m.role, content: m.content })).slice(-4),
          { role: "user", content: cleanAnswer },
          { role: "user", content: prompt },
        ],
        onDelta: (chunk) => {
          text += chunk;
          setMessages(prev => {
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
          onComplete?.();
        },
        onError: () => {
          setMessages(prev => [...prev, { role: "assistant", content: "🎉 Your form is complete! You can see it in the preview and download it when you're ready." }]);
          setIsLoading(false);
          setIsComplete(true);
          onComplete?.();
        },
      });
    } else {
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
          setMessages(prev => [...prev, { role: "assistant", content: `${currentField.acknowledgment} ${nextField.question}`, buttons }]);
          setFieldIndex(nextIdx);
          setIsLoading(false);
        },
      });
    }
  };

  const send = () => {
    const text = input.trim();
    if (!text || isLoading || isComplete) return;
    processAnswer(text);
  };

  const answeredCount = Object.keys(answers).filter(k => {
    const v = answers[k];
    return v && v.toLowerCase() !== "none" && v.toLowerCase() !== "same";
  }).length;
  const progress = Math.round((answeredCount / fields.length) * 100);

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden h-full" dir={dir}>
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
          ? "✅ All questions answered — your form is ready!"
          : `${answeredCount} of ${fields.length} fields completed`
        }
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <div key={i}>
            <div className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && <LumaAvatar size={28} />}
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary border border-border text-foreground"
                }`}
              >
                <div className="whitespace-pre-line">{msg.content}</div>
              </div>
            </div>
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

      {/* Input */}
      {!isComplete && (
        <div className="border-t border-border bg-card px-3 py-2.5">
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
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            🔒 Private · Not stored · Not connected to immigration
          </p>
        </div>
      )}
    </div>
  );
};

export default FormFillingChat;
