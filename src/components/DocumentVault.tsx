import { useState, useRef } from "react";
import LumaAvatar from "@/components/landing/LumaAvatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
];

type SlotStatus = "idle" | "uploading" | "done" | "skipped" | "error";

interface DocumentVaultProps {
  onComplete: (extracted: Record<string, string>, summary: string[]) => void;
  onSkipAll: () => void;
}

/**
 * Map raw extracted document data to form field IDs.
 */
function mapToFormFields(documentType: string, data: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};

  switch (documentType) {
    case "licenceFront": {
      if (data.firstName) mapped.firstName = data.firstName;
      if (data.surname) mapped.familyName = data.surname;
      if (data.dateOfBirth) {
        if (data.dateOfBirth.includes("-")) {
          const [y, m, d] = data.dateOfBirth.split("-");
          if (d && m && y) mapped.dob = `${d}/${m}/${y}`;
        } else {
          mapped.dob = data.dateOfBirth;
        }
      }
      if (data.address) {
        const full = [data.address, data.suburb, data.state].filter(Boolean).join(", ");
        mapped.permanentAddress = full || data.address;
      }
      if (data.postcode) mapped.postcode = data.postcode;
      if (data.licenceNumber) mapped.licenceNumber = data.licenceNumber;
      if (data.expiryDate) mapped.licenceExpiry = data.expiryDate;
      if (data.gender) {
        mapped.gender = data.gender;
        if (data.gender === "Male") mapped.title = "Mr";
        else if (data.gender === "Female") mapped.title = "Ms";
      }
      break;
    }
    case "licenceBack": {
      // Back may have additional address info or licence class
      if (data.address) mapped.permanentAddress = data.address;
      if (data.licenceNumber) mapped.licenceNumber = data.licenceNumber;
      break;
    }
    case "passport": {
      if (data.firstName) mapped.passport_firstName = data.firstName;
      if (data.surname) mapped.passport_familyName = data.surname;
      if (data.dateOfBirth) {
        if (data.dateOfBirth.includes("-")) {
          const [y, m, d] = data.dateOfBirth.split("-");
          if (d && m && y) mapped.passport_dob = `${d}/${m}/${y}`;
        } else {
          mapped.passport_dob = data.dateOfBirth;
        }
      }
      if (data.passportNumber) mapped.passportNumber = data.passportNumber;
      if (data.nationality) mapped.nationality = data.nationality;
      if (data.expiryDate) mapped.passportExpiry = data.expiryDate;
      if (data.gender) mapped.passport_gender = data.gender;
      // Also set primary fields from passport (preferred by Services Australia)
      if (data.firstName) mapped.firstName = data.firstName;
      if (data.surname) mapped.familyName = data.surname;
      if (data.dateOfBirth) {
        if (data.dateOfBirth.includes("-")) {
          const [y, m, d] = data.dateOfBirth.split("-");
          if (d && m && y) mapped.dob = `${d}/${m}/${y}`;
        } else {
          mapped.dob = data.dateOfBirth;
        }
      }
      if (data.gender) {
        mapped.gender = data.gender;
        if (data.gender === "Male") mapped.title = "Mr";
        else if (data.gender === "Female") mapped.title = "Ms";
      }
      break;
    }
    case "medicareCard": {
      if (data.medicareNumber) mapped.medicareNumber = data.medicareNumber;
      break;
    }
    case "centrelinkCard": {
      if (data.crn) mapped.crn = data.crn;
      break;
    }
    case "bankStatement": {
      if (data.bsbNumber) mapped.bankBSB = data.bsbNumber;
      if (data.accountNumber) mapped.bankAccountNumber = data.accountNumber;
      if (data.accountName) mapped.bankAccountName = data.accountName;
      if (data.bankName) mapped.bankName = data.bankName;
      break;
    }
    case "taxReturn": {
      if (data.taxFileNumber) mapped.taxFileNumber = data.taxFileNumber;
      if (data.crn) mapped.crn = data.crn;
      if (data.address) mapped.permanentAddress = data.address;
      break;
    }
    case "medicalReport": {
      if (data.primaryCondition) mapped.primaryCondition = data.primaryCondition;
      if (data.otherConditions) mapped.otherConditions = data.otherConditions;
      if (data.treatingDoctor) mapped.treatingDoctor = data.treatingDoctor;
      if (data.doctorAddress) mapped.doctorAddress = data.doctorAddress;
      if (data.doctorPhone) mapped.doctorPhone = data.doctorPhone;
      if (data.conditionStartDate) mapped.conditionStartDate = data.conditionStartDate;
      if (data.treatmentDetails) mapped.treatments = data.treatmentDetails;
      break;
    }
    case "leaseAgreement": {
      if (data.rentalAddress) mapped.permanentAddress = data.rentalAddress;
      if (data.rentAmount) mapped.rentAmount = data.rentAmount;
      break;
    }
  }

  return Object.fromEntries(Object.entries(mapped).filter(([, v]) => v && v.trim() !== ""));
}

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
  };

  const docLabels: Record<string, string> = {
    licenceFront: "your driver's licence (front)",
    licenceBack: "your driver's licence (back)",
    passport: "your passport",
    medicareCard: "your Medicare card",
    centrelinkCard: "your Centrelink card",
    bankStatement: "your bank statement",
    taxReturn: "your tax/Centrelink letter",
    medicalReport: "your medical report",
    leaseAgreement: "your lease agreement",
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

const DocumentVault = ({ onComplete, onSkipAll }: DocumentVaultProps) => {
  const [statuses, setStatuses] = useState<Record<string, SlotStatus>>(
    Object.fromEntries(DOCUMENT_SLOTS.map(s => [s.id, "idle" as SlotStatus]))
  );
  const [allExtracted, setAllExtracted] = useState<Record<string, string>>({});
  const [summaries, setSummaries] = useState<string[]>([]);
  const [discrepancies, setDiscrepancies] = useState<string[]>([]);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const uploadedOrSkippedCount = Object.values(statuses).filter(s => s !== "idle" && s !== "uploading").length;

  const handleFile = async (slot: DocumentSlot, file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File too large — max 15MB");
      return;
    }

    setStatuses(prev => ({ ...prev, [slot.id]: "uploading" }));

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke("extract-document", {
        body: { image: base64, mimeType: file.type, documentType: slot.documentType },
      });

      if (error) throw error;

      if (data?.extracted) {
        const mapped = mapToFormFields(slot.documentType, data.extracted);
        const summary = summarizeExtraction(slot.documentType, mapped);

        setAllExtracted(prev => {
          const updated = { ...prev, ...mapped };
          // Cross-check after passport or licence upload
          if (slot.documentType === "passport" || slot.documentType === "licenceFront") {
            const checks = crossCheckIdDocuments(updated);
            setDiscrepancies(checks);
          }
          return updated;
        });
        if (summary) setSummaries(prev => [...prev, summary]);

        setStatuses(prev => ({ ...prev, [slot.id]: "done" }));
        toast.success(`${slot.label} scanned successfully! ✨`);
      } else {
        throw new Error("No data extracted");
      }
    } catch (err: any) {
      console.error(`Document extraction error (${slot.id}):`, err);
      setStatuses(prev => ({ ...prev, [slot.id]: "error" }));
      toast.error(`Could not read ${slot.label}. You can skip this one.`);
    }
  };

  const handleSkipSlot = (slotId: string) => {
    setStatuses(prev => ({ ...prev, [slotId]: "skipped" }));
  };

  const handleDone = () => {
    onComplete(allExtracted, [...summaries, ...discrepancies]);
  };

  return (
    <div className="flex flex-col items-center py-8 px-4 max-w-2xl mx-auto">
      <LumaAvatar size={72} />
      <h2 className="mt-5 font-serif text-xl font-extrabold text-foreground text-center">
        📁 Document Vault
      </h2>
      <p className="mt-2 text-sm text-muted-foreground text-center max-w-md leading-relaxed">
        Before we start, upload any documents you have. I'll read them and fill in as much of the form as possible automatically — saving you time! ✨
      </p>

      <div className="mt-6 w-full space-y-3">
        {DOCUMENT_SLOTS.map(slot => {
          const status = statuses[slot.id];
          return (
            <div
              key={slot.id}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                status === "done"
                  ? "border-green-500/50 bg-green-50 dark:bg-green-900/10"
                  : status === "uploading"
                  ? "border-primary/40 bg-primary/5"
                  : status === "error"
                  ? "border-destructive/40 bg-destructive/5"
                  : status === "skipped"
                  ? "border-border bg-muted/30 opacity-60"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <span className="text-2xl shrink-0">{status === "done" ? "✅" : slot.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">{slot.label}</div>
                <div className="text-[11px] text-muted-foreground">{slot.description}</div>
              </div>
              <div className="shrink-0 flex gap-1.5">
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
                      className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground transition-all hover:opacity-90"
                    >
                      📸 Upload
                    </button>
                    <button
                      onClick={() => handleSkipSlot(slot.id)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-muted transition-all"
                    >
                      Skip
                    </button>
                  </>
                ) : status === "uploading" ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-primary">
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Reading…
                  </div>
                ) : status === "done" ? (
                  <span className="text-[11px] font-bold text-green-600">Done ✓</span>
                ) : status === "skipped" ? (
                  <span className="text-[11px] text-muted-foreground">Skipped</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Discrepancies */}
      {discrepancies.length > 0 && (
        <div className="mt-5 w-full rounded-xl border border-yellow-500/30 bg-yellow-50 dark:bg-yellow-900/10 p-4">
          <div className="text-sm font-bold text-foreground mb-2">🔍 Luma noticed some differences:</div>
          <ul className="space-y-1">
            {discrepancies.map((d, i) => (
              <li key={i} className="text-xs text-foreground/80">{d}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary of what was found */}
      {summaries.length > 0 && (
        <div className="mt-5 w-full rounded-xl border border-green-500/30 bg-green-50 dark:bg-green-900/10 p-4">
          <div className="text-sm font-bold text-foreground mb-2">📋 What Luma found:</div>
          <ul className="space-y-1">
            {summaries.map((s, i) => (
              <li key={i} className="text-xs text-foreground/80">✅ {s}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleDone}
          className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 shadow-lg"
        >
          {uploadedOrSkippedCount > 0 ? "Continue to form →" : "Start without documents →"}
        </button>
      </div>

      <button
        onClick={onSkipAll}
        className="mt-4 text-xs text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-primary transition-colors"
      >
        Skip all — I'll type everything manually
      </button>

      <p className="mt-6 text-center text-[10px] text-muted-foreground max-w-xs">
        🔒 Documents are processed securely and never stored. They are used only to read your details, then immediately deleted.
      </p>
    </div>
  );
};

export default DocumentVault;
