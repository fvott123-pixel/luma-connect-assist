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

  const handleDownloadClick = () => {
    doDownload();
  };

  const fallbackHtmlPrint = (previewEl: HTMLElement) => {
    console.log("Falling back to HTML print in new tab");
    try {
      const htmlContent = previewEl.innerHTML;
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML).join("\n");
      const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8">${styles}<style>body{margin:0;padding:20px;background:#fff;}</style></head><body>${htmlContent}</body></html>`], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (win) {
        win.onload = () => { win.print(); URL.revokeObjectURL(url); };
      } else {
        toast.error("Please allow popups to download your form.");
      }
    } catch (fallbackErr) {
      console.error("Fallback print also failed:", fallbackErr);
      toast.error("Could not generate PDF. Please try a different browser.");
    }
  };

  const doDownload = async () => {
    setIsGenerating(true);
    console.log("Starting PDF generation");
    console.log("html2canvas available:", typeof html2canvas);
    console.log("jsPDF available:", typeof jsPDF);

    const timeoutId = setTimeout(() => {
      console.error("PDF generation timed out after 15s");
      setIsGenerating(false);
      toast.error("Something went wrong. Please try again.");
    }, 15000);

    try {
      const previewEl = document.getElementById("form-preview-panel");
      console.log("Preview element found:", !!previewEl);
      if (!previewEl) {
        console.error("PDF: Form preview panel not found. Available IDs:", 
          Array.from(document.querySelectorAll("[id]")).map(el => el.id).join(", "));
        clearTimeout(timeoutId);
        setIsGenerating(false);
        toast.error("Could not find form preview. Please try again.");
        return;
      }

      // Swap signature pad for static image during capture
      const interactiveEls = previewEl.querySelectorAll(".signature-interactive");
      const staticEls = previewEl.querySelectorAll(".signature-static");
      interactiveEls.forEach(el => (el as HTMLElement).style.display = "none");
      staticEls.forEach(el => (el as HTMLElement).style.display = "block");

      // Remove highlight styles temporarily
      const highlighted = previewEl.querySelectorAll(".bg-green-200, .ring-2");
      highlighted.forEach(el => {
        (el as HTMLElement).dataset.origClass = (el as HTMLElement).className;
        (el as HTMLElement).className = (el as HTMLElement).className
          .replace(/bg-green-200/g, "bg-green-50")
          .replace(/ring-2\s*ring-green-500\s*rounded-sm/g, "");
      });

      // Capture all .sa466-page elements individually for proper A4 pages
      const pages = previewEl.querySelectorAll(".sa466-page");
      const A4_W = 210; // mm
      const A4_H = 297; // mm

      console.log(`Found ${pages.length} .sa466-page elements`);

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      if (pages.length > 0) {
        for (let i = 0; i < pages.length; i++) {
          console.log(`Capturing page ${i + 1} of ${pages.length}`);
          const page = pages[i] as HTMLElement;

          const canvas = await html2canvas(page, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: true,
            backgroundColor: "#ffffff",
          });

          console.log(`Page ${i + 1} canvas size: ${canvas.width}x${canvas.height}`);
          const imgData = canvas.toDataURL("image/png");

          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, 0, A4_W, A4_H);
        }
      } else {
        // No .sa466-page found, capture the whole panel
        console.log("No .sa466-page elements, capturing entire panel");
        console.log(`Panel size: ${previewEl.scrollWidth}x${previewEl.scrollHeight}`);
        
        const canvas = await html2canvas(previewEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: true,
          backgroundColor: "#ffffff",
        });

        console.log(`Full panel canvas: ${canvas.width}x${canvas.height}`);
        const imgData = canvas.toDataURL("image/png");
        const pxW = canvas.width;
        const pxH = canvas.height;
        const pdfW = A4_W;
        const pdfH = (pxH * pdfW) / pxW;
        
        // Handle multi-page if content is taller than A4
        let yOffset = 0;
        let pageNum = 0;
        while (yOffset < pdfH) {
          if (pageNum > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, -yOffset, pdfW, pdfH);
          yOffset += A4_H;
          pageNum++;
        }
      }

      const today = new Date().toLocaleDateString("en-AU").replace(/\//g, "-");
      const filename = `SA466-DSP-completed-${today}.pdf`;
      console.log(`Saving PDF as ${filename}`);
      pdf.save(filename);
      console.log("PDF download triggered successfully");

      // Restore signature pad & highlights
      interactiveEls.forEach(el => (el as HTMLElement).style.display = "");
      staticEls.forEach(el => (el as HTMLElement).style.display = "");
      highlighted.forEach(el => {
        if ((el as HTMLElement).dataset.origClass) {
          (el as HTMLElement).className = (el as HTMLElement).dataset.origClass!;
        }
      });

      clearTimeout(timeoutId);
      clearSession(slug);
      setIsGenerating(false);
      setDownloadComplete(true);
    } catch (err: any) {
      console.error("PDF generation error:", err);
      console.error("Error name:", err?.name);
      console.error("Error message:", err?.message);
      console.error("Error stack:", err?.stack);
      clearTimeout(timeoutId);
      
      // Fallback: open HTML in new tab for printing
      const previewEl = document.getElementById("form-preview-panel");
      if (previewEl) {
        fallbackHtmlPrint(previewEl);
      }
      
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
