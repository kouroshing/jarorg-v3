import type { Metadata } from "next";
import { JarLocationExplorer } from "@/components/tools/JarLocationExplorer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "جار لوکیشن | نقشه لوکیشن و عمارت عکاسی",
  description:
    "جار لوکیشن — مشاهده و ثبت لوکیشن‌های عکاسی، عمارت و فضای باز روی نقشه. نزدیک‌ترین‌ها به شما، جزئیات مجوز، دوربین و امنیت.",
  openGraph: {
    title: "جار لوکیشن",
    description: "نقشه لوکیشن‌های عکاسی ایران",
  },
};

export default function JarLocationsToolPage() {
  return <JarLocationExplorer />;
}
