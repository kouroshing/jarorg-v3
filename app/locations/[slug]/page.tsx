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
  Clapperboard,
  ArrowLeft,
  Check,
  UserRound,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import {
  maskContactPhone,
  parseLocationCategory,
  parseLocationImageUrls,
  parseLocationVideoUrls,
  parseSecurityLevel,
  resolveLocationCover,
  SECURITY_LABELS,
  locationCategoryLabel,
  locationCategoryPinColor,
  buildLocationMediaItems,
  googleMapsUrl,
} from "@/lib/locations/photoLocation";
import { parseSuitableFor, projectTypeChipLabel, projectTypeTitle } from "@/lib/locations/projectTypes";
import { phoneToLocalDisplay } from "@/lib/auth/phone";
import { formatPublicSpecialistName } from "@/lib/specialists/publicName";
import JarLocationMiniMap from "@/components/tools/JarLocationMiniMap";
import LocationMediaSlideshow from "@/components/tools/LocationMediaSlideshow";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> | { slug: string } };

async function loadMediaCredit(id: string): Promise<{
  videoUrls: string[];
  photographerUserId: string | null;
  photographerName: string | null;
}> {
  try {
    const rows = await prisma.$queryRawUnsafe<
      {
        video_urls: string | null;
        photographer_user_id: string | null;
        photographer_name: string | null;
      }[]
    >(
      "SELECT video_urls, photographer_user_id, photographer_name FROM photo_locations WHERE id = ? LIMIT 1",
      id
    );
    const row = rows[0];
    return {
      videoUrls: parseLocationVideoUrls(row?.video_urls),
      photographerUserId: row?.photographer_user_id ?? null,
      photographerName: row?.photographer_name?.trim() || null,
    };
  } catch {
    return { videoUrls: [], photographerUserId: null, photographerName: null };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  const row = await prisma.photoLocation.findFirst({
    where: { slug, status: "APPROVED" },
    select: {
      name: true,
      description: true,
      city: true,
      district: true,
      coverImageUrl: true,
      imageUrls: true,
      category: true,
    },
  });
  if (!row) {
    return { title: "لوکیشن یافت نشد | جار لوکیشن", robots: { index: false } };
  }
  const place = [row.city, row.district].filter(Boolean).join("، ");
  const cat = locationCategoryLabel(parseLocationCategory(row.category));
  const projects = parseSuitableFor(
    (row as { suitableFor?: string | null }).suitableFor
  )
    .slice(0, 3)
    .map((s) => projectTypeChipLabel(s));
  const title = `لوکیشن ${row.name}${place ? ` — ${place}` : ""} | ${cat} | جار لوکیشن`;
  const description =
    row.description?.replace(/\s+/g, " ").trim().slice(0, 155) ||
    `لوکیشن ${cat} «${row.name}»${place ? ` در ${place}` : ""}${
      projects.length ? ` مناسب ${projects.join("، ")}` : ""
    } — نقشه، مجوز دوربین، پارکینگ و جزئیات هماهنگی در جار لوکیشن.`;
  const gallery = parseLocationImageUrls(row.imageUrls);
  const cover = resolveLocationCover(row.coverImageUrl, gallery);
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/['"]/g, "")?.replace(/\/$/, "") ||
    "https://jarorg.ir";
  const ogImage = cover
    ? cover.startsWith("http")
      ? cover
      : `${site}${cover}`
    : `${site}/images/jar-locations/hero.jpg`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${site}/locations/${slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "fa_IR",
      url: `${site}/locations/${slug}`,
      siteName: "جار لوکیشن",
      images: [{ url: ogImage, alt: row.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
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
  const category = parseLocationCategory(row.category);
  const gallery = parseLocationImageUrls(row.imageUrls);
  const cover = resolveLocationCover(row.coverImageUrl, gallery);
  const suitableFor = parseSuitableFor(row.suitableFor);
  const mediaCredit = await loadMediaCredit(row.id);
  const media = buildLocationMediaItems(gallery, mediaCredit.videoUrls);
  const phoneDisplay = loggedIn
    ? row.contactPhone
      ? phoneToLocalDisplay(row.contactPhone)
      : null
    : maskContactPhone(row.contactPhone);

  let photographer: {
    name: string;
    href: string | null;
    avatarUrl: string | null;
  } | null = null;
  if (mediaCredit.photographerUserId) {
    const user = await prisma.user.findUnique({
      where: { id: mediaCredit.photographerUserId },
      select: {
        id: true,
        displayName: true,
        specialistProfile: { select: { avatarUrl: true, status: true } },
      },
    });
    if (user) {
      photographer = {
        name: formatPublicSpecialistName(user.displayName),
        href: user.specialistProfile ? `/s/${user.id}` : null,
        avatarUrl: user.specialistProfile?.avatarUrl || null,
      };
    }
  } else if (mediaCredit.photographerName) {
    photographer = {
      name: mediaCredit.photographerName,
      href: null,
      avatarUrl: null,
    };
  }

  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/['"]/g, "")?.replace(/\/$/, "") ||
    "https://jarorg.ir";
  const place = [row.city, row.district].filter(Boolean).join(" · ");
  const facts = [
    {
      icon: Shield,
      label: "مجوز",
      value: row.needsPermit ? "نیاز به مجوز" : "بدون مجوز اعلام‌شده",
      ok: !row.needsPermit,
    },
    {
      icon: Camera,
      label: "دوربین حرفه‌ای",
      value: row.proCameraAllowed ? "مجاز" : "محدود",
      ok: row.proCameraAllowed,
    },
    {
      icon: Smartphone,
      label: "عکاسی با گوشی",
      value: row.phoneCameraAllowed ? "مجاز" : "محدود",
      ok: row.phoneCameraAllowed,
    },
    {
      icon: DoorOpen,
      label: "ورودی",
      value: row.hasEntranceFee ? "دارد" : "رایگان",
      ok: !row.hasEntranceFee,
    },
    {
      icon: Shirt,
      label: "اتاق تعویض",
      value: row.hasChangingRoom ? "دارد" : "ندارد",
      ok: row.hasChangingRoom,
    },
    {
      icon: Car,
      label: "پارکینگ",
      value: row.hasParking ? "دارد" : "ندارد",
      ok: row.hasParking,
    },
    {
      icon: Shield,
      label: "امنیت",
      value: SECURITY_LABELS[security],
      ok: security !== "LOW",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Place",
        "@id": `${site}/locations/${row.slug}#place`,
        name: row.name,
        description: row.description || undefined,
        image:
          gallery.length > 0
            ? gallery.map((u) => (u.startsWith("http") ? u : `${site}${u}`))
            : cover
              ? [cover.startsWith("http") ? cover : `${site}${cover}`]
              : undefined,
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
        additionalProperty: [
          {
            "@type": "PropertyValue",
            name: "دسته",
            value: locationCategoryLabel(category),
          },
          {
            "@type": "PropertyValue",
            name: "پارکینگ",
            value: row.hasParking ? "دارد" : "ندارد",
          },
          {
            "@type": "PropertyValue",
            name: "ورودی",
            value: row.hasEntranceFee ? "دارد" : "رایگان / بدون ورودی",
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "جار لوکیشن",
            item: `${site}/tools/locations`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: row.name,
            item: `${site}/locations/${row.slug}`,
          },
        ],
      },
      {
        "@type": "WebPage",
        "@id": `${site}/locations/${row.slug}`,
        url: `${site}/locations/${row.slug}`,
        name: row.name,
        isPartOf: { "@type": "WebSite", name: "جار", url: site },
        about: { "@id": `${site}/locations/${row.slug}#place` },
        inLanguage: "fa-IR",
      },
    ],
  };

  return (
    <article className="relative mx-auto w-full max-w-5xl pb-8 text-right" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="pointer-events-none absolute -top-10 left-1/2 h-56 w-[min(90%,42rem)] -translate-x-1/2 rounded-full bg-[#CC785C]/15 blur-[90px]" />
      <div className="pointer-events-none absolute top-40 right-0 h-40 w-40 rounded-full bg-[#006097]/10 blur-[70px]" />

      <div className="relative space-y-6">
        <header className="space-y-3">
          <Link
            href="/tools/locations"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-jar-muted hover:text-jar-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
            جار لوکیشن
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black text-white"
                  style={{ background: locationCategoryPinColor(category) }}
                >
                  {locationCategoryLabel(category)}
                </span>
                {!row.hasEntranceFee && (
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                    رایگان
                  </span>
                )}
                {mediaCredit.videoUrls.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-jar-border bg-white/80 px-2.5 py-0.5 text-[10px] font-bold text-jar-primary">
                    <Clapperboard className="h-3 w-3" />
                    ویدیو دارد
                  </span>
                )}
              </div>
              <h1 className="text-[1.85rem] font-black leading-tight tracking-tight text-[#141413] sm:text-4xl">
                {row.name}
              </h1>
              <p className="flex items-center gap-1.5 text-sm text-[#66605B]">
                <MapPin className="h-4 w-4 shrink-0 text-[#CC785C]" />
                {[row.city, row.district, row.address].filter(Boolean).join(" · ") || "ایران"}
              </p>
            </div>
            <Link
              href="/order"
              className="inline-flex h-11 w-full sm:w-auto shrink-0 items-center justify-center rounded-full bg-[#141413] px-5 text-xs font-black text-white shadow-lg transition-transform active:scale-95 hover:bg-[#2a2928]"
            >
              ثبت سفارش عکاسی
            </Link>
          </div>
        </header>

        {media.length > 0 ? (
          <LocationMediaSlideshow items={media} alt={row.name} />
        ) : cover ? (
          <div className="relative aspect-[16/10] overflow-hidden rounded-[1.75rem] border border-white/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt={row.name} className="h-full w-full object-cover" />
          </div>
        ) : null}

        {photographer && (
          <div className="flex items-center justify-between gap-3 rounded-[1.4rem] border border-white/50 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-xl">
            <div className="flex min-w-0 items-center gap-3">
              {photographer.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photographer.avatarUrl}
                  alt=""
                  className="h-11 w-11 rounded-full object-cover ring-2 ring-white"
                />
              ) : (
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-jar-soft text-jar-muted ring-2 ring-white">
                  <UserRound className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-jar-muted">عکس و ویدیو از</p>
                <p className="truncate text-sm font-black text-[#141413]">{photographer.name}</p>
              </div>
            </div>
            {photographer.href && (
              <Link
                href={photographer.href}
                className="shrink-0 rounded-full border border-jar-border bg-white px-3 py-1.5 text-[11px] font-black text-jar-primary"
              >
                پروفایل متخصص
              </Link>
            )}
          </div>
        )}

        {suitableFor.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-black text-[#141413]">به درد این پروژه‌ها می‌خورد</h2>
            <div className="flex flex-wrap gap-1.5">
              {suitableFor.map((slugItem) => (
                <span
                  key={slugItem}
                  title={projectTypeTitle(slugItem)}
                  className="rounded-full border border-[#E5E0D8] bg-white/80 px-3 py-1.5 text-[11px] font-bold text-[#141413]"
                >
                  {projectTypeChipLabel(slugItem)}
                </span>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-4">
            {row.description && (
              <div className="rounded-[1.6rem] border border-white/50 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
                <h2 className="mb-2 text-sm font-black text-[#141413]">درباره این لوکیشن</h2>
                <p className="text-sm leading-relaxed text-[#3f3c38] whitespace-pre-wrap">
                  {row.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {facts.map((fact, i) => {
                const Icon = fact.icon;
                return (
                  <div
                    key={fact.label}
                    className={`rounded-[1.25rem] border border-white/50 bg-white/70 p-3.5 shadow-sm backdrop-blur-xl ${
                      i === facts.length - 1 ? "col-span-2" : ""
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <Icon className="h-4 w-4 text-[#CC785C]" />
                      {fact.ok && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-[10px] font-bold text-jar-muted">{fact.label}</p>
                    <p className="mt-0.5 text-[12px] font-black text-[#141413]">{fact.value}</p>
                  </div>
                );
              })}
            </div>

            {phoneDisplay && (
              <div className="flex items-center gap-2 rounded-[1.4rem] border border-white/50 bg-white/75 px-4 py-3 text-xs text-jar-muted backdrop-blur-xl">
                <Phone className="h-4 w-4 text-[#CC785C]" />
                {loggedIn ? (
                  <a href={`tel:${phoneDisplay}`} className="font-mono font-black text-jar-primary" dir="ltr">
                    {phoneDisplay}
                  </a>
                ) : (
                  <span>
                    <span className="font-mono" dir="ltr">
                      {phoneDisplay}
                    </span>
                    {" · "}
                    <Link href={`/login?next=/locations/${slug}`} className="font-black text-[#CC785C] underline">
                      ورود برای شماره کامل
                    </Link>
                  </span>
                )}
              </div>
            )}
          </section>

          <aside className="space-y-3">
            <div className="overflow-hidden rounded-[1.6rem] border border-white/50 bg-white/70 shadow-sm backdrop-blur-xl">
              <JarLocationMiniMap lat={row.lat} lng={row.lng} name={row.name} />
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <p className="min-w-0 truncate text-[11px] font-bold text-jar-muted">
                  {place || "موقعیت روی نقشه"}
                </p>
                <a
                  href={googleMapsUrl(row.lat, row.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[11px] font-black text-[#006097]"
                >
                  مسیریابی
                </a>
              </div>
            </div>
            <Link
              href="/tools/locations?view=map"
              className="flex h-11 items-center justify-center rounded-full border border-jar-border bg-white/80 text-xs font-black text-jar-primary"
            >
              همه لوکیشن‌ها روی نقشه
            </Link>
          </aside>
        </div>
      </div>
    </article>
  );
}
