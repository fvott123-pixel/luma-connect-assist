import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { getFormDocuments, PRIORITY_LABELS, type DocSlot } from "@/lib/formDocuments";
import LumaAvatar from "@/components/landing/LumaAvatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { generateMobileCode, pollMobileData } from "@/lib/mobileSession";
import { mapToFormFields } from "@/lib/mapToFormFields";
const PhoneCameraDemo = lazy(() => import("@/components/PhoneCameraDemo").then(m => ({ default: m.PhoneCameraDemo })));

export interface DocumentSlot {
  id: string;
  label: string;
  description: string;
  icon: string;
  documentType: string;
  accept: string;
}

const DOCUMENT_SLOTS: DocumentSlot[] = [
  {
    id: "licenceFront",
    label: "Driver's Licence — Front",
    description: "Full name, date of birth, address, licence number",
    icon: "🪪",
    documentType: "licenceFront",
    accept: "image/*",
  },
  {
    id: "licenceBack",
    label: "Driver's Licence — Back",
    description: "Additional licence details and barcode",
    icon: "🔄",
    documentType: "licenceBack",
    accept: "image/*",
  },
  {
    id: "passport",
    label: "Passport — Photo Page",
    description: "Full name, date of birth, passport number, nationality, expiry",
    icon: "🛂",
    documentType: "passport",
    accept: "image/*",
  },
  {
    id: "medicareCard",
    label: "Medicare Card",
    description: "For your Medicare number",
    icon: "💚",
    documentType: "medicareCard",
    accept: "image/*",
  },
  {
    id: "centrelinkCard",
    label: "Centrelink Concession Card",
    description: "For your Customer Reference Number (CRN)",
    icon: "🏛️",
    documentType: "centrelinkCard",
    accept: "image/*",
  },
  {
    id: "bankStatement",
    label: "Bank Statement",
    description: "For your BSB and account number",
    icon: "🏦",
    documentType: "bankStatement",
    accept: "image/*,.pdf",
  },
  {
    id: "taxReturn",
    label: "Centrelink or Tax Letter",
    description: "For your Tax File Number or CRN",
    icon: "📄",
    documentType: "taxReturn",
    accept: "image/*,.pdf",
  },
  {
    id: "medicalReport",
    label: "Medical Reports or Specialist Letters",
    description: "For your disability and doctor details",
    icon: "🏥",
    documentType: "medicalReport",
    accept: "image/*,.pdf",
  },
  {
    id: "leaseAgreement",
    label: "Lease or Rental Agreement",
    description: "For your address and rent details",
    icon: "🏠",
    documentType: "leaseAgreement",
    accept: "image/*,.pdf",
  },
  {
    id: "doctorLetter",
    label: "Doctor or Specialist Letter",
    description: "Fills doctor name, address, phone, profession, and condition details",
    icon: "👨‍⚕️",
    documentType: "doctorLetter",
    accept: "image/*,.pdf",
  },
  {
    id: "partnerLicence",
    label: "Partner's Driver's Licence",
    description: "Auto-fills your partner's name, DOB, address, and gender",
    icon: "👫",
    documentType: "partnerLicence",
    accept: "image/*",
  },
  {
    id: "partnerPassport",
    label: "Partner's Passport",
    description: "Auto-fills your partner's name, DOB, country of birth",
    icon: "🛂",
    documentType: "partnerPassport",
    accept: "image/*",
  },
  {
    id: "separationCertificate",
    label: "Employment Separation Certificate",
    description: "Employer name, separation date, last pay details (SU001 form)",
    icon: "📋",
    documentType: "separationCertificate",
    accept: "image/*,.pdf",
  },
  {
    id: "taxLetter",
    label: "ATO Tax Letter or myGov Letter",
    description: "Extracts your Tax File Number (TFN)",
    icon: "🔢",
    documentType: "taxLetter",
    accept: "image/*,.pdf",
  },
];

type SlotStatus = "idle" | "uploading" | "done" | "skipped" | "error";

interface DocumentVaultProps {
  onComplete: (extracted: Record<string, string>, summary: string[]) => void;
  onSkipAll: () => void;
  formSlug?: string;
}

// mapToFormFields is now imported from @/lib/mapToFormFields

