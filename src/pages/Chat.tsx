import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import LumaAvatar from "@/components/landing/LumaAvatar";
import { useNavigate } from "react-router-dom";
import { useVoiceInput, useTTS } from "@/hooks/useSpeech";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/luma-chat`;

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
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

  if (!resp.body) { onError("No response stream"); return; }

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
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch { /* partial json, wait */ }
    }
  }
  onDone();
}

const GREETING: Record<string, string> = {
  EN: "Hi! I'm Luma ✨ How can I help you today?",
  AR: "!مرحباً! أنا لوما ✨ كيف يمكنني مساعدتك اليوم؟",
  NP: "नमस्ते! म लुमा हुँ ✨ आज म तपाईंलाई कसरी मद्दत गर्न सक्छु?",
  IT: "Ciao! Sono Luma ✨ Come posso aiutarti oggi?",
  VN: "Xin chào! Tôi là Luma ✨ Tôi có thể giúp gì cho bạn hôm nay?",
};

const Chat = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState("EN");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: GREETING.EN },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef<number>(-1);
  const { speak } = useTTS();

  const handleVoiceResult = useCallback((text: string) => setInput(text), []);
  const { listening, toggle: toggleMic, supported: micSupported } = useVoiceInput(handleVoiceResult);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-speak new assistant messages when streaming finishes
  useEffect(() => {
    if (isLoading) return;
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && messages.length - 1 > lastSpokenRef.current) {
      lastSpokenRef.current = messages.length - 1;
      speak(last.content);
    }
  }, [messages, isLoading, speak]);

  const handleLangChange = (code: string) => {
    setLang(code);
    setMessages([{ role: "assistant", content: GREETING[code] || GREETING.EN }]);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");

    const userMsg: Msg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > newMessages.length) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev.slice(0, newMessages.length), { role: "assistant", content: assistantSoFar }];
      });
    };

    await streamChat({
      messages: newMessages,
      onDelta: upsert,
      onDone: () => setIsLoading(false),
      onError: (err) => {
        setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${err}` }]);
        setIsLoading(false);
      },
    });
  };

  const langs = [
    { code: "EN", label: "EN" },
    { code: "AR", label: "عربي" },
    { code: "NP", label: "नेपाली" },
    { code: "IT", label: "IT" },
    { code: "VN", label: "VI" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-primary px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button onClick={() => navigate("/")} className="text-primary-foreground/70 hover:text-primary-foreground text-sm">
            ← Back
          </button>
          <LumaAvatar size={36} />
          <div className="flex-1 text-left">
            <div className="font-serif text-sm font-bold text-primary-foreground">
              Luma ✨ <span className="ml-2 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px]">NCCSA Guide</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-primary-foreground/70">
              <span className="animate-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--mint))]" />
              Online now
            </div>
          </div>
          <div className="flex gap-1">
            {langs.map((l) => (
              <button
                key={l.code}
                onClick={() => handleLangChange(l.code)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                  lang === l.code
                    ? "bg-primary-foreground text-primary"
                    : "border border-primary-foreground/30 text-primary-foreground/70 hover:bg-primary-foreground/10"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && <LumaAvatar size={32} />}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground"
                }`}
                dir={lang === "AR" && msg.role === "assistant" ? "rtl" : undefined}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-3">
              <LumaAvatar size={32} />
              <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                Luma is thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="border-t border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-3xl gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={lang === "AR" ? "...اكتب رسالتك" : "Type your message…"}
            className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            dir={lang === "AR" ? "rtl" : undefined}
            disabled={isLoading}
          />
          {micSupported && (
            <button
              onClick={toggleMic}
              className={`rounded-xl px-4 py-2.5 text-sm transition-all ${
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
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-[hsl(var(--forest-hover))] disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">
          🔒 Your conversation is private and not stored. NCCSA is not connected to immigration.
        </p>
      </footer>
    </div>
  );
};

export default Chat;
