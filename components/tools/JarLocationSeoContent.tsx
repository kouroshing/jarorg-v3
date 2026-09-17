import Link from "next/link";
import {
  LOCATION_CATEGORIES,
  type PhotoLocationCategory,
} from "@/lib/locations/photoLocation";

const FAQ = [
  {
    q: "جار لوکیشن چیست؟",
    a: "جار لوکیشن کاتالوگ و نقشهٔ لوکیشن‌های مناسب تصویربرداری در ایران است؛ از فضای باز و عمارت تا استودیو، خیابان و مکان‌های تاریخی. می‌توانید بر اساس شهر، دستهٔ فضا، و نوع پروژهٔ عکاسی شخصی یا تجاری جستجو کنید، روی نقشه ببینید و لوکیشن خودتان را ثبت کنید.",
  },
  {
    q: "چطور لوکیشن مناسب پروژه خودم را پیدا کنم؟",
    a: "از نوار بالای صفحه شهر را عوض کنید و بین عکاسی شخصی و تجاری یکی را انتخاب کنید. بعد می‌توانید نوع پروژه را دقیق‌تر کنید؛ مثلاً عقد و فرمالیته، کودک، مدلینگ یا عکاسی محصول. همین دسته‌ها در ثبت سفارش جار هم استفاده می‌شوند.",
  },
  {
    q: "آیا همه لوکیشن‌ها پولی هستند؟",
    a: "خیر. برخی فضاها بدون هزینهٔ ورودی‌اند و با فیلتر «رایگان» قابل مشاهده‌اند. جزئیات مجوز، پارکینگ و قوانین هر لوکیشن در صفحهٔ همان مکان آمده است.",
  },
  {
    q: "چطور لوکیشن خودم را ثبت کنم؟",
    a: "از دکمهٔ «ثبت لوکیشن» وارد شوید، شهر و نوع پروژه‌هایی که فضا برایشان مناسب است را مشخص کنید، موقعیت را روی نقشه بگذارید و عکس‌ها را اضافه کنید. پس از بررسی و تایید، در کاتالوگ عمومی جار لوکیشن منتشر می‌شود.",
  },
  {
    q: "تفاوت جار لوکیشن با سایت‌های اجاره لوکیشن چیست؟",
    a: "تمرکز جار روی کشف، دسته‌بندی و نقشه است؛ نه فقط قیمت‌گذاری ساعتی. جزئیات عملی مثل مجوز دوربین حرفه‌ای، پارکینگ، اتاق تعویض و سطح امنیت برای برنامه‌ریزی پروژه در دسترس است.",
  },
];

const CATEGORY_SEO: Record<
  PhotoLocationCategory,
  { blurb: string; keywords: string }
> = {
  OPEN_SPACE: {
    blurb:
      "پارک‌ها، باغ‌ها و فضاهای باز مناسب نور طبیعی، فرمالیته و تصویربرداری فضای سبز.",
    keywords: "لوکیشن فضای باز، پارک عکاسی، باغ عکاسی",
  },
  MANSION_GARDEN: {
    blurb:
      "عمارت، ویلا و باغ‌عمارت برای تصویربرداری لوکس، عروس و تولید محتوای معماری.",
    keywords: "عمارت عکاسی، باغ عمارت، ویلا لوکیشن",
  },
  STREET: {
    blurb: "خیابان، بافت شهری و نماهای شهری برای استریت و پروژه‌های مد و برند.",
    keywords: "لوکیشن خیابانی، عکاسی شهری، استریت",
  },
  STUDIO: {
    blurb: "استودیو و آتلیه با کنترل نور برای محصول، پرتره و تولید محتوای کنترل‌شده.",
    keywords: "استودیو عکاسی، آتلیه، لوکیشن استودیو",
  },
  HISTORIC: {
    blurb: "موزه، خانهٔ تاریخی و بافت قدیمی برای پروژه‌های فرهنگی و معماری.",
    keywords: "لوکیشن تاریخی، موزه عکاسی، خانه قدیمی",
  },
  DECOR: {
    blurb: "فضاهای دکوراتیو و آمادهٔ تولید محتوا برای ریلز، تبلیغ و برندینگ.",
    keywords: "لوکیشن دکور، تولید محتوا، فضای تبلیغاتی",
  },
  OTHER: {
    blurb: "سایر فضاهای خاص که در دسته‌های اصلی نمی‌گنجند.",
    keywords: "لوکیشن خاص، مکان تصویربرداری",
  },
};

