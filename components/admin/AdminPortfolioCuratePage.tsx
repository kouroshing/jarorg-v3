"use client";

import Link from "next/link";
import { LayoutGrid, Table2 } from "lucide-react";
import AdminPortfolioGallery from "@/components/admin/AdminPortfolioGallery";
import type { AdminPortfolioGalleryItem } from "@/lib/admin/portfolioGalleryData";

export default function AdminPortfolioCuratePage({
  items,
}: {
  items: AdminPortfolioGalleryItem[];
}) {
  return (
    <div
      className="w-full max-w-full space-y-5 px-3 sm:px-6 lg:px-8 py-5 pb-20 text-right font-sans"
      dir="rtl"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 flex flex-wrap items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-slate-500" />
            <span>گالری نمونه‌کارها</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            انتخاب چندتایی، ZIP، کپشن اینستا، کراپ ۱:۱ / ۴:۵ و علامت «برداشته‌شده».
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/review?status=all"
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            صف بررسی متخصص
          </Link>
          <Link
            href="/admin"
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            داشبورد
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white">
            <Table2 className="w-3.5 h-3.5" />
            {items.length.toLocaleString("fa-IR")} فایل
          </span>
        </div>
      </div>

      <AdminPortfolioGallery items={items} />
    </div>
  );
}
