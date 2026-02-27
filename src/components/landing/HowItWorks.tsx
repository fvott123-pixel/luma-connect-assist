import LumaAvatar from "./LumaAvatar";
import { useLanguage } from "@/contexts/LanguageContext";

const HowItWorks = () => {
  const { t } = useLanguage();

  const steps = [
    { num: 1, icon: "🌍", titleKey: "howItWorks.step1", descKey: "howItWorks.step1desc" },
    { num: 2, icon: "💬", titleKey: "howItWorks.step2", descKey: "howItWorks.step2desc" },
    { num: 3, icon: "📸", titleKey: "howItWorks.step3", descKey: "howItWorks.step3desc" },
    { num: 4, icon: "✉️", titleKey: "howItWorks.step4", descKey: "howItWorks.step4desc" },
  ];

  return (
    <section className="border-t border-cream-border bg-cream-alt px-4 py-20">
      <div className="mx-auto max-w-6xl text-center">
        <span className="mb-4 inline-block rounded-full bg-forest-light px-4 py-1.5 text-xs font-bold text-forest">
          {t("howItWorks.badge")}
        </span>
        <h2 className="mb-3 font-serif text-3xl font-extrabold text-ink sm:text-4xl lg:text-[42px]">
          {t("howItWorks.heading")}
        </h2>
        <p className="mx-auto mb-12 max-w-lg text-ink-body">
          {t("howItWorks.sub")}
        </p>

        <div className="mx-auto mb-14 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.num} className="relative flex flex-col">
              <div className="card-hover relative flex-1 overflow-hidden rounded-[18px] border border-cream-border bg-card p-6 text-left">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-forest font-serif text-sm font-bold text-primary-foreground">
                  {step.num}
                </div>
                <span className="mb-2 block text-[22px]">{step.icon}</span>
                <h3 className="mb-2 font-serif text-base font-bold text-ink">{t(step.titleKey)}</h3>
                <p className="text-[13px] leading-relaxed text-ink-body">{t(step.descKey)}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="absolute -right-3 top-1/2 hidden text-xl text-ink-muted lg:block">→</div>
              )}
            </div>
          ))}
        </div>

        {/* Luma completion card */}
        <div className="mx-auto max-w-[720px] overflow-hidden rounded-2xl border border-cream-border bg-card">
          <div className="flex items-center gap-3 bg-forest px-5 py-3">
            <LumaAvatar size={42} />
            <div className="text-left">
              <div className="font-serif text-sm font-bold text-primary-foreground">
                Luma — completing your form now
              </div>
              <div className="text-[11px] text-primary-foreground/70">
                Reading your Medicare card and ID…
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 bg-forest-pale p-5 md:grid-cols-2">
            <div className="space-y-2">
              <div className="rounded-xl bg-card p-3 text-sm text-ink-body">
                ✅ Medicare card details found<br />
                ✅ Name matched across documents<br />
                ✅ Centrelink form is ready to print
              </div>
              <div className="rounded-xl bg-forest p-3 text-sm text-primary-foreground">
                Thank you Luma! What do I do next?
              </div>
            </div>
            <div className="space-y-2">
              <div className="rounded-xl bg-card p-3 text-sm text-ink-body">
                Print it → Sign it → Post it to Centrelink. That's it! 📬
                <br /><br />
                Your payments will start from today's date — not the approval date.
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-gold/25 bg-gold-bg px-6 py-5 sm:flex-row">
            <div className="text-left">
              <div className="mb-1 text-xs font-semibold text-gold">💛 Average annual value of a DSP approval</div>
              <div className="font-serif text-4xl font-bold text-ink">$29,000</div>
              <div className="text-sm text-ink-body">per year · starting from the day you post</div>
            </div>
            <button
              onClick={(e) => e.preventDefault()}
              className="whitespace-nowrap rounded-full bg-forest px-6 py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-forest-hover hover:-translate-y-0.5"
            >
              {t("cta.getHelp")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
