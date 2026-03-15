import { useParams, useNavigate, Navigate } from "react-router-dom";
import { getServiceBySlug } from "@/data/services";
import TopBar from "@/components/landing/TopBar";
import StickyNav from "@/components/landing/StickyNav";
import Footer from "@/components/landing/Footer";
import EligibilityChat from "@/components/EligibilityChat";
import { useLanguage } from "@/contexts/LanguageContext";

const descKeys: Record<string, string> = {
  "disability-support": "service.dsp.desc",
  "medicare": "service.medicare.desc",
  "ndis-access": "service.ndis.desc",
  "aged-care": "service.agedCare.desc",
  "carer-payment": "service.carer.desc",
  "age-pension": "service.agePension.desc",
};

const nameKeys: Record<string, string> = {
  "disability-support": "service.dsp",
  "medicare": "service.medicare",
  "ndis-access": "service.ndis",
  "aged-care": "service.agedCare",
  "carer-payment": "service.carer",
  "age-pension": "service.agePension",
};

const ServicePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t, dir } = useLanguage();
  const service = getServiceBySlug(slug || "");

  // DSP goes straight to form filling — no eligibility questions
  if (slug === "disability-support") {
    return <Navigate to="/fill-form/disability-support" replace />;
  }

  if (!service) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <p className="text-lg text-foreground">Service not found.</p>
        <button onClick={(e) => { e.preventDefault(); navigate("/"); }} className="mt-4 text-sm font-bold text-primary underline">
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
        <button onClick={(e) => { e.preventDefault(); navigate("/"); }} className="mb-6 text-sm font-semibold text-primary hover:underline">
          {t("service.back")}
        </button>

        <div className="mb-8 text-center">
          <span className="text-5xl">{service.icon}</span>
          <h1 className="mt-3 font-serif text-3xl font-extrabold text-foreground">{t(nameKeys[slug!] || service.name)}</h1>
          <div className="mt-2 inline-block rounded-full bg-gold-bg px-4 py-1 text-sm font-bold text-gold">
            {service.amount}
          </div>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            {t(descKeys[slug!] || service.description)}
          </p>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-center font-serif text-xl font-bold text-foreground">
            {t("service.checkEligibility")}
          </h2>
          <EligibilityChat service={service} />
        </div>

        <div className="rounded-2xl border border-primary/15 bg-secondary p-5">
          <div className="flex gap-4">
            <span className="text-[28px]">🔒</span>
            <div>
              <h3 className="mb-1 font-serif text-[15px] font-bold text-primary">
                {t("service.safetyTitle")}
              </h3>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {t("service.safetyDesc")}
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ServicePage;
