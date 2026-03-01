import { useState, useRef, useEffect, useCallback } from "react";
import LumaAvatar from "@/components/landing/LumaAvatar";
import { useVoiceInput, useTTS } from "@/hooks/useSpeech";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import type { ServiceConfig } from "@/data/services";

type Msg = { role: "user" | "assistant"; content: string };

const officialFormLinks: Record<string, { type: "url" | "phone"; value: string }> = {
  "disability-support": { type: "url", value: "https://www.servicesaustralia.gov.au/sites/default/files/sa466en.pdf" },
  "age-pension": { type: "url", value: "https://www.servicesaustralia.gov.au/sites/default/files/sa002en.pdf" },
  "carer-payment": { type: "url", value: "https://www.servicesaustralia.gov.au/sites/default/files/sc001en.pdf" },
  "medicare": { type: "url", value: "https://www.servicesaustralia.gov.au/sites/default/files/ms004en.pdf" },
  "ndis-access": { type: "url", value: "https://www.ndis.gov.au/applying-access-ndis/how-apply" },
  "aged-care": { type: "phone", value: "1800 200 422" },
};

const questionKeys: Record<string, string[]> = {
  "disability-support": ["q.dsp.1", "q.dsp.2", "q.dsp.3", "q.dsp.4", "q.dsp.5"],
  "medicare": ["q.medicare.1", "q.medicare.2", "q.medicare.3", "q.medicare.4", "q.medicare.5"],
  "ndis-access": ["q.ndis.1", "q.ndis.2", "q.ndis.3", "q.ndis.4", "q.ndis.5"],
  "aged-care": ["q.agedCare.1", "q.agedCare.2", "q.agedCare.3", "q.agedCare.4", "q.agedCare.5"],
  "carer-payment": ["q.carer.1", "q.carer.2", "q.carer.3", "q.carer.4", "q.carer.5"],
  "age-pension": ["q.agePension.1", "q.agePension.2", "q.agePension.3", "q.agePension.4", "q.agePension.5"],
};

const eligibleKeys: Record<string, string> = {
  "disability-support": "eligible.dsp",
  "medicare": "eligible.medicare",
  "ndis-access": "eligible.ndis",
  "aged-care": "eligible.agedCare",
  "carer-payment": "eligible.carer",
  "age-pension": "eligible.agePension",
};

const notEligibleKeys: Record<string, string> = {
  "disability-support": "notEligible.dsp",
  "medicare": "notEligible.medicare",
  "ndis-access": "notEligible.ndis",
  "aged-care": "notEligible.agedCare",
  "carer-payment": "notEligible.carer",
  "age-pension": "notEligible.agePension",
};

const nameKeys: Record<string, string> = {
  "disability-support": "service.dsp",
  "medicare": "service.medicare",
  "ndis-access": "service.ndis",
  "aged-care": "service.agedCare",
  "carer-payment": "service.carer",
  "age-pension": "service.agePension",
};

interface EligibilityChatProps {
  service: ServiceConfig;
}

