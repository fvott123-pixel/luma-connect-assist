const services = ["Disability Support Pension", "Medicare", "NDIS Access", "Aged Care", "Carer Payment", "Age Pension"];
const org = ["About NCCSA", "Volunteer Portal", "Contact Us", "Privacy Policy", "Governance"];
const langs = [
  { flag: "🇦🇺", label: "English" },
  { flag: "🇸🇦", label: "العربية" },
  { flag: "🇳🇵", label: "नेपाली" },
  { flag: "🇮🇹", label: "Italiano" },
  { flag: "🇻🇳", label: "Tiếng Việt" },
];

const Footer = () => (
  <footer className="bg-ink px-4 py-16 text-primary-foreground/80">
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
      {/* Col 1 */}
      <div className="sm:col-span-2 lg:col-span-1">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest text-xl">🌿</div>
          <div>
            <div className="font-serif text-sm font-bold text-primary-foreground">Northern Community Care SA Inc</div>
            <div className="text-[10px] text-primary-foreground/50">Registered Charity · Northern Adelaide</div>
          </div>
        </div>
        <p className="mb-3 text-sm leading-relaxed text-primary-foreground/60">
          Helping families in Salisbury, Elizabeth, Paralowie, Davoren and surrounding Northern Adelaide suburbs access the
          payments they deserve — in their language, at no cost.
        </p>
        <a href="mailto:admin@northerncommunitycaresa.org.au" className="text-sm font-semibold text-mint underline">
          📧 Email admin@nccsa
        </a>
      </div>

      {/* Col 2 */}
      <div>
        <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-primary-foreground/50">Services</h4>
        <ul className="space-y-2">
          {services.map((s) => (
            <li key={s}>
              <button onClick={() => console.log(s)} className="text-sm text-primary-foreground/70 transition-colors hover:text-mint">
                {s}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Col 3 */}
      <div>
        <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-primary-foreground/50">Organisation</h4>
        <ul className="space-y-2">
          {org.map((o) => (
            <li key={o}>
              <button onClick={() => console.log(o)} className="text-sm text-primary-foreground/70 transition-colors hover:text-mint">
                {o}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Col 4 */}
      <div>
        <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-primary-foreground/50">Languages</h4>
        <ul className="space-y-2">
          {langs.map((l) => (
            <li key={l.label}>
              <button onClick={() => console.log(l.label)} className="text-sm text-primary-foreground/70 transition-colors hover:text-mint">
                {l.flag} {l.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-primary-foreground/10 pt-6 sm:flex-row">
      <p className="text-xs text-primary-foreground/40">
        © 2025 Northern Community Care SA Inc. All rights reserved.
      </p>
      <div className="flex gap-1.5">
        {langs.map((l) => (
          <button
            key={l.label}
            onClick={() => console.log(l.label)}
            className="rounded-full border border-primary-foreground/20 px-3 py-1 text-[10px] font-semibold text-primary-foreground/60 transition-colors hover:bg-primary-foreground/10"
          >
            {l.flag} {l.label}
          </button>
        ))}
      </div>
    </div>
  </footer>
);

export default Footer;