function summarizeExtraction(documentType: string, data: Record<string, string>): string {
  const fields = Object.entries(data).filter(([, v]) => v && v.trim());
  if (fields.length === 0) return "";

  const labels: Record<string, string> = {
    firstName: "first name", familyName: "family name", dob: "date of birth",
    permanentAddress: "address", postcode: "postcode", gender: "gender", title: "title",
    crn: "CRN", taxFileNumber: "Tax File Number",
    bankBSB: "BSB", bankAccountNumber: "account number", bankAccountName: "account name", bankName: "bank name",
    medicareNumber: "Medicare number",
    primaryCondition: "primary condition", treatingDoctor: "treating doctor", doctorAddress: "doctor address",
    doctorPhone: "doctor phone", conditionStartDate: "condition start date", otherConditions: "other conditions",
    treatments: "treatment details", rentAmount: "rent amount",
    licenceNumber: "licence number", licenceExpiry: "licence expiry",
    passportNumber: "passport number", nationality: "nationality", passportExpiry: "passport expiry",
    passport_firstName: "passport name", passport_familyName: "passport surname", passport_dob: "passport DOB",
    passport_gender: "passport gender",
    australianCitizen: "Australian citizenship", currentCountry: "current country",
    australianCitizenBornHere: "born in Australia", countryOfBirth: "country of birth",
  };

  const docLabels: Record<string, string> = {
    licenceFront: "your driver's licence (front)",
    licenceBack: "your driver's licence (back)",
    passport: "your passport",
    medicareCard: "your Medicare card",
    centrelinkCard: "your Centrelink card",
    bankStatement: "your bank statement",
    taxReturn: "your tax/Centrelink letter",
    taxLetter: "your ATO/myGov letter",
    medicalReport: "your medical report",
    leaseAgreement: "your lease agreement",
    doctorLetter: "your doctor letter",
    partnerLicence: "your partner's licence",
    partnerPassport: "your partner's passport",
    separationCertificate: "your separation certificate",
  };

  const found = fields.map(([k]) => labels[k] || k).join(", ");
  return `From ${docLabels[documentType] || "your document"}: ${found}`;
}

/**
 * Cross-check licence vs passport details and return discrepancies.
 */
function crossCheckIdDocuments(allExtracted: Record<string, string>): string[] {
  const discrepancies: string[] = [];

  const licenceName = [allExtracted.firstName, allExtracted.familyName].filter(Boolean).join(" ");
  const passportName = [allExtracted.passport_firstName, allExtracted.passport_familyName].filter(Boolean).join(" ");

  if (licenceName && passportName && licenceName.toLowerCase() !== passportName.toLowerCase()) {
    discrepancies.push(
      `⚠️ Name mismatch: Licence says "${licenceName}" but passport says "${passportName}". Passport name will be used as Services Australia prefers passport details.`
    );
  }

  if (allExtracted.dob && allExtracted.passport_dob && allExtracted.dob !== allExtracted.passport_dob) {
    discrepancies.push(
      `⚠️ Date of birth mismatch: Licence says "${allExtracted.dob}" but passport says "${allExtracted.passport_dob}".`
    );
  }

  if (allExtracted.gender && allExtracted.passport_gender && allExtracted.gender !== allExtracted.passport_gender) {
    discrepancies.push(
      `⚠️ Gender mismatch: Licence says "${allExtracted.gender}" but passport says "${allExtracted.passport_gender}".`
    );
  }

  return discrepancies;
}

/**
 * Compress image to max 1600px JPEG.
 * On iOS, Safari decodes HEIC natively via Image + canvas — output is always JPEG.
 * Fixes HEIC rejections from Anthropic and reduces 3-5 MB photos to ~100-300 KB.
 */
async function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const MAX_DIM = 1600;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round(height * MAX_DIM / width);
          width = MAX_DIM;
        } else {
          width = Math.round(width * MAX_DIM / height);
          height = MAX_DIM;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not available")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not decode image")); };
    img.src = url;
  });
}

