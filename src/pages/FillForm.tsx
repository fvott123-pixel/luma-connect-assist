import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TopBar from "@/components/landing/TopBar";
import StickyNav from "@/components/landing/StickyNav";
import Footer from "@/components/landing/Footer";
import DocumentVault from "@/components/DocumentVault";
import FormFillingChat from "@/components/FormFillingChat";
import PdfPreview from "@/components/PdfPreview";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { loadSession, loadSessionByCode, clearSession, type FormSession } from "@/lib/formSession";
import { prefillSA466, downloadPdf } from "@/lib/prefillSA466";

const serviceNames: Record<string, string> = {
  "disability-support": "Disability Support Pension (SA466)",
};

const FillForm = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { dir, t } = useLanguage();

  const [phase, setPhase] = useState<"resume-check" | "vault" | "filling">("resume-check");
  const [prefilled, setPrefilled] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastAnsweredField, setLastAnsweredField] = useState<string | null>(null);
  const [resumedSession, setResumedSession] = useState<FormSession | null>(null);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [extractionSummary, setExtractionSummary] = useState<string[]>([]);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [downloadComplete, setDownloadComplete] = useState(false);

  const handleAnswersChange = useCallback((newAnswers: Record<string, string>) => {
    setAnswers(newAnswers);
  }, []);

  if (!slug || !serviceNames[slug]) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <p className="text-lg text-foreground">This form is not yet available for Luma's guided filling.</p>
        <button onClick={() => navigate("/")} className="mt-4 text-sm font-bold text-primary underline">
          Go back home
        </button>
      </div>
    );
  }

  // Check for saved session on first render
  if (phase === "resume-check") {
    const saved = loadSession(slug);
    if (saved && Object.keys(saved.answers).length > 0) {
      return (
        <div className="min-h-screen bg-background" dir={dir}>
          <TopBar />
          <StickyNav />
          <main className="mx-auto max-w-lg px-4 py-16">
            <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
              <span className="text-5xl">👋</span>
              <h2 className="mt-4 font-serif text-xl font-bold text-foreground">Welcome back!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                I saved your progress last time — you answered{" "}
                <span className="font-bold text-foreground">
                  {Object.keys(saved.answers).filter(k => saved.answers[k] && saved.answers[k].toLowerCase() !== "none").length}
                </span>{" "}
                questions. Would you like to continue where you left off?
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Session code: <span className="font-mono font-bold text-foreground">{saved.sessionCode}</span>
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setResumedSession(saved);
                    setAnswers(saved.answers);
                    setPhase("filling");
                  }}
                  className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90"
                >
                  ✅ Yes, continue
                </button>
                <button
                  onClick={() => {
                    clearSession(slug);
                    setPhase("vault");
                  }}
                  className="rounded-xl border border-border bg-background px-6 py-3 text-sm font-bold text-foreground transition-all hover:bg-muted"
                >
                  🔄 Start fresh
                </button>
              </div>

              <div className="mt-8 border-t border-border pt-6">
                <p className="text-xs text-muted-foreground mb-2">Or recover a different session with a code:</p>
                <div className="flex gap-2 justify-center">
                  <input
                    value={recoveryCode}
                    onChange={e => setRecoveryCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit code"
                    className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-center font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={() => {
                      const found = loadSessionByCode(recoveryCode);
                      if (found) {
                        setResumedSession(found);
                        setAnswers(found.answers);
                        setPhase("filling");
                        toast.success("Session recovered! Continuing your form.");
                      } else {
                        toast.error("No session found with that code.");
                      }
                    }}
                    disabled={recoveryCode.length !== 6}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                  >
                    Recover
                  </button>
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      );
    }
    // No saved session — go to vault
    setPhase("vault");
    return null;
  }

  const handleVaultComplete = (extracted: Record<string, string>, summary: string[]) => {
    setPrefilled(extracted);
    setAnswers(extracted);
    setExtractionSummary(summary);
    setPhase("filling");
  };

  const handleSkipVault = () => {
    setPhase("filling");
  };

  const handleDownloadClick = async () => {
    setIsGenerating(true);
    try {
      console.log("Starting pdf-lib PDF generation with answers:", Object.keys(answers).length);
      const pdfBytes = await prefillSA466(answers, signatureDataUrl);
      const today = new Date().toLocaleDateString("en-AU").replace(/\//g, "-");
      downloadPdf(pdfBytes, `SA466-DSP-completed-${today}.pdf`);
      console.log("PDF download triggered successfully");
      clearSession(slug);
      setDownloadComplete(true);
    } catch (err: any) {
      console.error("PDF generation error:", err?.message, err?.stack);
      toast.error("Could not generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (phase === "vault") {
    return (
      <div className="min-h-screen bg-background" dir={dir}>
        <TopBar />
        <StickyNav />
        <main className="mx-auto max-w-2xl px-4 py-6">
          <button onClick={() => navigate("/")} className="mb-4 text-sm font-semibold text-primary hover:underline">
            ← Back
          </button>
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <DocumentVault onComplete={handleVaultComplete} onSkipAll={handleSkipVault} />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" dir={dir}>
      <TopBar />
      <StickyNav />
      <main className="flex flex-col flex-1 min-h-0 px-4 py-2 mx-auto w-full max-w-7xl">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate("/")} className="text-sm font-semibold text-primary hover:underline">
            {t("form.back")}
          </button>
          {isComplete && !downloadComplete && (
            <button
              onClick={handleDownloadClick}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50 shadow-lg"
            >
              {isGenerating && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              )}
              {isGenerating ? t("form.generating") : t("form.downloadPdf")}
            </button>
          )}
        </div>

        {/* Extraction summary banner */}
        {extractionSummary.length > 0 && (
          <div className="mb-2 rounded-xl border border-green-500/30 bg-green-50 dark:bg-green-900/10 px-4 py-2">
            <p className="text-[11px] font-bold text-foreground">{t("form.prefilledBanner")}</p>
            {extractionSummary.map((s, i) => (
              <p key={i} className="text-[10px] text-foreground/70">✅ {s}</p>
            ))}
          </div>
        )}

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col min-h-[400px] lg:min-h-0 overflow-hidden">
            <FormFillingChat
              serviceSlug={slug}
              prefilled={prefilled}
              onAnswersChange={handleAnswersChange}
              onComplete={() => setIsComplete(true)}
              onFieldAnswered={setLastAnsweredField}
              resumedAnswers={resumedSession?.answers}
              resumedFieldIndex={resumedSession?.fieldIndex}
            />
          </div>
          <div id="form-preview-panel" className="flex flex-col min-h-[350px] lg:min-h-0 overflow-hidden">
            <PdfPreview answers={answers} scrollToField={lastAnsweredField} onSignatureChange={setSignatureDataUrl} signatureDataUrl={signatureDataUrl} />
          </div>
        </div>

        {/* Post-download success message */}
        {downloadComplete && (
          <div className="mb-2 rounded-2xl border border-primary/20 bg-card p-6 text-center shadow-md">
            <span className="text-4xl">🎉</span>
            <p className="mt-3 text-sm font-medium text-foreground leading-relaxed">{t("form.downloadSuccess")}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => toast.info("Email feature coming soon!")}
                className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-bold text-foreground transition-all hover:bg-muted"
              >
                {t("form.emailToSelf")}
              </button>
              <button
                onClick={() => {
                  clearSession(slug);
                  setDownloadComplete(false);
                  setIsComplete(false);
                  setAnswers({});
                  setPrefilled({});
                  setPhase("vault");
                }}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:opacity-90"
              >
                {t("form.startOver")}
              </button>
            </div>
          </div>
        )}

        <div className="mt-2 rounded-xl border border-primary/15 bg-secondary px-4 py-2.5 flex gap-3 items-start">
          <span className="text-lg">🔒</span>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-bold text-primary">{t("form.privacyBanner")}</span> {t("form.privacyDesc")}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FillForm;
