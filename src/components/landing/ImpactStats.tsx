const stats = [
  { value: "$29K", label: "Per year", sub: "Average DSP approval" },
  { value: "5 min", label: "To complete", sub: "Eligibility check" },
  { value: "5", label: "Languages", sub: "Full site translation" },
  { value: "Free", label: "Always", sub: "No cost. No catch. Ever." },
];

const ImpactStats = () => (
  <section className="bg-forest px-4 py-20">
    <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-center divide-x divide-primary-foreground/20">
      {stats.map((stat) => (
        <div key={stat.label} className="px-8 py-4 text-center sm:px-12">
          <div className="font-serif text-4xl font-extrabold text-primary-foreground sm:text-5xl">{stat.value}</div>
          <div className="mt-2 text-[15px] font-bold text-primary-foreground">{stat.label}</div>
          <div className="text-[13px] text-primary-foreground/40">{stat.sub}</div>
        </div>
      ))}
    </div>
  </section>
);

export default ImpactStats;
