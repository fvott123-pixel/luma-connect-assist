import { useState, useRef, useEffect, useCallback } from "react";
import LumaAvatar from "@/components/landing/LumaAvatar";
import { useVoiceInput, useTTS } from "@/hooks/useSpeech";
import { useLanguage } from "@/contexts/LanguageContext";
import { SA466_FIELDS, SA466_SECTIONS, type SA466Field } from "@/lib/formMaps/sa466Fields";
import { saveSession } from "@/lib/formSession";
import { parseNaturalDate, type DateParseResult } from "@/lib/dateParser";
import { mapYesNo, TODAY_CONFIRMATION_PATTERN, getTodayFormatted, translateToEnglish } from "@/lib/i18nFormUtils";

type Msg = {
  role: "user" | "assistant";
  content: string;
  buttons?: { label: string; value: string }[];
  questionNumber?: number; // SA466 question number shown as badge
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
  fixFieldId?: string | null;
  onFixFieldHandled?: () => void;
}

const LANG_NAMES: Record<string, string> = {
  EN: "English", AR: "Arabic", NP: "Nepali", IT: "Italian", VN: "Vietnamese",
};

/**
 * Determine whether a field should be skipped based on skip logic and current answers.
 */
/**
 * SA466 form skip logic — mirrors the actual "Go to Q__" rules printed on the form.
 * Based on: PDF AcroForm GoTo field analysis.
 */
