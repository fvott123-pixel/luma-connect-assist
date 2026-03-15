import { SA466_FIELDS } from "@/lib/formMaps/sa466Fields";

interface FieldReviewModalProps {
  answers: Record<string, string>;
  onConfirm: () => void;
  onFixField: (fieldId: string) => void;
}

const SUSPICIOUS_PATTERNS = /^(tes|tst|test|n|y|forgot|asdf|aaa|bbb|xxx|zzz|abc|qwerty|\.{1,3}|—|-|na)$/i;
const SHORT_SUSPICIOUS = (v: string) => v.length <= 2 && !/^(mr|ms|no)$/i.test(v);

function getSuspiciousFields(answers: Record<string, string>) {
  const issues: { fieldId: string; label: string; value: string; reason: string }[] = [];

  for (const field of SA466_FIELDS) {
    if (field.id === "declarationComplete" || field.id === "declarationSignature") continue;
    const v = answers[field.id];

    if (field.required && (!v || v.trim() === "")) {
      issues.push({ fieldId: field.id, label: field.label, value: "(empty)", reason: "Required field is empty" });
      continue;
    }

    if (!v) continue;
    const trimmed = v.trim();

    if (SUSPICIOUS_PATTERNS.test(trimmed)) {
      issues.push({ fieldId: field.id, label: field.label, value: trimmed, reason: "Looks like a test or incomplete entry" });
    } else if (field.fieldType === "text" && field.required && SHORT_SUSPICIOUS(trimmed)) {
      issues.push({ fieldId: field.id, label: field.label, value: trimmed, reason: "Very short answer — might be incomplete" });
    }
  }
  return issues;
}

const FieldReviewModal = ({ answers, onConfirm, onFixField }: FieldReviewModalProps) => {
  const issues = getSuspiciousFields(answers);

  if (issues.length === 0) {
    return null; // No issues — caller should proceed directly
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="text-center mb-4">
          <span className="text-3xl">⚠️</span>
          <h2 className="mt-2 font-serif text-lg font-bold text-foreground">
            A few fields might need checking
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            I noticed {issues.length} field{issues.length > 1 ? "s" : ""} that look incomplete or unusual. Would you like to review them before downloading?
          </p>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
          {issues.map(issue => (
            <div
              key={issue.fieldId}
              className="flex items-center justify-between rounded-xl border border-orange-300 bg-orange-50 dark:bg-orange-900/10 px-3 py-2"
            >
              <div>
                <p className="text-xs font-bold text-foreground">{issue.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  Current value: <span className="font-mono font-bold text-orange-600">"{issue.value}"</span>
                  {" · "}{issue.reason}
                </p>
              </div>
              <button
                onClick={() => onFixField(issue.fieldId)}
                className="ml-2 shrink-0 rounded-lg border border-primary bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all"
              >
                Fix
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={onConfirm}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:opacity-90"
          >
            ✅ Looks good — download anyway
          </button>
        </div>
      </div>
    </div>
  );
};

export default FieldReviewModal;
export { getSuspiciousFields };
