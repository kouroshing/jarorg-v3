import React from "react";
import type { Metadata, Viewport } from "next";
import { JarAmoozPurchaseProvider } from "@/components/jaramooz/JarAmoozPurchaseContext";

export const metadata: Metadata = {
  title: {
    default: "مسترکلاس ۱۰۰ روزه عکاسی تجاری و تبلیغاتی | کوروش چنان (جارآموز)",
    template: "%s | جار آموز",
  },
  description: "آموزش تخصصی نورپردازی، عکاسی تجاری و ورود مستقیم به بازار کار با تدریس کوروش چنان در جارآموز.",
  applicationName: "جار آموز",
  icons: {
    icon: [
      { url: "/appstore-images-jaramooz/android/launchericon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/appstore-images-jaramooz/android/launchericon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/appstore-images-jaramooz/android/android-launchericon-192-192.png", sizes: "192x192", type: "image/png" },
      { url: "/appstore-images-jaramooz/android/android-launchericon-512-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/appstore-images-jaramooz/android/launchericon-192x192.png",
    apple: [
      { url: "/appstore-images-jaramooz/ios/180.png", sizes: "180x180", type: "image/png" },
      { url: "/appstore-images-jaramooz/ios/152.png", sizes: "152x152", type: "image/png" },
      { url: "/appstore-images-jaramooz/ios/120.png", sizes: "120x120", type: "image/png" },
    ],
  },
  other: {
    google: "notranslate",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#006097",
};

export default function JarAmoozLayout({ children }: { children: React.ReactNode }) {
  return (
    <JarAmoozPurchaseProvider>
      {children}
    </JarAmoozPurchaseProvider>
  );
}
