import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import {
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL,
} from "@/lib/support/contact";

export default function ContactPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8 py-4" dir="rtl">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-[#141413]">
          تماس با ما
        </h1>
        <p className="mt-2 text-sm font-medium text-[#66605B]">
          برای پیگیری پروژه یا پشتیبانی با ما در ارتباط باشید.
        </p>
      </header>

      <div className="space-y-4">
        <a
          href={SUPPORT_PHONE_TEL}
          className="flex items-center gap-4 rounded-2xl border border-[#E5E0D8] bg-white p-5 shadow-xs transition-all hover:border-[#141413]/40 cursor-pointer"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#CC785C]/10 text-[#CC785C] border border-[#CC785C]/20 shrink-0">
            <Phone className="h-5 w-5" />
          </span>
          <div className="text-right">
            <p className="text-sm font-bold text-[#141413]">تلفن پشتیبانی</p>
            <p className="mt-0.5 text-sm text-[#66605B] font-mono" dir="ltr">
              {SUPPORT_PHONE_DISPLAY}
            </p>
          </div>
        </a>

        <div className="flex items-center gap-4 rounded-2xl border border-[#E5E0D8] bg-white p-5 shadow-xs">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FAF9F5] text-[#141413] border border-[#E5E0D8] shrink-0">
            <Mail className="h-5 w-5" />
          </span>
          <div className="text-right">
            <p className="text-sm font-bold text-[#141413]">ساعات پاسخ‌گویی</p>
            <p className="mt-0.5 text-sm text-[#66605B]">
              شنبه تا پنج‌شنبه · ۹ تا ۱۸
            </p>
          </div>
        </div>
      </div>

      <nav className="flex flex-wrap gap-4 text-sm font-medium text-[#66605B]">
        <Link href="/privacy" className="transition-colors hover:text-[#141413]">
          حریم خصوصی
        </Link>
        <Link href="/terms" className="transition-colors hover:text-[#141413]">
          قوانین
        </Link>
        <Link href="/order" className="transition-colors hover:text-[#141413]">
          ثبت سفارش
        </Link>
      </nav>
    </article>
  );
}
