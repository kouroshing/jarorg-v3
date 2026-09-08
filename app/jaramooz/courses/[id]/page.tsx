import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Play, BookOpen, Clock, AlertCircle, Award } from "lucide-react";
import PurchaseButtonWrapper from "./PurchaseButtonWrapper";

export const dynamic = "force-dynamic";

function formatPrice(price: number): string {
  return price.toLocaleString("fa-IR") + " تومان";
}

// Mock syllabus data to make the page look fully realized
const SYLLABUS = [
  { title: "معرفی دوره و پیش‌نیازها", duration: "۱۰ دقیقه" },
  { title: "مفاهیم پایه، شناخت نور و فیزیک سنسورها", duration: "۴۵ دقیقه" },
  { title: "چیدمان و ترکیب‌بندی خلاقانه سوژه‌ها", duration: "۶۰ دقیقه" },
  { title: "کار عملی در محیط استودیو و فضای باز", duration: "۱۲۰ دقیقه" },
  { title: "ادیت نهایی، اصلاح رنگ و کار با نرم‌افزارها", duration: "۹۰ دقیقه" },
];

type Props = {
  params: { id: string };
  searchParams: { error?: string };
};

export default async function CourseDetailPage({ params, searchParams }: Props) {
  const course = await prisma.course.findUnique({
    where: { id: params.id },
  });

  if (!course) {
    notFound();
  }

  const session = await getSession();
  let isPurchased = false;

  if (session) {
    const purchase = await prisma.purchase.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: course.id,
        },
      },
    });
    isPurchased = purchase?.status === "SUCCESS";
  }

  // Cover gradient mapping
  let gradient = "from-amber-500 to-yellow-600";
  if (course.image === "reels") {
    gradient = "from-purple-600 to-indigo-700";
  } else if (course.image === "lighting") {
    gradient = "from-cyan-600 to-blue-700";
  }

  return (
    <div className="min-h-screen bg-white pb-16">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/jaramooz"
          className="inline-flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-black"
        >
          <ChevronRight className="h-4 w-4" />
          بازگشت به لیست دوره‌ها
        </Link>
      </div>

      {/* Payment Error Banner */}
      {searchParams.error === "payment_failed" && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 animate-fade-step">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>فرآیند پرداخت ناموفق بود یا توسط کاربر لغو شد. لطفاً دوباره تلاش کنید.</span>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Details & Syllabus */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl leading-tight">
              {course.title}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-gray-600 sm:text-base">
              {course.description}
            </p>
          </div>

          {/* Syllabus Section */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-jar-yellow" />
              سرفصل‌های آموزشی دوره
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              این پکیج شامل {SYLLABUS.length.toLocaleString("fa-IR")} بخش آموزشی جامع به مدت کل ۵ ساعت است.
            </p>

            <div className="mt-6 divide-y divide-gray-50">
              {SYLLABUS.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-50 text-[10px] font-bold text-gray-500">
                      {(idx + 1).toLocaleString("fa-IR")}
                    </span>
                    <span className="text-xs font-semibold text-gray-700 sm:text-sm">
                      {item.title}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium" dir="ltr">
                    <Clock className="h-3 w-3" />
                    {item.duration}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Purchase Widget */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
            {/* Visual Header */}
            <div className={`flex h-40 w-full items-center justify-center bg-gradient-to-br ${gradient} text-white`}>
              <Award className="h-12 w-12 opacity-35" />
            </div>

            {/* Widget body */}
            <div className="p-6 space-y-6">
              {isPurchased ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-green-50 border border-green-100 p-4 text-center text-xs font-semibold text-green-700">
                    شما در این دوره ثبت‌نام کرده‌اید.
                  </div>
                  <Link
                    href={`/jaramooz/courses/${course.id}/play`}
                    className="w-full inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gray-900 text-white font-bold hover:bg-black transition-all"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    شروع یادگیری و پخش ویدیوها
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">قیمت نهایی پکیج:</span>
                    <span className="text-lg font-black text-black">
                      {formatPrice(course.price)}
                    </span>
                  </div>

                  <PurchaseButtonWrapper
                    courseId={course.id}
                    isLoggedIn={!!session}
                    initialPhone={session?.phone || ""}
                  />

                  <div className="text-[10px] leading-relaxed text-gray-400 text-center">
                    دسترسی شما پس از پرداخت آنی از درگاه شتاب فعال خواهد شد.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
