import type { Metadata } from "next";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import SpecialistMembershipTerms from "@/components/legal/SpecialistMembershipTerms";

export const metadata: Metadata = {
  title: "تعهدنامه و شرایط عضویت متخصصین | جار",
  description:
    "تعهدنامه حسن انجام کار، محرمانگی (NDA) و شرایط عضویت متخصصین پلتفرم جار",
};

export default function SpecialistTermsLegalPage() {
  return (
    <div className="jar-theme min-h-screen bg-jar-canvas text-jar-primary" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-jar-border bg-jar-surface/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <BrandLogo />
          <Link
            href="/join"
            className="rounded-full border border-jar-border bg-jar-canvas px-4 py-1.5 text-xs font-bold text-jar-primary"
          >
            بازگشت به ثبت‌نام
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-8 shadow-xs">
          <SpecialistMembershipTerms />
        </div>
      </main>
    </div>
  );
}
