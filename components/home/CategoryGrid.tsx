"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HOME_CATEGORIES } from "@/lib/home/mock-data";

export function CategoryGrid() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section
      id="services"
      className="border-t border-gray-100 py-16 sm:py-24"
      aria-labelledby="categories-heading"
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
        <div className="mb-10 flex items-end justify-between gap-4 sm:mb-12">
          <div className="text-right">
            <h2
              id="categories-heading"
              className="text-2xl font-extrabold tracking-tight text-black sm:text-3xl"
            >
              دسته‌بندی خدمات
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              مسیر مناسب پروژه خود را انتخاب کنید.
            </p>
          </div>
          <Link
            href="/order"
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-gray-600 transition-colors hover:text-black sm:inline-flex"
          >
            همه خدمات
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {HOME_CATEGORIES.map((cat, index) => (
            <Link
              key={cat.id}
              href="/order"
              className={`group relative overflow-hidden rounded-3xl border border-gray-100 bg-white transition-all duration-500 ease-out hover:border-gray-200 hover:shadow-lg ${cat.className}`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {mounted && cat.imageUrl ? (
                <Image
                  src={cat.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className={`object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${cat.imageClassName ?? ""}`}
                />
              ) : (
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${cat.imageGradient} transition-transform duration-700 ease-out group-hover:scale-105`}
                  aria-hidden
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                <span className="inline-block rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-md">
                  {cat.title}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
