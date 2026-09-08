import { HeroSection } from "@/components/home/HeroSection";
import { StatsBar } from "@/components/home/StatsBar";
import { CtaBanner } from "@/components/home/CtaBanner";
import { JoinUsBanner } from "@/components/home/JoinUsBanner";
import { HomeFooter } from "@/components/home/HomeFooter";
import JarBillowBackground from "@/components/home/JarBillowBackground";
import AnimatedHeroBackground from "@/components/shared/AnimatedHeroBackground";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="jar-theme relative isolate w-full min-h-screen flex flex-col bg-jar-canvas text-jar-primary overflow-x-clip selection:bg-jar-logo/25" dir="rtl">
      
      {/* 1. Pure WebGL Jelly Mesh Gradient (Soft & Ethereal Warm Paper #FAF9F5) */}
      <AnimatedHeroBackground colorScheme="yellow" opacity={0.65} />

      {/* 2. Warm Paper #FAF9F5 Ethereal Ambient Animated Halos (Full Page Coverage) */}
      <JarBillowBackground />

      <div className="relative z-10 flex flex-col w-full">
        {/* Hero Section (100% Full Viewport on Android & Windows) */}
        <HeroSection />

        {/* Live Metrics Trust Bar */}
        <StatsBar />

        {/* Free Inquiry & Consultation Conversion Banner */}
        <CtaBanner />

        {/* Join as Specialist Acquisition Banner */}
        <JoinUsBanner />

        {/* Minimal Clean Footer */}
        <HomeFooter />
      </div>
    </div>
  );
}
