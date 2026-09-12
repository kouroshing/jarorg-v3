"use client";

import React, { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Coins,
  CheckCircle2,
  Send,
  Users,
  ExternalLink,
  Briefcase,
  AlertCircle,
  ShieldAlert,
  Inbox,
  Loader2,
  XCircle,
  Check,
  RotateCcw,
  Phone,
  Car,
} from "lucide-react";
import {
  AvailableOrderSpecialistView,
  SpecialistTokenSummary,
  withdrawProjectInterestAction,
  confirmSpecialistSelectionAction,
  declineSpecialistSelectionAction,
  dismissOrderAction,
} from "@/app/actions/marketplaceActions";
import SpecialistInterestModal from "./SpecialistInterestModal";
import { formatPrice } from "@/components/order/BudgetSlider";
import { classifySpecialistOrder, type SpecialistFeedBucket } from "@/lib/orders/specialist-feed";
import { citiesMatch, normalizeCityLabel } from "@/lib/geo/serviceCities";

type FeedTabId = SpecialistFeedBucket;

function faNum(value: number): string {
  return value.toLocaleString("fa-IR");
}

interface SpecialistProjectFeedProps {
  initialOrders: AvailableOrderSpecialistView[];
  initialTokens?: SpecialistTokenSummary;
  authError?: string;
  redirectTo?: string;
  variant?: "open" | "mine";
}