const EligibilityChat = ({ service }: EligibilityChatProps) => {
  const navigate = useNavigate();
  const { t, lang, dir } = useLanguage();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [input, setInput] = useState("");
  const [finished, setFinished] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef<number>(-1);
  const { speak, muted, toggleMute } = useTTS();
  const handleVoiceResult = useCallback((text: string) => setInput(text), []);
  const { listening, toggle: toggleMic, supported: micSupported } = useVoiceInput(handleVoiceResult);

  const qKeys = questionKeys[service.slug] || [];
  const serviceName = t(nameKeys[service.slug] || service.name);

  // Initialize with first question
  useEffect(() => {
    const firstQ = qKeys[0] ? t(qKeys[0]) : service.questions[0];
    const greeting: Msg = {
      role: "assistant",
      content: `${t("eligibility.greeting")} ${serviceName}. ${t("eligibility.5questions")}\n\n**${t("eligibility.questionOf")} 1 ${t("eligibility.of")} 5:**\n${firstQ}`,
    };
    setMessages([greeting]);
    setQuestionIndex(0);
    setAnswers([]);
    setFinished(false);
    lastSpokenRef.current = -1;
  }, [service, lang]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
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
    const isYes = /^(yes|yeah|yep|yea|y|sure|ok|correct|true|right|of course|definitely|absolutely|نعم|هو|sì|si|có|हो)/.test(lower);
    const isNo = /^(no|nah|nope|n|not|never|false|wrong|لا|होइन|no|không)/.test(lower);

    if (!isYes && !isNo) {
      const currentQ = qKeys[questionIndex] ? t(qKeys[questionIndex]) : service.questions[questionIndex];
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: `${t("eligibility.yesNo")} ${currentQ}` },
      ]);
      return;
    }

    const newAnswers = [...answers, isYes];
    setAnswers(newAnswers);
    const nextIdx = questionIndex + 1;

    if (nextIdx >= 5) {
      const yesCount = newAnswers.filter(Boolean).length;
      const eligible = yesCount >= 3;
      const msgKey = eligible ? eligibleKeys[service.slug] : notEligibleKeys[service.slug];
      const summary = msgKey ? t(msgKey) : (eligible ? service.eligibleMessage : service.notEligibleMessage);

      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: summary },
      ]);
      setFinished(true);
    } else {
      setQuestionIndex(nextIdx);
      const nextQ = qKeys[nextIdx] ? t(qKeys[nextIdx]) : service.questions[nextIdx];
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        {
          role: "assistant",
          content: `${t("eligibility.gotIt")} **${t("eligibility.questionOf")} ${nextIdx + 1} ${t("eligibility.of")} 5:**\n${nextQ}`,
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
    <div className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3 bg-primary px-4 py-3">
        <LumaAvatar size={32} />
        <div className="flex-1 text-left">
          <div className="font-serif text-sm font-bold text-primary-foreground">
            Luma ✨ <span className="ml-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px]">{t("eligibility.check")}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-primary-foreground/70">
            <span className="animate-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-mint" />
            {serviceName}
          </div>
        </div>
        <button onClick={(e) => { e.preventDefault(); toggleMute(); }} className="rounded-full p-1 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground" title={muted ? "Unmute" : "Mute"}>
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-h-[400px] min-h-[280px]">
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
                onClick={(e) => { e.preventDefault(); setInput(""); processAnswer("Yes"); }}
                className="flex-1 rounded-xl bg-primary py-2 text-sm font-bold text-primary-foreground hover:bg-forest-hover transition-colors"
              >
                {t("eligibility.yes")}
              </button>
              <button
                onClick={(e) => { e.preventDefault(); setInput(""); processAnswer("No"); }}
                className="flex-1 rounded-xl border border-border bg-secondary py-2 text-sm font-bold text-foreground hover:bg-muted transition-colors"
              >
                {t("eligibility.no")}
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={t("eligibility.typeAnswer")}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                dir={lang === "AR" ? "rtl" : "ltr"}
              />
              {micSupported && (
                <button
                  onClick={(e) => { e.preventDefault(); toggleMic(); }}
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
                onClick={(e) => { e.preventDefault(); send(); }}
                disabled={!input.trim()}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-forest-hover disabled:opacity-50"
              >
                {t("eligibility.send")}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <button
              onClick={(e) => { e.preventDefault(); navigate(`/prepare-form?service=${service.slug}`); }}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90"
            >
              📄 {t("eligibility.downloadChecklist")}
            </button>
            {officialFormLinks[service.slug]?.type === "url" ? (
              <a
                href={officialFormLinks[service.slug].value}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-xl border-2 border-primary bg-card py-3 text-center text-sm font-bold text-primary transition-all hover:bg-primary/10"
              >
                📥 {t("eligibility.getOfficialForm")}
              </a>
            ) : officialFormLinks[service.slug]?.type === "phone" ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  navigator.clipboard.writeText("1800200422");
                  toast.success(t("prepare.phoneCopied"));
                }}
                className="w-full rounded-xl border-2 border-primary bg-card py-3 text-sm font-bold text-primary transition-all hover:bg-primary/10"
              >
                📞 {t("eligibility.callAgedCare")} — 1800 200 422
              </button>
            ) : null}
          </div>
        )}
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          {t("eligibility.privacy")}
        </p>
      </div>
    </div>
  );
};

export default EligibilityChat;
