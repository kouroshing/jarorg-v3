import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Camera,
  Film,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Phone,
  User,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  FileText,
  Share2,
  Headphones,
} from "lucide-react";
import { getOrderById } from "@/app/actions/orderActions";
import { formatPrice } from "@/lib/format/price";
import { getSession } from "@/lib/auth/session";
import {
  getOrderApplicantsForClientAction,
  ApplicantSpecialistView,
} from "@/app/actions/marketplaceActions";
import OrderApplicantsList from "@/components/order/OrderApplicantsList";
import CancelOrderButton from "@/components/order/CancelOrderButton";
import OrderWaitingHero from "@/components/order/OrderWaitingHero";
import OrderMatchingStage from "@/components/order/OrderMatchingStage";
import {
  isAdminTriage,
  isOnMarket,
  orderStatusPresentation,
  parseOrderStatus,
} from "@/lib/orders/status";

export const dynamic = "force-dynamic";

interface OrderDetailPageProps {
  params: {
    id: string;
  };
  searchParams?: {
    payment?: string;
  };
}

export async function generateMetadata({ params }: OrderDetailPageProps): Promise<Metadata> {
  return {
    title: `وضعیت سفارش #${params.id.slice(-6).toUpperCase()} | جستجوی متخصص جار`,
    description: "مشاهده وضعیت جستجوی هوشمند متخصص و رزرو خدمات عکاسی و فیلمبرداری در جار",
  };
}