function shouldSkipField(field: SA466Field, answers: Record<string, string>): boolean {
  const q = field.questionNumber;
  const id = field.id;
  const get = (key: string) => (answers[key] || "").toLowerCase().trim();

  // ─── Personal / Work ───
  if (["stillWorkingForEmployer","currentHoursWorking","gradualReturnToWork","planningLessHours","riskLosingJob"].includes(id)) {
    if (get("wasEmployee") !== "yes") return true;
  }
  if (id === "currentHoursWorking" && get("stillWorkingForEmployer") !== "yes") return true;
  if (id === "gradualReturnToWork" && get("stillWorkingForEmployer") !== "yes") return true;
  if (id === "stillSelfEmployed" && get("wasSelfEmployed") !== "yes") return true;
  if (id === "studyHours" && get("doingStudy") !== "yes") return true;
  if (id === "activityBeforeClaim") {
    if (get("wasEmployee") === "yes" || get("wasSelfEmployed") === "yes" || get("wasApprentice") === "yes" || get("doingStudy") === "yes") return true;
  }
  if (["institutionName","releaseDate"].includes(id) && get("chargedWithOffence") !== "yes") return true;
  // Q38 Yes → Go to Q41 (skip Q39/Q40). Q38 No → show Q39/Q40.
  if (["preferredLanguage","preferredWrittenLanguage"].includes(id) && get("interpreterNeeded") === "yes") return true;

  // ─── Residence ───
  if (id === "currentCountryDetails" && get("currentCountry") !== "other") return true;
  if (id === "countryOfBirth" && get("australianCitizenBornHere") === "yes") return true;
  if (["countryOfCitizenship","permanentResident","visaType","visaChanged","livedBefor1965","assuranceOfSupport"].includes(id)) {
    if (get("australianCitizen") === "yes") return true;
  }

  // ─── Partner section — Q54 No → skip EVERYTHING Q55-Q80 ───
  const PARTNER_FIELDS = ["relationshipStatus","partnerCrn","partnerFamilyName","partnerFirstName",
    "partnerDob","partnerAuthorisation","partnerGender","liveWithPartner","partnerAddress",
    "reasonNotWithPartner","partnerGettingPayments","partnerLivedInAustralia","partnerCountryOfBirth",
    "partnerAustralianCitizen","partnerVisaType"];
  if (PARTNER_FIELDS.includes(id) && get("hasPartner") !== "yes") return true;
  // Skip partner address/reason if living together
  if (["partnerAddress","reasonNotWithPartner"].includes(id) && get("liveWithPartner") === "yes") return true;

  // ─── No-partner relationship status ───
  if (id === "currentRelationshipStatus" && get("hasPartner") === "yes") return true;
  // Deceased partner — only if Widowed
  if (id === "deceasedPartnerName") {
    if (get("hasPartner") === "yes") return true;
    if (!["widowed"].includes(get("currentRelationshipStatus"))) return true;
  }
  // Ex-partner — only if Separated or Divorced
  if (["exPartnerFamilyName","exPartnerAddress"].includes(id)) {
    if (get("hasPartner") === "yes") return true;
    if (!["separated","divorced"].includes(get("currentRelationshipStatus"))) return true;
  }

  // ─── Accommodation / Income ───
  const accType = get("accommodationType");
  if (id === "whyNotInOwnHome" && get("ownHomeNotLiving") !== "yes") return true;
  if (id === "soldFormerHome" && get("ownHomeNotLiving") !== "yes") return true;
  // Aged care questions — only if in aged care/nursing/retirement
  if (["agedCareHomeName","agedCareMoveInDate","howLongStaying","giftLoanEntryFee","paidEntryContribution"].includes(id)) {
    if (!["aged care home","nursing home","retirement village"].includes(accType)) return true;
  }
  if (id === "giftLoanAmount" && get("giftLoanEntryFee") !== "yes") return true;
  // Boarding questions — only if boarding
  if (["boardLodgingsAmount","totalAmountCharged"].includes(id) && get("payBoardLodgings") !== "yes") return true;
  if (id === "payBoardLodgings" && accType === "own home") return true;
  if (id === "formalLease" && accType === "own home") return true;
  if (id === "nameOnLease" && accType === "own home") return true;
  if (id === "siteMooringFees" && !["other","caravan","boat"].some(v => accType.includes(v))) return true;
  if (id === "liveWithPrimaryTenant" && get("nameOnLease") === "yes") return true;
  if (id === "primaryTenantMarketRate" && get("nameOnLease") === "yes") return true;
  // Employment follow-ups
  if (id === "employerLastYear" && get("stoppedWorkingLastYear") !== "yes") return true;
  // Under 21 questions
  if (["liveWithParents","youngerThan18","liveAwayFromParents","unreasonableToLiveAtHome"].includes(id)) {
    if (get("youngerThan21") !== "yes") return true;
  }
  // TFN number — only if has TFN
  if (id === "tfnNumber" && get("hasTFN") !== "yes") return true;

  // ─── Doctor chain ───
  if (["doctor2Profession","doctor2Address","doctor2Phone"].includes(id)) {
    const v = get("doctor2Name");
    if (!v || ["none","no","n/a"].includes(v)) return true;
  }
  if (["doctor3Name","doctor3Profession","doctor3Address","doctor3Phone"].includes(id)) {
    const v2 = get("doctor2Name");
    if (!v2 || ["none","no","n/a"].includes(v2)) return true;
    if (["doctor3Profession","doctor3Address","doctor3Phone"].includes(id)) {
      const v3 = get("doctor3Name");
      if (!v3 || ["none","no","n/a"].includes(v3)) return true;
    }
  }

  // ─── Fallback: field-level skipIf ───
  if (field.skipIf) {
    const depVal = get(field.skipIf.field);
    if (depVal === field.skipIf.equals.toLowerCase()) return true;
  }

  return false;
}

/**
 * Get the ordered list of question fields, applying skip logic.
 * No longer filters out answered fields — we use findFirstUnanswered to skip them.
 */
function getActiveFields(answers: Record<string, string>, prefilled?: Record<string, string>): SA466Field[] {
  const merged = { ...prefilled, ...answers };
  return SA466_FIELDS.filter(f => {
    if (f.id === "declarationComplete") return false;
    if (f.id === "declarationSignature") return false;
    if (shouldSkipField(f, merged)) return false;
    return true;
  });
}

/**
 * Find the index of the first unanswered field in the active fields list.
 */