export function JarLocationSeoContent({
  locationCount,
  heroTitle,
}: {
  locationCount: number;
  heroTitle: string;
}) {
  const countLabel =
    locationCount > 0
      ? `${locationCount.toLocaleString("fa-IR")} لوکیشن تاییدشده`
      : "کاتالوگ در حال رشد";

  return (
    <div className="jar-loc-seo w-full bg-white">
    <section
      className="mx-auto max-w-5xl px-4 sm:px-6 pb-16 pt-2 space-y-10 text-right"
      dir="rtl"
      aria-label="راهنمای جار لوکیشن"
    >
      <div className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-black text-[#141413] tracking-tight">
          کاتالوگ لوکیشن تصویربرداری در ایران
        </h2>
        <p className="text-sm sm:text-[15px] leading-relaxed text-[#66605B] font-medium max-w-3xl">
          {heroTitle} جایی است برای پیدا کردن لوکیشن عکاسی و فیلمبرداری — از عمارت
          و باغ تا فضای باز، استودیو، خیابان و مکان‌های تاریخی. برخلاف فهرست‌های
          صرفاً اجاره‌ای، اینجا روی کشف، دسته‌بندی، نقشه و جزئیات عملی (مجوز،
          پارکینگ، دوربین حرفه‌ای و امنیت) تمرکز شده است. هم‌اکنون{" "}
          <strong className="text-[#141413] font-black">{countLabel}</strong> در
          دسترس است و هر روز با ثبت کاربران گسترش می‌یابد.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {LOCATION_CATEGORIES.map((c) => {
          const seo = CATEGORY_SEO[c.id];
          return (
            <article
              key={c.id}
              className="rounded-2xl border border-[#E8E0D4] bg-[#FAF9F5] p-4 space-y-1.5"
            >
              <h3 className="text-sm font-black text-[#141413]">{c.label}</h3>
              <p className="text-[12px] leading-relaxed text-[#66605B] font-medium">
                {seo.blurb}
              </p>
              <p className="text-[10px] text-[#99928A] font-bold">{seo.keywords}</p>
            </article>
          );
        })}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-black text-[#141413]">چطور از جار لوکیشن استفاده کنید؟</h2>
        <ol className="space-y-2 text-sm text-[#66605B] font-medium list-decimal list-inside leading-relaxed">
          <li>شهر و نوع پروژه (شخصی یا تجاری) را از هیرو انتخاب کنید، بعد دستهٔ فضا یا فیلتر رایگان را ورق بزنید.</li>
          <li>با «نقشه زنده» موقعیت لوکیشن‌ها را روی نقشه ببینید.</li>
          <li>وارد صفحهٔ هر لوکیشن شوید و جزئیات مجوز، پارکینگ و قوانین را بخوانید.</li>
          <li>
            اگر فضا دارید،{" "}
            <Link href="/tools/locations/new" className="font-black text-[#CC785C] underline-offset-2 hover:underline">
              لوکیشن خود را ثبت کنید
            </Link>
            .
          </li>
        </ol>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-black text-[#141413]">سوالات پرتکرار درباره لوکیشن عکاسی</h2>
        <div className="space-y-2">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-[#E8E0D4] bg-white px-4 py-3 open:shadow-sm"
            >
              <summary className="cursor-pointer list-none text-sm font-black text-[#141413] flex items-center justify-between gap-3">
                {item.q}
                <span className="text-[#CC785C] text-lg leading-none group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <p className="mt-2 text-[13px] leading-relaxed text-[#66605B] font-medium pb-1">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-[#99928A] font-medium leading-relaxed">
        واژه‌های مرتبط: لوکیشن عکاسی تهران، عمارت عکاسی، اجاره لوکیشن فیلمبرداری،
        کاتالوگ لوکیشن رایگان، استودیو و آتلیه، باغ عمارت، نقشه لوکیشن عکاسی ایران،
        ثبت لوکیشن تصویربرداری.
      </p>
    </section>
    </div>
  );
}

export function jarLocationFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}
