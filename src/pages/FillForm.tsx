import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TopBar from "@/components/landing/TopBar";
import StickyNav from "@/components/landing/StickyNav";
import Footer from "@/components/landing/Footer";
import IDUploadScreen from "@/components/IDUploadScreen";
import FormFillingChat from "@/components/FormFillingChat";
import PdfPreview from "@/components/PdfPreview";
import { prefillSA466, downloadPdf } from "@/lib/prefillSA466";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const serviceNames: Record<string, string> = {
  "disability-support": "Disability Support Pension (SA466)",
};

const FillForm = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { dir } = useLanguage();

  const [phase, setPhase] = useState<"upload" | "filling">("upload");
  const [prefilled, setPrefilled] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastAnsweredField, setLastAnsweredField] = useState<string | null>(null);

  const handleAnswersChange = useCallback((newAnswers: Record<string, string>) => {
    setAnswers(newAnswers);
  }, []);

  const serviceName = serviceNames[slug || ""] || "Form";

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

  const handleExtracted = (data: Record<string, string>) => {
    setPrefilled(data);
    setAnswers(data);
    setPhase("filling");
  };

  const handleSkip = () => {
    setPhase("filling");
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const data = { ...answers };
      if (data.postalAddress?.toLowerCase() === "same" || data.postalAddress?.toLowerCase() === "yes") {
        data.postalAddress = data.permanentAddress || "";
      }
      const pdfBytes = await prefillSA466(data);
      const today = new Date().toLocaleDateString("en-AU");
      downloadPdf(pdfBytes, `SA466-DSP-prefilled-${today}.pdf`);
      toast.success("Your completed form has been downloaded! 🎉 Ready to print and post.");
    } catch (err) {
      console.error("PDF error:", err);
      toast.error("Could not generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (phase === "upload") {
    return (
      <div className="min-h-screen bg-background" dir={dir}>
        <TopBar />
        <StickyNav />
        <main className="mx-auto max-w-2xl px-4 py-10">
          <button onClick={() => navigate("/")} className="mb-6 text-sm font-semibold text-primary hover:underline">
            ← Back
          </button>
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <IDUploadScreen onExtracted={handleExtracted} onSkip={handleSkip} />
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
            ← Back
          </button>
          {isComplete && (
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-[hsl(var(--forest-hover))] disabled:opacity-50 shadow-lg"
            >
              {isGenerating ? "⏳ Generating…" : "📥 Download PDF"}
            </button>
          )}
        </div>

        {/* Two-panel layout: fills remaining viewport */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Chat — fixed height, internal scroll */}
          <div className="flex flex-col min-h-[400px] lg:min-h-0 overflow-hidden">
            <FormFillingChat
              serviceSlug={slug}
              prefilled={prefilled}
              onAnswersChange={handleAnswersChange}
              onComplete={() => setIsComplete(true)}
              onFieldAnswered={setLastAnsweredField}
            />
          </div>

          {/* Right: PDF Preview — fixed height, internal scroll */}
          <div className="flex flex-col min-h-[350px] lg:min-h-0 overflow-hidden">
            <PdfPreview answers={answers} scrollToField={lastAnsweredField} />
          </div>
        </div>

        <div className="mt-2 rounded-xl border border-primary/15 bg-secondary px-4 py-2.5 flex gap-3 items-start">
          <span className="text-lg">🔒</span>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-bold text-primary">Your data stays private.</span> Nothing is saved or sent to the government. Answers fill the PDF on your device only.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FillForm;
