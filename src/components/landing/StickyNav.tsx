import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const navLinks = ["Get Help", "How It Works", "Volunteer", "About"];

const StickyNav = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 h-[68px] border-b border-cream-border bg-cream transition-shadow duration-300 ${
        scrolled ? "shadow-md" : ""
      }`}
    >
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest text-xl">
            🌿
          </div>
          <div>
            <div className="font-serif text-base font-bold leading-tight text-ink">
              Northern Community Care SA{" "}
              <span className="text-forest">Inc</span>
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Free Family Support · Northern Adelaide
            </div>
          </div>
        </div>

        {/* Centre links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <button
              key={link}
              onClick={() => console.log(`Nav: ${link}`)}
              className="text-sm font-semibold text-ink-body transition-colors hover:text-forest"
            >
              {link}
            </button>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate("/chat")}
          className="rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all duration-200 hover:bg-forest-hover hover:-translate-y-0.5 hover:shadow-lg"
        >
          🌿 Get Free Help
        </button>
      </div>
    </nav>
  );
};

export default StickyNav;
