import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  CreditCard,
  Phone,
  User,
} from "lucide-react";
import { getOrderById } from "@/app/actions/orderActions";
import { formatPrice } from "@/lib/format/price";
import { getSession } from "@/lib/auth/session";
import {
  getOrderApplicantsForClientAction,
  ApplicantSpecialistView,
} from "@/app/actions/marketplaceActions";
import OrderClientWaiting from "@/components/order/OrderClientWaiting";
import CancelOrderButton from "@/components/order/CancelOrderButton";
import OrderWaitingHero from "@/components/order/OrderWaitingHero";
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
    title: `وضعیت سفارش #${params.id.slice(-6).toUpperCase()} | جار`,
    description: "وضعیت جستجوی متخصص برای پروژه شما در جار",
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
          <Link
            href="/order"
            className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-[#141413] text-white text-xs font-medium hover:bg-[#282725] transition-colors"
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

  const currentStatus = orderStatusPresentation(order.status);

  return (
    <main className="min-h-screen bg-[#FAF9F5] py-10 px-4 sm:px-6 lg:px-8 text-[#141413]" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#66605B] hover:text-[#141413] transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            <span>پروفایل من</span>
          </Link>
          <span className="text-xs text-[#A8A29A] font-mono">
            #{order.id.slice(-8).toUpperCase()}
          </span>
        </div>

        {searchParams?.payment === "success" && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-bold">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>پرداخت انجام شد. پروژه قطعی است.</span>
          </div>
        )}

        {searchParams?.payment === "cancelled" && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#CC785C]/10 border border-[#CC785C]/30 text-[#CC785C] text-xs sm:text-sm font-bold">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>پرداخت لغو شد. می‌توانید دوباره تلاش کنید.</span>
          </div>
        )}

        {parsedStatus === "CANCELLED" && (
          <div className="rounded-[28px] border border-[#E5E0D8] bg-white p-8 text-center space-y-4">
            <h1 className="text-lg font-black">این پروژه لغو شده است</h1>
            <p className="text-xs text-[#66605B]">می‌توانید پروژه جدیدی ثبت کنید.</p>
            <Link
              href="/order"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#141413] px-6 text-xs font-medium text-white"
            >
              ثبت پروژه جدید
            </Link>
          </div>
        )}

        {isPendingFlow && <OrderWaitingHero order={order} />}

        {isOnMarket(order.status) && (
          <OrderClientWaiting
            orderId={order.id}
            categoryTitle={order.categoryTitle || "پروژه"}
            orderStatus={order.status}
            initialApplicants={applicants}
            isOwnerOrAdmin={isOwnerOrAdmin}
            selectedSpecialistId={order.selectedSpecialistId}
            agreedTotalPrice={order.agreedTotalPrice}
          />
        )}

        {/* After specialist selection: payment only (no estimate sidebar) */}
        {isAwaitingPayment && isOwnerOrAdmin && (
          <div className="rounded-[28px] border border-amber-200 bg-amber-50/80 p-6 sm:p-8 space-y-5 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-900">
              در انتظار پرداخت شما
            </div>
            <h1 className="text-xl font-black text-[#141413]">متخصص انتخاب شد</h1>
            <p className="text-xs text-amber-950/80 leading-relaxed max-w-md mx-auto">
              با پرداخت مبلغ توافق‌شده، پروژه قطعی می‌شود و هماهنگی شروع می‌گردد.
            </p>
            {payableAmount != null && (
              <p className="text-2xl font-black font-mono text-[#141413]">
                {formatPrice(payableAmount)} تومان
              </p>
            )}
            <a
              href={`/api/order/pay?orderId=${encodeURIComponent(order.id)}`}
              className="inline-flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-[#141413] text-white text-sm font-medium hover:bg-[#282725] transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              <span>
                {payableAmount != null
                  ? `پرداخت ${formatPrice(payableAmount)} تومان`
                  : "پرداخت و قطعی کردن پروژه"}
              </span>
            </a>
            <div className="max-w-sm mx-auto pt-2">
              <CancelOrderButton
                orderId={order.id}
                orderStatus={order.status}
                isOwnerOrAdmin={isOwnerOrAdmin}
              />
            </div>
          </div>
        )}

        {parsedStatus === "CONFIRMED" && isOwnerOrAdmin && (
          <div className="rounded-[28px] border border-emerald-200 bg-emerald-50/50 p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="h-5 w-5" />
              <h1 className="text-base font-black">پروژه قطعی شد</h1>
            </div>
            {order.selectedSpecialist && (
              <div className="rounded-2xl border border-emerald-200 bg-white p-4 flex items-center gap-3 text-right">
                <div className="h-10 w-10 rounded-xl bg-[#141413] text-white flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black">
                    {order.selectedSpecialist.displayName || "متخصص جار"}
                  </p>
                  {order.contactRevealedAt && order.selectedSpecialist.phone ? (
                    <a
                      href={`tel:${order.selectedSpecialist.phone}`}
                      className="text-xs font-bold text-emerald-800 inline-flex items-center gap-1 mt-1"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {order.selectedSpecialist.phone}
                    </a>
                  ) : (
                    <p className="text-[11px] text-[#66605B] mt-1">
                      شماره تماس نزدیک زمان پروژه نمایش داده می‌شود.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {!isOnMarket(order.status) &&
          !isPendingFlow &&
          !isAwaitingPayment &&
          parsedStatus !== "CONFIRMED" &&
          parsedStatus !== "CANCELLED" && (
            <div className="rounded-[28px] border border-[#E5E0D8] bg-white p-6 space-y-3 text-center">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold ${currentStatus.badgeBg}`}
              >
                {currentStatus.label}
              </div>
              <h1 className="text-lg font-black">سفارش {order.categoryTitle}</h1>
              <CancelOrderButton
                orderId={order.id}
                orderStatus={order.status}
                isOwnerOrAdmin={isOwnerOrAdmin}
              />
            </div>
          )}
      </div>
    </main>
  );
}
