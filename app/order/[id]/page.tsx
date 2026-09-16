import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
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
import { resolveAdminAccess } from "@/lib/auth/adminAccess";
import {
  getOrderApplicantsForClientAction,
  ApplicantSpecialistView,
} from "@/app/actions/marketplaceActions";
import OrderClientWaiting from "@/components/order/OrderClientWaiting";
import CancelOrderButton from "@/components/order/CancelOrderButton";
import OrderAdminStage from "@/components/order/OrderAdminStage";
import OrderDeliveryPanel from "@/components/order/OrderDeliveryPanel";
import OrderChatPanel from "@/components/order/OrderChatPanel";
import OrderReviewPanel from "@/components/order/OrderReviewPanel";
import {
  isAdminTriage,
  isClientCancellable,
  isOnMarket,
  needsClientEdit,
  orderStatusPresentation,
  parseOrderStatus,
} from "@/lib/orders/status";
import { formatPublicSpecialistName } from "@/lib/specialists/publicName";

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
    title: `وضعیت رزرو #${params.id.slice(-6).toUpperCase()} | جار`,
    description: "وضعیت رزرو پروژه شما در جار",
  };
}

export default async function OrderDetailPage({ params, searchParams }: OrderDetailPageProps) {
  const result = await getOrderById(params.id);

  if (!result.success || !result.order) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-neutral-200 shadow-sm text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-black text-neutral-900">رزرو موردنظر یافت نشد</h2>
          <Link
            href="/order"
            className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            <span>ثبت رزرو جدید</span>
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
  const isOwner = !!(
    session &&
    ((order.userId && order.userId === session.userId) ||
      (order.contactPhone && order.contactPhone === session.phone))
  );
  const adminAccess = await resolveAdminAccess(session);
  const isAdmin = Boolean(adminAccess);
  const isOwnerOrAdmin = !!(isOwner || isAdmin);
  const isSelectedSpecialist = !!(
    session?.userId && order.selectedSpecialistId === session.userId
  );
  const deliveryRole = isAdmin
    ? "admin"
    : isSelectedSpecialist
      ? "specialist"
      : isOwner
        ? "client"
        : null;
  const showDelivery =
    Boolean(order.paidAt) &&
    (parsedStatus === "CONFIRMED" ||
      parsedStatus === "COMPLETED" ||
      Boolean(order.settledAt) ||
      Boolean(order.disputedAt)) &&
    deliveryRole != null;

  const showChat =
    Boolean(order.paidAt) &&
    deliveryRole != null &&
    parsedStatus !== "CANCELLED";
  /** Admins review the thread read-only (esp. during disputes). */
  const chatReadOnly = deliveryRole === "admin";
  const showReview =
    Boolean(order.settledAt) &&
    (deliveryRole === "client" || deliveryRole === "specialist");

  let applicants: ApplicantSpecialistView[] = [];
  const isPendingFlow =
    isAdminTriage(order.status) || needsClientEdit(order.status);

  if (isOwnerOrAdmin && !isPendingFlow) {
    const appResult = await getOrderApplicantsForClientAction(order.id);
    if (appResult.success && appResult.applicants) {
      applicants = appResult.applicants;
    }
  }

  const currentStatus = orderStatusPresentation(order.status);
  const moodboardUrls = Array.isArray(order.moodboardUrls) ? order.moodboardUrls : [];
  const showCancel =
    isOwnerOrAdmin &&
    !order.settledAt &&
    !order.disputedAt &&
    parsedStatus !== "CANCELLED" &&
    parsedStatus !== "COMPLETED" &&
    (isClientCancellable(order.status) ||
      (parsedStatus === "CONFIRMED" && !order.deliveredAt));

  return (
    <main
      className="min-h-screen bg-white text-neutral-900 pb-10"
      dir="rtl"
    >
      <div className="border-b border-neutral-200 bg-white sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            <span>بازگشت به پروفایل</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-mono tracking-wide">
              رزرو #{order.id.slice(-8).toUpperCase()}
            </span>
            {showCancel && (
              <CancelOrderButton
                orderId={order.id}
                orderStatus={order.status}
                isOwnerOrAdmin={isOwnerOrAdmin}
                variant="headerMenu"
              />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        {searchParams?.payment === "success" && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-bold">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>پرداخت انجام شد. رزرو قطعی است.</span>
          </div>
        )}

        {searchParams?.payment === "cancelled" && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-sm font-bold">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>پرداخت لغو شد. می‌توانید دوباره تلاش کنید.</span>
          </div>
        )}

        {parsedStatus === "CANCELLED" && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center space-y-4 shadow-sm">
            <h1 className="text-lg font-black text-neutral-900">این رزرو لغو شده است</h1>
            <p className="text-sm text-neutral-500">می‌توانید رزرو جدیدی ثبت کنید.</p>
            <Link
              href="/order"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-neutral-900 px-6 text-sm font-medium text-white hover:bg-neutral-800"
            >
              ثبت رزرو جدید
            </Link>
          </div>
        )}

        {isPendingFlow && parsedStatus !== "CANCELLED" && (
          <OrderAdminStage
            order={{
              id: order.id,
              status: order.status,
              categoryTitle: order.categoryTitle,
              contactName: order.contactName,
              projectDescription: order.projectDescription,
              isFlexibleSchedule: order.isFlexibleSchedule,
              bookingDate: order.bookingDate,
              timeSlot: order.timeSlot,
              durationHours: order.durationHours,
              locationType: order.locationType,
              locationAddress: order.locationAddress,
              districtOrCity: order.districtOrCity,
              locationLat: order.locationLat,
              locationLng: order.locationLng,
              referenceLink: order.referenceLink,
              moodboardUrls,
              adminNote: order.adminNote ?? null,
              hourlyRate: order.hourlyRate,
              createdAt: order.createdAt.toISOString(),
            }}
            isOwnerOrAdmin={isOwnerOrAdmin}
          />
        )}

        {isOnMarket(order.status) && (
          <OrderClientWaiting
            orderId={order.id}
            categoryTitle={order.categoryTitle || "پروژه"}
            categorySlug={order.categorySlug}
            orderStatus={order.status}
            initialApplicants={applicants}
            isOwnerOrAdmin={isOwnerOrAdmin}
            selectedSpecialistId={order.selectedSpecialistId}
            agreedTotalPrice={order.agreedTotalPrice}
            createdAt={order.createdAt.toISOString()}
            clientIsFlexible={order.isFlexibleSchedule}
            clientBookingDate={order.bookingDate}
            clientTimeSlot={order.timeSlot}
            clientLocationType={order.locationType}
            clientPhotoLocationId={order.photoLocationId}
          />
        )}

        {isAwaitingPayment && isOwnerOrAdmin && (
          <div className="rounded-2xl border border-amber-200 bg-white p-6 sm:p-8 space-y-5 text-center shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
              در انتظار پرداخت شما
            </div>
            <h1 className="text-xl font-black text-neutral-900">متخصص انتخاب شد</h1>
            <p className="text-sm text-neutral-600 leading-relaxed max-w-md mx-auto">
              با پرداخت مبلغ توافق‌شده، رزرو قطعی می‌شود و گفتگوی هماهنگی روی همین صفحه باز می‌شود. شماره تماس نزدیک زمان پروژه نمایش داده می‌شود.
            </p>
            {payableAmount != null && (
              <p className="text-2xl font-black font-mono text-neutral-900">
                {formatPrice(payableAmount)} تومان
              </p>
            )}
            <a
              href={`/api/order/pay?orderId=${encodeURIComponent(order.id)}`}
              className="inline-flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              <span>
                {payableAmount != null
                  ? `پرداخت ${formatPrice(payableAmount)} تومان`
                  : "پرداخت و قطعی کردن رزرو"}
              </span>
            </a>
          </div>
        )}

        {parsedStatus === "CONFIRMED" && (isOwnerOrAdmin || isSelectedSpecialist) && (
          <div className="rounded-2xl border border-emerald-200 bg-white p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="h-5 w-5" />
              <h1 className="text-base font-black">رزرو قطعی شد</h1>
            </div>
            {isOwnerOrAdmin && order.selectedSpecialist && (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 flex items-center gap-3 text-right">
                <div className="h-10 w-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-neutral-900">
                    {formatPublicSpecialistName(order.selectedSpecialist.displayName)}
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
                    <p className="text-xs text-neutral-500 mt-1">
                      شماره تماس نزدیک زمان پروژه نمایش داده می‌شود. تا آن موقع از گفتگوی هماهنگی همین صفحه استفاده کنید.
                    </p>
                  )}
                </div>
              </div>
            )}
            {isSelectedSpecialist && !isOwnerOrAdmin && (
              <p className="text-xs text-neutral-600 leading-relaxed">
                پروژه قطعی است. هماهنگی را از گفتگوی پایین پیگیری کنید. پس از اتمام کار، تحویل را ثبت کنید. شماره و آدرس کارفرما نزدیک زمان پروژه آزاد می‌شود.
              </p>
            )}
          </div>
        )}

        {showChat && deliveryRole && (
          <OrderChatPanel
            orderId={order.id}
            role={deliveryRole}
            readOnly={chatReadOnly}
          />
        )}

        {showDelivery && deliveryRole && (
          <OrderDeliveryPanel
            role={deliveryRole}
            order={{
              id: order.id,
              paidAt: order.paidAt ? new Date(order.paidAt).toISOString() : null,
              deliveredAt: order.deliveredAt
                ? new Date(order.deliveredAt).toISOString()
                : null,
              settledAt: order.settledAt
                ? new Date(order.settledAt).toISOString()
                : null,
              disputedAt: order.disputedAt
                ? new Date(order.disputedAt).toISOString()
                : null,
              disputeReason: order.disputeReason ?? null,
              disputeResolvedAt: order.disputeResolvedAt
                ? new Date(order.disputeResolvedAt).toISOString()
                : null,
              revisionCount: order.revisionCount ?? 0,
              revisionNote: order.revisionNote ?? null,
              categoryTitle: order.categoryTitle,
            }}
          />
        )}

        {showReview && deliveryRole && (
          <OrderReviewPanel orderId={order.id} role={deliveryRole} />
        )}

        {parsedStatus === "AWAITING_SPECIALIST_CONFIRMATION" && isOwnerOrAdmin && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-3 text-center shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
              سفارش قدیمی — تأیید متخصص
            </div>
            <h1 className="text-lg font-black text-neutral-900">
              منتظر تأیید آمادگی متخصص هستیم
            </h1>
            <p className="text-sm text-neutral-500 leading-relaxed max-w-md mx-auto">
              پس از تأیید متخصص، نوبت پرداخت شماست. تا قبل از آن می‌توانید از منوی ⋮ رزرو را لغو کنید. سفارش‌های جدید دیگر این مرحله را ندارند.
            </p>
          </div>
        )}

        {!isOnMarket(order.status) &&
          !isPendingFlow &&
          !isAwaitingPayment &&
          parsedStatus !== "CONFIRMED" &&
          parsedStatus !== "CANCELLED" &&
          parsedStatus !== "AWAITING_SPECIALIST_CONFIRMATION" && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-3 text-center shadow-sm">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold ${currentStatus.badgeBg}`}
              >
                {currentStatus.label}
              </div>
              <h1 className="text-lg font-black text-neutral-900">
                رزرو {order.categoryTitle}
              </h1>
            </div>
          )}
      </div>
    </main>
  );
}
