/**
 * SA466 PDF Pre-fill Engine
 * 
 * Fills named AcroForm fields directly by name — same approach as DocuSign.
 * Field names come from the PDF's own AcroForm metadata (994 fields).
 */
import { PDFDocument } from "@cantoo/pdf-lib";

export type SA466FormData = Record<string, string>;

// ── Template cache — fetch once, reuse forever ──
let _cache: ArrayBuffer | null = null;

async function getTemplate(): Promise<ArrayBuffer> {
  if (_cache) return _cache;
  for (const url of [
    "/forms/DSP/sa466en.pdf",
    "/forms/CUsersfvottDesktopGovernment Forms/Disability Support Pension/sa466en.pdf",
  ]) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        _cache = await res.arrayBuffer();
        console.log(`SA466 cached (${Math.round(_cache.byteLength / 1024)}KB)`);
        return _cache;
      }
    } catch {}
  }
  throw new Error("Could not load SA466 PDF.");
}

const SKIP = new Set(["none","skip","n/a","na","nil","null","-","..","no answer","not applicable","n"]);
function isEmpty(v: string, isSelect = false) {
  if (!v || v.trim() === "") return true;
  const lv = v.trim().toLowerCase();
  if (SKIP.has(lv)) return true;
  if (!isSelect && lv === "no") return true;
  return false;
}

function parseDMY(v: string): [string, string, string] | null {
  const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return null;
  return [m[1].padStart(2,"0"), m[2].padStart(2,"0"), m[3].length===2?`19${m[3]}`:m[3]];
}

/** Split "123 Smith St, Suburb SA 5000" into address parts + postcode */
function splitAddress(addr: string): { line1: string; line2: string; line3: string; postcode: string } {
  // Extract postcode (4 digits at end)
  const pcMatch = addr.match(/\b(\d{4})\s*$/);
  const postcode = pcMatch ? pcMatch[1] : "";
  const clean = addr.replace(/\s*\d{4}\s*$/, "").trim();
  
  // Split on commas
  const parts = clean.split(",").map(s => s.trim()).filter(Boolean);
  
  return {
    line1: parts[0] || "",
    line2: parts[1] || "",
    line3: parts[2] || "",
    postcode,
  };
}

function txt(form: any, field: string, value: string) {
  if (!value || isEmpty(value)) return;
  try { form.getTextField(field).setText(value.trim()); } catch {}
}

function btn(form: any, field: string, value: string) {
  if (!value) return;
  try { form.getRadioGroup(field).select(value); return; } catch {}
  try { if (value === "Yes") form.getCheckBox(field).check(); } catch {}
}

function dmy(form: any, prefix: string, value: string) {
  const parts = parseDMY(value);
  if (!parts) return;
  txt(form, `${prefix}.D`, parts[0]);
  txt(form, `${prefix}.M`, parts[1]);
  txt(form, `${prefix}.Y`, parts[2]);
}

function addr(form: any, prefix: string, value: string, postcodeField?: string) {
  if (!value || isEmpty(value)) return;
  const { line1, line2, line3, postcode } = splitAddress(value);
  txt(form, `${prefix}.Address1`, line1);
  if (line2) txt(form, `${prefix}.Address2`, line2);
  if (line3) txt(form, `${prefix}.Address3`, line3);
  // Postcode — use dedicated field if provided, else use prefix.Postcode
  const pcField = postcodeField || `${prefix}.Postcode`;
  if (postcode) txt(form, pcField, postcode);
}

