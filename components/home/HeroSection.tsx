"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, ChevronDown } from "lucide-react";
import { HOME_CITIES } from "@/lib/home/mock-data";

export function HeroSection() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<(typeof HOME_CITIES)[number]["id"]>("tehran");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    params.set("city", city);
    const qs = params.toString();
    router.push(qs ? `/create-project?${qs}` : "/create-project");
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-gray-50/60 via-white to-white pb-16 pt-6 sm:pb-24 sm:pt-10">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(250,204,21,0.08),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8">
        <div className="animate-fade-up">
          <p className="mb-6 text-xs font-medium tracking-wide text-gray-400">
            پلتفرم جار
          </p>

          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-extrabold leading-[1.15] tracking-tight text-black sm:text-5xl md:text-[3.25rem]">
            لحظه‌هایت را با بهترین‌ها ثبت کن
          </h1>

          <form
            onSubmit={handleSearch}
            className="mx-auto mt-10 max-w-2xl animate-fade-up [animation-delay:120ms]"
            style={{ animationFillMode: "both" }}
          >
            <div className="flex w-full flex-col gap-1 rounded-[24px] border border-gray-100 bg-white p-2.5 shadow-xl shadow-black/[0.04] transition-shadow duration-300 focus-within:shadow-2xl focus-within:shadow-black/[0.06] md:flex-row md:items-center md:gap-0 md:rounded-full md:p-2">
              {/* ردیف اول — جستجوی خدمت */}
              <div className="flex min-w-0 flex-1 items-center px-4 py-2.5 md:py-2">
                <Search
                  className="ml-3 h-5 w-5 shrink-0 text-gray-400"
                  strokeWidth={2}
                  aria-hidden
                />
                <label className="sr-only" htmlFor="hero-search">
                  به چه خدمتی نیاز دارید؟
                </label>
                <input
                  id="hero-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="به چه خدمتی نیاز دارید؟"
                  className="flex-1 border-none bg-transparent text-sm text-black outline-none placeholder:text-gray-400"
                />
              </div>

              <div className="mx-5 h-[1px] bg-gray-100 md:hidden" aria-hidden />
              <div
                className="mx-2 hidden h-8 w-[1px] bg-gray-200 md:block"
                aria-hidden
              />

              {/* ردیف دوم — شهر */}
              <div className="relative flex items-center px-4 py-2.5 md:shrink-0 md:py-2">
                <MapPin
                  className="ml-3 h-5 w-5 shrink-0 text-gray-400"
                  strokeWidth={2}
                  aria-hidden
                />
                <select
                  value={city}
                  onChange={(e) =>
                    setCity(
                      e.target.value as (typeof HOME_CITIES)[number]["id"]
                    )
                  }
                  aria-label="شهر"
                  className="flex-1 cursor-pointer appearance-none border-none bg-transparent text-sm font-medium text-black outline-none md:min-w-[7rem] md:flex-none md:pr-6"
                >
                  {HOME_CITIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 md:left-3"
                  aria-hidden
                />
              </div>

              <button
                type="submit"
                className="mt-1 w-full rounded-2xl bg-[#FACC15] py-3.5 text-sm font-bold text-black transition-all duration-200 hover:brightness-95 active:scale-[0.98] md:mt-0 md:w-auto md:shrink-0 md:rounded-full md:px-8 md:py-3"
              >
                جستجو
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
