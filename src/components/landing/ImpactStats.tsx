import { useLanguage } from "@/contexts/LanguageContext";

const ImpactStats = () => {
  const { t } = useLanguage();
  const stats = [
    { value: "$29K", labelKey: "stats.perYear", subKey: "stats.avgDSP" },
    { value: "5 min", labelKey: "stats.toComplete", subKey: "stats.eligibilityCheck" },
    { value: "5", labelKey: "stats.languages", subKey: "stats.fullTranslation" },
    { value: "Free", labelKey: "stats.always", subKey: "stats.noCost" },
  ];

  return (
    <section className="bg-forest px-4 py-20">
      <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-center divide-x divide-primary-foreground/20">
        {stats.map((stat) => (
          <div key={stat.labelKey} className="px-8 py-4 text-center sm:px-12">
            <div className="font-serif text-4xl font-extrabold text-primary-foreground sm:text-5xl">{stat.value}</div>
            <div className="mt-2 text-[15px] font-bold text-primary-foreground">{t(stat.labelKey)}</div>
            <div className="text-[13px] text-primary-foreground/40">{t(stat.subKey)}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ImpactStats;