function findFirstUnanswered(fields: SA466Field[], answers: Record<string, string>): number {
  for (let i = 0; i < fields.length; i++) {
    const v = answers[fields[i].id];
    if (!v || v.trim() === "") return i;
  }
  return fields.length;
}

function getCurrentSection(questionNumber: number): string {
  const sec = SA466_SECTIONS.find(s => questionNumber >= s.startQ && questionNumber <= s.endQ);
  return sec?.title || "";
}

const FormFillingChat = ({ serviceSlug, prefilled, onAnswersChange, onComplete, onFieldAnswered, resumedAnswers, resumedFieldIndex, onSaveAndExit, fixFieldId, onFixFieldHandled }: FormFillingChatProps) => {
  const { lang, dir, t } = useLanguage();
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
  // Track all conditional notices triggered during this session
  const [triggeredNotices, setTriggeredNotices] = useState<{ qNum: number; notice: string }[]>([]);

  // Active fields — recalculated whenever answers change
  const activeFields = getActiveFields(answers, prefilled);
  const currentField = activeFields[fieldIndex] as SA466Field | undefined;
  const totalQuestions = SA466_FIELDS.filter(f => f.id !== "declarationComplete" && f.id !== "declarationSignature").length;
  const answeredCount = Object.keys(answers).filter(k => {
    const v = answers[k];
    return v && v.trim().length > 0;
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

  // Scroll on new messages — ensure buttons are visible
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50);
    }
  }, [messages]);

  // Handle fix field from review modal
  useEffect(() => {
    if (!fixFieldId || !onFixFieldHandled) return;
    const fieldIdx = activeFields.findIndex(f => f.id === fixFieldId);
    const field = activeFields[fieldIdx];
    if (!field) { onFixFieldHandled(); return; }

    const langName = LANG_NAMES[lang] || "English";
    const langInstruction = lang !== "EN" ? `IMPORTANT: Your ENTIRE response must be in ${langName}.` : "";

    setCorrectionMode({ fieldId: field.id, fieldIndex: fieldIdx, label: field.label });
    setIsComplete(false);
    setIsLoading(true);

    let text = "";
    const buttons = getButtonsForField(field);
    const prompt = `${langInstruction} The user needs to fix their answer for "${field.label}". Ask them in ${langName}: "${field.lumaQuestion}" ${field.lumaExplanation ? `Explain: "${field.lumaExplanation}"` : ""} Keep it to 1-2 sentences.`;

    streamResponse({
      messages: [{ role: "user", content: prompt }],
      onDelta: (chunk) => {
        text += chunk;
        setMessages(prev => [...prev.slice(0, -1).concat({ role: "assistant" as const, content: text, buttons, questionNumber: field.questionNumber })]);
      },
      onDone: () => {
        setMessages(prev => [...prev, { role: "assistant", content: text, buttons, questionNumber: field.questionNumber }]);
        setIsLoading(false);
      },
      onError: () => {
        setMessages(prev => [...prev, { role: "assistant", content: `Q${field.questionNumber}: ${field.lumaQuestion}`, buttons, questionNumber: field.questionNumber }]);
        setIsLoading(false);
      },
    });
    onFixFieldHandled();
  }, [fixFieldId]);

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

    const fields = getActiveFields(mergedAnswers, prefilled);
    // Always start from the first unanswered field — never re-ask answered questions
    const startIdx = findFirstUnanswered(fields, mergedAnswers);
    const isResuming = startIdx > 0;

    if (startIdx >= fields.length) {
      setMessages([{ role: "assistant", content: "All your details have been filled! 🎉 Your form is ready to download." }]);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    setFieldIndex(startIdx);
    const field = fields[startIdx];
    const langName = LANG_NAMES[lang] || "English";
    const sectionTitle = getCurrentSection(field.questionNumber);

    const langInstruction = lang !== "EN" ? `IMPORTANT: Your ENTIRE response must be in ${langName}. Translate all question text, explanations and options into ${langName}.` : "";
    
    let prompt: string;
    if (isResuming) {
      const answered = Object.keys(mergedAnswers).filter(k => mergedAnswers[k] && mergedAnswers[k].toLowerCase() !== "none").length;
      prompt = `${langInstruction} The user is RESUMING their DSP (SA466) form. They previously answered ${answered} questions. Welcome them back warmly in ${langName}. Say you've restored their progress and are continuing from where they left off. Then ask: Section: "${sectionTitle}". Question: "${field.lumaQuestion}" ${field.lumaExplanation ? `First explain: "${field.lumaExplanation}"` : ""} ${field.fieldType === "select" ? `Options: ${field.options?.join(", ")}` : ""} Keep it to 2-3 short sentences.`;
    } else {
      const prefilledCount = Object.keys(prefilled || {}).length;
      prompt = `${langInstruction} The user wants to fill out their DSP (SA466) form. ${prefilledCount > 0 ? `${prefilledCount} fields were already pre-filled from their ID scan.` : ""} Greet them warmly in ${langName}, ${prefilledCount > 0 ? `tell them you've pre-filled ${prefilledCount} fields and just need a few more details,` : "explain you'll guide them through the form one question at a time in simple language,"} then ask the first question. Section: "${sectionTitle}". Question: "${field.lumaQuestion}" ${field.lumaExplanation ? `Explanation to include: "${field.lumaExplanation}"` : ""} ${field.fieldType === "select" ? `Options: ${field.options?.join(", ")}` : ""} ${field.signatureNotice ? `IMPORTANT NOTICE: "${field.signatureNotice}"` : ""} Keep it to 2-3 short sentences.`;
    }

    setIsLoading(true);
    let text = "";
    const buttons = getButtonsForField(field);

    streamResponse({
      messages: [{ role: "user", content: prompt }],
      onDelta: (chunk) => {
        text += chunk;
        setMessages([{ role: "assistant", content: text, buttons, questionNumber: field.questionNumber }]);
      },
      onDone: () => {
        setMessages([{ role: "assistant", content: text, buttons, questionNumber: field.questionNumber }]);
        setIsLoading(false);
      },
      onError: () => {
        const fallback = isResuming
          ? `Welcome back! 🎉 I've restored your progress. Let's continue.\n\nQ${field.questionNumber}: ${field.lumaQuestion}`
          : (field.lumaExplanation ? `${field.lumaExplanation}\n\nQ${field.questionNumber}: ${field.lumaQuestion}` : `Q${field.questionNumber}: ${field.lumaQuestion}`);
        setMessages([{ role: "assistant", content: fallback, buttons, questionNumber: field.questionNumber }]);
        setIsLoading(false);
      },
    });
  }, []);

  function getButtonsForField(field: SA466Field) {
    if (field.signatureNotice) return undefined;
    if (field.fieldType === "select" && field.options) {
      return field.options.map(o => ({ label: o, value: o }));
    }
    return undefined;
  }

  // translateToEnglish is now imported from i18nFormUtils

  // Correction phrases detection — match anywhere in the input, not just exact match
  const CORRECTION_PATTERNS = /\b(last answer was wrong|that was wrong|that's wrong|go back|undo|change my last answer|i made a mistake|wrong answer|fix that|correction|let me change that|change previous|redo last|that is wrong|was wrong|made a mistake|era sbagliato|ho sbagliato|torna indietro|cambia risposta|errore|غلط|गलत भयो|sai rồi|lỗi rồi)\b/i;

  const SKIP_PATTERNS = /^(none|skip|n\/a|na|not applicable|no answer|pass|don't have|dont have|i don't know|i dont know|nothing|nil|—|-|\.{1,3}|nessuno|salta|non lo so|niente|لا شيء|تخطي|छोड्नुहोस्|không có|bỏ qua)$/i;

  const [correctionMode, setCorrectionMode] = useState<{ fieldId: string; fieldIndex: number; label: string } | null>(null);
  // Address autocomplete
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAddressSuggestions = async (query: string) => {
    if (query.length < 3) { setAddressSuggestions([]); setShowAddressSuggestions(false); return; }
    try {
      // Primary: Nominatim with AU filter — no API key needed
      // Bounded to South Australia first, fallback to all AU
      const saQuery = encodeURIComponent(query + " South Australia");
      const url = `https://nominatim.openstreetmap.org/search?q=${saQuery}&format=json&countrycodes=au&addressdetails=1&limit=8&viewbox=129,-38,141,-26&bounded=0`;
      const res = await fetch(url, {
        headers: { "Accept-Language": "en-AU", "User-Agent": "LumaFormAssist/1.0" }
      });
      if (res.ok) {
        const data = await res.json();
        const seen = new Set<string>();
        const formatted = data
          .filter((r: any) => r.address)
          .map((r: any) => {
            const a = r.address;
            // Build Australian-style address: "123 Smith St, Suburb SA 5000"
            const streetNum = a.house_number || "";
            const street = a.road || a.pedestrian || a.footway || "";
            const streetPart = streetNum ? `${streetNum} ${street}`.trim() : street;
            const suburb = a.suburb || a.town || a.city_district || a.village || a.city || "";
            const state = a.state_code || (a.state || "").replace("South Australia","SA")
              .replace("New South Wales","NSW").replace("Victoria","VIC")
              .replace("Queensland","QLD").replace("Western Australia","WA")
              .replace("Tasmania","TAS").replace("Northern Territory","NT")
              .replace("Australian Capital Territory","ACT");
            const postcode = a.postcode || "";
            const parts = [streetPart, suburb, state, postcode].filter(Boolean);
            return parts.join(", ");
          })
          .filter((s: string) => s.length > 8 && /\d/.test(s))
          .filter((s: string) => { if (seen.has(s)) return false; seen.add(s); return true; })
          .slice(0, 6);
        setAddressSuggestions(formatted);
        setShowAddressSuggestions(formatted.length > 0);
      }
    } catch { setAddressSuggestions([]); }
  };

  const isAddressField = currentField?.fieldSubtype === "address";

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
        // Translate correction if non-English and not a select/date field
        const applyCorrection = (finalValue: string) => {
          const newAnswers = { ...answers, [correctionMode.fieldId]: finalValue };
          setAnswers(newAnswers);
          onAnswersChange?.(newAnswers);
          onFieldAnswered?.(correctionMode.fieldId);
          setMessages(prev => [...prev,
            { role: "user", content: cleanAnswer },
            { role: "assistant", content: `✅ ✔️`, buttons: currentField ? getButtonsForField(currentField) : undefined },
          ]);
          if (currentField) {
            setTimeout(() => {
              setMessages(prev => [...prev, {
                role: "assistant",
                content: currentField.lumaQuestion,
                buttons: getButtonsForField(currentField) || undefined,
              }]);
            }, 500);
          }
          setCorrectionMode(null);
        };

        // Map yes/no first
        const yesNo = mapYesNo(cleanAnswer);
        if (yesNo && correctedField.fieldType === "select") {
          applyCorrection(yesNo);
          return;
        }

        // Translate non-English free text corrections
        if (lang !== "EN" && correctedField.fieldType !== "date" && correctedField.fieldType !== "select") {
          setMessages(prev => [...prev, { role: "user", content: cleanAnswer }]);
          setIsLoading(true);
          translateToEnglish(cleanAnswer, lang).then(translated => {
            applyCorrection(translated);
            setIsLoading(false);
          });
          return;
        }

        applyCorrection(cleanAnswer);
      } else {
        setCorrectionMode(null);
      }
      return;
    }

    // ── Detect correction phrases — do NOT treat as form answer ──
    if (CORRECTION_PATTERNS.test(cleanAnswer)) {
      setMessages(prev => [...prev, { role: "user", content: cleanAnswer }]);
      handleUndo();
      return;
    }

    // ── Block skip/none on required fields ──
    if (currentField.required && !currentField.signatureNotice && SKIP_PATTERNS.test(cleanAnswer)) {
      setMessages(prev => [...prev,
        { role: "user", content: cleanAnswer },
        {
          role: "assistant",
          content: `This field is required by Centrelink — I need an answer to continue. If you're not sure, just give your best answer and a Centrelink officer can help you later. 😊\n\n${currentField.lumaQuestion}`,
          buttons: getButtonsForField(currentField) || undefined,
        },
      ]);
      return;
    }

    // Handle signature notice — just move forward
    if (currentField.signatureNotice) {
      advanceToNext(cleanAnswer);
      return;
    }

    // ── Map yes/no in any language for select fields ──
    if (currentField.fieldType === "select") {
      const yesNo = mapYesNo(cleanAnswer);
      if (yesNo) {
        setMessages(prev => [...prev, { role: "user", content: cleanAnswer }]);
        applyAnswer(yesNo);
        return;
      }
      // If select field, use the value as-is (options are already in English)
      applyAnswer(cleanAnswer);
      return;
    }

    // ── Declaration date: auto-fill today if user says "yes/today" in any language ──
    if (currentField.id === "declarationDate" && TODAY_CONFIRMATION_PATTERN.test(cleanAnswer)) {
      const todayStr = getTodayFormatted();
      setMessages(prev => [...prev, { role: "user", content: cleanAnswer }]);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `📅 ${todayStr}`,
      }]);
      applyAnswer(todayStr);
      return;
    }

    // ── Date field: parse natural language dates (works for all languages via dateParser) ──
    if (currentField.fieldType === "date") {
      const dateResult = parseNaturalDate(cleanAnswer);
      
      if (dateResult) {
        if (dateResult.type === "needDayMonth") {
          setMessages(prev => [...prev,
            { role: "user", content: cleanAnswer },
            { role: "assistant", content: `I have the year ${dateResult.year}. What day and month? For example: 15/03/${dateResult.year}` },
          ]);
          return;
        }

        const finalDate = dateResult.parsed;
        setMessages(prev => [...prev, { role: "user", content: cleanAnswer }]);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `📅 I have entered ${finalDate} — is that correct?`,
          buttons: [
            { label: "✅ Yes", value: `__CONFIRM_DATE__${finalDate}` },
            { label: "✏️ No, let me retype", value: "__REJECT_DATE__" },
          ],
        }]);
        return;
      }

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

    // ── Translate ALL non-English free text answers to English before saving ──
    if (lang !== "EN") {
      setMessages(prev => [...prev, { role: "user", content: cleanAnswer }]);
      setIsLoading(true);
      translateToEnglish(cleanAnswer, lang).then(translated => {
        console.log(`Translated: "${cleanAnswer}" → "${translated}"`);
        applyAnswer(translated);
      });
      return;
    }

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

    // Check for a conditional notice on this field (e.g. Q9 Yes → SS313 reminder)
    const matchingNotice = currentField.conditionalNotice?.whenAnswer.toLowerCase() === cleanAnswer.toLowerCase()
      ? currentField.conditionalNotice.notice
      : null;

    if (matchingNotice) {
      setTriggeredNotices(prev => {
        // Avoid duplicates if the same question is re-answered
        const filtered = prev.filter(n => n.qNum !== currentField.questionNumber);
        return [...filtered, { qNum: currentField.questionNumber, notice: matchingNotice }];
      });
    }

    setMessages(prev => [
      ...prev,
      { role: "user", content: cleanAnswer },
      ...(matchingNotice ? [{ role: "assistant" as const, content: matchingNotice }] : []),
    ]);
    setIsLoading(true);
    setInput("");

    // Find the next unanswered field, skipping any already answered
    const updatedActive = getActiveFields(newAnswers, prefilled);
    let nextIdx = fieldIndex + 1;
    while (nextIdx < updatedActive.length) {
      const v = newAnswers[updatedActive[nextIdx].id];
      if (!v || v.trim() === "") break;
      nextIdx++;
    }

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
        const sigLangInstruction = lang !== "EN" ? `IMPORTANT: Respond ENTIRELY in ${LANG_NAMES[lang] || "English"}.` : "";
        const prompt = `${sigLangInstruction} The user finished all data questions. Tell them warmly in ${LANG_NAMES[lang] || "English"}: "${nextField.signatureNotice}" Then say you'll now finish up. Keep it to 2 sentences.`;
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
      const langInstruction = lang !== "EN" ? `IMPORTANT: Your ENTIRE response must be in ${langName}. Translate the question and explanation into ${langName}.` : "";
      const nextQ = nextField.lumaQuestion || `Please provide: ${nextField.label}`;
      const prompt = `${langInstruction} You are Luma filling a government form with the user. The user just answered "${cleanAnswer}" for "${currentField.label}". Acknowledge their answer warmly in 1 sentence in ${langName}. ${sectionChange} Then IMMEDIATELY ask Question ${nextField.questionNumber}: "${nextQ}" ${nextField.lumaExplanation ? `Briefly explain: "${nextField.lumaExplanation}"` : ""} ${nextField.fieldType === "select" ? `Options are: ${nextField.options?.join(", ")}` : ""} ${!nextField.required ? '(Optional — they can say "none" to skip)' : ""} Do NOT ask what comes next — you already know. Keep it to 1-2 sentences total.`;

      const buttons = getButtonsForField(nextField);
      const qNum = nextField.questionNumber;
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
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: text, buttons, questionNumber: qNum } : m);
            }
            return [...prev, { role: "assistant", content: text, buttons, questionNumber: qNum }];
          });
        },
        onDone: () => {
          setFieldIndex(nextIdx);
          setIsLoading(false);
        },
        onError: () => {
          const fallback = nextField.lumaExplanation
            ? `${nextField.lumaExplanation}\n\nQ${nextField.questionNumber}: ${nextField.lumaQuestion}`
            : `Q${nextField.questionNumber}: ${nextField.lumaQuestion}`;
          setMessages(prev => [...prev, { role: "assistant", content: fallback, buttons, questionNumber: qNum }]);
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
    const langInstruction = lang !== "EN" ? `IMPORTANT: Your ENTIRE response must be in ${langName}.` : "";
    const prompt = `${langInstruction} The user has completed ALL questions for their SA466 Disability Support Pension form! Congratulate them warmly in ${langName}. Tell them: 1) Their form is complete and ready to download. 2) They need to print it and sign where indicated. 3) Post it to: Reply Paid 7800, Canberra BC ACT 2610. Keep it to 3 sentences.`;

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
        // Show checklist of any additional actions triggered during the form
        setTriggeredNotices(prev => {
          if (prev.length > 0) {
            const sorted = [...prev].sort((a, b) => a.qNum - b.qNum);
            const checklistLines = sorted.map(n =>
              `• Q${n.qNum}: ${n.notice.split('\n')[0].replace(/^[📋📄⚠️📞]\s*/, '').trim()}`
            ).join('\n');
            setMessages(msgs => [...msgs, {
              role: "assistant",
              content: `📋 Your SA466 Checklist — things you still need to do:\n\n${checklistLines}\n\nAll items above were flagged during your form. Download your SA466 now, then work through this list before posting.`,
            }]);
          }
          return prev;
        });
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
            Luma ✨ <span className="ml-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px]">{t("form.formAssistant")}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-primary-foreground/70">
            <span className="animate-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--mint))]" />
            {t("form.dspTitle")}
          </div>
        </div>
        <button onClick={toggleMute} className="rounded-full p-1 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground" title={muted ? t("form.unmute") : t("form.mute")}>
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
          ? <span>{t("form.allComplete")}</span>
          : (
            <>
              <div className="font-medium text-foreground/80">{sectionTitle}</div>
              <div>{answeredCount} {t("form.questionsOf")} {totalQuestions} {t("form.questionsComplete")}</div>
            </>
          )
        }
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === "assistant" && msg.questionNumber && (
              <div className="flex items-center gap-1.5 ml-9 mb-1">
                <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary tracking-wide">
                  Q{msg.questionNumber}
                </span>
              </div>
            )}
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
              {t("form.thinking")}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      {!isComplete && (
        <div className="border-t border-border bg-card px-3 py-2.5">
          {/* Address autocomplete suggestions */}
          {isAddressField && showAddressSuggestions && addressSuggestions.length > 0 && (
            <div className="mb-2 rounded-xl border border-border bg-white shadow-xl overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
              <div className="px-3 py-1.5 border-b border-border/30 bg-muted/30 flex items-center gap-1.5">
                <svg className="w-3 h-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-[10px] text-muted-foreground font-medium">Australian address suggestions</span>
              </div>
              {addressSuggestions.map((addr, i) => {
                // Split address into street + suburb/state/postcode for two-line display
                const parts = addr.split(",");
                const street = parts[0]?.trim() || addr;
                const rest = parts.slice(1).join(",").trim();
                return (
                  <button
                    key={i}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setInput(addr);
                      setShowAddressSuggestions(false);
                    }}
                    className="w-full px-3 py-2.5 text-left hover:bg-primary/8 border-b border-border/20 last:border-0 transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-primary/60 text-xs">📍</span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {street}
                        </div>
                        {rest && <div className="text-[10px] text-muted-foreground truncate mt-0.5">{rest}</div>}
                      </div>
                    </div>
                  </button>
                );
              })}
              <div className="px-3 py-1 bg-muted/20 flex items-center justify-end gap-1">
                <span className="text-[9px] text-muted-foreground">Powered by OpenStreetMap</span>
              </div>
            </div>
          )}
          {/* Persistent option buttons for select/yes-no fields — always visible, no waiting on stream */}
          {currentField?.fieldType === "select" && currentField.options && !isComplete && (
            <div className="flex gap-1.5 mb-1.5 flex-wrap">
              {currentField.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => processAnswer(opt)}
                  disabled={isLoading}
                  className="rounded-xl border border-primary bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
                >
                  {opt}
                </button>
              ))}
              {!currentField.required && (
                <button
                  onClick={() => processAnswer("none")}
                  disabled={isLoading}
                  className="rounded-xl border border-border bg-background px-4 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted transition-all disabled:opacity-40"
                >
                  None
                </button>
              )}
            </div>
          )}
          {/* None/Skip button for non-select optional fields */}
          {currentField && !currentField.required && currentField.fieldType !== "select" && !isComplete && (
            <div className="flex gap-1.5 mb-1.5 flex-wrap">
              <button
                onClick={() => { setInput("none"); setTimeout(() => send(), 50); }}
                disabled={isLoading}
                className="rounded-lg px-3 py-1 text-xs font-bold border border-border bg-background text-muted-foreground hover:bg-muted transition-all disabled:opacity-40"
              >
                None
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (isAddressField) {
                  if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
                  addressDebounceRef.current = setTimeout(() => fetchAddressSuggestions(e.target.value), 350);
                }
              }}
              onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder={currentField?.fieldType === "date" ? t("form.datePlaceholder") : t("form.placeholder")}
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
                title={listening ? t("form.stopRecording") : t("form.voiceInput")}
              >
                🎤
              </button>
            )}
            <button
              onClick={send}
              disabled={isLoading || !input.trim()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-[hsl(var(--forest-hover))] disabled:opacity-50"
            >
              {t("form.send")}
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
                {t("form.saveAndContinue")}
              </button>
              {fieldIndex > 0 && !correctionMode && (
                <button
                  onClick={handleUndo}
                  disabled={isLoading}
                  className="text-[10px] font-semibold text-destructive hover:underline disabled:opacity-50"
                >
                  {t("form.undoLast")}
                </button>
              )}
            </div>
            {sessionCode && (
              <span className="text-[10px] text-muted-foreground">
                {t("form.session")}: <span className="font-mono font-bold text-foreground">{sessionCode}</span>
              </span>
            )}
          </div>
          <p className="mt-1 text-center text-[10px] text-muted-foreground">
            {t("form.privacy")}
          </p>
        </div>
      )}
    </div>
  );
};

export default FormFillingChat;
