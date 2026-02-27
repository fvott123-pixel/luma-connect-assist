import { useLanguage, type LangCode } from "@/contexts/LanguageContext";

const languages: { code: LangCode; label: string }[] = [
  { code: "EN", label: "EN" },
  { code: "AR", label: "عربي" },
  { code: "NP", label: "नेपाली" },
  { code: "IT", label: "IT" },
  { code: "VI", label: "VI" },
];

const TopBar = () => {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="bg-forest text-primary-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 text-sm">
        <div className="flex items-center gap-2 text-mint">
          <a href="mailto:admin@northerncommunitycaresa.org.au" className="underline hover:opacity-80 transition-opacity">
            {t("topbar.email")}
          </a>
          <span className="opacity-60">·</span>
          <span className="text-primary-foreground/80 hidden sm:inline">{t("topbar.location")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={(e) => { e.preventDefault(); setLang(l.code); }}
              className={`rounded-full px-3 py-0.5 text-xs font-semibold transition-all duration-200 ${
                lang === l.code
                  ? "bg-primary-foreground text-forest"
                  : "border border-primary-foreground/40 text-primary-foreground/80 hover:bg-primary-foreground/10"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopBar;
