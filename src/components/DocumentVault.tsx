import { useState, useRef } from "react";
import { getFormDocuments, PRIORITY_LABELS, type DocSlot } from "@/lib/formDocuments";
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

      // ── Derive citizenship/residence answers from passport nationality ──
      if (data.nationality) {
        const nat = data.nationality.toLowerCase();
        if (nat.includes("austral")) {
          // Australian passport → Australian citizen, currently living in Australia
          mapped.australianCitizen = "Yes";
          mapped.currentCountry = "Australia";
        }
      }
      // Country of birth — if passport or OCR provides it
      if (data.placeOfBirth || data.countryOfBirth) {
        const birthPlace = (data.placeOfBirth || data.countryOfBirth || "").toLowerCase();
        mapped.countryOfBirth = data.placeOfBirth || data.countryOfBirth || "";
        if (birthPlace.includes("austral")) {
          mapped.australianCitizenBornHere = "Yes";
        }
      }

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
    case "doctorLetter": {
      if (data.treatingDoctor) mapped.treatingDoctor = data.treatingDoctor;
      if (data.doctorProfession) mapped.doctorProfession = data.doctorProfession;
      if (data.doctorAddress) mapped.doctorAddress = data.doctorAddress;
      if (data.doctorPhone) mapped.doctorPhone = data.doctorPhone;
      if (data.primaryCondition) mapped.primaryCondition = data.primaryCondition;
      if (data.currentTreatment) mapped.currentTreatment = data.currentTreatment;
      break;
    }
    case "partnerLicence": {
      // AI returns standard names (firstName/surname/dateOfBirth) regardless of context — map both prefixed and plain
      const pFirst = data.partnerFirstName || data.firstName;
      const pFamily = data.partnerFamilyName || data.surname || data.lastName;
      const pDobRaw = data.partnerDob || data.dateOfBirth;
      const pGender = data.partnerGender || data.gender;
      const pAddr = data.partnerAddress || data.address;
      if (pFirst) mapped.partnerFirstName = pFirst;
      if (pFamily) mapped.partnerFamilyName = pFamily;
      if (pDobRaw) {
        if (pDobRaw.includes("-")) {
          const [y, m, d] = pDobRaw.split("-");
          if (d && m && y) mapped.partnerDob = `${d}/${m}/${y}`;
        } else { mapped.partnerDob = pDobRaw; }
      }
      if (pAddr) {
        const full = [pAddr, data.suburb, data.state].filter(Boolean).join(", ");
        mapped.partnerAddress = full || pAddr;
        if (data.postcode) mapped.partnerPostcode = data.postcode;
      }
      if (pGender) mapped.partnerGender = pGender;
      break;
    }
    case "partnerPassport": {
      // Same fix — AI returns standard field names, not partner-prefixed ones
      const pFirst = data.partnerFirstName || data.firstName;
      const pFamily = data.partnerFamilyName || data.surname || data.lastName;
      const pDobRaw = data.partnerDob || data.dateOfBirth;
      const pGender = data.partnerGender || data.gender;
      const pCob = data.partnerCountryOfBirth || data.countryOfBirth || data.placeOfBirth;
      if (pFirst) mapped.partnerFirstName = pFirst;
      if (pFamily) mapped.partnerFamilyName = pFamily;
      if (pDobRaw) {
        if (pDobRaw.includes("-")) {
          const [y, m, d] = pDobRaw.split("-");
          if (d && m && y) mapped.partnerDob = `${d}/${m}/${y}`;
        } else { mapped.partnerDob = pDobRaw; }
      }
      if (pGender) mapped.partnerGender = pGender;
      if (pCob) mapped.partnerCountryOfBirth = pCob;
      break;
    }
    case "separationCertificate": {
      if (data.employerName) mapped.employerLastYear = data.employerName;
      if (data.separationDate) mapped.separationDate = data.separationDate;
      break;
    }
    case "taxLetter": {
      if (data.taxFileNumber) mapped.tfnNumber = data.taxFileNumber;
      if (data.crn) mapped.crn = data.crn;
      if (data.address) mapped.permanentAddress = data.address;
      break;
    }
    case "superStatement": {
      if (data.superFundName) mapped.superFundName = data.superFundName;
      if (data.superBalance) mapped.superBalance = data.superBalance;
      break;
    }
    case "visaGrantLetter": {
      if (data.visaClass) mapped.visaType = data.visaClass;
      if (data.visaGrantDate) mapped.visaGrantDate = data.visaGrantDate;
      if (data.visaExpiryDate) mapped.visaExpiryDate = data.visaExpiryDate;
      break;
    }
    case "birthCertificate": {
      if (data.firstName) mapped.firstName = data.firstName;
      if (data.surname) mapped.familyName = data.surname;
      if (data.dateOfBirth) mapped.dob = data.dateOfBirth;
      if (data.countryOfBirth) mapped.countryOfBirth = data.countryOfBirth;
      if (data.placeOfBirth) mapped.placeOfBirth = data.placeOfBirth;
      break;
    }
    case "marriageCertificate": {
      if (data.marriageDate) mapped.relationshipDate = data.marriageDate;
      if (data.relationshipType) mapped.relationshipStatus = data.relationshipType.includes("de facto") ? "De facto" : "Married";
      break;
    }
    case "hospitalDischarge": {
      if (data.primaryCondition) mapped.primaryCondition = data.primaryCondition;
      if (data.diagnoses) mapped.otherConditions = data.diagnoses;
      if (data.treatingDoctor) mapped.treatingDoctor = data.treatingDoctor;
      if (data.hospital) mapped.hospitalDetails = data.hospital;
      if (data.currentTreatment) mapped.currentTreatment = data.currentTreatment;
      break;
    }
    case "medicationList": {
      if (data.medications) mapped.currentTreatment = data.medications;
      if (data.prescribingDoctor) mapped.treatingDoctor = data.prescribingDoctor;
      if (data.doctorPhone) mapped.doctorPhone = data.doctorPhone;
      if (data.practiceAddress) mapped.doctorAddress = data.practiceAddress;
      break;
    }
    case "programOfSupportCert": {
      if (data.providerName) mapped.programProvider = data.providerName;
      if (data.endDate) mapped.programEndDate = data.endDate;
      // Mark Q139 as Yes automatically
      mapped.programOfSupport = "Yes";
      break;
    }
    case "workersCompLetter": {
      if (data.weeklyAmount) mapped.compensationAmount = data.weeklyAmount;
      if (data.condition) mapped.primaryCondition = mapped.primaryCondition || data.condition;
      mapped.gettingWorkersComp = "Yes";
      break;
    }
    case "careRecipientId": {
      if (data.careRecipientFirstName) mapped.careRecipientFirstName = data.careRecipientFirstName;
      if (data.careRecipientFamilyName) mapped.careRecipientFamilyName = data.careRecipientFamilyName;
      if (data.careRecipientDob) mapped.careRecipientDob = data.careRecipientDob;
      break;
    }
    case "careRecipientMedical": {
      if (data.careRecipientCondition) mapped.careRecipientCondition = data.careRecipientCondition;
      if (data.careRecipientDoctor) mapped.careRecipientDoctor = data.careRecipientDoctor;
      break;
    }
    case "ndisLetter": {
      if (data.ndisNumber) mapped.ndisNumber = data.ndisNumber;
      if (data.disabilityType) mapped.primaryCondition = mapped.primaryCondition || data.disabilityType;
      break;
    }
    case "investmentStatement": {
      if (data.totalValue) mapped.sharesValue = data.totalValue;
      if (data.fundName) mapped.investmentFundName = data.fundName;
      if (data.totalValue) mapped.hasShares = "Yes";
      break;
    }
    case "ratesNotice": {
      if (data.propertyAddress) mapped.propertyAddress = data.propertyAddress;
      if (data.ownerName) mapped.propertyOwnerName = data.ownerName;
      mapped.ownHomeNotLiving = "Yes";
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
      toast.error(`Could not read ${slot.label}. Please try a clearer photo or skip.`);
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

  return (
    <div className="flex flex-col w-full">

      {/* ── HERO BANNER ── */}
      <div className="px-6 pt-6 pb-4 text-center border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <LumaAvatar size={56} />
        <h2 className="mt-3 font-serif text-lg font-extrabold text-foreground">
          📁 Document Vault
        </h2>
        <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-0.5">
          <span className="text-[11px] font-bold text-primary">{formConfig.formCode}</span>
          <span className="text-[11px] text-muted-foreground">— {formConfig.formName}</span>
        </div>

        {/* KEY MESSAGE */}
        <div className="mt-3 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3">
          <p className="text-sm font-extrabold text-primary">📸 Upload more → Answer less</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
            Every document you scan automatically fills in the matching questions —
            so you don't have to type them. The more you upload <span className="font-bold text-foreground">now</span>,
            the fewer questions Luma will ask you.
          </p>
        </div>

        {/* Live counter */}
        {autoFilledCount > 0 && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-green-500 px-4 py-1.5">
            <span className="text-white text-xs font-extrabold">
              🎉 {autoFilledCount} fields auto-filled from {doneCount} document{doneCount !== 1 ? "s" : ""}!
            </span>
          </div>
        )}

        {/* Legend */}
        <div className="mt-2 flex justify-center gap-4 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>Required</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Recommended</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block"/>Optional</span>
        </div>
      </div>

      {/* ── DOCUMENT LIST (scrollable) ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" style={{ maxHeight: "55vh" }}>

        {/* Required */}
        {required.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
              <span className="text-[11px] font-extrabold text-red-600 uppercase tracking-wide">
                Required — {required.filter(s => statuses[s.id] === "done").length}/{required.length} done
              </span>
            </div>
            <div className="space-y-1.5">
              {required.map(renderSlot)}
            </div>
          </div>
        )}

        {/* Recommended */}
        {recommended.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span className="text-[11px] font-extrabold text-amber-600 uppercase tracking-wide">
                Recommended — saves the most questions
              </span>
            </div>
            <div className="space-y-1.5">
              {recommended.map(renderSlot)}
            </div>
          </div>
        )}

        {/* Optional */}
        {optional.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
              <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wide">
                Optional — upload if you have them
              </span>
            </div>
            <div className="space-y-1.5">
              {optional.map(renderSlot)}
            </div>
          </div>
        )}

        {/* Discrepancies */}
        {discrepancies.length > 0 && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-50 dark:bg-yellow-900/10 p-3">
            <div className="text-xs font-bold text-foreground mb-1">🔍 Luma noticed some differences:</div>
            {discrepancies.map((d, i) => (
              <p key={i} className="text-[11px] text-foreground/80">{d}</p>
            ))}
          </div>
        )}

        {/* What Luma found */}
        {summaries.length > 0 && (
          <div className="rounded-xl border border-green-500/30 bg-green-50 dark:bg-green-900/10 p-3">
            <div className="text-xs font-bold text-foreground mb-1">📋 Auto-filled from your documents:</div>
            {summaries.map((s, i) => (
              <p key={i} className="text-[11px] text-foreground/80">✅ {s}</p>
            ))}
          </div>
        )}
      </div>

      {/* ── STICKY FOOTER ── */}
      <div className="border-t border-border px-4 py-3 bg-background">
        <button
          onClick={handleDone}
          className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 shadow-lg"
        >
          {doneCount > 0
            ? `Continue with ${doneCount} document${doneCount !== 1 ? "s" : ""} → (${autoFilledCount} fields pre-filled)`
            : "Start without documents →"}
        </button>
        <button
          onClick={onSkipAll}
          className="mt-2 w-full text-center text-[11px] text-muted-foreground hover:text-primary transition-colors"
        >
          Skip all — I'll type everything manually
        </button>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          🔒 Scanned securely, never stored. Deleted immediately after reading.
        </p>
      </div>

    </div>
  );
};

export default DocumentVault;
