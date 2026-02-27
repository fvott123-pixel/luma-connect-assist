import TopBar from "@/components/landing/TopBar";
import StickyNav from "@/components/landing/StickyNav";
import HeroSection from "@/components/landing/HeroSection";
import PaymentsBand from "@/components/landing/PaymentsBand";
import HowItWorks from "@/components/landing/HowItWorks";
import ImpactStats from "@/components/landing/ImpactStats";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => (
  <div className="min-h-screen">
    <TopBar />
    <StickyNav />
    <main>
      <HeroSection />
      <PaymentsBand />
      <HowItWorks />
      <ImpactStats />
      <CTASection />
    </main>
    <Footer />
  </div>
);

export default Index;
