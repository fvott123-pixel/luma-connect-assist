import { useNavigate } from "react-router-dom";
import LumaAvatar from "./LumaAvatar";
import { useLanguage, type LangCode } from "@/contexts/LanguageContext";

const languageCards = [
  { flag: "🇦🇺", code: "EN" as LangCode, name: "English", native: "English", btnKey: "hero.getStarted" },
  { flag: "🇸🇦", code: "AR" as LangCode, name: "Arabic", native: "العربية", btnKey: "hero.getStarted" },
  { flag: "🇳🇵", code: "NP" as LangCode, name: "Nepali", native: "नेपाली", btnKey: "hero.getStarted" },
  { flag: "🇮🇹", code: "IT" as LangCode, name: "Italian", native: "Italiano", btnKey: "hero.getStarted" },
  { flag: "🇻🇳", code: "VI" as LangCode, name: "Vietnamese", native: "Tiếng Việt", btnKey: "hero.getStarted" },
];

const serviceCards = [
  { icon: "♿", amount: "$1,116/fn", nameKey: "service.dsp", slug: "disability-support" },
  { icon: "🏥", amount: "Free", nameKey: "service.medicare", slug: "medicare" },
  { icon: "🤝", amount: "Funding", nameKey: "service.ndis", slug: "ndis-access" },
  { icon: "👴", amount: "Home care", nameKey: "service.agedCare", slug: "aged-care" },
  { icon: "❤️", amount: "$800+/fn", nameKey: "service.carer", slug: "carer-payment" },
  { icon: "🦘", amount: "$1,020/fn", nameKey: "service.agePension", slug: "age-pension" },
];