export default function SpecialistProjectFeed({
  initialOrders,
  initialTokens,
  authError,
  redirectTo,
  variant = "open",
}: SpecialistProjectFeedProps) {
  const isMine = variant === "mine";
  const [orders, setOrders] = useState<AvailableOrderSpecialistView[]>(initialOrders);
  const [tokens, setTokens] = useState<SpecialistTokenSummary | undefined>(initialTokens);
  const [selectedOrder, setSelectedOrder] = useState<AvailableOrderSpecialistView | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>("ALL");
  const [applyNotice, setApplyNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FeedTabId>(() => {
    if (variant === "open") return "open";
    if (initialOrders.some((o) => classifySpecialistOrder(o) === "action")) return "action";
    if (initialOrders.some((o) => classifySpecialistOrder(o) === "won")) return "won";
    return "applied";
  });

  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ orderId: string; text: string; type: "error" | "success" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const pool = orders.filter((o) => {
    const bucket = classifySpecialistOrder(o);
    return isMine ? bucket !== "open" : bucket === "open";
  });

  const uniqueCities = Array.from(
    new Set(
      pool
        .map((o) => normalizeCityLabel(o.districtOrCity))
        .filter((c): c is string => !!c && c.trim().length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, "fa"));

  const cityFiltered = pool.filter((o) => {
    if (selectedCity === "ALL") return true;
    return citiesMatch(o.districtOrCity, selectedCity);
  });

  const counts = useMemo(() => {
    const next = { action: 0, open: 0, applied: 0, won: 0 };
    for (const order of cityFiltered) {
      next[classifySpecialistOrder(order)] += 1;
    }
    return next;
  }, [cityFiltered]);

  const filteredOrders = cityFiltered.filter((o) => classifySpecialistOrder(o) === activeTab);
  const canAffordApply = !tokens || tokens.remaining >= tokens.costApply;

  const handleOpenInterestModal = (order: AvailableOrderSpecialistView) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleInterestSuccess = (orderId: string, interestId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            hasApplied: true,
            interestsCount: o.interestsCount + 1,
            myInterest: {
              id: interestId,
              status: "PENDING",
              message: null,
              proposedPrice: null,
              travelFee: o.travel?.fee ?? null,
              travelFeeOverride: null,
              createdAt: new Date().toISOString(),
            },
          };
        }
        return o;
      })
    );
    setTokens((prev) =>
      prev
        ? {
            ...prev,
            remaining: Math.max(0, prev.remaining - prev.costApply),
            spent: prev.spent + prev.costApply,
          }
        : prev
    );
    setApplyNotice("پیشنهاد ثبت شد. از این به بعد در «پروژه‌های من» پیگیری می‌شود.");
  };

  const handleWithdraw = (interestId: string, orderId: string) => {
    setBusyActionId(interestId);
    setActionNotice(null);

    startTransition(async () => {
      const res = await withdrawProjectInterestAction(interestId);
      setBusyActionId(null);
      if (!res.success) {
        setActionNotice({ orderId, text: res.error || "خطا در لغو پیشنهاد.", type: "error" });
      } else {
        setActionNotice({ orderId, text: "پیشنهاد شما با موفقیت لغو شد.", type: "success" });
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id === orderId) {
              return {
                ...o,
                hasApplied: false,
                interestsCount: Math.max(0, o.interestsCount - 1),
                myInterest: o.myInterest ? { ...o.myInterest, status: "WITHDRAWN" } : null,
              };
            }
            return o;
          })
        );
      }
    });
  };

  const handleConfirm = (orderId: string) => {
    setBusyActionId(orderId);
    setActionNotice(null);

    startTransition(async () => {
      const res = await confirmSpecialistSelectionAction(orderId);
      setBusyActionId(null);
      if (!res.success) {
        setActionNotice({ orderId, text: res.error || "خطا در تأیید نهایی پروژه.", type: "error" });
      } else {
        setActionNotice({
          orderId,
          text: "پروژه تأیید شد. بعد از پرداخت کارفرما، اطلاعات تماس نمایش داده می‌شود.",
          type: "success",
        });
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id === orderId) {
              return {
                ...o,
                status: "CONFIRMED",
                myInterest: o.myInterest ? { ...o.myInterest, status: "ACCEPTED" } : null,
              };
            }
            return o;
          })
        );
        setActiveTab("won");
      }
    });
  };

  const handleDismiss = (orderId: string) => {
    setBusyActionId(orderId);
    setActionNotice(null);

    startTransition(async () => {
      const res = await dismissOrderAction(orderId);
      setBusyActionId(null);
      if (!res.success) {
        setActionNotice({ orderId, text: res.error || "خطا در حذف پروژه از فهرست.", type: "error" });
        return;
      }
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setTokens((prev) =>
        prev
          ? {
              ...prev,
              remaining: Math.max(0, prev.remaining - prev.costDismiss),
              spent: prev.spent + prev.costDismiss,
            }
          : prev
      );
    });
  };

  const handleDecline = (orderId: string) => {
    setBusyActionId(orderId);
    setActionNotice(null);

    startTransition(async () => {
      const res = await declineSpecialistSelectionAction(orderId);
      setBusyActionId(null);
      if (!res.success) {
        setActionNotice({ orderId, text: res.error || "خطا در رد پیشنهاد.", type: "error" });
      } else {
        setActionNotice({ orderId, text: "عدم پذیرش پروژه ثبت شد.", type: "success" });
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id === orderId) {
              return {
                ...o,
                selectedSpecialistId: null,
                hasApplied: false,
                myInterest: o.myInterest ? { ...o.myInterest, status: "DECLINED" } : null,
              };
            }
            return o;
          })
        );
        setActiveTab("applied");
      }
    });
  };

  if (authError) {
    const isIncomplete = authError === "PROFILE_INCOMPLETE" || redirectTo === "/specialist/onboarding";

    return (
      <div className="space-y-6" dir="rtl">
        <div className="rounded-3xl border border-jar-border bg-jar-surface p-8 sm:p-12 text-center space-y-6 shadow-xs backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-jar-canvas text-jar-logo border border-jar-border shadow-xs">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-lg sm:text-xl font-bold text-jar-primary">
              {isIncomplete
                ? "پروفایل شما هنوز تکمیل نشده است"
                : "دسترسی محدود به متخصصان پلتفرم جار"}
            </h3>
            <p className="text-xs sm:text-sm text-jar-muted leading-relaxed font-medium">
              {isIncomplete
                ? "برای دریافت پروژه، نمونه‌کارها و محدوده کاری خود را تکمیل کنید"
                : authError}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href={redirectTo || "/specialist/onboarding"}
              className="inline-flex items-center gap-2 rounded-full bg-jar-primary hover:bg-jar-primaryHover px-7 py-3 text-xs sm:text-sm font-medium text-white transition-colors shadow-none"
            >
              <Sparkles className="h-4 w-4 text-jar-logo" />
              <span>تکمیل پروفایل و نمونه‌کارها</span>
            </Link>
            <Link
              href="/specialist/profile"
              className="inline-flex items-center gap-2 rounded-full border border-jar-border bg-jar-surface px-6 py-3 text-xs sm:text-sm font-medium text-jar-primary hover:bg-jar-soft transition-colors"
            >
              <span>پروفایل کاری</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tabs: { id: FeedTabId; label: string }[] = isMine
    ? [
        { id: "action", label: "نیاز به تأیید" },
        { id: "applied", label: "پیشنهادهای در انتظار" },
        { id: "won", label: "انتخاب‌شده و قطعی" },
      ]
    : [];

  const emptyCopy: Record<FeedTabId, { title: string; body: string }> = {
    action: {
      title: "پروژه‌ای منتظر تأیید شما نیست",
      body: "وقتی کارفرما شما را انتخاب کند، اینجا دکمه تأیید یا رد نمایش داده می‌شود.",
    },
    open: {
      title: "الان پروژه باز برای اعلام آمادگی نیست",
      body: "سفارش‌های جدید به‌محض ثبت در این فهرست ظاهر می‌شوند.",
    },
    applied: {
      title: "هنوز پیشنهادی ارسال نکرده‌اید",
      body: "از پروژه‌های باز می‌توانید برای سفارش مناسب اعلام آمادگی کنید.",
    },
    won: {
      title: "پروژه انتخاب‌شده یا قطعی ندارید",
      body: "اگر کارفرما شما را انتخاب کند، تا زمان پرداخت و بعد از آن اینجا می‌ماند.",
    },
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-jar-primary">
              {isMine ? "پروژه‌های من" : "پروژه‌های باز"}
            </h2>
            <p className="text-xs text-jar-muted font-medium mt-0.5">
              {isMine
                ? "پیشنهادهای ارسال‌شده، انتخاب کارفرما و پروژه‌های قطعی"
                : "سفارش‌های جدید برای اعلام آمادگی. قیمت و ایاب‌وذهاب را روی هر پیشنهاد تنظیم کنید."}
            </p>
          </div>

          {!isMine && tokens && (
            <div className="inline-flex items-center gap-2 rounded-full border border-jar-border bg-jar-surface px-3.5 py-2">
              <Coins className="h-4 w-4 text-jar-logo shrink-0" />
              <div className="text-right">
                <p className="text-[11px] font-bold text-jar-primary">
                  {faNum(tokens.remaining)} توکن باقی‌مانده
                </p>
                <p className="text-[10px] text-jar-muted font-medium">
                  {tokens.planName} · هر اعلام آمادگی {faNum(tokens.costApply)} توکن
                </p>
              </div>
            </div>
          )}
        </div>

        {tabs.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-jar-primary text-white"
                    : "border border-jar-border bg-jar-surface text-jar-muted hover:bg-jar-soft"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`min-w-5 rounded-full px-1.5 text-[10px] ${
                    activeTab === tab.id ? "bg-white/15 text-white" : "bg-jar-canvas text-jar-muted"
                  }`}
                >
                  {faNum(counts[tab.id])}
                </span>
              </button>
            ))}
          </div>
        )}

        {uniqueCities.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCity("ALL")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCity === "ALL"
                  ? "bg-jar-primary text-white"
                  : "border border-jar-border bg-jar-surface text-jar-muted hover:bg-jar-soft"
              }`}
            >
              همه شهرها
            </button>
            {uniqueCities.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setSelectedCity(city)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCity === city
                    ? "bg-jar-primary text-white"
                    : "border border-jar-border bg-jar-surface text-jar-muted hover:bg-jar-soft"
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        )}
      </div>

      {applyNotice && (
        <div className="rounded-2xl border border-jar-logo/30 bg-jar-canvas px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs font-medium text-jar-primary leading-relaxed">{applyNotice}</p>
          <Link
            href="/specialist/mine"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-jar-primary px-4 py-2 text-[11px] font-medium text-white hover:bg-jar-primaryHover transition-colors shrink-0"
          >
            رفتن به پروژه‌های من
          </Link>
        </div>
      )}

      {filteredOrders.length === 0 && (
        <div className="rounded-3xl border border-dashed border-jar-border bg-jar-surface/70 p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-jar-canvas text-jar-muted">
            <Inbox className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-jar-primary">{emptyCopy[activeTab].title}</h3>
            <p className="text-xs text-jar-muted max-w-md mx-auto leading-relaxed font-medium">
              {emptyCopy[activeTab].body}
            </p>
          </div>
          {activeTab === "applied" && (
            <Link
              href="/specialist/projects"
              className="inline-flex items-center justify-center rounded-full bg-jar-primary px-5 py-2.5 text-xs font-medium text-white hover:bg-jar-primaryHover transition-colors"
            >
              مشاهده پروژه‌های باز
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOrders.map((order) => {
          let locationText = "محل مدنظر کارفرما";
          if (order.locationType === "SPECIALIST_ADVICE") {
            locationText = order.districtOrCity
              ? `مشورت عکاس — ${order.districtOrCity}`
              : "مشاوره و پیشنهاد متخصص";
          }
          if (order.locationType === "JAR_STUDIO") {
            locationText = order.districtOrCity
              ? `استودیوهای جار — ${order.districtOrCity}`
              : "استودیوها و عمارت‌های جار";
          }

          return (
            <div
              key={order.id}
              className="rounded-2xl border border-jar-border bg-jar-surface p-4 sm:p-5 space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-jar-logo">
                      <Sparkles className="h-3.5 w-3.5 text-jar-logo" />
                      <span>{order.categoryTitle}</span>
                    </span>
                    <h3 className="text-base font-bold text-jar-primary pt-0.5">
                      آفیش {order.categoryTitle} ({order.durationHours} ساعت)
                    </h3>
                  </div>

                  <span className="inline-flex items-center gap-1 text-jar-muted text-[11px] font-medium shrink-0">
                    <Users className="h-3 w-3" />
                    <span>{faNum(order.interestsCount)} متقاضی</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs border-t border-jar-border/70 pt-3">
                  {order.isFlexibleSchedule ? (
                    <div className="col-span-2 flex items-center gap-1.5 text-jar-primary text-xs font-medium">
                      <Sparkles className="h-3.5 w-3.5 text-jar-logo shrink-0" />
                      <span>
                        زمان‌بندی: <b className="text-jar-primary">منعطف (هماهنگی توافقی با متخصص پس از پذیرش)</b>
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 text-jar-muted truncate">
                        <Calendar className="h-3.5 w-3.5 text-jar-logo shrink-0" />
                        <span className="truncate">
                          تاریخ: <b className="text-jar-primary">{order.bookingDate || "تعیین‌نشده"}</b>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-jar-muted truncate">
                        <Clock className="h-3.5 w-3.5 text-jar-logo shrink-0" />
                        <span className="truncate">
                          ساعت: <b className="text-jar-primary">{order.timeSlot || "تعیین‌نشده"}</b>
                        </span>
                      </div>
                    </>
                  )}

                  <div className="col-span-2 flex items-center gap-1.5 text-jar-muted truncate">
                    <MapPin className="h-3.5 w-3.5 text-jar-logo shrink-0" />
                    <span className="truncate">
                      موقعیت: <b className="text-jar-primary">{locationText}</b>
                      {order.districtOrCity ? ` (${order.districtOrCity})` : ""}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center gap-1.5 text-jar-muted truncate">
                    <Car className="h-3.5 w-3.5 text-jar-logo shrink-0" />
                    <span className="truncate">
                      ایاب‌وذهاب:{" "}
                      <b className="text-jar-primary">
                        {order.travel
                          ? order.travel.isFree
                            ? "رایگان"
                            : `${formatPrice(order.travel.fee)} تومان`
                          : "بعد از ثبت مبدأ شما محاسبه می‌شود"}
                      </b>
                    </span>
                  </div>
                </div>

                {order.contact && (order.contact.name || order.contact.phone || order.contact.address) && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>اطلاعات تماس کارفرما آزاد شد</span>
                    </div>
                    {order.contact.name && (
                      <p className="text-xs text-emerald-900 font-medium">{order.contact.name}</p>
                    )}
                    {order.contact.phone && (
                      <a
                        href={`tel:${order.contact.phone}`}
                        className="block text-xs font-bold text-emerald-800 text-right"
                        dir="ltr"
                      >
                        {order.contact.phone}
                      </a>
                    )}
                    {order.contact.address && (
                      <p className="text-[11px] text-emerald-800/80 leading-relaxed">{order.contact.address}</p>
                    )}
                  </div>
                )}

                {(order.projectDescription || order.moodboardUrls.length > 0 || order.referenceLink) && (
                  <div className="space-y-2 pt-1">
                    {order.projectDescription && (
                      <p className="text-xs text-jar-muted leading-relaxed line-clamp-3 font-medium bg-jar-canvas p-2.5 rounded-xl border border-jar-border/60">
                        {order.projectDescription}
                      </p>
                    )}

                    {order.moodboardUrls.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-medium text-jar-muted">تصاویر رفرنس کارفرما:</span>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                          {order.moodboardUrls.slice(0, 4).map((imgUrl, idx) => (
                            <div
                              key={idx}
                              className="relative h-14 w-14 rounded-xl overflow-hidden border border-jar-border shrink-0 shadow-xs"
                            >
                              <Image src={imgUrl} alt={`مودبورد ${idx + 1}`} fill className="object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {order.referenceLink && (
                      <div className="text-[11px] pt-1">
                        <a
                          href={order.referenceLink.startsWith("http") ? order.referenceLink : `https://${order.referenceLink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-jar-logo hover:underline font-medium"
                        >
                          <span>مشاهده لینک نمونه کار درخواستی</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-jar-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-jar-muted font-medium">برآورد کل پروژه:</span>
                      {order.isAutoPriced ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-jar-canvas border border-jar-border text-jar-logo text-[10px] font-medium">
                          نرخ پیشنهادی جار
                        </span>
                      ) : null}
                    </div>
                    <span className="text-base font-bold text-jar-primary font-mono">
                      {formatPrice(order.totalEstimatedPrice)} <span className="text-xs font-normal">تومان</span>
                    </span>
                  </div>

                  <div className="text-left">
                    <span className="block text-[10px] text-jar-muted font-medium">تسویه حساب:</span>
                    <span className="text-xs font-medium text-jar-primary">امن پس از توافق و پرداخت</span>
                  </div>
                </div>

                {actionNotice && actionNotice.orderId === order.id && (
                  <div
                    className={`rounded-xl p-2.5 text-xs font-bold flex items-center gap-1.5 ${
                      actionNotice.type === "error"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{actionNotice.text}</span>
                  </div>
                )}

                {order.status === "AWAITING_SPECIALIST_CONFIRMATION" &&
                (order.myInterest?.status === "SELECTED" || order.hasApplied) ? (
                  <div className="space-y-2 rounded-2xl bg-jar-canvas border border-jar-border p-3.5 text-right">
                    <div className="flex items-center gap-2 text-jar-primary font-bold text-xs">
                      <Sparkles className="h-4 w-4 text-jar-logo shrink-0" />
                      <span>کارفرما شما را انتخاب کرده است. لطفاً وضعیت را نهایی کنید:</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleConfirm(order.id)}
                        disabled={isPending && busyActionId === order.id}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors shadow-none cursor-pointer disabled:opacity-50"
                      >
                        {isPending && busyActionId === order.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        <span>تأیید و شروع پروژه</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDecline(order.id)}
                        disabled={isPending && busyActionId === order.id}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>رد پیشنهاد</span>
                      </button>
                    </div>
                  </div>
                ) : order.myInterest?.status === "SELECTED" ? (
                  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-right space-y-1">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>کارفرما شما را انتخاب کرد</span>
                    </div>
                    <p className="text-[11px] text-amber-800/90 leading-relaxed font-medium">
                      پروژه بعد از پرداخت کارفرما قطعی می‌شود. اطلاعات تماس فقط پس از پرداخت نمایش داده می‌شود.
                    </p>
                  </div>
                ) : order.myInterest?.status === "DECLINED" ? (
                  <div className="flex items-center justify-center gap-2 w-full h-11 rounded-full bg-jar-canvas border border-jar-border text-jar-muted text-xs font-medium">
                    <XCircle className="h-4 w-4 text-jar-muted" />
                    <span>شما انجام این پروژه را نپذیرفتید</span>
                  </div>
                ) : order.myInterest?.status === "REJECTED" ? (
                  <div className="flex items-center justify-center gap-2 w-full h-11 rounded-full bg-jar-canvas border border-jar-border text-jar-muted text-xs font-medium">
                    <span>متخصص دیگری برای این سفارش انتخاب شد</span>
                  </div>
                ) : order.myInterest?.status === "ACCEPTED" ||
                  order.status === "CONFIRMED" ||
                  order.status === "COMPLETED" ||
                  order.status === "IN_PROGRESS" ? (
                  <div className="flex items-center justify-center gap-2 w-full min-h-11 px-3 py-2 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      {order.contact
                        ? "پروژه قطعی شد. اطلاعات تماس در کارت بالا آمده است."
                        : "پروژه قطعی شد. شماره و آدرس ۲۴ ساعت قبل از شروع کار آزاد می‌شود."}
                    </span>
                  </div>
                ) : order.myInterest?.status === "PENDING" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 w-full p-2.5 rounded-2xl bg-jar-canvas border border-jar-border text-jar-primary text-xs font-medium">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          {order.selectedSpecialistId
                            ? "کارفرما در حال نهایی کردن انتخاب است"
                            : "پیشنهاد شما ثبت شده است"}
                        </span>
                      </div>
                      {!order.selectedSpecialistId && (
                        <button
                          type="button"
                          onClick={() => handleWithdraw(order.myInterest!.id, order.id)}
                          disabled={isPending && busyActionId === order.myInterest!.id}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-jar-border bg-jar-surface hover:bg-rose-50 hover:text-rose-600 text-jar-muted text-[11px] font-medium transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                        >
                          {isPending && busyActionId === order.myInterest!.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3" />
                          )}
                          <span>انصراف از پیشنهاد</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleOpenInterestModal(order)}
                      disabled={!canAffordApply}
                      className="group flex h-11 w-full items-center justify-center gap-2 rounded-full bg-jar-primary hover:bg-jar-primaryHover text-white font-medium text-xs sm:text-sm shadow-none transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Send className="h-4 w-4" />
                      <span>
                        {canAffordApply
                          ? "اعلام آمادگی برای این پروژه"
                          : "توکن این ماه تمام شده است"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismiss(order.id)}
                      disabled={isPending && busyActionId === order.id}
                      className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-jar-border bg-jar-surface text-jar-muted hover:bg-jar-soft hover:text-jar-primary text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isPending && busyActionId === order.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      <span>برای من مناسب نیست</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <SpecialistInterestModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleInterestSuccess}
        tokenCostApply={tokens?.costApply}
        tokensRemaining={tokens?.remaining}
      />
    </div>
  );
}
