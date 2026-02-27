import { useNavigate } from "react-router-dom";
import LumaAvatar from "./LumaAvatar";

const languageCards = [
  { flag: "🇦🇺", code: "AU", name: "English", native: "English", btn: "Start →" },
  { flag: "🇸🇦", code: "SA", name: "Arabic", native: "العربية", btn: "ابدأ →" },
  { flag: "🇳🇵", code: "NP", name: "Nepali", native: "नेपाली", btn: "सुरु →" },
  { flag: "🇮🇹", code: "IT", name: "Italian", native: "Italiano", btn: "Inizia →" },
  { flag: "🇻🇳", code: "VN", name: "Vietnamese", native: "Tiếng Việt", btn: "Bắt đầu →" },
];

const serviceCards = [
  { icon: "♿", amount: "$1,116/fn", name: "Disability Support Pension", slug: "disability-support" },
  { icon: "🏥", amount: "Free", name: "Medicare Enrolment", slug: "medicare" },
  { icon: "🤝", amount: "Funding", name: "NDIS Access Request", slug: "ndis-access" },
  { icon: "👴", amount: "Home care", name: "Aged Care Assessment", slug: "aged-care" },
  { icon: "❤️", amount: "$800+/fn", name: "Carer Payment", slug: "carer-payment" },
  { icon: "🦘", amount: "$1,020/fn", name: "Age Pension", slug: "age-pension" },
];

const trustItems = [
  { icon: "✅", title: "100% Free", sub: "No fees, ever" },
  { icon: "🔒", title: "Private & Secure", sub: "Docs deleted instantly" },
  { icon: "📬", title: "No myGov Needed", sub: "Postal route available" },
  { icon: "🇦🇺", title: "Registered Charity", sub: "Northern Adelaide" },
  { icon: "🌍", title: "5 Languages", sub: "Full site translation" },
];

