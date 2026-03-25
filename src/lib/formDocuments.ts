/**
 * Form-specific document requirements for each NCCSA form.
 * 
 * Each document slot defines:
 * - What it is
 * - What fields it fills
 * - Whether it's required/recommended/optional for that form
 * - What the AI should extract
 */

export type DocPriority = "required" | "recommended" | "optional";

export interface DocSlot {
  id: string;
  label: string;
  description: string;
  icon: string;
  documentType: string;  // matches extract-document edge function type
  accept: string;
  priority: DocPriority;
  fills: string;         // human-readable list of fields it fills
}

export interface FormDocConfig {
  formName: string;
  formCode: string;
  intro: string;
  slots: DocSlot[];
}

// ─── Shared document definitions ───────────────────────────────────
const SHARED: Record<string, DocSlot> = {
  licenceFront: {
    id: "licenceFront", label: "Driver's Licence — Front", icon: "🪪",
    description: "Fills: name, date of birth, address, postcode, gender",
    fills: "name, DOB, address, postcode, gender",
    documentType: "licenceFront", accept: "image/*", priority: "required",
  },
  licenceBack: {
    id: "licenceBack", label: "Driver's Licence — Back", icon: "🔄",
    description: "Fills: licence class and conditions",
    fills: "licence class", documentType: "licenceBack", accept: "image/*", priority: "optional",
  },
  passport: {
    id: "passport", label: "Passport — Photo Page", icon: "🛂",
    description: "Fills: name, date of birth, nationality, country of birth",
    fills: "name, DOB, nationality, country of birth",
    documentType: "passport", accept: "image/*", priority: "recommended",
  },
  medicareCard: {
    id: "medicareCard", label: "Medicare Card", icon: "💚",
    description: "Fills: Medicare number",
    fills: "Medicare number", documentType: "medicareCard", accept: "image/*", priority: "required",
  },
  centrelinkCard: {
    id: "centrelinkCard", label: "Centrelink Card or Letter with CRN", icon: "🏛️",
    description: "Fills: Customer Reference Number (CRN)",
    fills: "CRN", documentType: "centrelinkCard", accept: "image/*", priority: "recommended",
  },
  bankStatement: {
    id: "bankStatement", label: "Bank Statement", icon: "🏦",
    description: "Fills: bank name, BSB, account number, account name",
    fills: "bank name, BSB, account number, account name",
    documentType: "bankStatement", accept: "image/*,.pdf", priority: "required",
  },
  taxLetter: {
    id: "taxLetter", label: "ATO Tax Letter / myGov Letter", icon: "🔢",
    description: "Fills: Tax File Number (TFN), CRN",
    fills: "Tax File Number, CRN", documentType: "taxLetter", accept: "image/*,.pdf", priority: "recommended",
  },
  medicalReport: {
    id: "medicalReport", label: "Medical Report or Specialist Letter", icon: "🏥",
    description: "Fills: condition, diagnosis, doctor details, treatment",
    fills: "condition, diagnosis, doctor name/address/phone, treatment",
    documentType: "medicalReport", accept: "image/*,.pdf", priority: "required",
  },
  doctorLetter: {
    id: "doctorLetter", label: "Doctor or GP Letter", icon: "👨‍⚕️",
    description: "Fills: doctor name, clinic address, phone, profession",
    fills: "treating doctor, clinic address, phone number, profession",
    documentType: "doctorLetter", accept: "image/*,.pdf", priority: "required",
  },
  specialistReport: {
    id: "specialistReport", label: "Specialist / IME Report", icon: "🩺",
    description: "Fills: second doctor details, diagnosis, prognosis, treatment plan",
    fills: "specialist name, diagnosis, prognosis, detailed treatment",
    documentType: "medicalReport", accept: "image/*,.pdf", priority: "recommended",
  },
  leaseAgreement: {
    id: "leaseAgreement", label: "Lease or Rental Agreement", icon: "🏠",
    description: "Fills: rental address, rent amount",
    fills: "rental address, rent amount, landlord details",
    documentType: "leaseAgreement", accept: "image/*,.pdf", priority: "optional",
  },
  partnerLicence: {
    id: "partnerLicence", label: "Partner's Driver's Licence", icon: "👫",
    description: "Fills: partner name, DOB, address, gender",
    fills: "partner name, DOB, address, gender",
    documentType: "partnerLicence", accept: "image/*", priority: "optional",
  },
  partnerPassport: {
    id: "partnerPassport", label: "Partner's Passport", icon: "🛂",
    description: "Fills: partner name, DOB, country of birth",
    fills: "partner name, DOB, nationality", documentType: "partnerPassport", accept: "image/*", priority: "optional",
  },
  separationCert: {
    id: "separationCertificate", label: "Employment Separation Certificate (SU001)", icon: "📋",
    description: "Fills: employer name, separation date, last pay details",
    fills: "employer name, separation date, ABN",
    documentType: "separationCertificate", accept: "image/*,.pdf", priority: "recommended",
  },
  superStatement: {
    id: "superStatement", label: "Superannuation Statement", icon: "💰",
    description: "Fills: super fund name, account number, balance",
    fills: "super fund name, account number, balance",
    documentType: "superStatement", accept: "image/*,.pdf", priority: "recommended",
  },
  payslips: {
    id: "payslips", label: "Recent Payslips (last 3)", icon: "💵",
    description: "Fills: employer name, income, hours worked",
    fills: "employer name, weekly income, hours worked",
    documentType: "payslips", accept: "image/*,.pdf", priority: "recommended",
  },
  visaGrantLetter: {
    id: "visaGrantLetter", label: "Visa Grant Letter", icon: "🌏",
    description: "Fills: visa class, visa grant date, visa expiry",
    fills: "visa class, grant date, expiry date",
    documentType: "visaGrantLetter", accept: "image/*,.pdf", priority: "recommended",
  },
  birthCertificate: {
    id: "birthCertificate", label: "Birth Certificate", icon: "📜",
    description: "Fills: full name, date of birth, country of birth, parents' names",
    fills: "full name, DOB, country of birth",
    documentType: "birthCertificate", accept: "image/*,.pdf", priority: "optional",
  },
  marriageCertificate: {
    id: "marriageCertificate", label: "Marriage / Relationship Certificate", icon: "💍",
    description: "Fills: partner name, relationship date, relationship type",
    fills: "partner name, marriage/relationship date",
    documentType: "marriageCertificate", accept: "image/*,.pdf", priority: "optional",
  },
  hospitalDischarge: {
    id: "hospitalDischarge", label: "Hospital Discharge Summary", icon: "🏨",
    description: "Fills: diagnosis, treatment, hospital doctor, dates",
    fills: "condition, treatment history, doctor details, hospital dates",
    documentType: "hospitalDischarge", accept: "image/*,.pdf", priority: "recommended",
  },
  medicationList: {
    id: "medicationList", label: "Medication List or Prescription", icon: "💊",
    description: "Fills: current medications and prescribing doctor",
    fills: "current treatment medications, prescribing doctor name",
    documentType: "medicationList", accept: "image/*,.pdf", priority: "recommended",
  },
  programOfSupportCert: {
    id: "programOfSupportCert", label: "Program of Support Certificate", icon: "📑",
    description: "Confirms participation in Workforce Australia or job program (Q139)",
    fills: "program of support provider, dates",
    documentType: "programOfSupportCert", accept: "image/*,.pdf", priority: "required",
  },
  workersCompLetter: {
    id: "workersCompLetter", label: "Workers Compensation Letter", icon: "⚖️",
    description: "Fills: compensation amount, insurer, claim reference",
    fills: "compensation details, insurer name, claim reference",
    documentType: "workersCompLetter", accept: "image/*,.pdf", priority: "optional",
  },
  careRecipientId: {
    id: "careRecipientId", label: "Care Recipient's ID (licence or passport)", icon: "🪪",
    description: "Fills: the name, DOB and address of the person you care for",
    fills: "care recipient name, DOB, address",
    documentType: "careRecipientId", accept: "image/*", priority: "required",
  },
  careRecipientMedical: {
    id: "careRecipientMedical", label: "Care Recipient's Medical Report", icon: "🏥",
    description: "Fills: the condition and medical details of the person you care for",
    fills: "care recipient diagnosis, treatment, doctor details",
    documentType: "careRecipientMedical", accept: "image/*,.pdf", priority: "required",
  },
  ndisLetter: {
    id: "ndisLetter", label: "NDIS Letter or Plan", icon: "♿",
    description: "Fills: NDIS number, disability type, support needs",
    fills: "NDIS number, disability category, support needs",
    documentType: "ndisLetter", accept: "image/*,.pdf", priority: "optional",
  },
  dvaCertificate: {
    id: "dvaCertificate", label: "DVA Card or Letter", icon: "🎖️",
    description: "Fills: DVA number, entitlement type",
    fills: "DVA number, payment type",
    documentType: "centrelinkCard", accept: "image/*", priority: "optional",
  },
  investmentStatement: {
    id: "investmentStatement", label: "Investment / Shares Statement", icon: "📈",
    description: "Fills: shares/managed fund value for assets test",
    fills: "shares value, fund name",
    documentType: "investmentStatement", accept: "image/*,.pdf", priority: "optional",
  },
  ratesNotice: {
    id: "ratesNotice", label: "Council Rates Notice", icon: "🏡",
    description: "Fills: property address, owner name (if you own property)",
    fills: "property address, owner name, property value",
    documentType: "ratesNotice", accept: "image/*,.pdf", priority: "optional",
  },

  // ── NEW: missing from deep audit ──────────────────────────────────
  citizenshipCert: {
    id: "citizenshipCert", label: "Australian Citizenship Certificate", icon: "🇦🇺",
    description: "Fills: citizenship date, country of birth, citizenship number",
    fills: "date citizenship granted, country of birth, citizenship number",
    documentType: "citizenshipCert", accept: "image/*,.pdf", priority: "recommended",
  },
  immiCard: {
    id: "immiCard", label: "ImmiCard (evidence of immigration status)", icon: "🪪",
    description: "Fills: visa subclass, grant date — alternative to visa grant letter",
    fills: "visa class, grant date, expiry date",
    documentType: "visaGrantLetter", accept: "image/*", priority: "optional",
  },
  partnerVisaLetter: {
    id: "partnerVisaLetter", label: "Partner's Visa Grant Letter or ImmiCard", icon: "🌏",
    description: "If your partner is not an Australian citizen — fills partner visa class and grant date",
    fills: "partner visa class, partner visa grant date",
    documentType: "partnerVisaLetter", accept: "image/*,.pdf", priority: "optional",
  },
  incomeProtectionLetter: {
    id: "incomeProtectionLetter", label: "Income Protection Insurance Letter", icon: "📃",
    description: "If you receive income protection — fills insurer, amount, policy reference",
    fills: "income protection amount, insurer name, policy reference",
    documentType: "incomeProtectionLetter", accept: "image/*,.pdf", priority: "optional",
  },
  assuranceOfSupportLetter: {
    id: "assuranceOfSupportLetter", label: "Assurance of Support Letter", icon: "📨",
    description: "If someone sponsored your migration — fills sponsor name, assurance reference",
    fills: "assurance of support sponsor, reference number",
    documentType: "taxLetter", accept: "image/*,.pdf", priority: "optional",
  },
  redundancyLetter: {
    id: "redundancyLetter", label: "Redundancy or Termination Letter", icon: "📄",
    description: "Fills: redundancy payment amount, date terminated, employer name",
    fills: "redundancy amount, termination date, employer name",
    documentType: "separationCertificate", accept: "image/*,.pdf", priority: "optional",
  },
  vehicleRegistration: {
    id: "vehicleRegistration", label: "Vehicle Registration Papers", icon: "🚗",
    description: "Fills: vehicle make/model, registration number, market value",
    fills: "vehicle details, registration number",
    documentType: "ratesNotice", accept: "image/*,.pdf", priority: "optional",
  },
};

