import { HeroSection } from "@/components/home/HeroSection";
import { StatsBar } from "@/components/home/StatsBar";
import { CtaBanner } from "@/components/home/CtaBanner";
import { JoinUsBanner } from "@/components/home/JoinUsBanner";
import EndOfPageBounce from "@/components/home/EndOfPageBounce";
import CoverageMapBackground from "@/components/home/CoverageMapBackground";
import { getPublicCoverageCircles } from "@/lib/geo/coverageSnapshot";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { circles, specialistCount } = await getPublicCoverageCircles();

  return (
    <div
      className="jar-theme relative isolate w-full min-h-screen flex flex-col bg-[#F7F5F0] text-jar-primary overflow-x-clip selection:bg-jar-logo/25"
      dir="rtl"
    >
      <div className="relative z-10 flex flex-col w-full">
        <div className="relative isolate w-full">
          <CoverageMapBackground
            circles={circles}
            specialistCount={specialistCount}
          />
          <HeroSection
            coverageCount={circles.length}
            specialistCount={specialistCount}
          />
        </div>

        <div id="details" className="relative z-10 bg-[#F7F5F0]">
          <StatsBar />
          <CtaBanner />
          <JoinUsBanner />
          <EndOfPageBounce />
        </div>
      </div>
    </div>
  );
}
