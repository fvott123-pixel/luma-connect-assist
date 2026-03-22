/**
 * SA466 PDF Pre-fill Engine
 * Fills named AcroForm fields — same approach as DocuSign/Adobe Acrobat.
 */
import { PDFDocument, StandardFonts, rgb, PDFName, PDFDict } from "@cantoo/pdf-lib";

export type SA466FormData = Record<string, string>;

// ── Cache template — fetch once, reuse forever ──
let _cache: ArrayBuffer | null = null;

async function getTemplate(): Promise<ArrayBuffer> {
  if (_cache) return _cache;
  for (const url of ["/forms/DSP/sa466en.pdf"]) {
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

const SKIP = new Set(["none","skip","n/a","na","nil","null","-","..","no answer","not applicable","n","unknown","don't know","dont know"]);

function isEmpty(v: string, isSelect = false): boolean {
  if (!v || v.trim() === "") return true;
  const lv = v.trim().toLowerCase();
  if (SKIP.has(lv)) return true;
  if (!isSelect && lv === "no") return true;
  return false;
}

function parseDMY(v: string): [string, string, string] | null {
  if (!v) return null;
  // Handle DDMMYYYY (no separators)
  const compact = v.replace(/\D/g, "");
  if (compact.length === 8) {
    return [compact.slice(0,2), compact.slice(2,4), compact.slice(4,8)];
  }
  const m = v.match(/^(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{2,4})$/);
  if (!m) return null;
  const dd = m[1].padStart(2,"0");
  const mm = m[2].padStart(2,"0");
  const yyyy = m[3].length === 2 ? `19${m[3]}` : m[3];
  // Validate
  if (parseInt(dd) > 31 || parseInt(mm) > 12) return null;
  return [dd, mm, yyyy];
}

/** Split "13 Smith St, Athelstone SA 5076" → address parts + postcode */
function splitAddress(addr: string): { line1: string; line2: string; line3: string; postcode: string } {
  const pcMatch = addr.match(/\b(\d{4})\b/);
  const postcode = pcMatch ? pcMatch[1] : "";
  const clean = addr.replace(/\b\d{4}\b/, "").replace(/,\s*$/, "").trim();
  const parts = clean.split(",").map(s => s.trim()).filter(Boolean);
  return {
    line1: parts[0] || "",
    line2: parts[1] || "",
    line3: parts[2] || "",
    postcode,
  };
}

/** Set text field with explicit font size 10 and black color */
function txt(form: any, field: string, value: string, fontSize = 10) {
  if (!value || isEmpty(value)) return;
  try {
    const f = form.getTextField(field);
    f.setFontSize(fontSize);
    f.setText(value.trim());
  } catch {}
}

/** Set radio group or checkbox.
 *  SA466 uses "checkbox-array" pattern — multiple widgets share one field name,
 *  each widget has a different ON export value in its AP/N dict (e.g. "Yes"/"No").
 *  getRadioGroup() fails for all of them; check() always ticks widget[0] = "No".
 *  Fix: iterate widgets, read ON state from AP/N dict, set /AS directly.
 */
function btn(form: any, field: string, value: string) {
  if (!value) return;
  // 1. Try proper radio group first (works for Title1 etc.)
  try { form.getRadioGroup(field).select(value); return; } catch {}
  // 2. Checkbox widget targeting — find widget whose ON state matches value
  try {
    const cb = form.getCheckBox(field);
    const widgets = (cb as any).acroField.getWidgets();
    let matched = false;
    for (const widget of widgets) {
      const ap = widget.dict?.get?.(PDFName.of("AP"));
      const n = ap instanceof PDFDict ? ap.get(PDFName.of("N")) : null;
      if (!n || !(n instanceof PDFDict)) continue;
      let onState: string | null = null;
      for (const [k] of (n as any).entries()) {
        const name = (k.encodedName || k.asString?.() || "").replace(/^\//, "");
        if (name !== "Off") { onState = name; break; }
      }
      if (!onState) continue;
      if (onState === value) {
        widget.dict.set(PDFName.of("AS"), PDFName.of(onState));
        matched = true;
      } else {
        widget.dict.set(PDFName.of("AS"), PDFName.of("Off"));
      }
    }
    if (matched) {
      (cb as any).acroField.dict.set(PDFName.of("V"), PDFName.of(value));
      return;
    }
  } catch {}
  // 3. Last resort fallback
  try { if (value === "Yes") form.getCheckBox(field).check(); } catch {}
}

/** Set D/M/Y date fields */
function dmy(form: any, prefix: string, value: string) {
  const parts = parseDMY(value);
  if (!parts) return;
  txt(form, `${prefix}.D`, parts[0]);
  txt(form, `${prefix}.M`, parts[1]);
  txt(form, `${prefix}.Y`, parts[2]);
}

/** Set address with Address1/Address2/Address3/Postcode sub-fields */
function addr(form: any, prefix: string, value: string) {
  if (!value || isEmpty(value)) return;
  const { line1, line2, line3, postcode } = splitAddress(value);
  txt(form, `${prefix}.Address1`, line1);
  if (line2) txt(form, `${prefix}.Address2`, line2);
  if (line3) txt(form, `${prefix}.Address3`, line3);
  if (postcode) txt(form, `${prefix}.Postcode`, postcode);
}

export async function prefillSA466(data: SA466FormData, signatureDataUrl?: string | null): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load((await getTemplate()).slice(0), { ignoreEncryption: true, password: "" });
  const form = pdfDoc.getForm();

  // ══ Q1 — CRN ══
  if (data.crn) {
    const c = data.crn.replace(/\D/g, "");
    ["0","1","2","3"].forEach((i, idx) => { if (c[idx]) txt(form, `CRN.${i}`, c[idx]); });
  }

  // ══ Q2 — Name ══
  txt(form, "Q2.FamilyName", data.familyName || "");
  txt(form, "Q2.FirstName",  data.firstName  || "");
  if (!isEmpty(data.secondName || "")) txt(form, "Q2.SecondName", data.secondName || "");

  // Title
  if (data.title) {
    const mapped = ["Mr","Mrs","Miss","Ms","Mx"].includes(data.title) ? data.title : "Other";
    try { form.getRadioGroup("Title1").select(mapped); } catch {}
    if (mapped === "Other") txt(form, "TitleOther1", data.title);
  }

  // ══ Q3 — Date of Birth ══
  if (data.dob) dmy(form, "Q3.DateOfBirth", data.dob);

  // ══ Q4 — Other names ══
  if (!isEmpty(data.otherNames || "")) txt(form, "Q4Details.0.OtherName", data.otherNames || "");

  // ══ Q5 — Gender ══
  if (data.gender) {
    const g: Record<string,string> = { Male: "Male", Female: "Female", Other: "NB" };
    if (g[data.gender]) btn(form, "Q5", g[data.gender]);
  }

  // ══ Q6 — Permanent address + postcode ══
  if (data.permanentAddress && !isEmpty(data.permanentAddress)) {
    const { line1, line2, line3, postcode } = splitAddress(data.permanentAddress);
    txt(form, "Q6.Address1", line1);
    if (line2) txt(form, "Q6.Address2", line2);
    if (line3) txt(form, "Q6.Address3", line3);
    // Postcode: use explicit field if provided, else from address
    const pc = data.postcode || postcode;
    if (pc) txt(form, "Q6.Postcode", pc);
  } else if (data.postcode) {
    txt(form, "Q6.Postcode", data.postcode);
  }

  // ══ Q7 — Postal address ══
  if (data.postalAddressSame?.toLowerCase() !== "yes" && !isEmpty(data.postalAddress || "")) {
    addr(form, "Q7", data.postalAddress || "");
  }

  // ══ Q8 — Contact ══
  if (!isEmpty(data.mobile    || "")) txt(form, "Q8.MobileNo", data.mobile    || "");
  if (!isEmpty(data.homePhone || "")) txt(form, "Q8.PhoneNo",  data.homePhone || "");
  if (!isEmpty(data.email     || "")) txt(form, "Q8.Email",    data.email     || "");

  // ══ Q9 — Authorise person ══
  if (data.authorisePerson) btn(form, "Q9", data.authorisePerson);

  // ══ Q10-Q21 Work history ══
  if (data.wasEmployee)              btn(form, "Q10", data.wasEmployee);
  if (data.stillWorkingForEmployer)  btn(form, "Q12", data.stillWorkingForEmployer);  // FIX: was stillWorking
  if (data.gradualReturnToWork)      btn(form, "Q13", data.gradualReturnToWork);
  if (data.planningLessHours)        btn(form, "Q14", data.planningLessHours);
  if (data.riskLosingJob)            btn(form, "Q15", data.riskLosingJob);
  if (data.wasSelfEmployed)          btn(form, "Q16", data.wasSelfEmployed);
  if (data.stillSelfEmployed)        btn(form, "Q17", data.stillSelfEmployed);
  if (data.wasApprentice)            btn(form, "Q18", data.wasApprentice);
  if (data.stillAtSchool)            btn(form, "Q19", data.stillAtSchool);
  if (data.doingStudy)               btn(form, "Q20", data.doingStudy);
  // Q21 — activityBeforeClaim: checkbox + detail text field
  if (!isEmpty(data.activityBeforeClaim || "")) {
    btn(form, "Q21", "Yes");
    txt(form, "21.D", data.activityBeforeClaim || "");
  }
  // ══ Q116-Q118 Employment income ══
  if (data.stoppedWorkingLastYear)  btn(form, "Q116", data.stoppedWorkingLastYear);
  if (!isEmpty(data.employerLastYear||"")) txt(form, "116.Name.0", data.employerLastYear||"");
  if (data.leaveEntitlementPayment) btn(form, "Q117", data.leaveEntitlementPayment);

  // ══ Q11 — Study hours ══
  if (!isEmpty(data.studyHours || "")) txt(form, "20.D.Hours", data.studyHours || "");

  // ══ Q13 — Interpreter ══
  if (data.interpreterNeeded) btn(form, "Q38", data.interpreterNeeded);
  if (!isEmpty(data.preferredLanguage || ""))      txt(form, "Q39", data.preferredLanguage      || "");
  if (!isEmpty(data.preferredWrittenLanguage || "")) txt(form, "Q40", data.preferredWrittenLanguage || "");

  // ══ Q22-24 — Offence/detention ══
  if (data.chargedWithOffence) btn(form, "Q22", data.chargedWithOffence);
  if (!isEmpty(data.institutionName || "")) txt(form, "Q23", data.institutionName || "");
  if (data.releaseDate) dmy(form, "Q24", data.releaseDate);

  // ══ Q25-32 — Payment questions ══
  if (data.claimingForBlindness)     btn(form, "Q25", data.claimingForBlindness);
  if (data.claimingRentAssistance)   btn(form, "Q26", data.claimingRentAssistance);
  if (data.gettingNZPayment)         btn(form, "Q27", data.gettingNZPayment);
  if (data.gettingDVAPayment)        btn(form, "Q28", data.gettingDVAPayment);
  if (data.selfEmploymentAssistance) btn(form, "Q29", data.selfEmploymentAssistance);
  if (data.gettingWorkersComp)       btn(form, "Q30", data.gettingWorkersComp);

  // ══ Q31-32 — Income streams ══
  if (data.incomeStreamToldBefore) btn(form, "Q31", data.incomeStreamToldBefore);
  if (data.gettingIncomeStream)    btn(form, "Q32", data.gettingIncomeStream);

  // ══ Q34 — Bank details ══
  txt(form, "BankName", data.bankName      || "");
  if (data.bsb) txt(form, "BSB", (data.bsb || "").replace(/[\-\s]/g, "").slice(0,6));
  txt(form, "ACCNo",    data.accountNumber || "");
  txt(form, "AccNames", data.accountName   || "");

  // ══ Q35/36 ══
  if (data.receivingOtherPayments)  btn(form, "Q35", data.receivingOtherPayments);  // FIX: was receivingPayment
  if (data.changedCircumstances)    btn(form, "Q36", data.changedCircumstances);

  // ══ Q37/38 — Interpreter / under 21 ══
  if (data.youngerThan21ForPayment) btn(form, "Q37", data.youngerThan21ForPayment); // FIX: was under21ForPayment

  // ══ Q44-47 — Residence ══
  if (data.travelledOverseas)         btn(form, "Q44", data.travelledOverseas);
  if (data.australianCitizenBornHere) btn(form, "Q45", data.australianCitizenBornHere);
  if (!isEmpty(data.countryOfBirth        || "")) txt(form, "Q46", data.countryOfBirth        || "");
  if (!isEmpty(data.countryOfCitizenship  || "")) txt(form, "Q47Details.CoC", data.countryOfCitizenship || "");
  if (data.australianCitizen)  btn(form, "Q47", data.australianCitizen);
  if (data.permanentResident)  btn(form, "Q48", data.permanentResident);
  if (!isEmpty(data.visaType || "")) txt(form, "Q49.VisaClass", data.visaType || "");
  if (data.visaChanged)        btn(form, "Q50", data.visaChanged);
  if (data.livedBefor1965)     btn(form, "Q51", data.livedBefor1965);
  if (data.assuranceOfSupport) btn(form, "Q52", data.assuranceOfSupport);
  if (data.travelledOverseas)  btn(form, "Q53", data.travelledOverseas);

  // ══ Q54-64 — Partner ══
  if (data.hasPartner) btn(form, "Q54", data.hasPartner);

  // Relationship status
  if (data.relationshipStatus) {
    const rs: Record<string,string> = {
      "Married": "Married", "De facto": "DeFacto", "Registered relationship": "RR"
    };
    if (rs[data.relationshipStatus]) btn(form, "Q55", rs[data.relationshipStatus]);
  }

  // Partner name — handle "firstname lastname" or separate fields
  if (data.partnerFamilyName) {
    txt(form, "Partner_FamilyName", data.partnerFamilyName);
  } else if (data.partnerName && !isEmpty(data.partnerName)) {
    // Split "Jenny Vottari" → first + family
    const parts = data.partnerName.trim().split(/\s+/);
    txt(form, "Partner_FirstName", parts[0] || "");
    if (parts.length > 1) txt(form, "Partner_FamilyName", parts.slice(1).join(" "));
  }
  if (data.partnerFirstName) txt(form, "Partner_FirstName", data.partnerFirstName);

  if (data.partnerDob) dmy(form, "Q58", data.partnerDob);

  if (data.partnerCrn) {
    const c = (data.partnerCrn || "").replace(/\D/g, "");
    ["0","1","2","3"].forEach((i, idx) => { if (c[idx]) txt(form, `CRN.Partner.${i}`, c[idx]); });
  }

  if (data.partnerAuthorisation) btn(form, "Q59", data.partnerAuthorisation);
  if (data.partnerGender) {
    const g: Record<string,string> = { Male: "Male", Female: "Female", Other: "NB" };
    if (g[data.partnerGender]) btn(form, "Q61", g[data.partnerGender]);
  }
  if (data.liveWithPartner) btn(form, "Q62", data.liveWithPartner);
  if (!isEmpty(data.partnerAddress || "")) addr(form, "Q63", data.partnerAddress || "");
  if (!isEmpty(data.partnerPostalAddress || "")) addr(form, "Q64", data.partnerPostalAddress || "");

  if (data.reasonNotWithPartner) {
    const m: Record<string,string> = {
      "Partner illness":"PartnerIllness","Your illness":"YourIllness",
      "Partner in prison":"PartnerPrison","Partner employment":"PartnerEmployment","Other":"Other"
    };
    if (m[data.reasonNotWithPartner]) btn(form, "Q65", m[data.reasonNotWithPartner]);
  }

  if (data.partnerGettingPayments)   btn(form, "Q67", data.partnerGettingPayments);
  if (data.partnerTravelledOverseas) btn(form, "Q69", data.partnerTravelledOverseas);
  if (!isEmpty(data.partnerCountryOfBirth || ""))        txt(form, "Q71", data.partnerCountryOfBirth || "");
  if (!isEmpty(data.partnerCountryOfCitizenship || "")) txt(form, "Q72Details.CoC", data.partnerCountryOfCitizenship || "");
  if (data.partnerAustralianCitizen) btn(form, "Q72", data.partnerAustralianCitizen);
  if (data.partnerLivedInAustralia)  btn(form, "Q73", data.partnerLivedInAustralia);
  if (data.partnerVisaType) {
    const m: Record<string,string> = {
      "Permanent":"Perm","Temporary":"Temp","New Zealand":"NZ","Not sure":"NotSure"
    };
    if (m[data.partnerVisaType]) btn(form, "Q74", m[data.partnerVisaType]);
  }
  if (!isEmpty(data.partnerCurrentVisa || "")) txt(form, "Q75.VisaClass", data.partnerCurrentVisa || "");

  if (data.currentRelationshipStatus) {
    const m: Record<string,string> = {
      "Separated":"Separated","Divorced":"Divorced","Widowed":"Widowed","Never had partner":"NeverPartner"
    };
    if (m[data.currentRelationshipStatus]) btn(form, "Q77", m[data.currentRelationshipStatus]);
  }
  if (!isEmpty(data.deceasedPartnerName || "")) txt(form, "Q78.FullName", data.deceasedPartnerName || "");
  if (!isEmpty(data.exPartnerFamilyName || "")) txt(form, "Q79.FamilyName", data.exPartnerFamilyName || "");
  if (!isEmpty(data.exPartnerAddress    || "")) addr(form, "Q80", data.exPartnerAddress || "");

  // ══ Q81-88 — Accommodation ══
  if (data.shareAccommodation) btn(form, "Q81", data.shareAccommodation);
  if (data.ownHomeNotLiving)   btn(form, "Q83", data.ownHomeNotLiving);
  if (data.soldFormerHome)     btn(form, "Q85", data.soldFormerHome);
  if (data.accommodationType)  btn(form, "Q86", data.accommodationType);
  if (data.siteMooringFees)    btn(form, "Q87", data.siteMooringFees);
  if (data.nameOnLease)        btn(form, "Q88", data.nameOnLease);
  if (data.whyNotInOwnHome) {
    const m: Record<string,string> = {
      "Study":"Study","Medical treatment":"MedTreatment","Receiving care":"ReceiveCarePH",
      "Providing care":"ProvideCarePH","Overseas":"Overseas","Other":"Other"
    };
    if (m[data.whyNotInOwnHome]) btn(form, "Q84.Reason", m[data.whyNotInOwnHome]);
  }

  // ══ Q89-116 — Rent/boarding ══
  if (data.primaryTenantMarketRate) btn(form, "Q89", data.primaryTenantMarketRate);
  if (data.liveWithPrimaryTenant)   btn(form, "Q90", data.liveWithPrimaryTenant);
  if (!isEmpty(data.agedCareHomeName || "")) txt(form, "Q91", data.agedCareHomeName || "");
  if (data.agedCareMoveInDate) dmy(form, "Q92.Y", data.agedCareMoveInDate);
  if (data.giftLoanEntryFee)   btn(form, "Q96", data.giftLoanEntryFee);
  if (!isEmpty(data.giftLoanAmount || "")) txt(form, "Q97.Details.Gift", data.giftLoanAmount || "");
  if (data.paidEntryContribution)   btn(form, "Q99", data.paidEntryContribution);
  if (data.soldOrTransferredAssets) btn(form, "Q102", data.soldOrTransferredAssets);
  if (data.payBoardLodgings)   btn(form, "Q109", data.payBoardLodgings);
  if (!isEmpty(data.boardLodgingsAmount || "")) txt(form, "Q111.Paid", data.boardLodgingsAmount || "");
  if (data.boardingSubtype) {
    const m: Record<string,string> = {
      "Boarding house":"Boarding","Private":"Private","Community":"Community",
      "Defence":"Defence","Caravan":"Caravan","Boat":"Boat","Other":"Other"
    };
    if (m[data.boardingSubtype]) btn(form, "Q113", m[data.boardingSubtype]);
  }
  if (!isEmpty(data.totalAmountCharged || "")) txt(form, "Q114.Paid", data.totalAmountCharged || "");
  if (data.formalLease) btn(form, "Q115", data.formalLease);
  if (!isEmpty(data.incomeLastYear || ""))  txt(form, "Q105.Pay", data.incomeLastYear || "");
  if (data.redundancyPayment)           btn(form, "Q118", data.redundancyPayment);
  // Q120 TFN — two separate checkbox fields: Q120Y (has TFN) and Q120P (partner TFN)
  if (data.hasTFN) btn(form, "Q120Y", data.hasTFN);
  if (!isEmpty(data.tfnNumber || "")) txt(form, "Q120YDetails.0", data.tfnNumber || "");
  if (data.youngerThan21)               btn(form, "Q121", data.youngerThan21);
  if (data.liveWithParents)             btn(form, "Q124", data.liveWithParents);
  if (data.youngerThan18)               btn(form, "Q125", data.youngerThan18);
  if (data.liveAwayFromParents)         btn(form, "Q126", data.liveAwayFromParents);
  if (data.unreasonableToLiveAtHome)    btn(form, "Q127", data.unreasonableToLiveAtHome);

  // ══ Q117 Income ══
  if (!isEmpty(data.employerLastYear || "")) txt(form, "116.Name.0", data.employerLastYear || "");

  // ══ Assets ══
  if (!isEmpty(data.bankBalance || "")) txt(form, "Q106.Assets", data.bankBalance || "");
  // NOTE: sharesValue removed — would conflict with giftLoanAmount on Q97.Details.Gift
  // NOTE: rentAmount removed — same field (Q111.Paid) handled by boardLodgingsAmount above

  // ══ Q131-142 — Medical ══
  if (!isEmpty(data.primaryCondition || "")) txt(form, "Q131", data.primaryCondition || "", 9);
  if (!isEmpty(data.otherConditions  || "")) {
    // Append to Q131
    const existing = data.primaryCondition || "";
    if (existing) txt(form, "Q131", `${existing}\n${data.otherConditions}`, 9);
  }

  // Q132 — When condition started MM/YYYY
  if (!isEmpty(data.conditionStartDate || "")) {
    const p = parseDMY(data.conditionStartDate || "");
    if (p) { txt(form, "Q132.M", p[1]); txt(form, "Q132.Y", p[2]); }
    else {
      const my = (data.conditionStartDate || "").match(/^(\d{1,2})[\/\-](\d{4})$/);
      if (my) { txt(form, "Q132.M", my[1].padStart(2,"0")); txt(form, "Q132.Y", my[2]); }
    }
  }

  // Q133 — conditionCategory (PDF uses non-standard name encoding A\x85Yes … F\x85Yes)
  // FIX: was using conditionPermanent (wrong key + wrong export values)
  if (data.conditionCategory) {
    const catMap: Record<string, string> = {
      "Permanently blind":                     "A\x85Yes",
      "Need nursing home level care":          "B\x85Yes",
      "Terminal illness (less than 2 years)":  "C\x85Yes",
      "Intellectual disability (IQ under 70)": "D\x85Yes",
      "Category 4 HIV/AIDS":                   "E\x85Yes",
      "None of these":                         "F\x85Yes",
    };
    const exportVal = catMap[data.conditionCategory];
    if (exportVal) btn(form, "Q133", exportVal);
  }

  // Q135 — Treatment
  if (!isEmpty(data.currentTreatment || "")) txt(form, "Q135.CT", data.currentTreatment || "", 9);
  if (!isEmpty(data.pastTreatment    || "")) txt(form, "Q135.PT", data.pastTreatment    || "", 9);
  if (!isEmpty(data.futureTreatment  || "")) txt(form, "Q135.FT", data.futureTreatment  || "", 9);

  if (data.attendedSpecialSchool) btn(form, "Q136", data.attendedSpecialSchool);

  // Q137 — Work history
  if (!isEmpty(data.previousWorkType || "")) txt(form, "Q137.D0.WorkType", data.previousWorkType || "");
  if (data.workAffectedByCondition)  btn(form, "Q137.D0.AffectWork", data.workAffectedByCondition);
  if (!isEmpty(data.employerLastYear || "")) txt(form, "116.Name.0", data.employerLastYear || "");

  if (data.programOfSupport) btn(form, "Q139", data.programOfSupport);

  // Q140 — Doctors (3 slots)
  const doctors = [
    { name: data.treatingDoctor,  prof: data.doctorProfession,  addrStr: data.doctorAddress,  phone: data.doctorPhone  },
    { name: data.doctor2Name,     prof: data.doctor2Profession, addrStr: data.doctor2Address, phone: data.doctor2Phone },
    { name: data.doctor3Name,     prof: data.doctor3Profession, addrStr: data.doctor3Address, phone: data.doctor3Phone },
  ];
  doctors.forEach((doc, i) => {
    if (!doc.name || isEmpty(doc.name)) return;
    txt(form, `Q140.D${i}.FullName`,   doc.name);
    txt(form, `Q140.D${i}.Profession`, doc.prof  || "");
    if (doc.addrStr) {
      const { line1, line2, postcode } = splitAddress(doc.addrStr);
      txt(form, `Q140.D${i}.Address1`, line1);
      if (line2) txt(form, `Q140.D${i}.Address2`, line2);
      if (postcode) txt(form, `Q140.D${i}.Postcode`, postcode);
    }
    txt(form, `Q140.D${i}.PhoneNo`, doc.phone || "");
  });

  if (data.difficultyEvidence) btn(form, "Q142", data.difficultyEvidence);

  // ══ Signature ══
  if (signatureDataUrl) {
    try {
      const b64 = signatureDataUrl.split(",")[1];
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const img = await pdfDoc.embedPng(bytes);
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
