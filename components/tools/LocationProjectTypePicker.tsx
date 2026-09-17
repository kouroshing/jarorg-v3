"use client";

import React from "react";
import {
  AUDIENCE_OPTIONS,
  categoriesForAudience,
  projectTypeChipLabel,
  type LocationAudience,
} from "@/lib/locations/projectTypes";
import type { CategoryType } from "@/lib/categories";

export function LocationProjectTypePicker({
  value,
  onChange,
  required,
  compact,
}: {
  value: string[];
  onChange: (slugs: string[]) => void;
  required?: boolean;
  compact?: boolean;
}) {
  const selected = new Set(value);
  const personalCount = value.filter((s) =>
    categoriesForAudience("PERSONAL").some((c) => c.slug === s)
  ).length;
  const commercialCount = value.filter((s) =>
    categoriesForAudience("COMMERCIAL").some((c) => c.slug === s)
  ).length;

  const toggle = (slug: string) => {
    if (selected.has(slug)) onChange(value.filter((s) => s !== slug));
    else onChange([...value, slug]);
  };

  const setGroup = (audience: CategoryType, on: boolean) => {
    const group = categoriesForAudience(audience).map((c) => c.slug);
    if (on) {
      onChange(Array.from(new Set([...value, ...group])));
    } else {
      onChange(value.filter((s) => !group.includes(s)));
    }
  };

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold text-jar-primary">
            به درد چه نوع پروژه‌هایی می‌خوره
            {required ? <span className="text-rose-600"> *</span> : null}
          </p>
          <p className="text-[10px] text-jar-muted font-medium mt-0.5 leading-relaxed">
            همان دسته‌های عکاسی شخصی و تجاری سفارش جار — عکاس‌ها با این فیلتر لوکیشن را پیدا می‌کنند.
          </p>
        </div>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="shrink-0 text-[10px] font-bold text-jar-muted hover:text-jar-primary"
          >
            پاک کردن
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {AUDIENCE_OPTIONS.filter((o) => o.id !== "ALL").map((opt) => {
          const allOn =
            opt.id === "PERSONAL"
              ? personalCount === categoriesForAudience("PERSONAL").length
              : commercialCount === categoriesForAudience("COMMERCIAL").length;
          const some =
            opt.id === "PERSONAL" ? personalCount > 0 : commercialCount > 0;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setGroup(opt.id as CategoryType, !allOn)}
              className={`rounded-full border px-3 py-1.5 text-[10px] font-black transition-colors ${
                allOn
                  ? "border-jar-primary bg-jar-primary text-white"
                  : some
                    ? "border-[#CC785C] bg-[#CC785C]/10 text-[#9A4E38]"
                    : "border-jar-border bg-white text-jar-muted"
              }`}
            >
              {opt.label}
              {some ? ` · ${opt.id === "PERSONAL" ? personalCount : commercialCount}` : ""}
            </button>
          );
        })}
      </div>

      {(["PERSONAL", "COMMERCIAL"] as const).map((audience) => (
        <div key={audience} className="space-y-1.5">
          <p className="text-[10px] font-black text-jar-muted">
            {audience === "PERSONAL" ? "شخصی" : "تجاری"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {categoriesForAudience(audience).map((cat) => {
              const on = selected.has(cat.slug);
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => toggle(cat.slug)}
                  title={cat.title}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors ${
                    on
                      ? "border-[#CC785C] bg-[#CC785C] text-white"
                      : "border-jar-border bg-white text-jar-muted hover:border-[#CC785C]/40 hover:text-jar-primary"
                  } ${compact ? "max-w-[11rem] truncate" : ""}`}
                >
                  {projectTypeChipLabel(cat.slug)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
