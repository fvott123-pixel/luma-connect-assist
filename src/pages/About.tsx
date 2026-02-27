import TopBar from "@/components/landing/TopBar";
import StickyNav from "@/components/landing/StickyNav";
import Footer from "@/components/landing/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

const langFlags = [
  { flag: "🇦🇺", name: "English" },
  { flag: "🇸🇦", name: "العربية (Arabic)" },
  { flag: "🇳🇵", name: "नेपाली (Nepali)" },
  { flag: "🇮🇹", name: "Italiano (Italian)" },
  { flag: "🇻🇳", name: "Tiếng Việt (Vietnamese)" },
];

const About = () => {
  const { t, dir } = useLanguage();

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <TopBar />
      <StickyNav />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-10 text-center">
          <span className="text-5xl">🌿</span>
          <h1 className="mt-3 font-serif text-3xl font-extrabold text-foreground">{t("about.title")}</h1>
        </div>

        <div className="space-y-8">
          {/* Mission */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-3 font-serif text-xl font-bold text-foreground">{t("about.mission")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("about.missionText")}</p>
          </div>

          {/* Serving */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-3 font-serif text-xl font-bold text-foreground">{t("about.serving")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("about.servingText")}</p>
          </div>

          {/* Languages */}
          <div className="rounded-2xl border border-primary/15 bg-forest-light p-6">
            <h2 className="mb-4 font-serif text-xl font-bold text-primary">{t("about.languagesTitle")}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {langFlags.map((l) => (
                <div key={l.name} className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm font-semibold text-foreground border border-border">
                  <span className="text-lg">{l.flag}</span>
                  {l.name}
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-3 font-serif text-xl font-bold text-foreground">{t("about.contact")}</h2>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{t("about.contactText")}</p>
            <a href="mailto:admin@northerncommunitycaresa.org.au" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-forest-hover">
              📧 admin@northerncommunitycaresa.org.au
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;