const HeroSection = ({ onOpenChat }: { onOpenChat?: () => void }) => {
  const navigate = useNavigate();
  const { t, setLang, dir } = useLanguage();

  const trustItems = [
    { icon: "✅", title: t("trust.free"), sub: t("trust.freeSub") },
    { icon: "🔒", title: t("trust.private"), sub: t("trust.privateSub") },
    { icon: "📬", title: t("trust.noMyGov"), sub: t("trust.noMyGovSub") },
    { icon: "🇦🇺", title: t("trust.charity"), sub: t("trust.charitySub") },
    { icon: "🌍", title: t("trust.languages"), sub: t("trust.languagesSub") },
  ];

  return (
    <section className="bg-cream px-4 pb-16 pt-11" dir={dir}>
      <div className="mx-auto max-w-[800px] text-center">
        {/* Org name */}
        <div className="animate-fade-up delay-1 mb-4 flex items-center justify-center gap-2 font-serif text-lg text-forest">
          <span className="animate-pulse-dot inline-block h-2 w-2 rounded-full bg-forest" />
          {t("hero.orgLabel")}
          <span className="animate-pulse-dot inline-block h-2 w-2 rounded-full bg-forest" />
        </div>

        {/* Badge */}
        <div className="animate-fade-up delay-2 mb-6">
          <span className="inline-block rounded-full bg-forest-light px-4 py-1.5 text-xs font-semibold text-forest">
            {t("hero.badge")}
          </span>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up delay-3 mb-5 font-serif text-4xl font-extrabold leading-tight text-ink sm:text-5xl lg:text-[54px]">
          {t("hero.headline1")}{" "}
          <em className="text-forest">{t("hero.headline2")}</em>
          <br />
          {t("hero.headline3")}
        </h1>

        {/* Subheading */}
        <p className="animate-fade-up delay-4 mx-auto mb-8 max-w-xl text-lg text-ink-body">
          {t("hero.subheading")}
        </p>

        {/* Language prompt */}
        <div className="animate-fade-up delay-5 mb-6 flex items-center justify-center gap-3">
          <div className="h-px w-12 bg-cream-border" />
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            {t("hero.chooseLang")}
          </span>
          <div className="h-px w-12 bg-cream-border" />
        </div>

        {/* Language cards */}
        <div className="animate-fade-up delay-5 mx-auto mb-4 grid max-w-[800px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {languageCards.map((lang) => (
            <div
              key={lang.code}
              className="card-hover group relative cursor-pointer overflow-hidden rounded-[14px] border border-cream-border bg-card p-4 text-center"
              onClick={(e) => { e.preventDefault(); setLang(lang.code); }}
            >
              <div className="mb-1 text-2xl">{lang.flag}</div>
              <div className="text-xs font-bold uppercase tracking-wider text-ink-muted">{lang.code}</div>
              <div className="text-sm font-bold text-ink">{lang.name}</div>
              <div className="mb-3 text-xs text-ink-muted">{lang.native}</div>
              <span className="w-full inline-block rounded-lg border border-forest/20 bg-forest-light px-3 py-1.5 text-xs font-bold text-forest transition-colors group-hover:bg-forest group-hover:text-primary-foreground">
                {t("hero.getStarted")}
              </span>
            </div>
          ))}
        </div>

        {/* Language note */}
        <p className="animate-fade-up delay-6 mb-8 text-sm text-ink-muted">
          {t("hero.langNote")}{" "}
          <strong className="text-forest">{t("hero.everything")}</strong>
        </p>

        {/* Trust strip */}
        <div className="animate-fade-up delay-6 mx-auto mb-10 flex flex-wrap items-center justify-center gap-6 border-y border-cream-border py-4">
          {trustItems.map((item) => (
            <div key={item.title} className="flex items-center gap-2">
              <span className="text-base">{item.icon}</span>
              <div className="text-left">
                <div className="text-xs font-bold text-ink">{item.title}</div>
                <div className="text-[11px] text-ink-muted">{item.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Services heading */}
        <h2 className="animate-fade-up delay-7 mb-6 font-serif text-xl font-bold text-ink">
          {t("hero.servicesHeading")}
        </h2>

        {/* Service cards */}
        <div className="animate-fade-up delay-7 mx-auto mb-10 grid max-w-[800px] grid-cols-2 gap-3 sm:grid-cols-3">
          {serviceCards.map((svc) => (
            <div
              key={svc.slug}
              className="card-hover group relative cursor-pointer overflow-hidden rounded-[14px] border border-cream-border bg-card p-4 text-left"
              onClick={(e) => { e.preventDefault(); navigate(`/service/${svc.slug}`); }}
            >
              <span className="text-[22px]">{svc.icon}</span>
              <div className="mt-1 text-[11px] font-bold text-gold">{svc.amount}</div>
              <div className="font-serif text-sm font-bold text-ink">{t(svc.nameKey)}</div>
              <div className="mt-1 text-xs font-semibold text-forest">{t("hero.getStarted")}</div>
            </div>
          ))}
        </div>

        {/* Safety notice */}
        <div className="animate-fade-up delay-8 mx-auto mb-10 max-w-[800px] rounded-[14px] border border-forest/15 bg-forest-light p-5 text-left">
          <div className="flex gap-4">
            <span className="text-[28px]">🔒</span>
            <div>
              <h3 className="mb-1 font-serif text-[15px] font-bold text-forest">
                {t("hero.safetyTitle")}
              </h3>
              <p className="text-[13px] leading-relaxed text-ink-body">
                {t("hero.safetyDesc")}
              </p>
            </div>
          </div>
        </div>

        {/* Luma chat strip */}
        <div className="animate-fade-up delay-9 mx-auto max-w-[800px] overflow-hidden rounded-2xl border border-cream-border bg-card">
          <div className="flex items-center gap-3 bg-forest px-5 py-3">
            <LumaAvatar size={36} />
            <div className="text-left">
              <div className="font-serif text-sm font-bold text-primary-foreground">
                {t("hero.lumaGreeting")}{" "}
                <span className="ml-2 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px] font-semibold">
                  {t("hero.lumaTag")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-primary-foreground/70">
                <span className="animate-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-mint" />
                {t("hero.lumaOnline")}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 bg-forest-pale p-5 md:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-bold text-ink-muted">🇸🇦 Arabic</div>
              <div className="space-y-2">
                <div className="rounded-xl bg-card p-3 text-right text-sm text-ink-body" dir="rtl">مرحباً! هل تحتاج مساعدة في طلب دعم الإعاقة؟</div>
                <div className="rounded-xl bg-forest p-3 text-right text-sm text-primary-foreground" dir="rtl">نعم، لكن ليس عندي myGov</div>
                <div className="rounded-xl bg-card p-3 text-right text-sm text-ink-body" dir="rtl">لا مشكلة! لا تحتاج myGov. سأملأ النموذج وترسله بالبريد. 📬</div>
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-bold text-ink-muted">🇦🇺 English translation</div>
              <div className="space-y-2">
                <div className="rounded-xl bg-card p-3 text-sm text-ink-body">Hello! Do you need help with Disability Support Pension?</div>
                <div className="rounded-xl bg-forest p-3 text-sm text-primary-foreground">Yes, but I don't have myGov</div>
                <div className="rounded-xl bg-card p-3 text-sm text-ink-body">No problem — you don't need myGov. I'll fill the form and you post it. 📬</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-cream-border bg-card px-5 py-3">
            <p className="text-sm text-ink-body">
              {t("hero.lumaFooter")} <strong className="text-forest">{t("hero.completelyFree")}</strong>
            </p>
            <button
              onClick={(e) => { e.preventDefault(); onOpenChat?.(); }}
              className="rounded-full bg-forest px-5 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-forest-hover hover:-translate-y-0.5"
            >
              {t("hero.startWithLuma")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
