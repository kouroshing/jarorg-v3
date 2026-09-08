import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { Phone } from "lucide-react";

export function HomeFooter() {
  return (
    <footer
      id="footer"
      className="relative border-t border-[#282725] bg-[#141413] text-[#FAF9F5] py-12 select-none scroll-mt-20 overflow-hidden"
      dir="rtl"
    >
      {/* Subtle Luxury Gradient Accent Line at top border */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#CC785C]/35 to-transparent pointer-events-none" />

      {/* Ambient background glow */}
      <div className="absolute -top-32 right-1/4 w-96 h-96 rounded-full bg-[#CC785C]/[0.03] blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#282725] pb-8">
          <div className="flex items-center gap-3">
            <BrandLogo variant="footer" showWordmark={false} />
            <div className="flex flex-col">
              <span className="text-sm font-black text-white leading-none">
                پلتفرم جامع جار
              </span>
              <span className="text-[10px] text-jar-logo font-bold mt-1">
                سفارش عکاسی، فیلمبرداری و آکادمی تخصصی
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="tel:09100138383"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] px-4 py-2 text-xs font-bold text-white shadow-2xs transition-all duration-200"
            >
              <Phone className="h-3.5 w-3.5 text-jar-logo" />
              <span dir="ltr">۰۹۱۰۰۱۳۸۳۸۳</span>
              <span className="text-[10px] text-[#A8A29A] font-normal">(مشاوره رایگان)</span>
            </a>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-xs text-[#A8A29A]">
          <p className="font-medium text-[#8E867E]">
            © ۲۰۲۶ پلتفرم جار (Jarorg). تمامی حقوق مادی و معنوی محفوظ است.
          </p>

          <nav
            className="flex flex-wrap items-center gap-5 font-bold text-[#A8A29A]"
            aria-label="لینک‌های پایین صفحه"
          >
            <Link href="/" className="hover:text-white transition-colors">
              صفحه اصلی
            </Link>
            <Link href="/order" className="hover:text-white transition-colors">
              ثبت سفارش
            </Link>
            <Link href="/jaramooz" className="hover:text-white transition-colors">
              جارآموز
            </Link>
            <Link href="/tools" className="hover:text-white transition-colors">
              ابزارها
            </Link>
            <Link href="/contact" className="hover:text-white transition-colors">
              تماس با ما
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              حریم خصوصی
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              قوانین
            </Link>
          </nav>
        </div>

      </div>
    </footer>
  );
}
