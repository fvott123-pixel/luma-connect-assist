import { useState } from "react";

const languages = [
  { code: "EN", label: "EN" },
  { code: "AR", label: "عربي" },
  { code: "NP", label: "नेपाली" },
  { code: "IT", label: "IT" },
  { code: "VI", label: "VI" },
];

const TopBar = () => {
  const [activeLang, setActiveLang] = useState("EN");

  return (
    <div className="bg-forest text-primary-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 text-sm">
        <div className="flex items-center gap-2 text-mint">
          <a href="mailto:admin@northerncommunitycaresa.org.au" className="underline hover:opacity-80 transition-opacity">
            admin@northerncommunitycaresa.org.au
          </a>
          <span className="opacity-60">·</span>
          <span className="text-primary-foreground/80 hidden sm:inline">Northern Adelaide, SA · 100% Free</span>
        </div>
        <div className="flex items-center gap-1.5">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { setActiveLang(lang.code); console.log(`Language: ${lang.code}`); }}
              className={`rounded-full px-3 py-0.5 text-xs font-semibold transition-all duration-200 ${
                activeLang === lang.code
                  ? "bg-primary-foreground text-forest"
                  : "border border-primary-foreground/40 text-primary-foreground/80 hover:bg-primary-foreground/10"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopBar;
