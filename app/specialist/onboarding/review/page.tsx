import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Images,
  MapPin,
  ShieldCheck,
  Camera,
  Layers,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";
import SpecialistOnboardingShell from "@/components/specialist/SpecialistOnboardingShell";
import ResubmitSpecialistButton from "@/components/specialist/ResubmitSpecialistButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "پرونده در انتظار بررسی | پنل متخصص جار",
};

function formatSubmittedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

export default async function SpecialistReviewWaitingPage() {
  const session = await getSession();
  if (!session) redirect("/join");

  const state = await getSpecialistOnboardingStateAction();

  if (state.status === "ACTIVE") {
    redirect(state.nextStep || "/specialist/projects");
  }

  const needsRevision =
    state.status === "INCOMPLETE" && Boolean(state.reviewNote && state.reviewNote.trim());
  const isSuspended = state.status === "SUSPENDED";
  const isPending = state.status === "PENDING_REVIEW";

  if (!isPending && !isSuspended && !needsRevision) {
    redirect(state.nextStep || "/specialist/onboarding/profile");
  }

  const submittedAt = formatSubmittedAt(state.submittedForReviewAt);

  const checklist = [
    { icon: Camera, label: "عکس پروفایل", done: Boolean(state.hasAvatar) },
    { icon: Layers, label: "دسته‌بندی‌ها", done: Boolean(state.hasCategories) },
    {
      icon: Images,
      label: "نمونه‌کارها",
      done: (state.maxPortfolioInCategory ?? 0) >= 10,
    },
    { icon: CreditCard, label: "اشتراک", done: Boolean(state.hasPlan) },
    {
      icon: MapPin,
      label: "شهر و مبدأ",
      done: Boolean(state.hasCity && state.baseLat != null && state.baseLng != null),
    },
    { icon: ShieldCheck, label: "تعهدنامه", done: Boolean(state.hasNda) },
  ];

  const title = needsRevision
    ? "پرونده برای اصلاح بازگردانده شد"
    : isSuspended
      ? "دسترسی شما موقتاً محدود است"
      : "پرونده شما برای تیم جار ارسال شد";

  const subtitle = needsRevision
    ? "پیام ادمین را بخوانید، موارد لازم را اصلاح کنید و دوباره ارسال کنید."
    : isSuspended
      ? "تا رفع تعلیق، دسترسی به فید پروژه‌ها محدود است. در صورت نیاز نمونه‌کارها را اصلاح کنید."
      : "کارشناسان پرونده را در پنل ادمین می‌بینند. معمولاً کمتر از ۲۴ ساعت کاری طول می‌کشد.";

  const statusTone = needsRevision || isSuspended ? "warn" : "wait";

  return (
    <SpecialistOnboardingShell
      activeStep="review"
      subtitle={needsRevision ? "نیاز به اصلاح" : "منتظر تایید تیم جار"}
    >
      <section className="relative overflow-hidden rounded-[36px] border border-jar-border bg-jar-surface/90 shadow-xs backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(196,92,38,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_left,_rgba(16,185,129,0.08),_transparent_45%)]" />
        <div className="pointer-events-none absolute -right-20 top-8 h-48 w-48 rounded-full bg-jar-logo/20 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative px-6 py-10 sm:px-10 sm:py-12 space-y-8 text-center">
          <div className="mx-auto relative">
            <div
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border shadow-sm ${
                statusTone === "warn"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-jar-logo/25 bg-jar-logo/10 text-jar-logo"
              }`}
            >
              {needsRevision || isSuspended ? (
                <AlertTriangle className="h-9 w-9" />
              ) : (
                <Clock className="h-9 w-9 animate-pulse" />
              )}
            </div>
            {statusTone === "wait" && (
              <span className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-jar-logo shadow-[0_0_0_6px_rgba(196,92,38,0.18)] animate-ping" />
            )}
          </div>

          <div className="space-y-3">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-black tracking-wide ${
                statusTone === "warn"
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : "border-jar-logo/30 bg-jar-logo/10 text-jar-logo"
              }`}
            >
              {needsRevision
                ? "نیاز به اصلاح"
                : isSuspended
                  ? "پرونده تعلیق شده"
                  : "در صف بررسی ادمین"}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-jar-primary">
              {title}
            </h1>
            <p className="mx-auto max-w-lg text-xs sm:text-sm text-jar-muted leading-relaxed font-medium">
              {subtitle}
            </p>
            {submittedAt && !needsRevision && (
              <p className="text-[11px] font-bold text-jar-muted/90">
                زمان ارسال: {submittedAt}
              </p>
            )}
          </div>

          {statusTone === "wait" && (
            <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-jar-border/80 bg-jar-canvas/70 px-4 py-3 text-right backdrop-blur-sm">
              <Sparkles className="h-5 w-5 shrink-0 text-jar-logo" />
              <p className="text-[11px] font-semibold leading-relaxed text-jar-primary/90">
                پرونده‌تان در صف اولویت بررسی است. به‌محض تایید، کارتابل پروژه‌ها برایتان باز
                می‌شود.
              </p>
            </div>
          )}

          {state.reviewNote && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-right text-xs text-amber-950 leading-relaxed whitespace-pre-wrap">
              <span className="font-black">پیام ادمین: </span>
              {state.reviewNote}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-right">
            {checklist.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 transition-colors ${
                    item.done
                      ? "border-emerald-200/80 bg-emerald-50/70"
                      : "border-jar-border bg-jar-canvas/80"
                  }`}
                >
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Icon className="h-4 w-4 text-jar-muted shrink-0" />
                  )}
                  <span className="text-xs font-bold text-jar-primary">{item.label}</span>
                </div>
              );
            })}
          </div>

          {(needsRevision || isSuspended) && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link
                href={isSuspended ? "/specialist/portfolio" : "/specialist/onboarding/portfolio"}
                className="inline-flex h-12 items-center justify-center rounded-full border border-jar-border bg-jar-canvas px-7 text-xs font-bold text-jar-primary transition-colors hover:bg-jar-soft"
              >
                اصلاح نمونه‌کارها
              </Link>
              {needsRevision && <ResubmitSpecialistButton />}
            </div>
          )}
        </div>
      </section>
    </SpecialistOnboardingShell>
  );
}
