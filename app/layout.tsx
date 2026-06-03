import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { NavbarWrapper } from "@/components/NavbarWrapper";

// Vazirmatn: crisp Persian + Latin glyphs, exposed as a CSS variable so
// Tailwind's `font-sans` token can reference it.
const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "جار | پلتفرم رزرو خدمات بصری",
  description: "ثبت سفارش عکاسی، فیلم‌برداری و خدمات بصری",
  applicationName: "جار",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "جار",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/app-icon.png",
  },
};

// Viewport + PWA / iOS Add to Home Screen. `viewportFit: cover` enables safe-area insets.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // RTL + Persian as the base direction/language for native mirroring.
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="min-h-dvh bg-white font-sans">
        <NavbarWrapper />

        {/*
          Top: safe-area + pt-20 / md:pt-24 clearance for fixed header.
          Bottom: mobile app bar clearance; md resets to normal padding.
        */}
        <main className="mx-auto w-full max-w-5xl px-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(env(safe-area-inset-top,0px)+5rem)] md:px-8 md:pb-12 md:pt-[calc(env(safe-area-inset-top,0px)+6rem)]">
          {children}
        </main>
      </body>
    </html>
  );
}
