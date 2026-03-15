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

  const handleAnswersChange = useCallback((newAnswers: Record<string, string>) => {
    setAnswers(newAnswers);
  }, []);

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
    <div className="min-h-screen bg-background" dir={dir}>
      <TopBar />
      <StickyNav />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <button onClick={() => navigate("/")} className="mb-4 text-sm font-semibold text-primary hover:underline">
          ← Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ minHeight: "calc(100vh - 200px)" }}>
          {/* Left: Chat */}
          <div className="flex flex-col min-h-[500px] lg:min-h-0">
            <FormFillingChat
              serviceSlug={slug}
              prefilled={prefilled}
              onAnswersChange={handleAnswersChange}
              onComplete={() => setIsComplete(true)}
            />
          </div>

          {/* Right: Live PDF Preview */}
          <div className="flex flex-col gap-4 min-h-[500px] lg:min-h-0">
            <div className="flex-1 min-h-0">
              <PdfPreview answers={answers} />
            </div>

            {/* Download button */}
            {isComplete && (
              <button
                onClick={handleDownload}
                disabled={isGenerating}
                className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-all hover:bg-[hsl(var(--forest-hover))] disabled:opacity-50 shadow-lg"
              >
                {isGenerating ? "⏳ Generating PDF…" : "📥 Download completed form — ready to print and post"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-primary/15 bg-secondary p-5">
          <div className="flex gap-4">
            <span className="text-[28px]">🔒</span>
            <div>
              <h3 className="mb-1 font-serif text-[15px] font-bold text-primary">Your data stays private</h3>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Nothing is saved or sent to the government. Your answers are used only to fill the PDF on your device, then deleted. NCCSA is not connected to immigration or any enforcement agency.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FillForm;