const DocumentVault = ({ onComplete, onSkipAll, formSlug = "disability-support-pension" }: DocumentVaultProps) => {
  const formConfig = getFormDocuments(formSlug);
  const DOCUMENT_SLOTS_FOR_FORM: DocSlot[] = formConfig.slots;
  const [statuses, setStatuses] = useState<Record<string, SlotStatus>>(
    Object.fromEntries(DOCUMENT_SLOTS_FOR_FORM.map(s => [s.id, "idle" as SlotStatus]))
  );
  const [allExtracted, setAllExtracted] = useState<Record<string, string>>({});
  const [summaries, setSummaries] = useState<string[]>([]);
  const [discrepancies, setDiscrepancies] = useState<string[]>([]);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Mobile scan session ──────────────────────────────────────────
  const [mobileCode] = useState<string>(() => generateMobileCode());
  const [mobileDocs, setMobileDocs] = useState(0);          // docs scanned on phone
  const [mobileFields, setMobileFields] = useState(0);      // fields received from phone
  const [lastMobilePoll, setLastMobilePoll] = useState(0);  // doc_count at last merge
  const mobileUrl = `${window.location.origin}/mobile-upload/${mobileCode}`;
  const [showDemo, setShowDemo] = useState(false);

  // Poll every 4 seconds for data pushed by the mobile page
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await pollMobileData(mobileCode);
      if (!result || result.doc_count === 0) return;
      if (result.doc_count <= lastMobilePoll) return; // nothing new

      // Merge new extracted fields into our state
      const newExtracted = result.extracted as Record<string, string>;
      const newFieldCount = Object.keys(newExtracted).length;

      setAllExtracted(prev => ({ ...prev, ...newExtracted }));
      setSummaries(prev => {
        const incoming = (result.summaries as string[]) || [];
        const fresh = incoming.filter(s => !prev.includes(s));
        return fresh.length ? [...prev, ...fresh] : prev;
      });
      setMobileDocs(result.doc_count);
      setMobileFields(newFieldCount);
      setLastMobilePoll(result.doc_count);
      toast.success(`📱 ${result.doc_count} document${result.doc_count !== 1 ? "s" : ""} received from your phone! ${newFieldCount} fields pre-filled.`);
    }, 4000);

    return () => clearInterval(interval);
  }, [mobileCode, lastMobilePoll]);

  const uploadedOrSkippedCount = Object.values(statuses).filter(s => s !== "idle" && s !== "uploading").length;

  const handleFile = async (slot: DocumentSlot, file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File too large — max 15MB");
      return;
    }

    setStatuses(prev => ({ ...prev, [slot.id]: "uploading" }));

    try {
          // Compress & convert to JPEG (handles HEIC on iOS via canvas automatically)
    const { base64, mimeType: imgMime } = await compressImage(file);
    const { data, error } = await supabase.functions.invoke("extract-document", {
      body: { image: base64, mimeType: imgMime, documentType: slot.documentType },
    });

      if (error) throw error;

      if (data?.error === "wrong_document_type") {
        // Wrong document detected — show clear error
        setStatuses(prev => ({ ...prev, [slot.id]: "error" }));
        const actual = data.actual || "a different document";
        toast.error(
          `Wrong document! ${slot.label} expects ${slot.description.toLowerCase()}. You uploaded: ${actual}. Please upload the correct document.`,
          { duration: 7000 }
        );
      } else if (data?.extracted) {
        const mapped = mapToFormFields(slot.documentType, data.extracted);
        const fieldsCount = Object.keys(mapped).length;
        const summary = summarizeExtraction(slot.documentType, mapped);

        setAllExtracted(prev => {
          const updated = { ...prev, ...mapped };
          if (slot.documentType === "passport" || slot.documentType === "licenceFront") {
            const checks = crossCheckIdDocuments(updated);
            setDiscrepancies(checks);
          }
          return updated;
        });
        if (summary) setSummaries(prev => [...prev, summary]);

        setStatuses(prev => ({ ...prev, [slot.id]: "done" }));
        toast.success(`${slot.label} scanned! ✅ ${fieldsCount} field${fieldsCount !== 1 ? "s" : ""} pre-filled.`);
      } else {
        throw new Error("No data extracted");
      }
      } catch (err: any) {
      console.error(`Document extraction error (${slot.id}):`, err);
      setStatuses(prev => ({ ...prev, [slot.id]: "error" }));
      const msg = (err?.message ?? "") as string;
      let tip = "Try a clearer, well-lit photo.";
      if (msg.includes("unsupported_format") || msg.toLowerCase().includes("heic")) {
        tip = "iPhone: Settings → Camera → Formats → Most Compatible.";
      } else if (msg.includes("image_too_large") || msg.includes("too large")) {
        tip = "Photo too large — try a lower-resolution shot.";
      } else if (msg.includes("timeout")) {
        tip = "Request timed out — please try again.";
      } else if (msg && msg !== "No data extracted" && msg.length < 120) {
        tip = msg;
      }
      toast.error(`Could not read ${slot.label}. ${tip}`, { duration: 7000 });
    }
  };

  const handleSkipSlot = (slotId: string) => {
    setStatuses(prev => ({ ...prev, [slotId]: "skipped" }));
  };

  const handleDone = () => {
    onComplete(allExtracted, [...summaries, ...discrepancies]);
  };

  // Count auto-filled fields so far
  const autoFilledCount = Object.keys(allExtracted).length;
  const doneCount = Object.values(statuses).filter(s => s === "done").length;

  // Group slots by priority
  const required    = DOCUMENT_SLOTS_FOR_FORM.filter(s => s.priority === "required");
  const recommended = DOCUMENT_SLOTS_FOR_FORM.filter(s => s.priority === "recommended");
  const optional    = DOCUMENT_SLOTS_FOR_FORM.filter(s => !s.priority || s.priority === "optional");

  const renderSlot = (slot: DocSlot) => {
    const status = statuses[slot.id];
    return (
      <div
        key={slot.id}
        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-all ${
          status === "done"    ? "border-green-500/40 bg-green-50 dark:bg-green-900/10" :
          status === "uploading" ? "border-primary/40 bg-primary/5 animate-pulse" :
          status === "error"   ? "border-destructive/40 bg-destructive/5" :
          status === "skipped" ? "border-border/40 bg-muted/20 opacity-50" :
          "border-border bg-card hover:border-primary/30 hover:bg-primary/5"
        }`}
      >
        {/* Icon */}
        <span className="text-lg shrink-0 w-6 text-center">
          {status === "done" ? "✅" : status === "error" ? "⚠️" : slot.icon}
        </span>

        {/* Label + description */}
        <div className="flex-1 min-w-0">
          <div className={`text-[12px] font-semibold leading-tight ${status === "skipped" ? "text-muted-foreground" : "text-foreground"}`}>
            {slot.label}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">{slot.description}</div>
        </div>

        {/* Action */}
        <div className="shrink-0 flex items-center gap-1">
          {status === "idle" || status === "error" ? (
            <>
              <input
                ref={el => { fileRefs.current[slot.id] = el; }}
                type="file"
                accept={slot.accept}
                capture="environment"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(slot, file);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileRefs.current[slot.id]?.click()}
                className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground hover:opacity-90 transition-all"
              >
                📸 Upload
              </button>
              <button
                onClick={() => handleSkipSlot(slot.id)}
                className="rounded-lg border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted transition-all"
              >
                Skip
              </button>
            </>
          ) : status === "uploading" ? (
            <div className="flex items-center gap-1 text-[11px] text-primary font-semibold">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Reading…
            </div>
          ) : status === "done" ? (
            <span className="text-[11px] font-bold text-green-600 whitespace-nowrap">✓ Done</span>
          ) : status === "skipped" ? (
            <button
              onClick={() => setStatuses(prev => ({ ...prev, [slot.id]: "idle" }))}
              className="text-[10px] text-muted-foreground hover:text-primary underline"
            >
              Undo
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  // Helper to render a priority group
  const renderGroup = (slots: DocSlot[], label: string, dotColor: string, textColor: string) => {
    if (slots.length === 0) return null;
    const doneInGroup = slots.filter(s => statuses[s.id] === "done").length;
    return (
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
          <span className={`text-[11px] font-extrabold uppercase tracking-wide ${textColor}`}>
            {label}
            {label.startsWith("Required") && ` — ${doneInGroup}/${slots.length} done`}
          </span>
        </div>
        <div className="space-y-1.5">
          {slots.map(renderSlot)}
        </div>
      </div>
    );
  };

  return (
    // ── Responsive wrapper: column on mobile, side-by-side on desktop ──
    <div className="flex flex-col md:flex-row w-full min-h-0" style={{ maxHeight: "90vh" }}>

      {/* ════════════════════════════════════════════════
          LEFT PANEL — document list (scrollable)
          On mobile: full width. On desktop: 58% width.
          ════════════════════════════════════════════════ */}
      <div className="flex flex-col md:w-[58%] min-h-0 border-b md:border-b-0 md:border-r border-border">

        {/* Mobile-only mini header */}
        <div className="md:hidden px-4 pt-5 pb-3 text-center border-b border-border bg-gradient-to-b from-primary/5 to-background">
          <div className="flex items-center justify-center gap-2 mb-2">
            <LumaAvatar size={40} />
            <div>
              <h2 className="font-serif text-base font-extrabold text-foreground">📁 Document Vault</h2>
              <div className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5">
                <span className="text-[10px] font-bold text-primary">{formConfig.formCode}</span>
                <span className="text-[10px] text-muted-foreground">— {formConfig.formName}</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border-2 border-primary/30 bg-primary/5 px-3 py-2">
            <p className="text-[12px] font-extrabold text-primary">📸 Upload more → Answer less</p>
            <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
              Every document you scan fills in questions automatically.
            </p>
          </div>
          {autoFilledCount > 0 && (
            <div className="mt-2 inline-flex items-center rounded-full bg-green-500 px-3 py-1">
              <span className="text-white text-[11px] font-extrabold">
                🎉 {autoFilledCount} fields auto-filled!
              </span>
            </div>
          )}
          <div className="mt-2 flex justify-center gap-4 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"/>Required</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"/>Recommended</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300"/>Optional</span>
          </div>
        </div>

        {/* Desktop column label */}
        <div className="hidden md:flex items-center gap-2 px-5 pt-5 pb-2 border-b border-border/60">
          <span className="text-sm font-extrabold text-foreground">📄 Your Documents</span>
          <span className="ml-auto text-[10px] text-muted-foreground flex gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"/>Required</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"/>Recommended</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300"/>Optional</span>
          </span>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {renderGroup(required,    "Required",    "bg-red-400",   "text-red-600")}
          {renderGroup(recommended, "Recommended — saves the most questions", "bg-amber-400", "text-amber-600")}
          {renderGroup(optional,    "Optional — upload if you have them",     "bg-gray-300",  "text-muted-foreground")}
        </div>

        {/* Mobile-only footer */}
        <div className="md:hidden border-t border-border px-4 py-3 bg-background">
          <button onClick={handleDone}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 shadow-lg">
            {doneCount > 0
              ? `Continue with ${doneCount} doc${doneCount !== 1 ? "s" : ""} → (${autoFilledCount} fields pre-filled)`
              : "Start without documents →"}
          </button>
          <button onClick={onSkipAll}
            className="mt-2 w-full text-center text-[11px] text-muted-foreground hover:text-primary">
            Skip all — I'll type everything manually
          </button>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            🔒 Scanned securely, never stored.
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          RIGHT PANEL — sticky sidebar (desktop only)
          ════════════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col md:w-[42%] bg-gradient-to-b from-primary/5 to-background">

        {/* Header with Luma avatar */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-border/60">
          <LumaAvatar size={60} />
          <h2 className="mt-3 font-serif text-lg font-extrabold text-foreground">📁 Document Vault</h2>
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-0.5">
            <span className="text-[11px] font-bold text-primary">{formConfig.formCode}</span>
            <span className="text-[11px] text-muted-foreground">— {formConfig.formName}</span>
          </div>

          {/* KEY MESSAGE */}
          <div className="mt-3 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3 text-left">
            <p className="text-sm font-extrabold text-primary">📸 Upload more → Answer less</p>
            <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
              Every document you scan auto-fills the matching form questions —
              so you don't have to type them manually.
              The more you upload <span className="font-bold text-foreground">now</span>,
              the fewer questions Luma will ask.
            </p>
          </div>
          {/* Demo button — always visible */}
          <button
            onClick={() => setShowDemo(true)}
            className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all shadow-sm"
          >
            ▶️ See how the phone camera works — 60-second demo
          </button>
          {showDemo && (
            <Suspense fallback={null}>
              <PhoneCameraDemo onClose={() => setShowDemo(false)} />
            </Suspense>
          )}
        </div>

        {/* Live progress */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

          {/* Auto-fill counter */}
          <div className={`rounded-xl border-2 p-4 text-center transition-all ${
            autoFilledCount > 0
              ? "border-green-500/40 bg-green-50"
              : "border-border bg-card"
          }`}>
            <div className="text-3xl font-extrabold text-primary">{autoFilledCount}</div>
            <div className="text-xs font-bold text-muted-foreground">fields auto-filled</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              from {doneCount} document{doneCount !== 1 ? "s" : ""} scanned
            </div>
            {autoFilledCount === 0 && (
              <p className="mt-2 text-[10px] text-muted-foreground italic">
                Upload your first document to see this number climb →
              </p>
            )}
          </div>

          {/* Discrepancies */}
          {discrepancies.length > 0 && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-50 p-3">
              <div className="text-xs font-bold text-foreground mb-1">🔍 Luma noticed some differences:</div>
              {discrepancies.map((d, i) => (
                <p key={i} className="text-[11px] text-foreground/80">{d}</p>
              ))}
            </div>
          )}

          {/* What Luma found */}
          {summaries.length > 0 ? (
            <div className="rounded-xl border border-green-500/30 bg-green-50 p-3">
              <div className="text-xs font-bold text-foreground mb-2">✅ What Luma found so far:</div>
              <div className="space-y-1">
                {summaries.map((s, i) => (
                  <p key={i} className="text-[11px] text-foreground/80 leading-snug">{s}</p>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-4 text-center">
              <p className="text-[11px] text-muted-foreground italic">
                Uploaded documents will be summarised here as Luma reads them.
              </p>
            </div>
          )}

          {/* ── PHONE SCAN PANEL ── */}
          <div className={`rounded-xl border-2 p-4 transition-all ${
            mobileDocs > 0
              ? "border-green-500/50 bg-green-50"
              : "border-primary/30 bg-primary/5"
          }`}>
            {mobileDocs > 0 ? (
              // ── RECEIVED STATE ──
              <div className="text-center">
                <div className="text-2xl">📱✅</div>
                <p className="mt-1 text-xs font-extrabold text-green-700">
                  {mobileDocs} document{mobileDocs !== 1 ? "s" : ""} received from your phone!
                </p>
                <p className="text-[10px] text-green-600 mt-0.5">
                  {mobileFields} fields pre-filled. Keep your phone open to scan more.
                </p>
                {/* Small QR still accessible */}
                <div className="mt-2 flex justify-center">
                  <div className="bg-white p-1.5 rounded-lg border border-green-300 inline-block">
                    <QRCodeSVG value={mobileUrl} size={64} />
                  </div>
                </div>
                <p className="mt-1 text-[9px] text-muted-foreground font-mono">{mobileCode}</p>
              </div>
            ) : (
              // ── WAITING STATE ──
              <div>
                <p className="text-xs font-extrabold text-primary text-center mb-1">
                  📱 Easier on your phone?
                </p>
                <p className="text-[10px] text-muted-foreground text-center leading-snug mb-3">
                  Scan this QR code with your phone camera. Use your phone to photograph documents — results sync here automatically.
                </p>
                <div className="flex justify-center">
                  <div className="bg-white p-2.5 rounded-xl border-2 border-primary/20 shadow-sm inline-block">
                    <QRCodeSVG value={mobileUrl} size={120} level="M"
                      imageSettings={{ src: "", height: 0, width: 0, excavate: false }} />
                  </div>
                </div>
                <p className="mt-2 text-center text-[10px] text-muted-foreground">
                  Session code: <span className="font-mono font-bold text-foreground">{mobileCode}</span>
                </p>
                <p className="mt-1.5 text-center text-[9px] text-muted-foreground italic">
                  Waiting for phone… scanning every 4 seconds
                </p>
                <div className="mt-2 flex justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-[11px] font-bold text-foreground mb-1.5">💡 Tips</div>
            <ul className="space-y-1 text-[10px] text-muted-foreground">
              <li>📱 <span className="font-semibold">Phone camera</span> — scan the QR above for best results</li>
              <li>📄 <span className="font-semibold">PDF files</span> — accepted for bank/medical docs</li>
              <li>☀️ <span className="font-semibold">Good lighting</span> — helps Luma read text clearly</li>
              <li>🔒 <span className="font-semibold">100% private</span> — deleted immediately after scan</li>
            </ul>
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="border-t border-border px-5 py-4 bg-background">
          <button
            onClick={handleDone}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 shadow-lg transition-all"
          >
            {doneCount > 0
              ? `Continue → ${autoFilledCount} fields pre-filled`
              : "Start without documents →"}
          </button>
          <button
            onClick={onSkipAll}
            className="mt-2 w-full text-center text-[11px] text-muted-foreground hover:text-primary transition-colors"
          >
            Skip all — I'll type everything manually
          </button>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            🔒 Scanned securely, never stored. Deleted immediately after reading.
          </p>
        </div>
      </div>

    </div>
  );
};

export default DocumentVault;
