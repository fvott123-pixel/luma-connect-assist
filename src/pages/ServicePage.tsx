import { useParams, useNavigate } from "react-router-dom";
import { getServiceBySlug } from "@/data/services";
import TopBar from "@/components/landing/TopBar";
import StickyNav from "@/components/landing/StickyNav";
import Footer from "@/components/landing/Footer";
import EligibilityChat from "@/components/EligibilityChat";

const ServicePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const service = getServiceBySlug(slug || "");

  if (!service) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <p className="text-lg text-foreground">Service not found.</p>
        <button onClick={() => navigate("/")} className="mt-4 text-sm font-bold text-primary underline">
          Go back home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <StickyNav />
      <main className="mx-auto max-w-3xl px-4 py-10">
        {/* Back link */}
        <button onClick={() => navigate("/")} className="mb-6 text-sm font-semibold text-primary hover:underline">
          ← Back to all services
        </button>

        {/* Service header */}
        <div className="mb-8 text-center">
          <span className="text-5xl">{service.icon}</span>
          <h1 className="mt-3 font-serif text-3xl font-extrabold text-foreground">{service.name}</h1>
          <div className="mt-2 inline-block rounded-full bg-gold-bg px-4 py-1 text-sm font-bold text-gold">
            {service.amount}
          </div>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            {service.description}
          </p>
        </div>

        {/* Eligibility checker */}
        <div className="mb-8">
          <h2 className="mb-4 text-center font-serif text-xl font-bold text-foreground">
            Check your eligibility with Luma
          </h2>
          <EligibilityChat service={service} />
        </div>

        {/* Safety notice */}
        <div className="rounded-2xl border border-primary/15 bg-secondary p-5">
          <div className="flex gap-4">
            <span className="text-[28px]">🔒</span>
            <div>
              <h3 className="mb-1 font-serif text-[15px] font-bold text-primary">
                Your information is completely safe
              </h3>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                We never share your information with immigration, police or any government agency.
                Documents are deleted immediately after use.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ServicePage;
