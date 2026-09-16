"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, AlertCircle } from "lucide-react";
import {
  PERSONAL_CATEGORIES,
  COMMERCIAL_CATEGORIES,
  type ServiceCategory,
} from "@/lib/categories";
import { updateSpecialistCategories } from "@/app/actions/specialistPortfolioActions";
import { MIN_SELECTED_CATEGORIES } from "@/lib/specialists/eligibility";

interface Props {
  initialSelected: string[];
}

function CategoryGrid({
  categories,
  selected,
  onToggle,
}: {
  categories: ServiceCategory[];
  selected: string[];
  onToggle: (slug: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {categories.map((cat) => {
        const on = selected.includes(cat.slug);
        return (
          <button
            key={cat.slug}
            type="button"
            onClick={() => onToggle(cat.slug)}
            className={`flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-3 text-right transition-colors ${
              on
                ? "border-jar-primary bg-jar-primary text-white"
                : "border-jar-border bg-jar-canvas hover:border-jar-primary/40"
            }`}
          >
            <span className="text-xs font-bold">{cat.title}</span>
            {on && <Check className="h-4 w-4 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

export default function SpecialistCategoriesForm({ initialSelected }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggle = (slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.length < MIN_SELECTED_CATEGORIES) {
      setError(`حداقل ${MIN_SELECTED_CATEGORIES} دسته‌بندی انتخاب کنید.`);
      return;
    }

    startTransition(async () => {
      const res = await updateSpecialistCategories(selected);
      if (!res.success) {
        setError(res.error || "خطا در ذخیره");
        return;
      }
      router.push("/specialist/onboarding/portfolio");
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-8 space-y-5 shadow-xs"
    >
      <div className="space-y-1">
        <h1 className="text-lg sm:text-xl font-black">دسته‌بندی‌هایی که بلدید</h1>
        <p className="text-xs text-jar-muted leading-relaxed">
          حداقل {MIN_SELECTED_CATEGORIES} شاخه انتخاب کنید. شاخه‌های شخصی و تجاری جدا هستند؛
          بعداً باید حداقل ۱۰ نمونه‌کار در هر یک از همین شاخه‌ها بارگذاری کنید.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <section className="space-y-2.5">
        <h2 className="text-xs font-black text-jar-primary tracking-tight">
          شخصی
        </h2>
        <CategoryGrid
          categories={PERSONAL_CATEGORIES}
          selected={selected}
          onToggle={toggle}
        />
      </section>

      <section className="space-y-2.5 pt-2 border-t border-jar-border">
        <h2 className="text-xs font-black text-jar-primary tracking-tight">
          تجاری
        </h2>
        <CategoryGrid
          categories={COMMERCIAL_CATEGORIES}
          selected={selected}
          onToggle={toggle}
        />
      </section>

      <p className="text-[11px] text-jar-muted font-medium">
        انتخاب‌شده: {selected.length.toLocaleString("fa-IR")} شاخه
      </p>

      <button
        type="submit"
        disabled={isPending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-jar-primary text-white text-sm font-medium disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        ذخیره و رفتن به نمونه‌کارها
      </button>
    </form>
  );
}