// ─── Form-specific document configurations ──────────────────────────

export const FORM_DOCUMENTS: Record<string, FormDocConfig> = {

  // DSP — Disability Support Pension (SA466)
  "disability-support-pension": {
    formName: "Disability Support Pension",
    formCode: "SA466",
    intro: "Upload these documents and I'll fill in as much of the form as possible automatically. The more you upload, the fewer questions you'll need to answer.",
    slots: [
      // ── REQUIRED ────────────────────────────────────────────────────
      // Identity Q2/Q3/Q5/Q6 — name, DOB, address, gender
      { ...SHARED.licenceFront, priority: "required",
        description: "Fills: your name, date of birth, address, postcode, gender" },
      // Bank Q34 — BSB, account number, account name
      { ...SHARED.bankStatement, priority: "required",
        description: "Fills: bank name, BSB, account number, account name" },
      // Medical Q131–Q135 — GP is the #1 document for DSP approval
      { ...SHARED.doctorLetter, priority: "required",
        description: "Fills: doctor name, clinic address, phone, profession — the most important document for DSP" },
      { ...SHARED.medicalReport, priority: "required",
        description: "Fills: your diagnosis, condition details, treatment — GP report or specialist letter" },
      // Program of Support Q139 — mandatory for most DSP claims
      { ...SHARED.programOfSupportCert, priority: "required",
        description: "REQUIRED for most DSP claims — certificate from Workforce Australia or job program" },

      // ── RECOMMENDED ─────────────────────────────────────────────────
      // Passport — fills nationality, country of birth, overseas travel Q44/Q45/Q46/Q47
      { ...SHARED.passport, priority: "recommended",
        description: "Fills: name, DOB, nationality, country of birth — especially important if not born in Australia" },
      // Centrelink/Tax — CRN Q1, TFN Q120
      { ...SHARED.centrelinkCard, priority: "recommended",
        description: "Fills: Customer Reference Number (CRN)" },
      { ...SHARED.taxLetter, priority: "recommended",
        description: "Fills: Tax File Number (TFN), CRN" },
      // Citizenship cert — fills Q45/Q46 (Australian citizen date granted)
      { ...SHARED.citizenshipCert, priority: "recommended",
        description: "If naturalised Australian — fills citizenship date, country of birth" },
      // Visa grant letter — fills Q48/Q49 visa subclass and grant date
      { ...SHARED.visaGrantLetter, priority: "recommended",
        description: "If not Australian citizen — fills visa class, grant date, expiry (Q48/Q49)" },
      // Medical supporting docs
      { ...SHARED.hospitalDischarge, priority: "recommended",
        description: "Fills: condition, hospitalisation history, specialist details" },
      { ...SHARED.specialistReport, priority: "recommended",
        description: "Fills: second specialist details, diagnosis, prognosis" },
      { ...SHARED.medicationList, priority: "recommended",
        description: "Fills: current medications — shows your condition is being treated" },
      // Work Q116–Q118 — employer, separation, income
      { ...SHARED.separationCert, priority: "recommended",
        description: "If you recently stopped working — fills employer name, separation date, last pay" },
      { ...SHARED.payslips, priority: "recommended",
        description: "Last 3 payslips — fills employer name, income, hours worked" },
      // Partner — Q54–Q80 partner details
      { ...SHARED.partnerLicence, priority: "recommended",
        description: "If you have a partner — fills partner name, DOB, address, gender (Q57/Q58/Q63)" },
      { ...SHARED.partnerPassport, priority: "recommended",
        description: "Partner's passport — fills partner DOB, nationality, overseas passport Q68/Q69/Q70" },
      // Super/Assets Q83–Q107
      { ...SHARED.superStatement, priority: "recommended",
        description: "Fills: super fund name and balance for assets test" },

      // ── OPTIONAL ────────────────────────────────────────────────────
      // Partner relationship & visa
      { ...SHARED.marriageCertificate,
        description: "If married or registered — fills relationship type and date (Q55)" },
      { ...SHARED.partnerVisaLetter,
        description: "If your partner is not an Australian citizen — fills partner visa class/grant date (Q74/Q75)" },
      // Assets
      { ...SHARED.investmentStatement,
        description: "Fills: shares, managed fund value for assets test (Q96)" },
      { ...SHARED.ratesNotice,
        description: "If you own property not lived in — fills property address and ownership (Q83/Q84)" },
      { ...SHARED.vehicleRegistration,
        description: "Fills: vehicle make/model, value for assets test (Q93)" },
      // Compensation & income
      { ...SHARED.workersCompLetter,
        description: "If receiving workers compensation — fills compensation details (Q30)" },
      { ...SHARED.incomeProtectionLetter,
        description: "If receiving income protection — fills insurer and amount (Q32)" },
      { ...SHARED.redundancyLetter,
        description: "If you received redundancy pay — fills amount and termination date (Q118)" },
      // Accommodation
      { ...SHARED.leaseAgreement,
        description: "If renting — fills rental address and weekly rent amount (Q115)" },
      // Immigration extras
      { ...SHARED.immiCard,
        description: "ImmiCard — alternative to visa grant letter for non-citizens" },
      { ...SHARED.assuranceOfSupportLetter,
        description: "If someone sponsored your migration — fills assurance of support details (Q51)" },
    ],
  },

  // Medicare Enrolment (MS004)
  "medicare-enrolment": {
    formName: "Medicare Enrolment",
    formCode: "MS004",
    intro: "Upload these documents to enrol in Medicare. Your identity and residency documents are the most important.",
    slots: [
      { ...SHARED.passport, priority: "required",
        description: "Primary ID for Medicare — fills name, DOB, nationality" },
      { ...SHARED.licenceFront, priority: "recommended" },
      { ...SHARED.birthCertificate,
        description: "Alternative to passport for Australian-born applicants" },
      { ...SHARED.visaGrantLetter, priority: "required",
        description: "REQUIRED for migrants — fills visa class and eligibility for Medicare" },
      { ...SHARED.leaseAgreement,
        description: "Fills your Australian residential address" },
      { ...SHARED.medicareCard,
        description: "If updating Medicare — current Medicare number" },
    ],
  },

  // NDIS Access Request (NA3518)
  "ndis-access-request": {
    formName: "NDIS Access Request",
    formCode: "NA3518",
    intro: "Upload evidence of your disability and identity. The more medical evidence you provide, the faster your NDIS access will be assessed.",
    slots: [
      { ...SHARED.licenceFront, priority: "required" },
      { ...SHARED.passport, priority: "recommended" },
      { ...SHARED.medicareCard, priority: "required" },
      { ...SHARED.medicalReport, priority: "required",
        description: "REQUIRED — fills diagnosis, functional impact, and disability details" },
      { ...SHARED.doctorLetter, priority: "required",
        description: "REQUIRED — GP letter confirming disability and impact on daily life" },
      { ...SHARED.specialistReport, priority: "required",
        description: "REQUIRED — specialist confirming permanent and significant disability" },
      { ...SHARED.hospitalDischarge,
        description: "Fills: hospitalisation history and medical evidence" },
      { ...SHARED.ndisLetter,
        description: "If you already have a plan — fills NDIS number and existing supports" },
    ],
  },

  // Aged Care Assessment (ACAT)
  "aged-care-assessment": {
    formName: "Aged Care Assessment",
    formCode: "ACAT",
    intro: "Upload these documents for your aged care assessment. Your medical history and current health status are most important.",
    slots: [
      { ...SHARED.licenceFront, priority: "required" },
      { ...SHARED.medicareCard, priority: "required" },
      { ...SHARED.centrelinkCard },
      { ...SHARED.doctorLetter, priority: "required",
        description: "GP summary — fills current conditions, medications, care needs" },
      { ...SHARED.medicalReport, priority: "required",
        description: "Fills: diagnoses, medical history, functional capacity" },
      { ...SHARED.hospitalDischarge,
        description: "Recent hospital stay — fills conditions and treatment history" },
      { ...SHARED.medicationList, priority: "required",
        description: "Current medication list — critical for aged care assessment" },
      { ...SHARED.bankStatement,
        description: "For aged care fees assessment — fills bank details" },
      { ...SHARED.superStatement,
        description: "Fills: assets for aged care means test" },
      { ...SHARED.ratesNotice,
        description: "If you own property — fills property details for means test" },
    ],
  },

  // Carer Payment (SA395 + SA410)
  "carer-payment": {
    formName: "Carer Payment",
    formCode: "SA395",
    intro: "Upload your documents AND documents for the person you care for. Both sets are needed.",
    slots: [
      // Your identity
      { ...SHARED.licenceFront, priority: "required",
        description: "YOUR licence — fills your name, DOB, address" },
      { ...SHARED.centrelinkCard },
      { ...SHARED.bankStatement, priority: "required" },
      { ...SHARED.taxLetter },
      
      // Care recipient's documents
      { ...SHARED.careRecipientId, priority: "required",
        description: "The person you care for — their licence or passport" },
      { ...SHARED.careRecipientMedical, priority: "required",
        description: "REQUIRED — medical evidence of the person you care for, confirming their condition" },
      { ...SHARED.doctorLetter, priority: "required",
        description: "Doctor's letter about the person you care for — fills their diagnosis and care needs" },
      { ...SHARED.hospitalDischarge,
        description: "Care recipient's hospital discharge — fills condition history" },
    ],
  },

  // Age Pension (SA002)
  "age-pension": {
    formName: "Age Pension",
    formCode: "SA002",
    intro: "The Age Pension has a detailed assets and income test. Upload these documents to auto-fill everything needed.",
    slots: [
      { ...SHARED.licenceFront, priority: "required" },
      { ...SHARED.passport },
      { ...SHARED.medicareCard, priority: "required" },
      { ...SHARED.centrelinkCard },
      { ...SHARED.bankStatement, priority: "required",
        description: "REQUIRED — fills bank details for payment and assets test" },
      { ...SHARED.taxLetter, priority: "required",
        description: "REQUIRED — fills TFN and CRN" },
      { ...SHARED.superStatement, priority: "required",
        description: "REQUIRED — super is counted in assets test" },
      { ...SHARED.investmentStatement, priority: "recommended",
        description: "Shares, managed funds — fills investment assets" },
      { ...SHARED.ratesNotice, priority: "recommended",
        description: "If you own property — fills property address and ownership for assets test" },
      { ...SHARED.partnerLicence,
        description: "If you have a partner — fills all partner fields automatically" },
      { ...SHARED.marriageCertificate,
        description: "Fills relationship type and date" },
      { ...SHARED.dvaCertificate,
        description: "If receiving DVA payments — fills DVA number and entitlement" },
    ],
  },
};

// Default (DSP) if no form-specific config found
export function getFormDocuments(slug: string): FormDocConfig {
  return FORM_DOCUMENTS[slug] || FORM_DOCUMENTS["disability-support-pension"];
}

// Priority labels for display
export const PRIORITY_LABELS: Record<DocPriority, { label: string; color: string }> = {
  required:    { label: "Required",    color: "text-red-600 bg-red-50 border-red-200" },
  recommended: { label: "Recommended", color: "text-amber-600 bg-amber-50 border-amber-200" },
  optional:    { label: "Optional",    color: "text-gray-500 bg-gray-50 border-gray-200" },
};
