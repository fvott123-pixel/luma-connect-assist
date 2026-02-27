import { useState } from "react";
import TopBar from "@/components/landing/TopBar";
import StickyNav from "@/components/landing/StickyNav";
import Footer from "@/components/landing/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

const Volunteer = () => {
  const { t, dir } = useLanguage();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", language: "", weekdays: false, weekends: false, evenings: false });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <TopBar />
      <StickyNav />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 text-center">
          <span className="text-5xl">🤝</span>
          <h1 className="mt-3 font-serif text-3xl font-extrabold text-foreground">{t("volunteer.title")}</h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            {t("volunteer.desc")}
          </p>
        </div>

        {submitted ? (
          <div className="rounded-2xl border border-primary/20 bg-forest-light p-8 text-center">
            <span className="text-4xl">✅</span>
            <p className="mt-4 font-serif text-lg font-bold text-foreground">{t("volunteer.thankYou")}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <div>
              <label className="mb-1 block text-sm font-bold text-foreground">{t("volunteer.fullName")}</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-foreground">{t("volunteer.email")}</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-foreground">{t("volunteer.phone")}</label>
              <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-foreground">{t("volunteer.language")}</label>
              <select required value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">{t("volunteer.selectLang")}</option>
                <option value="Arabic">{t("volunteer.arabic")}</option>
                <option value="Nepali">{t("volunteer.nepali")}</option>
                <option value="Italian">{t("volunteer.italian")}</option>
                <option value="Vietnamese">{t("volunteer.vietnamese")}</option>
                <option value="Other">{t("volunteer.other")}</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-foreground">{t("volunteer.availability")}</label>
              <div className="flex flex-wrap gap-4">
                {(["weekdays", "weekends", "evenings"] as const).map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="h-4 w-4 rounded border-border text-primary accent-primary" />
                    {t(`volunteer.${key}`)}
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-forest-hover">
              {t("volunteer.submit")}
            </button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Volunteer;
