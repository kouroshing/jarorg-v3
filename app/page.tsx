import { Suspense } from "react";
import { HeroSection } from "@/components/home/HeroSection";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { TopExperts } from "@/components/home/TopExperts";
import { CtaBanner } from "@/components/home/CtaBanner";
import { HomeFooter } from "@/components/home/HomeFooter";

export const revalidate = 3600;

export default function HomePage() {
  return (
    <div className="overflow-x-hidden bg-white">
      <HeroSection />
      <CategoryGrid />
      <Suspense fallback={null}>
        <TopExperts />
      </Suspense>
      <CtaBanner />
      <HomeFooter />
    </div>
  );
}