export default async function OrderDetailPage({ params, searchParams }: OrderDetailPageProps) {
  const result = await getOrderById(params.id);

  if (!result.success || !result.order) {
    return (
      <main className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E5E0D8] shadow-xs text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-black text-[#141413]">سفارش موردنظر یافت نشد</h2>
          <p className="text-xs text-[#66605B] font-medium">
            ممکن است شناسه سفارش اشتباه باشد یا سفارش حذف شده باشد.
          </p>
          <Link
            href="/order"
            className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-[#141413] text-white text-xs font-medium hover:bg-[#282725] transition-colors shadow-none"
          >
            <ArrowRight className="h-4 w-4" />
            <span>ثبت سفارش جدید</span>
          </Link>
        </div>
      </main>
    );
  }

  const order = result.order;
  const parsedStatus = parseOrderStatus(order.status);
  const isAwaitingPayment = parsedStatus === "AWAITING_PAYMENT";
  const payableAmount =
    order.agreedTotalPrice && order.agreedTotalPrice > 0 ? order.agreedTotalPrice : null;

  // Session and ownership authorization
  const session = await getSession();
  const isOwner =
    session &&
    ((order.userId && order.userId === session.userId) ||
      (order.contactPhone && order.contactPhone === session.phone));
  const isAdmin = session?.role === "admin";
  const isOwnerOrAdmin = !!(isOwner || isAdmin);

  let applicants: ApplicantSpecialistView[] = [];
  const isPendingFlow = isAdminTriage(order.status);

  if (isOwnerOrAdmin && !isPendingFlow) {
    const appResult = await getOrderApplicantsForClientAction(order.id);
    if (appResult.success && appResult.applicants) {
      applicants = appResult.applicants;
    }
  }

  // Labels and badge colours live in lib/orders/status.ts so the admin
  // dropdown and this page cannot drift apart again.
  const currentStatus = orderStatusPresentation(order.status);

  // Location string label
  let locationLabel = "در محل کارفرما";
  if (order.locationType === "SPECIALIST_ADVICE") {
    locationLabel = "با پیشنهاد و مشورت عکاس";
  } else if (order.locationType === "JAR_STUDIO") {
    locationLabel = "استودیوهای همکار جار";
  }

  const moodboardImages: string[] = Array.isArray(order.moodboardUrls) ? order.moodboardUrls : [];

  return (
    <main className="min-h-screen bg-[#FAF9F5] py-10 px-4 sm:px-6 lg:px-8 text-[#141413]" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/order"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#66605B] hover:text-[#141413] transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            <span>ثبت سفارش جدید</span>
          </Link>

          <span className="text-xs text-[#A8A29A] font-mono">
            شناسه سفارش: #{order.id.slice(-8).toUpperCase()}
          </span>
        </div>

        {/* Payment status alerts */}
        {searchParams?.payment === "success" && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-bold shadow-xs">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>پرداخت با موفقیت انجام شد. پروژه قطعی است و هماهنگی با متخصص منتخب شروع می‌شود.</span>
          </div>
        )}

        {searchParams?.payment === "cancelled" && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#CC785C]/10 border border-[#CC785C]/30 text-[#CC785C] text-xs sm:text-sm font-bold shadow-xs">
            <AlertCircle className="h-5 w-5 text-[#CC785C] shrink-0" />
            <span>پرداخت لغو شد. متخصص منتخب محفوظ است؛ هر زمان می‌توانید دوباره پرداخت کنید.</span>
          </div>
        )}

        {(searchParams?.payment === "failed" ||
          searchParams?.payment === "no_amount" ||
          searchParams?.payment === "not_ready" ||
          searchParams?.payment === "configuration_error") && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold shadow-xs">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>
              {searchParams.payment === "no_amount"
                ? "مبلغ قابل پرداخت برای این سفارش ثبت نشده است. با پشتیبانی تماس بگیرید."
                : searchParams.payment === "not_ready"
                  ? "هنوز متخصصی انتخاب نشده یا سفارش آماده پرداخت نیست."
                  : searchParams.payment === "configuration_error"
                    ? "درگاه پرداخت در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید."
                    : "پرداخت ناموفق بود. در صورت کسر وجه، ظرف ۷۲ ساعت بازمی‌گردد؛ می‌توانید دوباره تلاش کنید."}
            </span>
          </div>
        )}

        {searchParams?.payment === "already" && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-bold shadow-xs">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>این سفارش قبلاً پرداخت شده و پروژه قطعی است.</span>
          </div>
        )}

        {/* Top Hero Banner - 72h Waiting Screen vs Radar vs Generic */}
        {isPendingFlow ? (
          <OrderWaitingHero order={order} />
        ) : isOnMarket(order.status) ? (
          <OrderMatchingStage
            orderId={order.id}
            categoryTitle={order.categoryTitle || "پروژه"}
            districtOrCity={order.districtOrCity}
            orderStatus={order.status}
            initialApplicants={applicants}
            isOwnerOrAdmin={isOwnerOrAdmin}
            selectedSpecialistId={order.selectedSpecialistId}
            agreedTotalPrice={order.agreedTotalPrice}
          />
        ) : (
          <div className="rounded-[32px] border border-slate-200 bg-white/95 p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold shadow-xs ${currentStatus.badgeBg}`}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{currentStatus.label}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950">
                  سفارش {order.categoryTitle}
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  شناسه رهگیری سفارش: #{order.id.slice(-8).toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Info (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Confirmed Project Contact Card (Revealed ONLY after CONFIRMED, owner/admin only) */}
            {order.status === "CONFIRMED" && isOwnerOrAdmin && (
              <div className="rounded-[28px] border-2 border-emerald-500/80 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/30 p-5 sm:p-7 shadow-[0_8px_30px_rgba(16,185,129,0.12)] space-y-5 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">اطلاعات تماس جهت هماهنگی</h3>
                      <p className="text-[11px] text-emerald-800 font-bold mt-0.5">
                        پروژه با تأیید دوطرفه قطعی شده است. می‌توانید مستقیماً برای هماهنگی زمان و لوکیشن تماس بگیرید.
                      </p>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>تأیید دوطرفه قطعی</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Confirmed Specialist Contact Box */}
                  <div className="p-4 rounded-2xl bg-white border border-emerald-200/90 shadow-2xs space-y-3">
                    <span className="block text-[11px] font-bold text-slate-400">متخصص منتخب و مجری پروژه:</span>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-[#141413] text-white flex items-center justify-center font-bold text-sm">
                        <Camera className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-black text-[#141413] text-sm block truncate">
                          {order.selectedSpecialist?.displayName || "متخصص عکاسی جار"}
                        </span>
                        {order.selectedSpecialist?.city && (
                          <span className="text-[11px] text-[#66605B] font-medium block">
                            مستقر در {order.selectedSpecialist.city}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E5E0D8] flex items-center justify-between gap-2">
                      <span className="text-[#66605B] font-medium">شماره تماس مستقیم:</span>
                      {order.selectedSpecialist?.phone ? (
                        <a
                          href={`tel:${order.selectedSpecialist.phone}`}
                          className="font-mono font-black text-sm text-emerald-700 hover:text-emerald-800 dir-ltr inline-flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                        >
                          <Phone className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{order.selectedSpecialist.phone}</span>
                        </a>
                      ) : (
                        <span className="text-[11px] font-medium text-[#CC785C] bg-[#CC785C]/10 border border-[#CC785C]/20 px-2 py-0.5 rounded">
                          شماره در پرونده ثبت نشده است
                        </span>
                      )}
                    </div>

                    {order.selectedSpecialist?.equipment && (
                      <div className="text-[11px] text-[#66605B] bg-[#FAF9F5] p-2 rounded-xl border border-[#E5E0D8]">
                        <span className="font-bold text-[#141413]">تجهیزات: </span>
                        <span>{order.selectedSpecialist.equipment}</span>
                      </div>
                    )}
                  </div>

                  {/* Client Contact Box */}
                  <div className="p-4 rounded-2xl bg-white border border-emerald-200/90 shadow-2xs space-y-3">
                    <span className="block text-[11px] font-bold text-slate-400">اطلاعات کارفرما (ثبت‌کننده):</span>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-[#141413]/5 text-[#141413] flex items-center justify-center font-bold text-sm">
                        <User className="h-5 w-5 text-[#141413]" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-black text-[#141413] text-sm block truncate">
                          {order.contactName || order.user?.displayName || "کارفرما"}
                        </span>
                        <span className="text-[11px] text-[#66605B] font-medium block">
                          ثبت‌کننده سفارش #{order.id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E5E0D8] flex items-center justify-between gap-2">
                      <span className="text-[#66605B] font-medium">شماره تماس:</span>
                      {order.contactPhone ? (
                        <a
                          href={`tel:${order.contactPhone}`}
                          className="font-mono font-black text-sm text-[#141413] hover:text-black dir-ltr inline-flex items-center gap-1 bg-[#FAF9F5] px-2.5 py-1 rounded-lg border border-[#E5E0D8]"
                        >
                          <Phone className="h-3.5 w-3.5 text-[#66605B]" />
                          <span>{order.contactPhone}</span>
                        </a>
                      ) : (
                        <span className="text-[11px] font-medium text-[#A8A29A]">ثبت نشده</span>
                      )}
                    </div>

                    <div className="text-[11px] text-[#66605B] bg-[#FAF9F5] p-2 rounded-xl border border-[#E5E0D8] leading-relaxed">
                      <span>هماهنگی نهایی ساعت حضور و جزئیات پروژه بین کارفرما و متخصص انجام می‌شود.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Project Specifications */}
            <div className="rounded-[28px] border border-[#E5E0D8] bg-white p-5 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E5E0D8] pb-3">
                <FileText className="h-5 w-5 text-[#141413]" />
                <h3 className="text-base font-black text-[#141413]">مشخصات و زمان‌بندی پروژه</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                {order.isFlexibleSchedule ? (
                  <div className="col-span-1 sm:col-span-2 p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E5E0D8] flex items-start gap-3">
                    <Sparkles className="h-4 w-4 text-[#CC785C] shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-[#66605B] font-medium text-[11px]">زمان‌بندی و برگزاری:</span>
                      <span className="font-bold text-[#141413] text-sm mt-0.5 block">
                        منعطف و زودترین زمان ممکن (توافق ساعت با متخصص پس از پذیرش)
                      </span>
                      <span className="block text-xs text-[#66605B] mt-1 font-normal">
                        مدت زمان تخمینی پروژه: {order.durationHours} ساعت
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E5E0D8] flex items-start gap-3">
                      <Calendar className="h-4 w-4 text-[#141413] shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-[#66605B] font-medium">تاریخ برگزاری:</span>
                        <span className="font-bold text-[#141413] text-sm mt-0.5 block">{order.bookingDate || "تعیین‌نشده"}</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E5E0D8] flex items-start gap-3">
                      <Clock className="h-4 w-4 text-[#141413] shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-[#66605B] font-medium">ساعت و مدت زمان:</span>
                        <span className="font-bold text-[#141413] text-sm mt-0.5 block">
                          {order.timeSlot || "تعیین‌نشده"} ({order.durationHours} ساعت)
                        </span>
                      </div>
                    </div>
                  </>
                )}

                <div className="col-span-1 sm:col-span-2 p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E5E0D8] flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-[#141413] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[#66605B] font-medium">لوکیشن و محل عکاسی:</span>
                    <span className="font-bold text-[#141413] text-sm mt-0.5 block">
                      {locationLabel}
                      {order.districtOrCity ? ` - ${order.districtOrCity}` : ""}
                    </span>
                    {order.locationAddress && isOwnerOrAdmin && (
                      <span className="block text-xs text-[#66605B] mt-1 font-normal">
                        آدرس: {order.locationAddress}
                      </span>
                    )}
                  </div>
                </div>

                {order.contactName && (
                  <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E5E0D8] flex items-start gap-3">
                    <User className="h-4 w-4 text-[#141413] shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-[#66605B] font-medium">کارفرما:</span>
                      <span className="font-bold text-[#141413] text-sm mt-0.5 block">{order.contactName}</span>
                    </div>
                  </div>
                )}

                {order.contactPhone && (
                  <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E5E0D8] flex items-start gap-3">
                    <Phone className="h-4 w-4 text-[#141413] shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-[#66605B] font-medium">شماره تماس هماهنگی:</span>
                      {order.status === "CONFIRMED" ? (
                        <span className="font-bold text-[#141413] text-sm mt-0.5 block font-mono" dir="ltr">
                          {isOwnerOrAdmin
                            ? order.contactPhone
                            : `${order.contactPhone.slice(0, 4)}***${order.contactPhone.slice(-4)}`}
                        </span>
                      ) : (
                        <span className="text-[#66605B] text-[11px] mt-0.5 block font-medium">
                          پس از تأیید و قطعی‌شدن پروژه نمایش داده می‌شود
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Moodboard, Reference, Description */}
            {(order.referenceLink || moodboardImages.length > 0 || order.projectDescription) && (
              <div className="rounded-[28px] border border-[#E5E0D8] bg-white p-5 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[#E5E0D8] pb-3">
                  <Sparkles className="h-5 w-5 text-[#CC785C]" />
                  <h3 className="text-base font-black text-[#141413]">نمونه ایده و توضیحات پروژه</h3>
                </div>

                {order.referenceLink && (
                  <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E5E0D8] flex items-center justify-between text-xs">
                    <span className="font-bold text-[#141413]">لینک رفرنس یا صفحه اینستاگرام/پینترست:</span>
                    <a
                      href={order.referenceLink.startsWith("http") ? order.referenceLink : `https://${order.referenceLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[#CC785C] hover:text-[#141413] font-bold"
                    >
                      <span className="truncate max-w-[200px]">{order.referenceLink}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}

                {moodboardImages.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">تصاویر رفرنس و سبک مدنظر:</span>
                    <div className="grid grid-cols-3 gap-3">
                      {moodboardImages.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
                          <Image
                            src={url}
                            alt={`نمونه کار ${i + 1}`}
                            fill
                            className="object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {order.projectDescription && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
                    <span className="text-xs font-bold text-slate-500 block">توضیحات و نیازمندی‌های کارفرما:</span>
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                      {order.projectDescription}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 3. Applicants & Specialist Selection List (Hidden for pending flow) */}
            {!isPendingFlow && !isOnMarket(order.status) && (
              <OrderApplicantsList
                orderId={order.id}
                orderStatus={order.status}
                initialApplicants={applicants}
                isOwnerOrAdmin={isOwnerOrAdmin}
                selectedSpecialistId={order.selectedSpecialistId}
                agreedTotalPrice={order.agreedTotalPrice}
              />
            )}

          </div>

          {/* Sidebar Invoice & Payment (1 Col) */}
          <div className="space-y-6">
            
            <div className="rounded-[28px] border border-[#E5E0D8] bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 border-b border-[#E5E0D8] pb-3">
                <CreditCard className="h-5 w-5 text-[#141413]" />
                <h3 className="text-base font-black text-[#141413]">جزئیات مالی پروژه</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-[#66605B] font-medium">
                  <div className="flex items-center gap-1.5">
                    <span>نرخ ساعتی:</span>
                    {order.isAutoPriced ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-[#CC785C]/10 text-[#CC785C] border border-[#CC785C]/20 text-[10px] font-black">
                        پیشنهادی جار
                      </span>
                    ) : null}
                  </div>
                  <span className="font-bold text-[#141413] font-mono">{formatPrice(order.hourlyRate)} تومان</span>
                </div>

                <div className="flex items-center justify-between text-[#66605B] font-medium">
                  <span>مدت زمان:</span>
                  <span className="font-bold text-[#141413]">{order.durationHours} ساعت</span>
                </div>

                <div className="flex items-center justify-between text-sm font-bold text-[#141413] pt-2 border-t border-[#E5E0D8]">
                  <span>کل برآورد پروژه:</span>
                  <span className="font-black font-mono">{formatPrice(order.totalEstimatedPrice)} تومان</span>
                </div>

                {isAwaitingPayment && payableAmount != null && (
                  <div className="space-y-2 pt-1">
                    {typeof order.agreedBasePrice === "number" && (
                      <div className="flex items-center justify-between text-[#66605B] font-medium">
                        <span>دستمزد توافق‌شده:</span>
                        <span className="font-bold text-[#141413] font-mono">
                          {formatPrice(order.agreedBasePrice)} تومان
                        </span>
                      </div>
                    )}
                    {typeof order.agreedTravelFee === "number" && order.agreedTravelFee > 0 && (
                      <div className="flex items-center justify-between text-[#66605B] font-medium">
                        <span>ایاب‌وذهاب:</span>
                        <span className="font-bold text-[#141413] font-mono">
                          {formatPrice(order.agreedTravelFee)} تومان
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm font-black text-[#141413] pt-2 border-t border-dashed border-[#E5E0D8]">
                      <span>مبلغ قابل پرداخت:</span>
                      <span className="font-mono">{formatPrice(payableAmount)} تومان</span>
                    </div>
                  </div>
                )}

                {isAwaitingPayment && isOwnerOrAdmin ? (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black">وضعیت تسویه مالی:</span>
                      <span className="text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                        در انتظار پرداخت شما
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-900/80 leading-relaxed">
                      متخصص انتخاب شده است. با پرداخت مبلغ توافق‌شده، پروژه قطعی می‌شود و مبلغ نزد جار امانت می‌ماند.
                    </p>
                    <a
                      href={`/api/order/pay?orderId=${encodeURIComponent(order.id)}`}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#141413] text-white text-xs font-medium hover:bg-[#282725] transition-colors"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>
                        {payableAmount != null
                          ? `پرداخت ${formatPrice(payableAmount)} تومان`
                          : "پرداخت و قطعی کردن پروژه"}
                      </span>
                    </a>
                  </div>
                ) : order.paidAt || parsedStatus === "CONFIRMED" ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black">وضعیت تسویه مالی:</span>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                        پرداخت شده
                      </span>
                    </div>
                    {payableAmount != null && (
                      <p className="text-[10px] text-emerald-900/80 leading-relaxed pt-1 font-mono">
                        مبلغ قطعی: {formatPrice(payableAmount)} تومان
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E5E0D8] text-[#141413] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black">وضعیت تسویه مالی:</span>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        ثبت رایگان
                      </span>
                    </div>
                    <p className="text-[10px] text-[#66605B] leading-relaxed pt-1">
                      ثبت اولیه رایگان است. بعد از انتخاب متخصص، پرداخت مبلغ توافق‌شده پروژه را قطعی می‌کند.
                    </p>
                  </div>
                )}
              </div>

              {/* Mandatory Transparent Guidance Note */}
              <div className="flex items-start gap-2 rounded-xl bg-[#FAF9F5] border border-[#E5E0D8] p-3 text-[#66605B] text-right">
                <AlertCircle className="h-4 w-4 text-[#66605B] shrink-0 mt-0.5" />
                <p className="text-[10px] leading-relaxed font-medium">
                  {isAwaitingPayment
                    ? "«مبلغ پرداختی همان مبلغ توافق‌شده با متخصص منتخب است و تا انجام پروژه نزد جار امانت می‌ماند.»"
                    : "«مبلغ فوق برآورد تخمینی پروژه است؛ پرداخت نهایی بعد از انتخاب متخصص و بر اساس پیشنهاد او انجام می‌شود.»"}
                </p>
              </div>

              {/* Telegram & Support CTA */}
              <div className="pt-2 border-t border-[#E5E0D8]">
                <a
                  href="https://t.me/jarorg_support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-[#FAF9F5] border border-[#E5E0D8] hover:bg-[#F3F1EC] text-[#141413] text-xs font-bold transition-colors"
                >
                  <Headphones className="h-4 w-4 text-[#66605B]" />
                  <span>پشتیبانی و هماهنگی تلگرام</span>
                </a>
              </div>

              {/* Cancel Order Button (Active only after 72 hours) */}
              <CancelOrderButton
                orderId={order.id}
                orderStatus={order.status}
                createdAt={order.createdAt}
                hasSelectedSpecialist={!!order.selectedSpecialistId}
                isOwnerOrAdmin={isOwnerOrAdmin}
              />

            </div>

          </div>

        </div>

      </div>
    </main>
  );
}
