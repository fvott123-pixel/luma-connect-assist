import { useRef } from "react";

interface SA466FormPreviewProps {
  answers: Record<string, string>;
  scrollToField?: string | null;
}

/**
 * HTML replica of SA466 DSP form — Pages 7 & 8 (Personal Details).
 * Zero coordinate problems: we control the layout completely.
 * Supports window.print() for clean PDF output.
 */
const SA466FormPreview = ({ answers, scrollToField }: SA466FormPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const val = (key: string) => {
    const v = answers[key];
    if (!v || v.toLowerCase() === "none" || v.toLowerCase() === "skip") return "";
    return v;
  };

  const isHighlighted = (key: string) => scrollToField === key;

  const fieldClass = (key: string) =>
    `min-h-[24px] border-b border-gray-400 px-1 py-0.5 text-[11px] font-medium text-black transition-colors duration-500 ${
      isHighlighted(key) ? "bg-green-200 ring-2 ring-green-500" : "bg-transparent"
    }`;

  const tickBox = (key: string, option: string) => {
    const checked = val(key) === option;
    return (
      <span
        className={`inline-flex h-[14px] w-[14px] items-center justify-center border border-gray-600 text-[10px] font-bold ${
          checked ? "bg-green-100 text-green-700" : ""
        } ${isHighlighted(key) && checked ? "ring-2 ring-green-500" : ""}`}
      >
        {checked ? "✓" : ""}
      </span>
    );
  };

  const parseDob = () => {
    const d = val("dob");
    const m = d.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) return { dd: m[1].padStart(2, "0"), mm: m[2].padStart(2, "0"), yyyy: m[3].length === 2 ? `19${m[3]}` : m[3] };
    return { dd: "", mm: "", yyyy: "" };
  };
  const dob = parseDob();

  const postalSame = val("postalAddressSame") === "Yes";

  return (
    <div className="h-full w-full flex flex-col overflow-hidden rounded-xl border border-border bg-white">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 print:hidden">
        <span className="text-[10px] font-mono text-muted-foreground">
          SA466 Form Preview — HTML Mode
        </span>
        <button
          onClick={() => window.print()}
          className="rounded bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground hover:opacity-90"
        >
          🖨️ Print / Save PDF
        </button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto p-4 print:p-0 print:overflow-visible">
        {/* ═══════════ PAGE 7 — Personal Details ═══════════ */}
        <div className="sa466-page mx-auto mb-8 w-full max-w-[210mm] bg-white border border-gray-300 shadow-sm print:shadow-none print:border-0 print:mb-0 print:break-after-page">
          <div className="p-6 print:p-[15mm]">
            {/* Header */}
            <div className="mb-1 flex items-start justify-between">
              <div>
                <div className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Australian Government</div>
                <div className="text-[8px] text-gray-400">Services Australia</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-bold text-gray-500">SA466</div>
                <div className="text-[8px] text-gray-400">Page 7 of 28</div>
              </div>
            </div>

            <div className="mb-4 border-b-2 border-gray-800 pb-2">
              <h2 className="text-[14px] font-bold text-gray-900">Part A — Your personal details</h2>
              <p className="text-[8px] text-gray-500 mt-0.5">Complete all questions in this section</p>
            </div>

            {/* Q1 — Title */}
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9px] font-bold text-gray-700">1</span>
                <span className="text-[9px] font-semibold text-gray-700">Title</span>
              </div>
              <div className="flex items-center gap-3 ml-3">
                {["Mr", "Mrs", "Ms", "Miss", "Dr"].map(opt => (
                  <label key={opt} className="flex items-center gap-1 text-[10px] text-gray-700">
                    {tickBox("title", opt)} {opt}
                  </label>
                ))}
              </div>
            </div>

            {/* Q2 — Family name */}
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9px] font-bold text-gray-700">2</span>
                <span className="text-[9px] font-semibold text-gray-700">Family name</span>
              </div>
              <div className={`${fieldClass("familyName")} ml-3`}>{val("familyName")}</div>
            </div>

            {/* Q3 — First name */}
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9px] font-bold text-gray-700">3</span>
                <span className="text-[9px] font-semibold text-gray-700">First given name</span>
              </div>
              <div className={`${fieldClass("firstName")} ml-3`}>{val("firstName")}</div>
            </div>

            {/* Q4 — Second name */}
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9px] font-bold text-gray-700">4</span>
                <span className="text-[9px] font-semibold text-gray-700">Second given name</span>
              </div>
              <div className={`${fieldClass("secondName")} ml-3`}>{val("secondName")}</div>
            </div>

            {/* Q5 — Other names */}
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9px] font-bold text-gray-700">5</span>
                <span className="text-[9px] font-semibold text-gray-700">Have you been known by any other name(s)?</span>
              </div>
              <div className="flex items-center gap-3 ml-3 mb-1">
                <label className="flex items-center gap-1 text-[10px] text-gray-700">
                  {tickBox("otherNames", "")}
                  <span>No</span>
                </label>
                <label className="flex items-center gap-1 text-[10px] text-gray-700">
                  <span className={`inline-flex h-[14px] w-[14px] items-center justify-center border border-gray-600 text-[10px] font-bold ${val("otherNames") ? "bg-green-100 text-green-700" : ""}`}>
                    {val("otherNames") ? "✓" : ""}
                  </span>
                  <span>Yes — give details</span>
                </label>
              </div>
              {val("otherNames") && (
                <div className={`${fieldClass("otherNames")} ml-3`}>{val("otherNames")}</div>
              )}
            </div>

            {/* Q6 — Date of birth */}
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9px] font-bold text-gray-700">6</span>
                <span className="text-[9px] font-semibold text-gray-700">Date of birth</span>
              </div>
              <div className={`flex items-center gap-1 ml-3 ${isHighlighted("dob") ? "" : ""}`}>
                <div className="flex items-center gap-0.5">
                  {dob.dd.split("").map((c, i) => (
                    <span key={`dd${i}`} className={`inline-flex h-[20px] w-[16px] items-center justify-center border border-gray-500 text-[11px] font-mono font-bold text-black ${isHighlighted("dob") ? "bg-green-200" : "bg-gray-50"}`}>{c}</span>
                  ))}
                  {!dob.dd && [0, 1].map(i => (
                    <span key={`dd-e${i}`} className="inline-flex h-[20px] w-[16px] items-center justify-center border border-gray-400 bg-gray-50" />
                  ))}
                </div>
                <span className="text-[8px] text-gray-400 mx-0.5">/</span>
                <div className="flex items-center gap-0.5">
                  {dob.mm.split("").map((c, i) => (
                    <span key={`mm${i}`} className={`inline-flex h-[20px] w-[16px] items-center justify-center border border-gray-500 text-[11px] font-mono font-bold text-black ${isHighlighted("dob") ? "bg-green-200" : "bg-gray-50"}`}>{c}</span>
                  ))}
                  {!dob.mm && [0, 1].map(i => (
                    <span key={`mm-e${i}`} className="inline-flex h-[20px] w-[16px] items-center justify-center border border-gray-400 bg-gray-50" />
                  ))}
                </div>
                <span className="text-[8px] text-gray-400 mx-0.5">/</span>
                <div className="flex items-center gap-0.5">
                  {dob.yyyy.split("").map((c, i) => (
                    <span key={`yy${i}`} className={`inline-flex h-[20px] w-[16px] items-center justify-center border border-gray-500 text-[11px] font-mono font-bold text-black ${isHighlighted("dob") ? "bg-green-200" : "bg-gray-50"}`}>{c}</span>
                  ))}
                  {!dob.yyyy && [0, 1, 2, 3].map(i => (
                    <span key={`yy-e${i}`} className="inline-flex h-[20px] w-[16px] items-center justify-center border border-gray-400 bg-gray-50" />
                  ))}
                </div>
                <span className="text-[8px] text-gray-400 ml-2">Day / Month / Year</span>
              </div>
            </div>

            {/* Q7 — Gender */}
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9px] font-bold text-gray-700">7</span>
                <span className="text-[9px] font-semibold text-gray-700">Sex</span>
              </div>
              <div className="flex items-center gap-4 ml-3">
                {["Male", "Female", "Other"].map(opt => (
                  <label key={opt} className="flex items-center gap-1 text-[10px] text-gray-700">
                    {tickBox("gender", opt)} {opt}
                  </label>
                ))}
              </div>
            </div>

            {/* Q8 — Home address */}
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9px] font-bold text-gray-700">8</span>
                <span className="text-[9px] font-semibold text-gray-700">Home address (not a PO Box)</span>
              </div>
              <div className={`${fieldClass("permanentAddress")} ml-3`}>{val("permanentAddress")}</div>
            </div>

            {/* Q9 — Postcode */}
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9px] font-bold text-gray-700">9</span>
                <span className="text-[9px] font-semibold text-gray-700">Postcode</span>
              </div>
              <div className="flex items-center gap-0.5 ml-3">
                {(val("postcode") || "    ").slice(0, 4).split("").map((c, i) => (
                  <span key={`pc${i}`} className={`inline-flex h-[20px] w-[16px] items-center justify-center border border-gray-500 text-[11px] font-mono font-bold text-black ${isHighlighted("postcode") ? "bg-green-200" : c.trim() ? "bg-gray-50" : "bg-gray-50"}`}>
                    {c.trim() || ""}
                  </span>
                ))}
              </div>
            </div>

            {/* Q10 — Postal address same? */}
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9px] font-bold text-gray-700">10</span>
                <span className="text-[9px] font-semibold text-gray-700">Is your postal address the same as your home address?</span>
              </div>
              <div className="flex items-center gap-3 ml-3">
                {["Yes", "No"].map(opt => (
                  <label key={opt} className="flex items-center gap-1 text-[10px] text-gray-700">
                    {tickBox("postalAddressSame", opt)} {opt}
                  </label>
                ))}
              </div>
            </div>

            {/* Q11 — Postal address */}
            {!postalSame && (
              <div className="mb-3">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[9px] font-bold text-gray-700">11</span>
                  <span className="text-[9px] font-semibold text-gray-700">Postal address</span>
                </div>
                <div className={`${fieldClass("postalAddress")} ml-3`}>{val("postalAddress")}</div>
              </div>
            )}

            <div className="mt-6 text-center text-[7px] text-gray-400">
              SA466 — Claim for Disability Support Pension — Page 7
            </div>
          </div>
        </div>

        {/* ═══════════ PAGE 8 — Contact Details ═══════════ */}
        <div className="sa466-page mx-auto mb-8 w-full max-w-[210mm] bg-white border border-gray-300 shadow-sm print:shadow-none print:border-0 print:mb-0 print:break-after-page">
          <div className="p-6 print:p-[15mm]">
            {/* Header */}
            <div className="mb-1 flex items-start justify-between">
              <div>
                <div className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Australian Government</div>
                <div className="text-[8px] text-gray-400">Services Australia</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-bold text-gray-500">SA466</div>
                <div className="text-[8px] text-gray-400">Page 8 of 28</div>
              </div>
            </div>

            <div className="mb-4 border-b-2 border-gray-800 pb-2">
              <h2 className="text-[14px] font-bold text-gray-900">Part A — Your personal details (continued)</h2>
              <p className="text-[8px] text-gray-500 mt-0.5">Contact information</p>
            </div>

            {/* Q12 — Home phone */}
            <div className="mb-4">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9px] font-bold text-gray-700">12</span>
                <span className="text-[9px] font-semibold text-gray-700">Home phone number</span>
              </div>
              <div className={`${fieldClass("homePhone")} ml-3 max-w-[200px]`}>{val("homePhone")}</div>
            </div>

            {/* Q13 — Mobile */}
            <div className="mb-4">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9px] font-bold text-gray-700">13</span>
                <span className="text-[9px] font-semibold text-gray-700">Mobile phone number</span>
              </div>
              <div className={`${fieldClass("mobile")} ml-3 max-w-[200px]`}>{val("mobile")}</div>
            </div>

            {/* Q14 — Email */}
            <div className="mb-4">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9px] font-bold text-gray-700">14</span>
                <span className="text-[9px] font-semibold text-gray-700">Email address</span>
              </div>
              <div className={`${fieldClass("email")} ml-3`}>{val("email")}</div>
            </div>

            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-[9px] text-blue-800 font-medium">
                ℹ️ More sections will appear here as they are built — Residence, Payment, Disability, Work History, Income, Partner, Bank, and Declaration.
              </p>
            </div>

            <div className="mt-6 text-center text-[7px] text-gray-400">
              SA466 — Claim for Disability Support Pension — Page 8
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SA466FormPreview;