const HeroSection = ({ onOpenChat }: { onOpenChat?: () => void }) => {
  const navigate = useNavigate();
  return (
    <section className="bg-cream px-4 pb-16 pt-11">
      <div className="mx-auto max-w-[800px] text-center">
        {/* Org name */}
        <div className="animate-fade-up delay-1 mb-4 flex items-center justify-center gap-2 font-serif text-lg text-forest">
          <span className="animate-pulse-dot inline-block h-2 w-2 rounded-full bg-forest" />
          Northern Community Care SA Inc
          <span className="animate-pulse-dot inline-block h-2 w-2 rounded-full bg-forest" />
        </div>

        {/* Badge */}
        <div className="animate-fade-up delay-2 mb-6">
          <span className="inline-block rounded-full bg-forest-light px-4 py-1.5 text-xs font-semibold text-forest">
            Northern Adelaide · 100% Free · No myGov Needed · Registered Charity
          </span>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up delay-3 mb-5 font-serif text-4xl font-extrabold leading-tight text-ink sm:text-5xl lg:text-[54px]">
          Your family deserves{" "}
          <em className="text-forest">more</em>
          <br />
          than you know
        </h1>

        {/* Subheading */}
        <p className="animate-fade-up delay-4 mx-auto mb-8 max-w-xl text-lg text-ink-body">
          We guide families through Centrelink, Medicare, NDIS and aged care — in{" "}
          <strong>your language</strong>, step by step, completely free. No myGov account needed.
        </p>

        {/* Language prompt */}
        <div className="animate-fade-up delay-5 mb-6 flex items-center justify-center gap-3">
          <div className="h-px w-12 bg-cream-border" />
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            Choose your language to begin
          </span>
          <div className="h-px w-12 bg-cream-border" />
        </div>

        {/* Language cards */}
        <div className="animate-fade-up delay-5 mx-auto mb-4 grid max-w-[800px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {languageCards.map((lang) => (
            <div
              key={lang.code}
              className="card-hover group relative cursor-pointer overflow-hidden rounded-[14px] border border-cream-border bg-card p-4 text-center"
              onClick={() => console.log(`Language: ${lang.code}`)}
            >
              <div className="mb-1 text-2xl">{lang.flag}</div>
              <div className="text-xs font-bold uppercase tracking-wider text-ink-muted">{lang.code}</div>
              <div className="text-sm font-bold text-ink">{lang.name}</div>
              <div className="mb-3 text-xs text-ink-muted">{lang.native}</div>
              <button className="w-full rounded-lg border border-forest/20 bg-forest-light px-3 py-1.5 text-xs font-bold text-forest transition-colors group-hover:bg-forest group-hover:text-primary-foreground">
                {lang.btn}
              </button>
            </div>
          ))}
        </div>

        {/* Language note */}
        <p className="animate-fade-up delay-6 mb-8 text-sm text-ink-muted">
          The whole site switches to your language — every question, every document, your entire summary.{" "}
          <strong className="text-forest">Everything.</strong>
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
          Choose your form — Luma prepares everything
        </h2>

        {/* Service cards */}
        <div className="animate-fade-up delay-7 mx-auto mb-10 grid max-w-[800px] grid-cols-2 gap-3 sm:grid-cols-3">
          {serviceCards.map((svc) => (
            <div
              key={svc.name}
              className="card-hover group relative cursor-pointer overflow-hidden rounded-[14px] border border-cream-border bg-card p-4 text-left"
              onClick={() => navigate(`/service/${svc.slug}`)}
            >
              <span className="text-[22px]">{svc.icon}</span>
              <div className="mt-1 text-[11px] font-bold text-gold">{svc.amount}</div>
              <div className="font-serif text-sm font-bold text-ink">{svc.name}</div>
              <div className="mt-1 text-xs font-semibold text-forest">Get started →</div>
            </div>
          ))}
        </div>

        {/* Safety notice */}
        <div className="animate-fade-up delay-8 mx-auto mb-10 max-w-[800px] rounded-[14px] border border-forest/15 bg-forest-light p-5 text-left">
          <div className="flex gap-4">
            <span className="text-[28px]">🔒</span>
            <div>
              <h3 className="mb-1 font-serif text-[15px] font-bold text-forest">
                Your information is completely safe with us
              </h3>
              <p className="text-[13px] leading-relaxed text-ink-body">
                Registered not-for-profit. We never share your information with immigration, police or any government agency.
                Documents read by Luma and immediately deleted. No connection to the Department of Home Affairs.
              </p>
            </div>
          </div>
        </div>

        {/* Luma chat strip */}
        <div className="animate-fade-up delay-9 mx-auto max-w-[800px] overflow-hidden rounded-2xl border border-cream-border bg-card">
          {/* Chat header */}
          <div className="flex items-center gap-3 bg-forest px-5 py-3">
            <LumaAvatar size={36} />
            <div className="text-left">
              <div className="font-serif text-sm font-bold text-primary-foreground">
                Hi, I'm Luma ✨{" "}
                <span className="ml-2 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px] font-semibold">
                  Your free NCCSA guide
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-primary-foreground/70">
                <span className="animate-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-mint" />
                Online now · Arabic, Nepali, Italian, Vietnamese & English
              </div>
            </div>
          </div>

          {/* Chat area */}
          <div className="grid grid-cols-1 gap-4 bg-forest-pale p-5 md:grid-cols-2">
            {/* Arabic column */}
            <div>
              <div className="mb-2 text-xs font-bold text-ink-muted">🇸🇦 Arabic</div>
              <div className="space-y-2">
                <div className="rounded-xl bg-card p-3 text-right text-sm text-ink-body" dir="rtl">
                  مرحباً! هل تحتاج مساعدة في طلب دعم الإعاقة؟
                </div>
                <div className="rounded-xl bg-forest p-3 text-right text-sm text-primary-foreground" dir="rtl">
                  نعم، لكن ليس عندي myGov
                </div>
                <div className="rounded-xl bg-card p-3 text-right text-sm text-ink-body" dir="rtl">
                  لا مشكلة! لا تحتاج myGov. سأملأ النموذج وترسله بالبريد. 📬
                </div>
              </div>
            </div>
            {/* English column */}
            <div>
              <div className="mb-2 text-xs font-bold text-ink-muted">🇦🇺 English translation</div>
              <div className="space-y-2">
                <div className="rounded-xl bg-card p-3 text-sm text-ink-body">
                  Hello! Do you need help with Disability Support Pension?
                </div>
                <div className="rounded-xl bg-forest p-3 text-sm text-primary-foreground">
                  Yes, but I don't have myGov
                </div>
                <div className="rounded-xl bg-card p-3 text-sm text-ink-body">
                  No problem — you don't need myGov. I'll fill the form and you post it. 📬
                </div>
              </div>
            </div>
          </div>

          {/* Chat footer */}
          <div className="flex items-center justify-between border-t border-cream-border bg-card px-5 py-3">
            <p className="text-sm text-ink-body">
              Luma speaks your language · fills your forms · <strong className="text-forest">completely free</strong>
            </p>
            <button
              onClick={onOpenChat}
              className="rounded-full bg-forest px-5 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-forest-hover hover:-translate-y-0.5"
            >
              ✨ Start with Luma →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
