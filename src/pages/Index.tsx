import { useState } from "react";
import TopBar from "@/components/landing/TopBar";
import StickyNav from "@/components/landing/StickyNav";
import HeroSection from "@/components/landing/HeroSection";
import PaymentsBand from "@/components/landing/PaymentsBand";
import HowItWorks from "@/components/landing/HowItWorks";
import ImpactStats from "@/components/landing/ImpactStats";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import LumaChatPanel from "@/components/LumaChatPanel";

const Index = () => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <TopBar />
      <StickyNav />
      <main>
        <HeroSection onOpenChat={() => setChatOpen(true)} />
        <PaymentsBand />
        <HowItWorks />
        <ImpactStats />
        <CTASection />
      </main>
      <Footer />
      <LumaChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
};

export default Index;
