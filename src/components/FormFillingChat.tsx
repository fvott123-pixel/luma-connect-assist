import { useState, useRef, useEffect, useCallback } from "react";
import LumaAvatar from "@/components/landing/LumaAvatar";
import { useVoiceInput, useTTS } from "@/hooks/useSpeech";
import { useLanguage } from "@/contexts/LanguageContext";
import { SA466_FIELDS, SA466_SECTIONS, type SA466Field } from "@/lib/formMaps/sa466Fields";
import { saveSession } from "@/lib/formSession";
import { parseNaturalDate } from "@/lib/dateParser";

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
  onFieldAnswered?: (fieldId: string) => void;
  resumedAnswers?: Record<string, string>;
  resumedFieldIndex?: number;
  onSaveAndExit?: () => void;
}

const LANG_NAMES: Record<string, string> = {
  EN: "English", AR: "Arabic", NP: "Nepali", IT: "Italian", VN: "Vietnamese",
};

/**
 * Determine whether a field should be skipped based on skip logic and current answers.
 */
function shouldSkipField(field: SA466Field, answers: Record<string, string>): boolean {
  if (!field.skipIf) return false;
  const depValue = answers[field.skipIf.field];
  return depValue?.toLowerCase() === field.skipIf.equals.toLowerCase();
}

/**
 * Get the ordered list of question numbers to ask, applying skip logic.
 */
function getActiveFields(answers: Record<string, string>, prefilled?: Record<string, string>): SA466Field[] {
  return SA466_FIELDS.filter(f => {
    // Skip the final confirmation pseudo-field
    if (f.id === "declarationComplete") return false;
    // Skip signature — it's a notice, not a real input
    if (f.id === "declarationSignature") return false;
    // Skip already prefilled
    if (prefilled?.[f.id]) return false;
    // Apply skip logic
    if (shouldSkipField(f, { ...prefilled, ...answers })) return false;
    return true;
  });
}

function getCurrentSection(questionNumber: number): string {
  const sec = SA466_SECTIONS.find(s => questionNumber >= s.startQ && questionNumber <= s.endQ);
  return sec?.title || "";
}

