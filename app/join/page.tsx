import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Home } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import JarBillowBackground from "@/components/home/JarBillowBackground";
import JoinForm from "./JoinForm";
import { getSession } from "@/lib/auth/session";
import {
  getSpecialistAccess,
  repairOrphanSpecialistRole,
} from "@/lib/specialists/access";

export const metadata: Metadata = {
  title: "ورود و ثبت‌نام متخصصین | جار",
  description: "ورود با شماره موبایل برای عکاسان، فیلمبرداران و متخصصین جار",
};

export const dynamic = "force-dynamic";

export default async function JoinPage() {
  const session = await getSession();
  if (session?.userId) {
    await repairOrphanSpecialistRole(session.userId);
    const access = await getSpecialistAccess(session.userId);
    // Already a specialist (any stage) → resume their path.
    // Pure customers who open /join intentionally start onboarding.
    if (access.kind === "active" || access.kind === "pending" || access.kind === "onboarding") {
      redirect(access.landingPath);
    }
    redirect("/specialist/onboarding/profile");
  }

  return (
    <div
      className="jar-theme relative isolate min-h-screen bg-jar-canvas text-jar-primary overflow-x-hidden flex flex-col justify-between selection:bg-jar-primary/10"
      dir="rtl"
    >
      <JarBillowBackground />

      <header className="fixed inset-x-0 top-3 z-50 px-4 md:px-6">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between rounded-full border border-jar-border bg-jar-surface/80 px-4 sm:px-6 backdrop-blur-xl shadow-xs">
          <Link href="/" className="flex items-center gap-2.5 group">
            <BrandLogo linked={false} />
          </Link>

          <Link
            href="/"
            className="group inline-flex h-9 sm:h-10 items-center gap-2 rounded-full border border-jar-border bg-jar-surface px-4 text-xs sm:text-sm font-medium text-jar-primary shadow-xs hover:bg-jar-soft transition-colors cursor-pointer"
          >
            <Home className="h-4 w-4 text-jar-muted group-hover:text-jar-primary transition-colors" />
            <span>صفحه اصلی</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 pt-28 pb-12">
        <div className="w-full max-w-3xl mx-auto">
          <div className="relative max-w-lg mx-auto rounded-[32px] border border-jar-border bg-jar-surface/90 p-8 sm:p-10 backdrop-blur-2xl shadow-xs">
            <div className="text-center mb-7">
              <h1 className="text-xl sm:text-2xl font-black text-jar-primary tracking-tight leading-snug">
                ورود متخصصین جار
              </h1>
              <p className="mt-2.5 text-sm font-medium text-jar-muted leading-relaxed">
                با شماره موبایل وارد شوید؛ نام و پروفایل را فقط یک‌بار در اطلاعات پایه می‌گیریم.
              </p>
            </div>

            <JoinForm />
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-right">
            {[
              { n: "۱", t: "ورود با موبایل", d: "فقط OTP. اگر قبلاً آمده‌اید مستقیم وارد می‌شوید." },
              { n: "۲", t: "اطلاعات پایه", d: "نام، عکس و بقیهٔ مراحل فقط اگر هنوز کامل نکرده باشید." },
              { n: "۳", t: "کارتابل", d: "بعد از تایید ادمین، پروژه‌های باز را می‌بینید و می‌توانید سفارش هم ثبت کنید." },
            ].map((step) => (
              <div key={step.n} className="rounded-2xl border border-jar-border bg-jar-surface/80 p-4">
                <span className="text-[10px] font-bold text-jar-logo">{step.n}</span>
                <h3 className="text-xs font-black text-jar-primary mt-1">{step.t}</h3>
                <p className="text-[11px] text-jar-muted leading-relaxed mt-1">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-4 text-center text-xs text-jar-muted font-medium">
        © پلتفرم عکاسی و آموزش تخصصی جار
      </footer>
    </div>
  );
}
