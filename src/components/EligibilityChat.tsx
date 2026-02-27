import { useState, useRef, useEffect, useCallback } from "react";
import LumaAvatar from "@/components/landing/LumaAvatar";
import { useVoiceInput, useTTS } from "@/hooks/useSpeech";
import { useNavigate } from "react-router-dom";
import type { ServiceConfig } from "@/data/services";

type Msg = { role: "user" | "assistant"; content: string };

interface EligibilityChatProps {
  service: ServiceConfig;
}

const EligibilityChat = ({ service }: EligibilityChatProps) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [input, setInput] = useState("");
  const [finished, setFinished] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef<number>(-1);
  const { speak, muted, toggleMute } = useTTS();
  const handleVoiceResult = useCallback((text: string) => setInput(text), []);
  const { listening, toggle: toggleMic, supported: micSupported } = useVoiceInput(handleVoiceResult);

  // Initialize with first question
  useEffect(() => {
    const greeting: Msg = {
      role: "assistant",
      content: `Hi! I'm Luma ✨ Let's check if you're eligible for ${service.name}. I'll ask you 5 quick questions.\n\n**Question 1 of 5:**\n${service.questions[0]}`,
    };
    setMessages([greeting]);
  }, [service]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-speak assistant messages
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && messages.length - 1 > lastSpokenRef.current) {
      lastSpokenRef.current = messages.length - 1;
      speak(last.content);
    }
  }, [messages, speak]);

  const processAnswer = (text: string) => {
    const lower = text.toLowerCase().trim();
    const isYes = /^(yes|yeah|yep|yea|y|sure|ok|correct|true|right|of course|definitely|absolutely)/.test(lower);
    const isNo = /^(no|nah|nope|n|not|never|false|wrong)/.test(lower);

    if (!isYes && !isNo) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: "Just a simple yes or no is fine! " + service.questions[questionIndex] },
      ]);
      return;
    }

    const newAnswers = [...answers, isYes];
    setAnswers(newAnswers);
    const nextIdx = questionIndex + 1;

    if (nextIdx >= service.questions.length) {
      // All questions answered — evaluate
      const yesCount = newAnswers.filter(Boolean).length;
      const eligible = yesCount >= 3;
      const summary = eligible ? service.eligibleMessage : service.notEligibleMessage;

      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: `${summary}` },
      ]);
      setFinished(true);
    } else {
      setQuestionIndex(nextIdx);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        {
          role: "assistant",
          content: `Got it! **Question ${nextIdx + 1} of 5:**\n${service.questions[nextIdx]}`,
        },
      ]);
    }
  };

  const send = () => {
    const text = input.trim();
    if (!text || finished) return;
    setInput("");
    processAnswer(text);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 bg-primary px-4 py-3">
        <LumaAvatar size={32} />
        <div className="flex-1 text-left">
          <div className="font-serif text-sm font-bold text-primary-foreground">
            Luma ✨ <span className="ml-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px]">Eligibility Check</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-primary-foreground/70">
            <span className="animate-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-mint" />
            {service.name}
          </div>
        </div>
        <button onClick={toggleMute} className="rounded-full p-1 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground" title={muted ? "Unmute" : "Mute"}>
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-h-[400px] min-h-[280px]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && <LumaAvatar size={28} />}
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary border border-border text-foreground"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="whitespace-pre-line">
                  {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                    part.startsWith("**") && part.endsWith("**") ? (
                      <strong key={j}>{part.slice(2, -2)}</strong>
                    ) : (
                      <span key={j}>{part}</span>
                    )
                  )}
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick answer buttons + input */}
      <div className="border-t border-border bg-card px-3 py-2.5">
        {!finished ? (
          <>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => { setInput(""); processAnswer("Yes"); }}
                className="flex-1 rounded-xl bg-primary py-2 text-sm font-bold text-primary-foreground hover:bg-forest-hover transition-colors"
              >
                ✅ Yes
              </button>
              <button
                onClick={() => { setInput(""); processAnswer("No"); }}
                className="flex-1 rounded-xl border border-border bg-secondary py-2 text-sm font-bold text-foreground hover:bg-muted transition-colors"
              >
                ❌ No
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Or type your answer…"
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                disabled={!input.trim()}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-forest-hover disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => navigate(`/prepare-form?service=${service.slug}`)}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-forest-hover"
          >
            Prepare my form →
          </button>
        )}
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          🔒 Private · Not stored · Not connected to immigration
        </p>
      </div>
    </div>
  );
};

export default EligibilityChat;