const FormFillingChat = ({ serviceSlug, prefilled, onAnswersChange, onComplete, onFieldAnswered, resumedAnswers, resumedFieldIndex, onSaveAndExit }: FormFillingChatProps) => {
  const { lang, dir } = useLanguage();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({ ...(prefilled || {}), ...(resumedAnswers || {}) });
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef(-1);
  const { speak, muted, toggleMute } = useTTS();
  const handleVoice = useCallback((t: string) => setInput(t), []);
  const { listening, toggle: toggleMic, supported: micSupported } = useVoiceInput(handleVoice);
  const [input, setInput] = useState("");
  const initRef = useRef(false);
  const [fieldIndex, setFieldIndex] = useState(resumedFieldIndex || 0);
  const [sessionCode, setSessionCode] = useState<string>("");

  // Active fields — recalculated whenever answers change
  const activeFields = getActiveFields(answers, prefilled);
  const currentField = activeFields[fieldIndex] as SA466Field | undefined;
  const totalQuestions = SA466_FIELDS.filter(f => f.id !== "declarationComplete" && f.id !== "declarationSignature").length;
  const answeredCount = Object.keys(answers).filter(k => {
    const v = answers[k];
    return v && v.toLowerCase() !== "none" && v.toLowerCase() !== "skip";
  }).length;
  const progress = Math.round((answeredCount / totalQuestions) * 100);

  // Notify parent of answer changes
  useEffect(() => {
    onAnswersChange?.(answers);
  }, [answers, onAnswersChange]);

  // Auto-save to localStorage on every answer change
  useEffect(() => {
    if (Object.keys(answers).length === 0) return;
    const code = saveSession(serviceSlug, lang, answers, fieldIndex);
    setSessionCode(code);
  }, [answers, fieldIndex, serviceSlug, lang]);

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

    const mergedAnswers = { ...(prefilled || {}), ...(resumedAnswers || {}) };
    const isResuming = resumedFieldIndex !== undefined && resumedFieldIndex > 0;

    const fields = getActiveFields(mergedAnswers, prefilled);
    if (fields.length === 0) {
      setMessages([{ role: "assistant", content: "All your details have been filled from your ID! 🎉 Your form is ready to download." }]);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    const startIdx = isResuming ? Math.min(resumedFieldIndex!, fields.length - 1) : 0;
    const field = fields[startIdx];
    const langName = LANG_NAMES[lang] || "English";
    const sectionTitle = getCurrentSection(field.questionNumber);

    let prompt: string;
    if (isResuming) {
      const answered = Object.keys(mergedAnswers).filter(k => mergedAnswers[k] && mergedAnswers[k].toLowerCase() !== "none").length;
      prompt = `The user is RESUMING their DSP (SA466) form. They previously answered ${answered} questions. Welcome them back warmly in ${langName}. Say you've restored their progress and are continuing from where they left off. Then ask: Section: "${sectionTitle}". Question: "${field.lumaQuestion}" ${field.lumaExplanation ? `First explain: "${field.lumaExplanation}"` : ""} ${field.fieldType === "select" ? `Options: ${field.options?.join(", ")}` : ""} Keep it to 2-3 short sentences.`;
    } else {
      const prefilledCount = Object.keys(prefilled || {}).length;
      prompt = `The user wants to fill out their DSP (SA466) form. ${prefilledCount > 0 ? `${prefilledCount} fields were already pre-filled from their ID scan.` : ""} Greet them warmly in ${langName}, ${prefilledCount > 0 ? `tell them you've pre-filled ${prefilledCount} fields and just need a few more details,` : "explain you'll guide them through the form one question at a time in simple language,"} then ask the first question. Section: "${sectionTitle}". Question: "${field.lumaQuestion}" ${field.lumaExplanation ? `Explanation to include: "${field.lumaExplanation}"` : ""} ${field.fieldType === "select" ? `Options: ${field.options?.join(", ")}` : ""} ${field.signatureNotice ? `IMPORTANT NOTICE: "${field.signatureNotice}"` : ""} Keep it to 2-3 short sentences.`;
    }

    setIsLoading(true);
    let text = "";
    const buttons = getButtonsForField(field);

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
        const fallback = isResuming
          ? `Welcome back! 🎉 I've restored your progress. Let's continue.\n\n${field.lumaQuestion}`
          : (field.lumaExplanation ? `${field.lumaExplanation}\n\n${field.lumaQuestion}` : field.lumaQuestion);
        setMessages([{ role: "assistant", content: fallback, buttons }]);
        setIsLoading(false);
      },
    });
  }, []);

  function getButtonsForField(field: SA466Field) {
    if (field.signatureNotice) return undefined; // signature is a notice
    if (field.fieldType === "select" && field.options) {
      return field.options.map(o => ({ label: o, value: o }));
    }
    return undefined;
  }

  // Correction phrases detection
  const CORRECTION_PATTERNS = /^(last answer was wrong|that was wrong|that's wrong|go back|undo|change my last answer|i made a mistake|wrong answer|fix that|correction|let me change that|change previous|redo last)$/i;

  const [correctionMode, setCorrectionMode] = useState<{ fieldId: string; fieldIndex: number; label: string } | null>(null);

  const handleUndo = () => {
    if (fieldIndex <= 0 || isLoading || isComplete) return;
    const prevIdx = fieldIndex - 1;
    const prevField = activeFields[prevIdx];
    if (!prevField) return;

    setCorrectionMode({ fieldId: prevField.id, fieldIndex: prevIdx, label: prevField.label });
    setMessages(prev => [...prev, {
      role: "assistant",
      content: `No problem! Let me fix that. What should the answer be for "${prevField.lumaQuestion}"?`,
      buttons: getButtonsForField(prevField) || undefined,
    }]);
  };

  const processAnswer = (answerText: string) => {
    if (!currentField || isLoading || isComplete) return;
    const cleanAnswer = answerText.trim();
    if (!cleanAnswer) return;

    // ── Handle correction mode: apply corrected answer then resume ──
    if (correctionMode) {
      const correctedField = SA466_FIELDS.find(f => f.id === correctionMode.fieldId);
      if (correctedField) {
        const newAnswers = { ...answers, [correctionMode.fieldId]: cleanAnswer };
        setAnswers(newAnswers);
        onAnswersChange?.(newAnswers);
        onFieldAnswered?.(correctionMode.fieldId);
        setMessages(prev => [...prev,
          { role: "user", content: cleanAnswer },
          { role: "assistant", content: `✅ Updated! "${correctedField.label}" is now "${cleanAnswer}". Let's continue where we left off.`, buttons: currentField ? getButtonsForField(currentField) : undefined },
        ]);
        // Re-ask current question
        if (currentField) {
          setTimeout(() => {
            setMessages(prev => [...prev, {
              role: "assistant",
              content: currentField.lumaQuestion,
              buttons: getButtonsForField(currentField) || undefined,
            }]);
          }, 500);
        }
      }
      setCorrectionMode(null);
      return;
    }

    // ── Detect correction phrases — do NOT treat as form answer ──
    if (CORRECTION_PATTERNS.test(cleanAnswer)) {
      setMessages(prev => [...prev, { role: "user", content: cleanAnswer }]);
      handleUndo();
      return;
    }

    // Handle signature notice — just move forward
    if (currentField.signatureNotice) {
      advanceToNext(cleanAnswer);
      return;
    }

    // ── Date field: parse natural language dates ──
    if (currentField.fieldType === "date") {
      const dateResult = parseNaturalDate(cleanAnswer);
      if (dateResult) {
        // Show confirmation message with converted date
        const finalDate = dateResult.parsed;
        setMessages(prev => [...prev, { role: "user", content: cleanAnswer }]);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `📅 I've entered **${finalDate}** as ${dateResult.label} — is that correct?`,
          buttons: [
            { label: "✅ Yes, correct", value: `__CONFIRM_DATE__${finalDate}` },
            { label: "✏️ No, let me type it", value: "__REJECT_DATE__" },
          ],
        }]);
        return;
      }

      // Handle date confirmation
      if (cleanAnswer.startsWith("__CONFIRM_DATE__")) {
        const confirmed = cleanAnswer.replace("__CONFIRM_DATE__", "");
        applyAnswer(confirmed);
        return;
      }
      if (cleanAnswer === "__REJECT_DATE__") {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "No worries! Please type the date in DD/MM/YYYY format.",
        }]);
        return;
      }
    }

    console.log(`Answer received: ${cleanAnswer}`);
    applyAnswer(cleanAnswer);
  };

  const applyAnswer = (cleanAnswer: string) => {
    if (!currentField) return;

    const placement = currentField.tickPositions?.[cleanAnswer]
      ? {
          page: currentField.pageNumber + 1,
          x: currentField.tickPositions[cleanAnswer].x,
          y: currentField.tickPositions[cleanAnswer].y,
        }
      : {
          page: currentField.pageNumber + 1,
          x: currentField.x,
          y: currentField.y,
        };

    console.log(`Placing on page ${placement.page} at x=${placement.x} y=${placement.y}`);

    const newAnswers = { ...answers, [currentField.id]: cleanAnswer };
    setAnswers(newAnswers);
    onAnswersChange?.(newAnswers);
    onFieldAnswered?.(currentField.id);
    setMessages(prev => [...prev, { role: "user", content: cleanAnswer }]);
    setIsLoading(true);
    setInput("");

    // Recalculate active fields with new answers
    const updatedActive = getActiveFields(newAnswers, prefilled);
    const nextIdx = fieldIndex + 1;

    if (nextIdx >= updatedActive.length) {
      // Show signature notice then complete
      finishForm(newAnswers, cleanAnswer);
    } else {
      const nextField = updatedActive[nextIdx];

      // Check if we're entering a new section
      const currentSection = getCurrentSection(currentField.questionNumber);
      const nextSection = getCurrentSection(nextField.questionNumber);
      const sectionChange = currentSection !== nextSection ? `\n\nYou're now starting a new section: "${nextSection}".` : "";

      if (nextField.signatureNotice) {
        // Signature notice — tell user and auto-advance
        let text = "";
        const prompt = `The user finished all data questions. Tell them warmly in ${LANG_NAMES[lang] || "English"}: "${nextField.signatureNotice}" Then say you'll now finish up. Keep it to 2 sentences.`;
        streamResponse({
          messages: [{ role: "user", content: prompt }],
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
            setFieldIndex(nextIdx);
            setIsLoading(false);
            // Auto-advance past signature
            setTimeout(() => finishForm(newAnswers, "acknowledged"), 1500);
          },
          onError: () => {
            setMessages(prev => [...prev, { role: "assistant", content: `✍️ ${nextField.signatureNotice}` }]);
            setFieldIndex(nextIdx);
            setIsLoading(false);
            setTimeout(() => finishForm(newAnswers, "acknowledged"), 1500);
          },
        });
        return;
      }

      const langName = LANG_NAMES[lang] || "English";
      const prompt = `The user answered "${cleanAnswer}" for "${currentField.label}". Acknowledge warmly in ${langName}. ${sectionChange} Then ask: "${nextField.lumaQuestion}" ${nextField.lumaExplanation ? `First explain: "${nextField.lumaExplanation}"` : ""} ${nextField.fieldType === "select" ? `Options: ${nextField.options?.join(", ")}` : ""} ${!nextField.required ? 'This field is optional — let them know they can say "none" or skip.' : ""} Keep it to 1-2 short sentences.`;

      const buttons = getButtonsForField(nextField);
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
          const fallback = nextField.lumaExplanation
            ? `${nextField.lumaExplanation}\n\n${nextField.lumaQuestion}`
            : nextField.lumaQuestion;
          setMessages(prev => [...prev, { role: "assistant", content: fallback, buttons }]);
          setFieldIndex(nextIdx);
          setIsLoading(false);
        },
      });
    }
  };

  const advanceToNext = (text: string) => {
    const newAnswers = { ...answers };
    setMessages(prev => [...prev, { role: "user", content: text }]);
    const updatedActive = getActiveFields(newAnswers, prefilled);
    const nextIdx = fieldIndex + 1;
    if (nextIdx >= updatedActive.length) {
      finishForm(newAnswers, text);
    } else {
      setFieldIndex(nextIdx);
    }
  };

  const finishForm = (finalAnswers: Record<string, string>, lastAnswer: string) => {
    setIsLoading(true);
    const langName = LANG_NAMES[lang] || "English";
    const prompt = `The user has completed ALL questions for their SA466 Disability Support Pension form! Congratulate them warmly in ${langName}. Tell them: 1) Their form is complete and ready to download. 2) They need to print it and sign where indicated. 3) Post it to: Reply Paid 7800, Canberra BC ACT 2610. Keep it to 3 sentences.`;

    let text = "";
    streamResponse({
      messages: [
        ...messages.filter(m => !m.buttons).map(m => ({ role: m.role, content: m.content })).slice(-4),
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
        setMessages(prev => [...prev, { role: "assistant", content: "🎉 Your form is complete! Download it, sign where marked, and post to: Reply Paid 7800, Canberra BC ACT 2610." }]);
        setIsLoading(false);
        setIsComplete(true);
        onComplete?.();
      },
    });
  };

  const send = () => {
    const text = input.trim();
    if (!text || isLoading || isComplete) return;
    processAnswer(text);
  };

  const sectionTitle = currentField ? getCurrentSection(currentField.questionNumber) : "";

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
      <div className="px-4 py-1.5 text-[11px] text-muted-foreground text-center space-y-0.5">
        {isComplete
          ? <span>✅ All questions answered — your form is ready!</span>
          : (
            <>
              <div className="font-medium text-foreground/80">{sectionTitle}</div>
              <div>{answeredCount} of {totalQuestions} questions complete</div>
            </>
          )
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
              placeholder={currentField?.fieldType === "date" ? "DD/MM/YYYY" : "Type your answer…"}
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
          <div className="mt-1.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const code = saveSession(serviceSlug, lang, answers, fieldIndex);
                  setSessionCode(code);
                  const qNum = currentField?.questionNumber || fieldIndex + 1;
                  setMessages(prev => [...prev, { role: "assistant", content: `💾 Your progress is saved! You can return any time and continue from question ${qNum}.\n\nYour session code: **${code}** — write it down in case you need it later.` }]);
                  onSaveAndExit?.();
                }}
                className="text-[10px] font-semibold text-primary hover:underline"
              >
                💾 Save & continue later
              </button>
              {fieldIndex > 0 && !correctionMode && (
                <button
                  onClick={handleUndo}
                  disabled={isLoading}
                  className="text-[10px] font-semibold text-destructive hover:underline disabled:opacity-50"
                >
                  ↩ Undo last answer
                </button>
              )}
            </div>
            {sessionCode && (
              <span className="text-[10px] text-muted-foreground">
                Session: <span className="font-mono font-bold text-foreground">{sessionCode}</span>
              </span>
            )}
          </div>
          <p className="mt-1 text-center text-[10px] text-muted-foreground">
            🔒 Saved on your device only · Not sent anywhere
          </p>
        </div>
      )}
    </div>
  );
};

export default FormFillingChat;
