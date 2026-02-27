import { useNavigate } from "react-router-dom";
import { useLanguage, type LangCode } from "@/contexts/LanguageContext";

const serviceKeys = [
  { key: "service.dsp", slug: "disability-support" },
  { key: "service.medicare", slug: "medicare" },
  { key: "service.ndis", slug: "ndis-access" },
  { key: "service.agedCare", slug: "aged-care" },
  { key: "service.carer", slug: "carer-payment" },
  { key: "service.agePension", slug: "age-pension" },
];
const orgKeys = ["footer.aboutNccsa", "footer.volunteerPortal", "footer.contactUs", "footer.privacyPolicy", "footer.governance"];
const orgPaths: Record<string, string> = { "footer.aboutNccsa": "/about", "footer.volunteerPortal": "/volunteer" };
const langs: { flag: string; label: string; code: LangCode }[] = [
  { flag: "🇦🇺", label: "English", code: "EN" },
  { flag: "🇸🇦", label: "العربية", code: "AR" },
  { flag: "🇳🇵", label: "नेपाली", code: "NP" },
  { flag: "🇮🇹", label: "Italiano", code: "IT" },
  { flag: "🇻🇳", label: "Tiếng Việt", code: "VI" },
];

const Footer = () => {
  const navigate = useNavigate();
  const { t, setLang } = useLanguage();

  return (
    <footer className="bg-ink px-4 py-16 text-primary-foreground/80">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest text-xl">🌿</div>
            <div>
              <div className="font-serif text-sm font-bold text-primary-foreground">{t("nav.orgName")} Inc</div>
              <div className="text-[10px] text-primary-foreground/50">{t("trust.charity")} · {t("trust.charitySub")}</div>
            </div>
          </div>
          <p className="mb-3 text-sm leading-relaxed text-primary-foreground/60">{t("footer.desc")}</p>
          <a href="mailto:admin@northerncommunitycaresa.org.au" className="text-sm font-semibold text-mint underline">📧 admin@nccsa</a>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-primary-foreground/50">{t("footer.services")}</h4>
          <ul className="space-y-2">
            {serviceKeys.map((s) => (
              <li key={s.key}>
                <button onClick={(e) => { e.preventDefault(); navigate(`/service/${s.slug}`); }} className="text-sm text-primary-foreground/70 transition-colors hover:text-mint">{t(s.key)}</button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-primary-foreground/50">{t("footer.organisation")}</h4>
          <ul className="space-y-2">
            {orgKeys.map((o) => (
              <li key={o}>
                <button onClick={(e) => { e.preventDefault(); if (orgPaths[o]) navigate(orgPaths[o]); }} className="text-sm text-primary-foreground/70 transition-colors hover:text-mint">{t(o)}</button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-primary-foreground/50">{t("footer.languages")}</h4>
          <ul className="space-y-2">
            {langs.map((l) => (
              <li key={l.label}>
                <button onClick={(e) => { e.preventDefault(); setLang(l.code); }} className="text-sm text-primary-foreground/70 transition-colors hover:text-mint">{l.flag} {l.label}</button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-primary-foreground/10 pt-6 sm:flex-row">
        <p className="text-xs text-primary-foreground/40">{t("footer.copyright")}</p>
        <div className="flex gap-1.5">
          {langs.map((l) => (
            <button key={l.label} onClick={(e) => { e.preventDefault(); setLang(l.code); }} className="rounded-full border border-primary-foreground/20 px-3 py-1 text-[10px] font-semibold text-primary-foreground/60 transition-colors hover:bg-primary-foreground/10">
              {l.flag} {l.label}
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
