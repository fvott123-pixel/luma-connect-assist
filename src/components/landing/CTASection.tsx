const CTASection = () => (
  <section className="bg-cream px-4 py-20">
    <div className="mx-auto max-w-4xl overflow-hidden rounded-[26px] border border-cream-border bg-card">
      <div className="grid grid-cols-1 gap-8 p-8 sm:p-12 md:grid-cols-2">
        {/* Left */}
        <div>
          <h2 className="mb-4 font-serif text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            Your family deserves the support they're owed
          </h2>
          <p className="text-ink-body leading-relaxed">
            5 minutes. Completely free. Luma speaks your language. No myGov account needed.
            Your information is safe — we are not connected to immigration or any enforcement agency.
          </p>
        </div>

        {/* Right */}
        <div className="flex flex-col items-stretch justify-center gap-3">
          <button
            onClick={() => console.log("Get Free Help Now")}
            className="rounded-full bg-forest px-6 py-3.5 text-center font-bold text-primary-foreground transition-all hover:bg-forest-hover hover:-translate-y-0.5"
          >
            🌿 Get Free Help Now →
          </button>
          <button
            onClick={() => console.log("Choose Language First")}
            className="rounded-full border-2 border-forest bg-transparent px-6 py-3 text-center font-bold text-forest transition-all hover:bg-forest-light"
          >
            🌍 Choose Your Language First
          </button>
          <p className="mt-2 text-center text-sm text-ink-muted">
            Questions?{" "}
            <a href="mailto:admin@northerncommunitycaresa.org.au" className="font-semibold text-forest underline">
              Email us
            </a>{" "}
            — reply within 24 hours
          </p>
        </div>
      </div>
    </div>
  </section>
);

export default CTASection;
