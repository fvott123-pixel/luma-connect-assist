import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const CTASection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <section className="bg-cream px-4 py-20">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[26px] border border-cream-border bg-card">
        <div className="grid grid-cols-1 gap-8 p-8 sm:p-12 md:grid-cols-2">
          <div>
            <h2 className="mb-4 font-serif text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
              {t("cta.heading")}
            </h2>
            <p className="text-ink-body leading-relaxed">
              {t("cta.desc")}
            </p>
          </div>

          <div className="flex flex-col items-stretch justify-center gap-3">
            <button
              onClick={(e) => { e.preventDefault(); navigate("/chat"); }}
              className="rounded-full bg-forest px-6 py-3.5 text-center font-bold text-primary-foreground transition-all hover:bg-forest-hover hover:-translate-y-0.5"
            >
              {t("cta.getHelp")}
            </button>
            <button
              onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="rounded-full border-2 border-forest bg-transparent px-6 py-3 text-center font-bold text-forest transition-all hover:bg-forest-light"
            >
              {t("cta.chooseLang")}
            </button>
            <p className="mt-2 text-center text-sm text-ink-muted">
              {t("cta.questions")}{" "}
              <a href="mailto:admin@northerncommunitycaresa.org.au" className="font-semibold text-forest underline">
                {t("cta.emailUs")}
              </a>{" "}
              {t("cta.replyTime")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