export async function prefillSA466(data: SA466FormData, signatureDataUrl?: string | null): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load((await getTemplate()).slice(0), { ignoreEncryption: true, password: "" });
  const form = pdfDoc.getForm();

  // ══ Q1 — CRN ══
  if (data.crn) {
    const c = data.crn.replace(/\D/g, "");
    ["0","1","2","3"].forEach((i,idx) => { if(c[idx]) txt(form, `CRN.${i}`, c[idx]); });
  }

  // ══ Q2 — Name ══
  txt(form, "Q2.FamilyName", data.familyName || "");
  txt(form, "Q2.FirstName",  data.firstName || "");
  if (!isEmpty(data.secondName || "")) txt(form, "Q2.SecondName", data.secondName || "");

  // Title (radio: Mr Mrs Miss Ms Mx + TitleOther1 for Dr/Other)
  if (data.title) {
    const t = data.title;
    const mapped = ["Mr","Mrs","Miss","Ms","Mx"].includes(t) ? t : "Other";
    try { form.getRadioGroup("Title1").select(mapped); } catch {}
    if (mapped === "Other") txt(form, "TitleOther1", t);
  }

  // ══ Q3 — Date of Birth ══
  if (data.dob) dmy(form, "Q3.DateOfBirth", data.dob);

  // ══ Q4 — Other names ══
  if (!isEmpty(data.otherNames || "")) {
    txt(form, "Q4Details.0.OtherName", data.otherNames || "");
  }

  // ══ Q5 — Gender ══
  if (data.gender) {
    const g = { Male:"Male", Female:"Female", Other:"NB" } as Record<string,string>;
    if (g[data.gender]) btn(form, "Q5", g[data.gender]);
  }

  // ══ Q6 — Permanent address ══
  if (data.permanentAddress && !isEmpty(data.permanentAddress)) {
    // If postcode provided separately, append it
    const fullAddr = data.postcode && !data.permanentAddress.match(/\d{4}$/)
      ? `${data.permanentAddress}, ${data.postcode}`
      : data.permanentAddress;
    addr(form, "Q6", fullAddr);
    // Also set postcode separately if provided
    if (data.postcode) txt(form, "Q6.Postcode", data.postcode);
  }

  // ══ Q7 — Postal address ══
  if (data.postalAddressSame?.toLowerCase() !== "yes" && !isEmpty(data.postalAddress || "")) {
    addr(form, "Q7", data.postalAddress || "");
  }

  // ══ Q8 — Contact details ══
  if (!isEmpty(data.mobile || ""))    txt(form, "Q8.MobileNo", data.mobile || "");
  if (!isEmpty(data.homePhone || "")) txt(form, "Q8.PhoneNo",  data.homePhone || "");
  if (!isEmpty(data.email || ""))     txt(form, "Q8.Email",    data.email || "");

  // ══ Q9 — Authorise person ══
  if (data.authorisePerson) btn(form, "Q9", data.authorisePerson);

  // ══ Q10 — Previously working ══
  if (data.previouslyWorking) btn(form, "Q10", data.previouslyWorking);

  // ══ Q12 — Still working ══
  if (data.currentlyWorking) btn(form, "Q18", data.currentlyWorking);

  // ══ Q13 — Interpreter needed ══
  if (data.interpreterNeeded) btn(form, "Q38", data.interpreterNeeded);
  if (!isEmpty(data.preferredLanguage || "")) txt(form, "Q39", data.preferredLanguage || "");

  // ══ Q38/39/40 — Language ══
  if (!isEmpty(data.preferredWrittenLanguage || "")) txt(form, "Q40", data.preferredWrittenLanguage || "");

  // ══ Q43/44 — Overseas travel ══
  if (data.travelledOverseas) btn(form, "Q44", data.travelledOverseas);

  // ══ Q45 — Australian citizen born in Australia ══
  if (data.australianCitizenBornHere) btn(form, "Q45", data.australianCitizenBornHere);

  // ══ Q46/47 — Country of birth/citizenship ══
  if (!isEmpty(data.countryOfBirth || ""))        txt(form, "Q46", data.countryOfBirth || "");
  if (!isEmpty(data.countryOfCitizenship || ""))  txt(form, "Q47Details.CoC", data.countryOfCitizenship || "");

  // ══ Q47/48 — Australian citizen / permanent resident ══
  if (data.australianCitizen) btn(form, "Q47", data.australianCitizen);
  if (data.permanentResident) btn(form, "Q48", data.permanentResident);

  // ══ Q49 — Visa type ══
  if (!isEmpty(data.visaType || "")) txt(form, "Q49.VisaClass", data.visaType || "");

  // ══ Q53 — Travelled overseas ══
  if (data.travelledOverseas) btn(form, "Q53", data.travelledOverseas);

  // ══ Q54 — Have a partner ══
  if (data.hasPartner) btn(form, "Q54", data.hasPartner);

  // ══ Q55 — Relationship status ══
  if (data.relationshipStatus) {
    const rs: Record<string,string> = {
      "Married": "Married",
      "De facto": "DeFacto",
      "Registered": "RR",
    };
    if (rs[data.relationshipStatus]) btn(form, "Q55", rs[data.relationshipStatus]);
  }

  // ══ Partner details (Q56-Q64) ══
  if (!isEmpty(data.partnerFamilyName || "")) txt(form, "Partner_FamilyName", data.partnerFamilyName || "");
  if (!isEmpty(data.partnerFirstName  || "")) txt(form, "Partner_FirstName",  data.partnerFirstName  || "");
  if (data.partnerDob) dmy(form, "Q58", data.partnerDob);
  if (data.partnerCrn) {
    const c = (data.partnerCrn || "").replace(/\D/g,"");
    ["0","1","2","3"].forEach((i,idx) => { if(c[idx]) txt(form, `CRN.Partner.${i}`, c[idx]); });
  }
  if (data.partnerWorking) btn(form, "Q59", data.partnerWorking);
  if (!isEmpty(data.partnerAddress || "")) addr(form, "Q63", data.partnerAddress || "");

  // ══ Q71 — Partner country of birth ══
  if (!isEmpty(data.partnerCountryOfBirth || "")) txt(form, "Q71", data.partnerCountryOfBirth || "");

  // ══ Q83 — Own a home ══
  if (data.ownHome)    btn(form, "Q83", data.ownHome === "Yes" ? "Yes" : "No");
  if (data.hasVehicle) btn(form, "Q102", data.hasVehicle);

  // ══ Q86 — Accommodation type ══
  if (data.accommodationType) btn(form, "Q86", data.accommodationType);

  // ══ Q120 — Tax file number ══
  if (data.receivingPayment) btn(form, "Q35", data.receivingPayment);

  // ══ Bank details ══
  txt(form, "BankName", data.bankName     || "");
  txt(form, "BSB",      data.bsb          || "");
  txt(form, "ACCNo",    data.accountNumber|| "");
  txt(form, "AccNames", data.accountName  || "");

  // ══ Step 6 — Medical ══
  // Q131 — Medical condition description
  if (!isEmpty(data.primaryCondition || "")) txt(form, "Q131", data.primaryCondition || "");

  // Q132 — When condition started (MM/YYYY)
  if (!isEmpty(data.conditionStartDate || "")) {
    const parts = parseDMY(data.conditionStartDate || "");
    if (parts) {
      txt(form, "Q132.M", parts[1]);
      txt(form, "Q132.Y", parts[2]);
    } else {
      // Try MM/YYYY format
      const my = (data.conditionStartDate || "").match(/^(\d{1,2})[\/\-](\d{4})$/);
      if (my) {
        txt(form, "Q132.M", my[1].padStart(2,"0"));
        txt(form, "Q132.Y", my[2]);
      }
    }
  }

  // Q133 — Condition category (blind, intellectual etc)
  if (data.conditionPermanent) btn(form, "Q133", data.conditionPermanent);

  // Q135 — Treatment details
  if (!isEmpty(data.currentTreatment || ""))  txt(form, "Q135.CT", data.currentTreatment || "");
  if (!isEmpty(data.pastTreatment    || ""))  txt(form, "Q135.PT", data.pastTreatment    || "");
  if (!isEmpty(data.futureTreatment  || ""))  txt(form, "Q135.FT", data.futureTreatment  || "");

  // Q140 — Treating doctors (3 slots)
  const doctors = [
    { name: data.treatingDoctor,   prof: data.doctorProfession,  addr_: data.doctorAddress,  phone: data.doctorPhone,  pc: data.doctorPostcode  },
    { name: data.doctor2Name,      prof: data.doctor2Profession, addr_: data.doctor2Address, phone: data.doctor2Phone, pc: data.doctor2Postcode },
    { name: data.doctor3Name,      prof: data.doctor3Profession, addr_: data.doctor3Address, phone: data.doctor3Phone, pc: data.doctor3Postcode },
  ];
  doctors.forEach((doc, i) => {
    if (!doc.name || isEmpty(doc.name)) return;
    const pfx = `Q140.D${i}`;
    txt(form, `${pfx}.FullName`,  doc.name);
    txt(form, `${pfx}.Profession`,doc.prof || "");
    if (doc.addr_) {
      const { line1, line2, postcode } = splitAddress(doc.addr_);
      txt(form, `${pfx}.Address1`, line1);
      if (line2) txt(form, `${pfx}.Address2`, line2);
      if (doc.pc || postcode) txt(form, `${pfx}.Postcode`, doc.pc || postcode);
    }
    txt(form, `${pfx}.PhoneNo`, doc.phone || "");
  });

  // ══ Q136/137 — Work history ══
  if (data.hospitalised) btn(form, "Q83", data.hospitalised);

  // ══ Q139 — Program of support ══
  if (data.programOfSupport) btn(form, "Q139", data.programOfSupport);


  // ══ Q81 — Share accommodation ══
  if (data.shareAccommodation) btn(form, "Q81", data.shareAccommodation);

  // ══ Q83 — Own home not living in ══
  if (data.ownHomeNotLiving) btn(form, "Q83", data.ownHomeNotLiving);

  // ══ Q85 — Sold former home ══
  if (data.soldFormerHome) btn(form, "Q85", data.soldFormerHome);

  // ══ Q88 — Name on lease ══
  if (data.nameOnLease) btn(form, "Q88", data.nameOnLease);

  // ══ Q109 — Board/lodgings ══
  if (data.payBoardLodgings) btn(form, "Q109", data.payBoardLodgings);

  // ══ Q115 — Formal lease ══
  if (data.formalLease) btn(form, "Q115", data.formalLease);

  // ══ Q117 — Income last year ══
  if (!isEmpty(data.incomeLastYear || "")) {
    // Q117 has sub-fields — write as employer name
    txt(form, "116.Name.0", data.incomeLastYear || "");
  }

  // ══ Q118 — Redundancy payment ══
  if (data.redundancyPayment) btn(form, "Q118", data.redundancyPayment);

  // ══ Q120 — Tax file number ══
  if (data.hasTFN) btn(form, "Q120", data.hasTFN);

  // ══ Q121 — Younger than 21 ══
  if (data.youngerThan21) btn(form, "Q121", data.youngerThan21);

  // ══ Q124 — Live with parents ══
  if (data.liveWithParents) btn(form, "Q124", data.liveWithParents);

  // ══ Q136 — Attended special school ══
  if (data.attendedSpecialSchool) btn(form, "Q136", data.attendedSpecialSchool);

  // ══ Q138 — Workplace support ══
  if (data.workplaceSupport && data.workplaceSupport !== "None") {
    // Mark all that apply — simplified to a checkbox
    btn(form, "Q138", "NoSupport");
  }

  // ══ Q142 — Difficulty getting evidence ══
  if (data.difficultyEvidence) btn(form, "Q142", data.difficultyEvidence);

  // ══ Q77 — Current relationship status ══
  if (data.currentRelationshipStatus) {
    const rs: Record<string,string> = {
      "Separated": "Separated", "Divorced": "Divorced",
      "Widowed": "Widowed", "Never had partner": "NeverPartner"
    };
    if (rs[data.currentRelationshipStatus]) btn(form, "Q77", rs[data.currentRelationshipStatus]);
  }

  // ══ Partner lived in Australia ══
  if (data.partnerLivedInAustralia) btn(form, "Q73", data.partnerLivedInAustralia);

  // ══ Partner country of citizenship ══
  if (!isEmpty(data.partnerCountryOfCitizenship || "")) txt(form, "Q72", data.partnerCountryOfCitizenship || "");


  // ══ Signature ══
  if (signatureDataUrl) {
    try {
      const b64 = signatureDataUrl.split(",")[1];
      const sigBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const img = await pdfDoc.embedPng(sigBytes);
      const pages = pdfDoc.getPages();
      const last = pages[pages.length - 1];
      if (last) {
        const { width } = last.getSize();
        last.drawImage(img, { x: width - 220, y: 80, width: 160, height: 50 });
      }
    } catch {}
  }

  form.flatten();
  return pdfDoc.save();
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
