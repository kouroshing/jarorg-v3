import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  Shield,
  Camera,
  Smartphone,
  DoorOpen,
  Shirt,
  Car,
  Phone,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import {
  maskContactPhone,
  parseLocationImageUrls,
  parseSecurityLevel,
  resolveLocationCover,
  SECURITY_LABELS,
} from "@/lib/locations/photoLocation";
import { phoneToLocalDisplay } from "@/lib/auth/phone";
import JarLocationMiniMap from "@/components/tools/JarLocationMiniMap";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> | { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  const row = await prisma.photoLocation.findFirst({
    where: { slug, status: "APPROVED" },
    select: { name: true, description: true, city: true, district: true },
  });
  if (!row) {
    return { title: "لوکیشن یافت نشد | جار لوکیشن" };
  }
  const place = [row.city, row.district].filter(Boolean).join("، ");
  const title = `لوکیشن عکاسی ${row.name}${place ? ` — ${place}` : ""} | جار لوکیشن`;
  const description =
    row.description?.slice(0, 155) ||
    `لوکیشن عکاسی ${row.name} در جار لوکیشن — مشاهده روی نقشه، مجوز، دوربین و هماهنگی.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    alternates: { canonical: `https://jarorg.ir/locations/${slug}` },
  };
}

export default async function PhotoLocationSeoPage({ params }: Props) {
  const { slug } = await Promise.resolve(params);
  const session = await getSession();
  const loggedIn = Boolean(session?.userId);

  const row = await prisma.photoLocation.findFirst({
    where: { slug, status: "APPROVED" },
  });
  if (!row) notFound();

  const security = parseSecurityLevel(row.securityLevel);
  const gallery = parseLocationImageUrls(row.imageUrls);
  const cover = resolveLocationCover(row.coverImageUrl, gallery);
  const phoneDisplay = loggedIn
    ? row.contactPhone
      ? phoneToLocalDisplay(row.contactPhone)
      : null
    : maskContactPhone(row.contactPhone);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: row.name,
    description: row.description || undefined,
    image: gallery.length > 0 ? gallery : cover ? [cover] : undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: row.city || undefined,
      addressRegion: row.district || undefined,
      streetAddress: row.address || undefined,
      addressCountry: "IR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: row.lat,
      longitude: row.lng,
    },
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 pb-24 space-y-6 text-right" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="space-y-1">
        <Link href="/tools/locations" className="text-[11px] font-bold text-jar-muted hover:text-jar-primary">
          ← جار لوکیشن
        </Link>
        <h1 className="text-2xl font-black text-jar-primary leading-snug">{row.name}</h1>
        <p className="text-xs text-jar-muted flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {[row.city, row.district, row.address].filter(Boolean).join(" · ") || "ایران"}
        </p>
      </div>

      {gallery.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {gallery.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className={`relative overflow-hidden rounded-2xl border border-jar-border bg-jar-soft ${
                idx === 0 ? "col-span-2 aspect-[16/10]" : "aspect-square"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      ) : cover ? (
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-jar-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}

      <JarLocationMiniMap lat={row.lat} lng={row.lng} name={row.name} />

      {row.description && (
        <section className="space-y-2">
          <h2 className="text-sm font-black text-jar-primary">درباره این لوکیشن عکاسی</h2>
          <p className="text-sm text-jar-primary/90 leading-relaxed whitespace-pre-wrap">
            {row.description}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-jar-border bg-jar-surface p-4 space-y-3">
        <h2 className="text-sm font-black text-jar-primary">جزئیات کاربردی</h2>
        <ul className="space-y-2 text-xs text-jar-primary">
          <li className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-jar-muted" />
            {row.needsPermit ? "نیاز به مجوز دارد" : "بدون نیاز به مجوز (طبق اعلام ثبت‌کننده)"}
          </li>
          <li className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-jar-muted" />
            دوربین حرفه‌ای: {row.proCameraAllowed ? "مجاز" : "غیرمجاز / محدود"}
          </li>
          <li className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-jar-muted" />
            عکاسی با گوشی: {row.phoneCameraAllowed ? "مجاز" : "غیرمجاز / محدود"}
          </li>
          <li className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4 text-jar-muted" />
            ورودی: {row.hasEntranceFee ? "دارد" : "ندارد"}
          </li>
          <li className="flex items-center gap-2">
            <Shirt className="h-4 w-4 text-jar-muted" />
            جای تعویض لباس: {row.hasChangingRoom ? "دارد" : "ندارد"}
          </li>
          <li className="flex items-center gap-2">
            <Car className="h-4 w-4 text-jar-muted" />
            جای پارک: {row.hasParking ? "دارد" : "ندارد"}
          </li>
          <li className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-jar-muted" />
            امنیت: {SECURITY_LABELS[security]}
          </li>
        </ul>
        {phoneDisplay && (
          <p className="text-xs text-jar-muted flex items-center gap-2 pt-1 border-t border-jar-border">
            <Phone className="h-4 w-4" />
            {loggedIn ? (
              <a href={`tel:${phoneDisplay}`} className="font-mono font-bold text-jar-primary" dir="ltr">
                {phoneDisplay}
              </a>
            ) : (
              <span>
                <span className="font-mono" dir="ltr">{phoneDisplay}</span>
                {" · "}
                <Link href={`/login?next=/locations/${slug}`} className="text-jar-logo font-bold underline">
                  ورود برای شماره کامل
                </Link>
              </span>
            )}
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/order"
          className="inline-flex h-10 items-center justify-center rounded-full bg-jar-primary px-5 text-xs font-bold text-white"
        >
          ثبت سفارش عکاسی
        </Link>
        <Link
          href="/tools/locations"
          className="inline-flex h-10 items-center justify-center rounded-full border border-jar-border px-5 text-xs font-bold text-jar-primary"
        >
          همه لوکیشن‌ها روی نقشه
        </Link>
      </div>
    </main>
  );
}
