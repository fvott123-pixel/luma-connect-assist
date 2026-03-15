import { useParams, useNavigate } from "react-router-dom";
import TopBar from "@/components/landing/TopBar";
import StickyNav from "@/components/landing/StickyNav";
import Footer from "@/components/landing/Footer";
import FormFillingChat from "@/components/FormFillingChat";
import { useLanguage } from "@/contexts/LanguageContext";

const serviceNames: Record<string, string> = {
  "disability-support": "Disability Support Pension (SA466)",
};

const FillForm = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { dir } = useLanguage();

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

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <TopBar />
      <StickyNav />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <button onClick={() => navigate(-1)} className="mb-6 text-sm font-semibold text-primary hover:underline">
          ← Back
        </button>

        <div className="mb-8 text-center">
          <span className="text-5xl">♿</span>
          <h1 className="mt-3 font-serif text-3xl font-extrabold text-foreground">
            Fill your {serviceName}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Luma will guide you through every question — one at a time, in plain language.
          </p>
        </div>

        <FormFillingChat serviceSlug={slug} />

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
