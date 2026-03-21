/**
 * SA466 PDF Pre-fill Engine
 * 
 * Fills the SA466 PDF using named AcroForm fields (field names from the PDF itself).
 * This is the correct approach — same as DocuSign/Adobe Acrobat.
 * No coordinate guessing needed.
 */
import { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup } from "@cantoo/pdf-lib";
import { SA466_FIELDS } from "./formMaps/sa466Fields";

export type SA466FormData = Record<string, string>;

// Cache the template bytes — fetch once, reuse forever
let _templateCache: ArrayBuffer | null = null;

const PDF_PATHS = [
  "/forms/DSP/sa466en.pdf",
  "/forms/CUsersfvottDesktopGovernment Forms/Disability Support Pension/sa466en.pdf",
];

async function getTemplate(): Promise<ArrayBuffer> {
  if (_templateCache) return _templateCache;
  for (const url of PDF_PATHS) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        _templateCache = await res.arrayBuffer();
        console.log(`SA466 template cached (${Math.round(_templateCache.byteLength / 1024)}KB)`);
        return _templateCache;
      }
    } catch (e) {
      console.warn("SA466 fetch error:", url, e);
    }
  }
  throw new Error("Could not load SA466 PDF template.");
}

// Values that mean "skip this field"
const SKIP = new Set([
  "none", "skip", "n/a", "na", "no answer", "not applicable",
  "-", "--", ".", "..", "...", "nil", "null", "undefined", "n",
]);

function shouldSkip(value: string, fieldType: string): boolean {
  if (!value || value.trim() === "") return true;
  const v = value.trim().toLowerCase();
  if (SKIP.has(v)) return true;
  if (fieldType === "text" && v === "no") return true;
  return false;
}

function parseDMY(value: string): { d: string; m: string; y: string } | null {
  const match = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!match) return null;
  return {
    d: match[1].padStart(2, "0"),
    m: match[2].padStart(2, "0"),
    y: match[3].length === 2 ? `19${match[3]}` : match[3],
  };
}

/**
 * Set a named text field in the PDF form.
 * Silently skips if field doesn't exist.
 */
function setTextField(form: any, fieldName: string, value: string) {
  try {
    const field = form.getTextField(fieldName);
    field.setText(value);
    field.enableReadOnly();
  } catch {
    // Field doesn't exist or wrong type — ignore
  }
}

/**
 * Set a named checkbox/radio button.
 */
function setCheckbox(form: any, fieldName: string, value: string) {
  try {
    // Try as radio group first
    try {
      const radio = form.getRadioGroup(fieldName);
      radio.select(value);
      return;
    } catch {}
    // Try as checkbox
    try {
      const cb = form.getCheckBox(fieldName);
      cb.check();
      return;
    } catch {}
  } catch {}
}

