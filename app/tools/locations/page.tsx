import type { Metadata } from "next";
import { JarLocationCatalog } from "@/components/tools/JarLocationCatalog";
import {
  JarLocationSeoContent,
  jarLocationFaqJsonLd,
} from "@/components/tools/JarLocationSeoContent";
import { getJarLocationPageSettings } from "@/lib/locations/pageSettings";
import { prisma } from "@/lib/prisma";
import { LOCATION_CATEGORIES } from "@/lib/locations/photoLocation";

export const dynamic = "force-dynamic";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/['"]/g, "")?.replace(/\/$/, "") ||
  "https://jarorg.ir";
const CANONICAL = `${SITE}/tools/locations`;
const OG_IMAGE = `${SITE}/images/jar-locations/hero.jpg`;

const TITLE =
  "جار لوکیشن | کاتالوگ و نقشه لوکیشن عکاسی، عمارت و استودیو در ایران";
const DESCRIPTION =
  "جار لوکیشن — کاتالوگ حرفه‌ای لوکیشن عکاسی و فیلمبرداری در ایران: عمارت و باغ، فضای باز، خیابان، استودیو و مکان تاریخی. جستجو بر اساس دسته، مشاهده روی نقشه، فیلتر رایگان و ثبت لوکیشن.";

export const metadata: Metadata = {
  title: {
    absolute: TITLE,
  },
  description: DESCRIPTION,
  keywords: [
    "جار لوکیشن",
    "لوکیشن عکاسی",
    "لوکیشن عکاسی تهران",
    "لوکیشن عکاسی شخصی",
    "لوکیشن عکاسی تجاری",
    "لوکیشن فرمالیته",
    "لوکیشن عکاسی محصول",
    "عمارت عکاسی",
    "باغ عمارت عکاسی",
    "کاتالوگ لوکیشن عکاسی",
    "لوکیشن فیلمبرداری",
    "استودیو عکاسی",
    "لوکیشن رایگان عکاسی",
    "نقشه لوکیشن عکاسی",
    "ثبت لوکیشن عکاسی",
    "اجاره لوکیشن عکاسی",
    "فضای باز عکاسی",
    "آتلیه",
  ],
  alternates: {
    canonical: CANONICAL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: CANONICAL,
    siteName: "جار",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1600,
        height: 900,
        alt: "جار لوکیشن — کاتالوگ لوکیشن عکاسی و عمارت",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  category: "photography locations",
};

export default async function JarLocationsToolPage() {
  const [pageSettings, locationCount, sampleLocations] = await Promise.all([
    getJarLocationPageSettings(),
    prisma.photoLocation
      .count({ where: { status: "APPROVED" } })
      .catch(() => 0),
    prisma.photoLocation
      .findMany({
        where: { status: "APPROVED" },
        orderBy: { updatedAt: "desc" },
        take: 24,
        select: {
          name: true,
          slug: true,
          city: true,
          category: true,
          coverImageUrl: true,
          updatedAt: true,
        },
      })
      .catch(() => [] as Array<{
        name: string;
        slug: string;
        city: string | null;
        category: string;
        coverImageUrl: string | null;
        updatedAt: Date;
      }>),
  ]);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "جار",
        item: SITE,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "ابزارها",
        item: `${SITE}/tools`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "جار لوکیشن",
        item: CANONICAL,
      },
    ],
  };

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: pageSettings.heroTitle || "جار لوکیشن",
    description: DESCRIPTION,
    url: CANONICAL,
    inLanguage: "fa-IR",
    isPartOf: {
      "@type": "WebSite",
      name: "جار",
      url: SITE,
    },
    about: {
      "@type": "Thing",
      name: "لوکیشن عکاسی و فیلمبرداری",
    },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: pageSettings.heroImageUrl?.startsWith("http")
        ? pageSettings.heroImageUrl
        : `${SITE}${pageSettings.heroImageUrl || "/images/jar-locations/hero.jpg"}`,
    },
  };

  const itemListLd =
    sampleLocations.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "لوکیشن‌های تاییدشده جار لوکیشن",
          numberOfItems: locationCount,
          itemListElement: sampleLocations.map((loc, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE}/locations/${loc.slug}`,
            name: loc.name,
          })),
        }
      : {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "دسته‌های جار لوکیشن",
          numberOfItems: LOCATION_CATEGORIES.length,
          itemListElement: LOCATION_CATEGORIES.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.label,
            url: CANONICAL,
          })),
        };

  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "جار لوکیشن",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    url: CANONICAL,
    description: DESCRIPTION,
    inLanguage: "fa-IR",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "IRR",
    },
  };

  const jsonLdGraph = {
    "@context": "https://schema.org",
    "@graph": [collectionLd, breadcrumbLd, itemListLd, webAppLd, jarLocationFaqJsonLd()],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGraph) }}
      />
      <JarLocationCatalog pageSettings={pageSettings} />
      <JarLocationSeoContent
        locationCount={locationCount}
        heroTitle={pageSettings.heroTitle}
      />
    </>
  );
}
