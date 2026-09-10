"use client";

import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import {
  ONBOARDING_STEPS,
  type OnboardingStepId,
  stepIndex,
} from "@/lib/specialists/eligibility";

export default function SpecialistOnboardingShell({
  activeStep,
  subtitle,
  children,
  rightAction,
}: {
  activeStep: OnboardingStepId;
  subtitle?: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
}) {
  const activeIdx = stepIndex(activeStep);

  return (
    <div
      className="jar-theme relative min-h-screen bg-jar-canvas text-jar-primary selection:bg-jar-primary/10 pb-24"
      dir="rtl"
    >
      <header className="fixed inset-x-0 top-3 z-50 px-4 md:px-6">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between rounded-full border border-jar-border bg-jar-surface/90 px-4 sm:px-6 backdrop-blur-md shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandLogo />
            <div className="flex flex-col border-r border-jar-border pr-2.5 mr-1 min-w-0">
              <span className="text-xs sm:text-sm font-bold tracking-tight truncate">
                ثبت‌نام متخصص جار
              </span>
              <span className="text-[10px] font-medium text-jar-logo truncate">
                {subtitle ||
                  `مرحله ${(activeIdx + 1).toLocaleString("fa-IR")} از ${ONBOARDING_STEPS.length.toLocaleString("fa-IR")}`}
              </span>
            </div>
          </div>
          {rightAction}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 space-y-5">
        <nav
          className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none"
          aria-label="مراحل ثبت‌نام"
        >
          {ONBOARDING_STEPS.map((step, idx) => {
            const done = idx < activeIdx;
            const current = idx === activeIdx;
            return (
              <Link
                key={step.id}
                href={done || current ? step.href : "#"}
                aria-current={current ? "step" : undefined}
                className={`flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold border transition-colors ${
                  current
                    ? "bg-jar-primary text-white border-jar-primary"
                    : done
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-jar-surface text-jar-muted border-jar-border pointer-events-none opacity-70"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                    current
                      ? "bg-white text-jar-primary"
                      : done
                        ? "bg-emerald-600 text-white"
                        : "bg-jar-canvas text-jar-muted"
                  }`}
                >
                  {done ? <Check className="h-3 w-3" /> : (idx + 1).toLocaleString("fa-IR")}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.short}</span>
              </Link>
            );
          })}
        </nav>

        {children}
      </main>
    </div>
  );
}