export async function prefillSA466(data: SA466FormData, signatureDataUrl?: string | null): Promise<Uint8Array> {
  const templateBytes = await getTemplate();
  const pdfDoc = await PDFDocument.load(templateBytes.slice(0), { ignoreEncryption: true, password: "" });
  const form = pdfDoc.getForm();

  // ── Personal Details (Step 1) ──
  if (data.familyName) setTextField(form, "Q2.FamilyName", data.familyName);
  if (data.firstName)  setTextField(form, "Q2.FirstName", data.firstName);
  if (data.secondName && !shouldSkip(data.secondName, "text")) setTextField(form, "Q2.SecondName", data.secondName);

  // Title (radio group)
  if (data.title) {
    const titleMap: Record<string, string> = { Mr: "Mr", Mrs: "Mrs", Miss: "Miss", Ms: "Ms", Dr: "Other" };
    const mapped = titleMap[data.title];
    if (mapped) setCheckbox(form, "Title1", mapped);
    if (data.title === "Dr") setTextField(form, "TitleOther1", "Dr");
  }

  // DOB
  if (data.dob) {
    const parts = parseDMY(data.dob);
    if (parts) {
      setTextField(form, "Q3.DateOfBirth.D", parts.d);
      setTextField(form, "Q3.DateOfBirth.M", parts.m);
      setTextField(form, "Q3.DateOfBirth.Y", parts.y);
    }
  }

  // Gender (radio)
  if (data.gender) {
    const gMap: Record<string, string> = { Male: "Male", Female: "Female", Other: "NB" };
    if (gMap[data.gender]) setCheckbox(form, "Q5", gMap[data.gender]);
  }

  // CRN
  if (data.crn) {
    const crn = data.crn.replace(/\D/g, "");
    ["0","1","2","3"].forEach((i, idx) => {
      if (crn[idx]) setTextField(form, `CRN.${i}`, crn[idx]);
    });
  }

  // Address
  if (data.permanentAddress) {
    const parts = data.permanentAddress.split(",").map(s => s.trim());
    setTextField(form, "Q6.Address1", parts[0] || "");
    if (parts[1]) setTextField(form, "Q6.Address2", parts.slice(1, -1).join(", ") || "");
  }
  if (data.postcode) setTextField(form, "Q6.Postcode", data.postcode);

  // Postal address (only if different)
  if (data.postalAddressSame?.toLowerCase() !== "yes" && data.postalAddress && !shouldSkip(data.postalAddress, "text")) {
    const parts = data.postalAddress.split(",").map(s => s.trim());
    setTextField(form, "Q7.Address1", parts[0] || "");
    if (parts[1]) setTextField(form, "Q7.Address2", parts.slice(1).join(", ") || "");
    if (data.postalPostcode) setTextField(form, "Q7.Postcode", data.postalPostcode);
  }

  // Contact
  if (data.mobile && !shouldSkip(data.mobile, "text"))    setTextField(form, "Q8.MobileNo", data.mobile);
  if (data.homePhone && !shouldSkip(data.homePhone, "text")) setTextField(form, "Q8.PhoneNo", data.homePhone);
  if (data.email && !shouldSkip(data.email, "text"))      setTextField(form, "Q8.Email", data.email);

  // Bank details
  if (data.bankName)       setTextField(form, "BankName", data.bankName);
  if (data.bsb)            setTextField(form, "BSB", data.bsb);
  if (data.accountNumber)  setTextField(form, "ACCNo", data.accountNumber);
  if (data.accountName)    setTextField(form, "AccNames", data.accountName);

  // Partner
  if (data.partnerName) {
    const parts = data.partnerName.trim().split(" ");
    setTextField(form, "Partner_FirstName", parts[0] || "");
    if (parts.length > 1) setTextField(form, "Partner_FamilyName", parts.slice(1).join(" "));
  }
  if (data.partnerFamilyName) setTextField(form, "Partner_FamilyName", data.partnerFamilyName);
  if (data.partnerFirstName)  setTextField(form, "Partner_FirstName", data.partnerFirstName);
  if (data.partnerDob) {
    const parts = parseDMY(data.partnerDob);
    if (parts) {
      setTextField(form, "Q58.D", parts.d);
      setTextField(form, "Q58.M", parts.m);
      setTextField(form, "Q58.Y", parts.y);
    }
  }

  // Medical condition (free text)
  if (data.primaryCondition && !shouldSkip(data.primaryCondition, "text")) {
    setTextField(form, "Q131", data.primaryCondition);
  }

  // Treating doctors (3 slots)
  if (data.treatingDoctor)   setTextField(form, "Q140.D0.FullName", data.treatingDoctor);
  if (data.doctorProfession) setTextField(form, "Q140.D0.Profession", data.doctorProfession);
  if (data.doctorAddress)    setTextField(form, "Q140.D0.Address1", data.doctorAddress);
  if (data.doctorPhone)      setTextField(form, "Q140.D0.PhoneNo", data.doctorPhone);

  if (data.doctor2Name && !shouldSkip(data.doctor2Name, "text")) {
    setTextField(form, "Q140.D1.FullName", data.doctor2Name);
    if (data.doctor2Profession) setTextField(form, "Q140.D1.Profession", data.doctor2Profession);
    if (data.doctor2Address)    setTextField(form, "Q140.D1.Address1", data.doctor2Address);
    if (data.doctor2Phone)      setTextField(form, "Q140.D1.PhoneNo", data.doctor2Phone);
  }

  if (data.doctor3Name && !shouldSkip(data.doctor3Name, "text")) {
    setTextField(form, "Q140.D2.FullName", data.doctor3Name);
    if (data.doctor3Profession) setTextField(form, "Q140.D2.Profession", data.doctor3Profession);
    if (data.doctor3Address)    setTextField(form, "Q140.D2.Address1", data.doctor3Address);
    if (data.doctor3Phone)      setTextField(form, "Q140.D2.PhoneNo", data.doctor3Phone);
  }

  // Yes/No radio buttons — map Luma answers to PDF field names
  const yesNoFields: Record<string, string> = {
    australianCitizen:       "Q47",
    permanentResident:       "Q48",
    travelledOverseas:       "Q53",
    receivingPayment:        "Q35",
    interpreterNeeded:       "Q13",
    currentlyWorking:        "Q18",
    lookingForWork:          "Q22",
    hospitalised:            "Q83",
    conditionPermanent:      "Q133",
    hasPartner:              "Q54",
    partnerWorking:          "Q59",
    partnerReceivingPayment: "Q62",
    hasShares:               "Q96",
    hasSuperannuation:       "Q99",
    hasVehicle:              "Q102",
    receivingCompensation:   "Q85",
    ownHome:                 "Q86",
  };

  for (const [lumaId, pdfField] of Object.entries(yesNoFields)) {
    const val = data[lumaId];
    if (val === "Yes" || val === "No") {
      setCheckbox(form, pdfField, val);
    }
  }

  // Work capacity
  if (data.workCapacity) setCheckbox(form, "Q30", data.workCapacity === "Yes" ? "Yes" : "No");

  // Signature
  if (signatureDataUrl) {
    try {
      const base64 = signatureDataUrl.split(",")[1];
      const sigBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const sigImage = await pdfDoc.embedPng(sigBytes);
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      if (lastPage) {
        const { width: pw } = lastPage.getSize();
        lastPage.drawImage(sigImage, { x: pw - 220, y: 80, width: 160, height: 50 });
      }
    } catch (e) {
      console.warn("Signature embed failed:", e);
    }
  }

  // Flatten the form so fields are embedded as visible text
  form.flatten();
  return pdfDoc.save();
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
