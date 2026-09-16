import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { headers } from "next/headers";
import "@fontsource/vazirmatn/index.css";
import "@fontsource/vazirmatn/300.css";
import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import "@fontsource/vazirmatn/800.css";
import "@fontsource/vazirmatn/900.css";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { NavbarWrapper } from "@/components/NavbarWrapper";
import { MainLayout } from "@/components/Navbar";
import IosInstallPrompt from "@/components/IosInstallPrompt";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import VpnSlowBanner from "@/components/VpnSlowBanner";
import { getPwaSettings } from "@/app/actions/pwaActions";
import ReactGrab from "@/components/ReactGrab";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/['"]/g, "")?.replace(/\/$/, "") || "https://jarorg.ir";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = headers();
  const host = (headersList.get("x-forwarded-host") || headersList.get("host") || "").toLowerCase();
  const referer = (headersList.get("referer") || "").toLowerCase();

  const isJaramooz = host.includes("jaramooz.ir") || referer.includes("/jaramooz");

  if (isJaramooz) {
    return {
      metadataBase: new URL(siteUrl),
      title: {
        default: "جار آموز | آموزش تخصصی عکاسی و فیلمبرداری",
        template: "%s | جار آموز",
      },
      description: "پلتفرم آموزشی تخصصی عکاسی، فیلم‌برداری و خدمات بصری",
      applicationName: "جار آموز",
      manifest: "/manifest.webmanifest",
      icons: {
        icon: [
          { url: "/appstore-images-jaramooz/android/launchericon-192x192.png", sizes: "192x192", type: "image/png" },
          { url: "/appstore-images-jaramooz/android/launchericon-512x512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: [
          { url: "/appstore-images-jaramooz/ios/180.png", sizes: "180x180", type: "image/png" },
          { url: "/appstore-images-jaramooz/ios/152.png", sizes: "152x152", type: "image/png" },
          { url: "/appstore-images-jaramooz/ios/120.png", sizes: "120x120", type: "image/png" },
        ],
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
      other: {
        google: "notranslate",
      },
    };
  }

  return {
    metadataBase: new URL(siteUrl),
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    title: {
      default: "جار | پلتفرم رزرو خدمات بصری",
      template: "%s | جار",
    },
    description: "ثبت سفارش عکاسی, فیلم‌برداری و خدمات بصری",
    applicationName: "جار",
    manifest: "/manifest.webmanifest",
    openGraph: {
      type: "website",
      locale: "fa_IR",
      url: siteUrl,
      siteName: "جار",
      title: "جار | پلتفرم رزرو خدمات بصری",
      description: "ثبت سفارش عکاسی, فیلم‌برداری و خدمات بصری",
      images: [{ url: "/app-icon.png", width: 512, height: 512, alt: "جار" }],
    },
    twitter: {
      card: "summary",
      title: "جار | پلتفرم رزرو خدمات بصری",
      description: "ثبت سفارش عکاسی, فیلم‌برداری و خدمات بصری",
      images: ["/app-icon.png"],
    },
    appleWebApp: {
      capable: true,
      title: "جار",
      statusBarStyle: "default",
    },
    icons: {
      icon: [
        { url: "/favicon-32x32.png?v=orange", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png?v=orange", sizes: "16x16", type: "image/png" },
        { url: "/favicon.ico?v=orange", sizes: "any" },
        { url: "/icon-192.png?v=orange", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png?v=orange", sizes: "512x512", type: "image/png" },
        { url: "/brand-icons/launchericon-192x192.png?v=orange", sizes: "192x192", type: "image/png" },
        { url: "/brand-icons/launchericon-512x512.png?v=orange", sizes: "512x512", type: "image/png" },
      ],
      shortcut: "/favicon-32x32.png?v=orange",
      apple: [
        { url: "/ios/180.png?v=orange", sizes: "180x180", type: "image/png" },
        { url: "/ios/152.png?v=orange", sizes: "152x152", type: "image/png" },
        { url: "/ios/120.png?v=orange", sizes: "120x120", type: "image/png" },
      ],
    },
    other: {
      google: "notranslate",
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const headersList = headers();
  const host = (headersList.get("x-forwarded-host") || headersList.get("host") || "").toLowerCase();
  const referer = (headersList.get("referer") || "").toLowerCase();

  const isJaramooz = host.includes("jaramooz.ir") || referer.includes("/jaramooz");

  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: isJaramooz ? "#006097" : "#CC785C",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pwaRes = await getPwaSettings().catch(() => ({ success: false, data: null }));
  const showIosPrompt = pwaRes.success && pwaRes.data ? pwaRes.data.showIosPrompt : true;

  return (
    <html lang="fa" dir="rtl" translate="no" className="notranslate" suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="/react-grab.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body className="min-h-dvh bg-jar-canvas font-sans antialiased text-jar-primary">
        {process.env.NODE_ENV === "development" && <ReactGrab />}
        <VpnSlowBanner />
        <NavbarWrapper />

        <MainLayout>
          {children}
        </MainLayout>

        <IosInstallPrompt showPrompt={showIosPrompt} />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
