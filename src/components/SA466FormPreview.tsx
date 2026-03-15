import { useRef, useEffect } from "react";
import SignaturePad from "./SignaturePad";

interface SA466FormPreviewProps {
  answers: Record<string, string>;
  scrollToField?: string | null;
  onSignatureChange?: (dataUrl: string | null) => void;
  signatureDataUrl?: string | null;
}

const SA466FormPreview = ({ answers, scrollToField, onSignatureChange, signatureDataUrl }: SA466FormPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-scroll to the active field
  useEffect(() => {
    if (!scrollToField || !fieldRefs.current[scrollToField]) return;
    const el = fieldRefs.current[scrollToField];
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [scrollToField]);

  const val = (key: string) => {
    const v = answers[key];
    if (!v || v.toLowerCase() === "none" || v.toLowerCase() === "skip") return "";
    return v;
  };

  const hl = (key: string) => scrollToField === key;

  const fieldClass = (key: string) =>
    `min-h-[22px] border-b border-gray-400 px-1 py-0.5 text-[11px] font-medium text-black transition-all duration-500 ${
      hl(key) ? "bg-green-200 ring-2 ring-green-500 rounded-sm" : val(key) ? "bg-green-50" : "bg-transparent"
    }`;

  const tickBox = (key: string, option: string) => {
    const checked = val(key) === option;
    return (
      <span
        className={`inline-flex h-[14px] w-[14px] items-center justify-center border border-gray-600 text-[10px] font-bold ${
          checked ? "bg-green-100 text-green-700" : ""
        } ${hl(key) && checked ? "ring-2 ring-green-500" : ""}`}
      >
        {checked ? "✓" : ""}
      </span>
    );
  };

  const parseDate = (key: string) => {
    const d = val(key);
    const m = d.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) return { dd: m[1].padStart(2, "0"), mm: m[2].padStart(2, "0"), yyyy: m[3].length === 2 ? `19${m[3]}` : m[3] };
    return { dd: "", mm: "", yyyy: "" };
  };

  const dateBoxes = (key: string) => {
    const d = parseDate(key);
    const highlighted = hl(key);
    const box = (c: string, k: string) => (
      <span key={k} className={`inline-flex h-[18px] w-[14px] items-center justify-center border border-gray-500 text-[10px] font-mono font-bold text-black ${highlighted ? "bg-green-200" : c ? "bg-green-50" : "bg-gray-50"}`}>{c}</span>
    );
    return (
      <div className={`flex items-center gap-0.5 ${highlighted ? "ring-2 ring-green-500 rounded-sm p-0.5" : ""}`}>
        {(d.dd || "  ").split("").map((c, i) => box(c.trim(), `dd${i}`))}
        <span className="text-[8px] text-gray-400 mx-0.5">/</span>
        {(d.mm || "  ").split("").map((c, i) => box(c.trim(), `mm${i}`))}
        <span className="text-[8px] text-gray-400 mx-0.5">/</span>
        {(d.yyyy || "    ").split("").map((c, i) => box(c.trim(), `yy${i}`))}
      </div>
    );
  };

  const setRef = (key: string) => (el: HTMLDivElement | null) => { fieldRefs.current[key] = el; };

  const Q = ({ num, label, id, children }: { num: number; label: string; id: string; children: React.ReactNode }) => (
    <div ref={setRef(id)} className="mb-3">
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-[9px] font-bold text-gray-700">{num}</span>
        <span className="text-[9px] font-semibold text-gray-700">{label}</span>
      </div>
      <div className="ml-3">{children}</div>
    </div>
  );

  const TextF = ({ id }: { id: string }) => <div className={fieldClass(id)}>{val(id)}</div>;

  const SelectF = ({ id, options }: { id: string; options: string[] }) => (
    <div className="flex items-center gap-3">
      {options.map(o => (
        <label key={o} className="flex items-center gap-1 text-[10px] text-gray-700">
          {tickBox(id, o)} {o}
        </label>
      ))}
    </div>
  );

  const PageHeader = ({ page, total = 28 }: { page: number; total?: number }) => (
    <div className="mb-1 flex items-start justify-between">
      <div>
        <div className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Australian Government</div>
        <div className="text-[8px] text-gray-400">Services Australia</div>
      </div>
      <div className="text-right">
        <div className="text-[9px] font-bold text-gray-500">SA466</div>
        <div className="text-[8px] text-gray-400">Page {page} of {total}</div>
      </div>
    </div>
  );

  const SectionHeader = ({ title, sub }: { title: string; sub?: string }) => (
    <div className="mb-4 border-b-2 border-gray-800 pb-2">
      <h2 className="text-[13px] font-bold text-gray-900">{title}</h2>
      {sub && <p className="text-[8px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );

  const PageWrap = ({ children }: { children: React.ReactNode }) => (
    <div className="sa466-page mx-auto mb-6 w-full max-w-[210mm] bg-white border border-gray-300 shadow-sm print:shadow-none print:border-0 print:mb-0 print:break-after-page">
      <div className="p-5 print:p-[12mm]">{children}</div>
    </div>
  );

  const postalSame = val("postalAddressSame") === "Yes";

  console.log("PDF re-rendered", Object.keys(answers).length, "answers");

  return (
    <div className="h-full w-full flex flex-col overflow-hidden rounded-xl border border-border bg-white">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 print:hidden">
        <span className="text-[10px] font-mono text-muted-foreground">SA466 Preview — Live</span>
        <button onClick={() => window.print()} className="rounded bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground hover:opacity-90">
          🖨️ Print / Save PDF
        </button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto p-3 print:p-0 print:overflow-visible">

        {/* ═══════ PAGE 7 — Part A: Personal Details ═══════ */}
        <PageWrap>
          <PageHeader page={7} />
          <SectionHeader title="Part A — Your personal details" sub="Complete all questions in this section" />

          <Q num={1} label="Title" id="title">
            <SelectF id="title" options={["Mr", "Mrs", "Ms", "Miss", "Dr"]} />
          </Q>
          <Q num={2} label="Family name" id="familyName"><TextF id="familyName" /></Q>
          <Q num={3} label="First given name" id="firstName"><TextF id="firstName" /></Q>
          <Q num={4} label="Second given name" id="secondName"><TextF id="secondName" /></Q>
          <Q num={5} label="Have you been known by any other name(s)?" id="otherNames">
            <TextF id="otherNames" />
          </Q>
          <Q num={6} label="Date of birth" id="dob">{dateBoxes("dob")}</Q>
          <Q num={7} label="Sex" id="gender">
            <SelectF id="gender" options={["Male", "Female", "Other"]} />
          </Q>
          <Q num={8} label="Home address (not a PO Box)" id="permanentAddress"><TextF id="permanentAddress" /></Q>
          <Q num={9} label="Postcode" id="postcode">
            <div className="flex gap-0.5">
              {(val("postcode") || "    ").slice(0, 4).split("").map((c, i) => (
                <span key={i} className={`inline-flex h-[18px] w-[14px] items-center justify-center border border-gray-500 text-[10px] font-mono font-bold text-black ${hl("postcode") ? "bg-green-200" : c.trim() ? "bg-green-50" : "bg-gray-50"}`}>{c.trim()}</span>
              ))}
            </div>
          </Q>
          <Q num={10} label="Is your postal address the same as your home address?" id="postalAddressSame">
            <SelectF id="postalAddressSame" options={["Yes", "No"]} />
          </Q>
          {!postalSame && (
            <Q num={11} label="Postal address" id="postalAddress"><TextF id="postalAddress" /></Q>
          )}
        </PageWrap>

        {/* ═══════ PAGE 8 — Part A continued: Contact ═══════ */}
        <PageWrap>
          <PageHeader page={8} />
          <SectionHeader title="Part A — Your personal details (continued)" sub="Contact information" />

          <Q num={12} label="Home phone number" id="homePhone"><TextF id="homePhone" /></Q>
          <Q num={13} label="Mobile phone number" id="mobile"><TextF id="mobile" /></Q>
          <Q num={14} label="Email address" id="email"><TextF id="email" /></Q>
        </PageWrap>

        {/* ═══════ PAGE 9 — Part B: Residence ═══════ */}
        <PageWrap>
          <PageHeader page={9} />
          <SectionHeader title="Part B — Your residence" sub="Residency and citizenship details" />

          <Q num={15} label="Customer Reference Number (CRN)" id="crn"><TextF id="crn" /></Q>
          <Q num={16} label="Are you an Australian citizen?" id="australianCitizen">
            <SelectF id="australianCitizen" options={["Yes", "No"]} />
          </Q>
          {val("australianCitizen") !== "Yes" && (
            <>
              <Q num={17} label="Are you a permanent resident of Australia?" id="permanentResident">
                <SelectF id="permanentResident" options={["Yes", "No"]} />
              </Q>
              <Q num={18} label="What type of visa do you have?" id="visaType"><TextF id="visaType" /></Q>
            </>
          )}
          <Q num={19} label="Date of arrival in Australia" id="arrivalDate">{dateBoxes("arrivalDate")}</Q>
          <Q num={20} label="Country of birth" id="countryOfBirth"><TextF id="countryOfBirth" /></Q>
        </PageWrap>

        {/* ═══════ PAGE 10 — Part B continued ═══════ */}
        <PageWrap>
          <PageHeader page={10} />
          <SectionHeader title="Part B — Your residence (continued)" sub="Travel history" />

          <Q num={21} label="Have you travelled outside Australia in the last 12 months?" id="travelledOverseas">
            <SelectF id="travelledOverseas" options={["Yes", "No"]} />
          </Q>
          {val("travelledOverseas") === "Yes" && (
            <Q num={22} label="Travel dates — when did you leave and return?" id="travelDates"><TextF id="travelDates" /></Q>
          )}
        </PageWrap>

        {/* ═══════ PAGE 11 — Part C: Payment Details ═══════ */}
        <PageWrap>
          <PageHeader page={11} />
          <SectionHeader title="Part C — Payment details" sub="Tax and current payments" />

          <Q num={23} label="Tax File Number (TFN)" id="taxFileNumber"><TextF id="taxFileNumber" /></Q>
          <Q num={24} label="Are you currently receiving any Centrelink payments?" id="receivingPayment">
            <SelectF id="receivingPayment" options={["Yes", "No"]} />
          </Q>
          {val("receivingPayment") === "Yes" && (
            <Q num={25} label="What payment are you currently receiving?" id="currentPaymentType"><TextF id="currentPaymentType" /></Q>
          )}
          <Q num={26} label="Date you want this pension to start" id="claimStartDate">{dateBoxes("claimStartDate")}</Q>
          <Q num={27} label="Do you need an interpreter?" id="interpreterNeeded">
            <SelectF id="interpreterNeeded" options={["Yes", "No"]} />
          </Q>
        </PageWrap>

        {/* ═══════ PAGE 12–13 — Part D: Disability ═══════ */}
        <PageWrap>
          <PageHeader page={12} />
          <SectionHeader title="Part D — Your disability or medical condition" sub="Details about your condition" />

          <Q num={28} label="Primary medical condition" id="primaryCondition"><TextF id="primaryCondition" /></Q>
          <Q num={29} label="When did this condition start?" id="conditionStartDate">{dateBoxes("conditionStartDate")}</Q>
          <Q num={30} label="Other medical conditions" id="otherConditions"><TextF id="otherConditions" /></Q>
          <Q num={31} label="Treating doctor's name" id="treatingDoctor"><TextF id="treatingDoctor" /></Q>
          <Q num={32} label="Doctor's address / clinic" id="doctorAddress"><TextF id="doctorAddress" /></Q>
          <Q num={33} label="Doctor's phone number" id="doctorPhone"><TextF id="doctorPhone" /></Q>
        </PageWrap>

        <PageWrap>
          <PageHeader page={13} />
          <SectionHeader title="Part D — Your disability (continued)" sub="Hospital, medication, aids" />

          <Q num={34} label="Have you been hospitalised in the last 12 months?" id="hospitalised">
            <SelectF id="hospitalised" options={["Yes", "No"]} />
          </Q>
          {val("hospitalised") === "Yes" && (
            <Q num={35} label="Hospital name and dates" id="hospitalDetails"><TextF id="hospitalDetails" /></Q>
          )}
          <Q num={36} label="Current medications" id="medication"><TextF id="medication" /></Q>
          <Q num={37} label="Aids or equipment used" id="mobilityAids"><TextF id="mobilityAids" /></Q>
          <Q num={38} label="Is your condition likely to be permanent?" id="conditionPermanent">
            <SelectF id="conditionPermanent" options={["Yes", "No", "Not sure"]} />
          </Q>
        </PageWrap>

        {/* ═══════ PAGE 14–15 — Part E: Work History ═══════ */}
        <PageWrap>
          <PageHeader page={14} />
          <SectionHeader title="Part E — Your work history" sub="Current and past employment" />

          <Q num={39} label="Are you currently working?" id="currentlyWorking">
            <SelectF id="currentlyWorking" options={["Yes", "No"]} />
          </Q>
          {val("currentlyWorking") === "Yes" && (
            <>
              <Q num={40} label="Employer name" id="employerName"><TextF id="employerName" /></Q>
              <Q num={41} label="Hours per week" id="hoursPerWeek"><TextF id="hoursPerWeek" /></Q>
              <Q num={42} label="Weekly pay (before tax)" id="weeklyPay"><TextF id="weeklyPay" /></Q>
            </>
          )}
          <Q num={43} label="When did you last work?" id="lastWorkedDate">{dateBoxes("lastWorkedDate")}</Q>
        </PageWrap>

        <PageWrap>
          <PageHeader page={15} />
          <SectionHeader title="Part E — Work history (continued)" sub="Work capacity" />

          <Q num={44} label="Are you currently looking for work?" id="lookingForWork">
            <SelectF id="lookingForWork" options={["Yes", "No"]} />
          </Q>
          <Q num={45} label="Could you work 15 or more hours per week?" id="workCapacity">
            <SelectF id="workCapacity" options={["Yes", "No", "Not sure"]} />
          </Q>
        </PageWrap>

        {/* ═══════ PAGE 16–18 — Part F: Income & Assets ═══════ */}
        <PageWrap>
          <PageHeader page={16} />
          <SectionHeader title="Part F — Income and assets" sub="Property, savings, and investments" />

          <Q num={46} label="Do you own the home you live in?" id="ownHome">
            <SelectF id="ownHome" options={["Yes", "No"]} />
          </Q>
          {val("ownHome") !== "Yes" && (
            <Q num={47} label="Weekly rent amount" id="rentAmount"><TextF id="rentAmount" /></Q>
          )}
          <Q num={48} label="Total bank balance (all accounts)" id="bankBalance"><TextF id="bankBalance" /></Q>
        </PageWrap>

        <PageWrap>
          <PageHeader page={17} />
          <SectionHeader title="Part F — Income and assets (continued)" sub="Investments and super" />

          <Q num={49} label="Do you own shares or investments?" id="hasShares">
            <SelectF id="hasShares" options={["Yes", "No"]} />
          </Q>
          {val("hasShares") === "Yes" && (
            <Q num={50} label="Total value of shares/investments" id="sharesValue"><TextF id="sharesValue" /></Q>
          )}
          <Q num={51} label="Do you have superannuation?" id="hasSuperannuation">
            <SelectF id="hasSuperannuation" options={["Yes", "No", "Not sure"]} />
          </Q>
          {val("hasSuperannuation") !== "No" && (
            <Q num={52} label="Super fund name" id="superFundName"><TextF id="superFundName" /></Q>
          )}
        </PageWrap>

        <PageWrap>
          <PageHeader page={18} />
          <SectionHeader title="Part F — Income and assets (continued)" sub="Vehicle and compensation" />

          <Q num={53} label="Do you own a vehicle?" id="hasVehicle">
            <SelectF id="hasVehicle" options={["Yes", "No"]} />
          </Q>
          {val("hasVehicle") === "Yes" && (
            <Q num={54} label="Vehicle type and value" id="vehicleDetails"><TextF id="vehicleDetails" /></Q>
          )}
          <Q num={55} label="Have you received or expect compensation?" id="receivingCompensation">
            <SelectF id="receivingCompensation" options={["Yes", "No"]} />
          </Q>
          {val("receivingCompensation") === "Yes" && (
            <Q num={56} label="Compensation details" id="compensationDetails"><TextF id="compensationDetails" /></Q>
          )}
        </PageWrap>

        {/* ═══════ PAGE 19–20 — Part G: Partner ═══════ */}
        <PageWrap>
          <PageHeader page={19} />
          <SectionHeader title="Part G — Your partner" sub="Partner details (if applicable)" />

          <Q num={57} label="Do you have a partner?" id="hasPartner">
            <SelectF id="hasPartner" options={["Yes", "No"]} />
          </Q>
          {val("hasPartner") === "Yes" && (
            <>
              <Q num={58} label="Partner's full name" id="partnerName"><TextF id="partnerName" /></Q>
              <Q num={59} label="Partner's date of birth" id="partnerDob">{dateBoxes("partnerDob")}</Q>
              <Q num={60} label="Partner's CRN" id="partnerCrn"><TextF id="partnerCrn" /></Q>
              <Q num={61} label="Is your partner working?" id="partnerWorking">
                <SelectF id="partnerWorking" options={["Yes", "No"]} />
              </Q>
              {val("partnerWorking") === "Yes" && (
                <Q num={62} label="Partner's weekly income (before tax)" id="partnerIncome"><TextF id="partnerIncome" /></Q>
              )}
            </>
          )}
        </PageWrap>

        {val("hasPartner") === "Yes" && (
          <PageWrap>
            <PageHeader page={20} />
            <SectionHeader title="Part G — Your partner (continued)" sub="Partner payments" />

            <Q num={63} label="Is your partner receiving Centrelink payments?" id="partnerReceivingPayment">
              <SelectF id="partnerReceivingPayment" options={["Yes", "No"]} />
            </Q>
            {val("partnerReceivingPayment") === "Yes" && (
              <Q num={64} label="What payment is your partner receiving?" id="partnerPaymentType"><TextF id="partnerPaymentType" /></Q>
            )}
          </PageWrap>
        )}

        {/* ═══════ PAGE 21 — Part H: Bank Account ═══════ */}
        <PageWrap>
          <PageHeader page={21} />
          <SectionHeader title="Part H — Bank account details" sub="Where your payments will be deposited" />

          <Q num={65} label="Bank name" id="bankName"><TextF id="bankName" /></Q>
          <Q num={66} label="BSB number" id="bsb"><TextF id="bsb" /></Q>
          <Q num={67} label="Account number" id="accountNumber"><TextF id="accountNumber" /></Q>
          <Q num={68} label="Account holder name" id="accountName"><TextF id="accountName" /></Q>
          <Q num={69} label="Account type" id="accountType">
            <SelectF id="accountType" options={["Savings", "Cheque"]} />
          </Q>
        </PageWrap>

        {/* ═══════ PAGE 22 — Part I: Declaration ═══════ */}
        <PageWrap>
          <PageHeader page={22} />
          <SectionHeader title="Part I — Declaration" sub="Read carefully before signing" />

          <div className="mb-4 rounded border border-gray-300 bg-gray-50 p-3 text-[9px] text-gray-700 leading-relaxed">
            <p className="font-bold mb-1">I declare that:</p>
            <ul className="list-disc ml-4 space-y-0.5">
              <li>The information I have provided in this form is complete and correct.</li>
              <li>I understand giving false or misleading information is a serious offence.</li>
              <li>I have read and understood the privacy notice.</li>
            </ul>
          </div>

          <Q num={70} label="Date of declaration" id="declarationDate">{dateBoxes("declarationDate")}</Q>

          <div ref={setRef("declarationSignature")} className="mb-3 mt-4">
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-[9px] font-bold text-gray-700">71</span>
              <span className="text-[9px] font-semibold text-gray-700">Your signature</span>
            </div>
            <div className="ml-3 h-[40px] border-b-2 border-gray-600 flex items-end">
              <span className="text-[9px] text-gray-400 italic mb-1">✍️ Sign here after printing</span>
            </div>
          </div>
        </PageWrap>

      </div>
    </div>
  );
};

export default SA466FormPreview;
