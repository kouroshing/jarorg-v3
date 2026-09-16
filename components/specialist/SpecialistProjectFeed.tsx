"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
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
  Phone,
  Car,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import {
  AvailableOrderSpecialistView,
  SpecialistTokenSummary,
  confirmSpecialistSelectionAction,
  declineSpecialistSelectionAction,
  dismissOrderAction,
  getAvailableOrdersForSpecialistAction,
} from "@/app/actions/marketplaceActions";
import SpecialistInterestModal from "./SpecialistInterestModal";
import { formatPrice } from "@/components/order/BudgetSlider";
import { classifySpecialistOrder, isLostInterestArchived, type SpecialistFeedBucket } from "@/lib/orders/specialist-feed";
import { citiesMatch, normalizeCityLabel } from "@/lib/geo/serviceCities";
import { formatDistanceKm } from "@/lib/locations/photoLocation";

type FeedTabId = SpecialistFeedBucket;

const OPEN_FEED_REFRESH_MS = 10 * 60 * 1000;

function faNum(value: number): string {
  return value.toLocaleString("fa-IR");
}

function formatUpdatedAt(date: Date): string {
  return new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

interface SpecialistProjectFeedProps {
  initialOrders: AvailableOrderSpecialistView[];
  initialTokens?: SpecialistTokenSummary;
  authError?: string;
  redirectTo?: string;
  variant?: "open" | "mine";
  /** When false, apply CTAs are blocked and a KYC banner is shown. */
  kycReady?: boolean;
  kycStatus?: string | null;
  kycDeadlineDaysLeft?: number | null;
  kycDeadlineExpired?: boolean;
  kycDeadlineMessage?: string | null;
  /** Home city of the specialist — biases the city chip filter. */
  specialistCity?: string | null;
  /** Whether travel quotes can be computed from a registered base pin. */
  specialistHasBase?: boolean;
}

export default function SpecialistProjectFeed({
  initialOrders,
  initialTokens,
  authError,
  redirectTo,
  variant = "open",
  kycReady = true,
  kycStatus = null,
  kycDeadlineDaysLeft = null,
  kycDeadlineExpired = false,
  kycDeadlineMessage = null,
  specialistCity = null,
  specialistHasBase: specialistHasBaseProp = false,
}: SpecialistProjectFeedProps) {
  const isMine = variant === "mine";
  const [orders, setOrders] = useState(initialOrders);
  const [tokens, setTokens] = useState<SpecialistTokenSummary | undefined>(initialTokens);
  const [specialistHasBase, setSpecialistHasBase] = useState(specialistHasBaseProp);
  const [selectedOrder, setSelectedOrder] = useState<AvailableOrderSpecialistView | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>("ALL");
  const [cityInitialized, setCityInitialized] = useState(false);
  const [applyNotice, setApplyNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FeedTabId>(() => {
    if (variant === "open") return "open";
    if (initialOrders.some((o) => classifySpecialistOrder(o) === "action")) return "action";
    if (initialOrders.some((o) => classifySpecialistOrder(o) === "won")) return "won";
    if (initialOrders.some((o) => classifySpecialistOrder(o) === "applied")) return "applied";
    return "lost";
  });

  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ orderId: string; text: string; type: "error" | "success" } | null>(null);
  const [expandedDescIds, setExpandedDescIds] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    setOrders(initialOrders);
    setLastUpdatedAt(new Date());
  }, [initialOrders]);

  useEffect(() => {
    if (initialTokens) setTokens(initialTokens);
  }, [initialTokens]);

  useEffect(() => {
    setSpecialistHasBase(specialistHasBaseProp);
  }, [specialistHasBaseProp]);

  const refreshOpenFeed = async () => {
    if (isMine || isRefreshing) return;
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const res = await getAvailableOrdersForSpecialistAction();
      if (!res.success) {
        setRefreshError(res.error || "به‌روزرسانی ناموفق بود.");
        return;
      }
      setOrders(res.orders || []);
      if (res.tokens) setTokens(res.tokens);
      if (typeof res.specialistHasBase === "boolean") {
        setSpecialistHasBase(res.specialistHasBase);
      }
      setLastUpdatedAt(new Date());
    } catch {
      setRefreshError("خطای شبکه در به‌روزرسانی فهرست.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isMine) return;
    const id = window.setInterval(() => {
      void refreshOpenFeed();
    }, OPEN_FEED_REFRESH_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional interval on mount for open feed
  }, [isMine]);

  const pool = orders.filter((o) => {
    const bucket = classifySpecialistOrder(o);
    if (isMine) {
      if (bucket === "open") return false;
      if (bucket === "lost" && isLostInterestArchived(o)) return false;
      return true;
    }
    return bucket === "open";
  });

  const uniqueCities = Array.from(
    new Set(
      pool
        .map((o) => normalizeCityLabel(o.districtOrCity))
        .filter((c): c is string => !!c && c.trim().length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, "fa"));

  // Prefer the specialist's home city chip when it appears in the board.
  React.useEffect(() => {
    if (cityInitialized || isMine || !specialistCity) return;
    const home = normalizeCityLabel(specialistCity);
    if (!home) {
      setCityInitialized(true);
      return;
    }
    const cities = Array.from(
      new Set(
        pool
          .map((o) => normalizeCityLabel(o.districtOrCity))
          .filter((c): c is string => !!c && c.trim().length > 0)
      )
    );
    const match = cities.find((c) => citiesMatch(c, home));
    if (match) setSelectedCity(match);
    setCityInitialized(true);
  }, [cityInitialized, isMine, specialistCity, pool]);

  const cityFiltered = pool.filter((o) => {
    if (selectedCity === "ALL") return true;
    return citiesMatch(o.districtOrCity, selectedCity);
  });

  /** Keep proximity order from the server; within city filter preserve it. */
  const sortedForTab = useMemo(() => {
    return [...cityFiltered].sort((a, b) => {
      const da = a.travel?.distanceKm;
      const db = b.travel?.distanceKm;
      const aHas = typeof da === "number" && Number.isFinite(da);
      const bHas = typeof db === "number" && Number.isFinite(db);
      if (aHas && bHas && da !== db) return (da as number) - (db as number);
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [cityFiltered]);

  const counts = useMemo(() => {
    const next = { action: 0, open: 0, applied: 0, won: 0, lost: 0 };
    for (const order of sortedForTab) {
      next[classifySpecialistOrder(order)] += 1;
    }
    return next;
  }, [sortedForTab]);

  const filteredOrders = sortedForTab.filter((o) => classifySpecialistOrder(o) === activeTab);
  const canAffordApply = !tokens || tokens.remaining >= tokens.costApply;

  const handleOpenInterestModal = (order: AvailableOrderSpecialistView) => {
    if (!kycReady) {
      setApplyNotice(
        kycDeadlineMessage ||
          (kycStatus === "PENDING"
            ? "احراز هویت در صف بررسی است؛ تا تایید نهایی نمی‌توانید اعلام آمادگی کنید."
            : "ابتدا احراز هویت را تکمیل کنید، سپس اعلام آمادگی کنید.")
      );
      return;
    }
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
              updatedAt: new Date().toISOString(),
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
          text: "آمادگی شما ثبت شد. کارفرما باید مبلغ را پرداخت کند تا رزرو قطعی شود.",
          type: "success",
        });
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id === orderId) {
              return {
                ...o,
                status: "AWAITING_PAYMENT",
                myInterest: o.myInterest ? { ...o.myInterest, status: "SELECTED" } : null,
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
        { id: "lost", label: "از دست‌رفته" },
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
      title: "هنوز پیشنهادی در انتظار ندارید",
      body: "از پروژه‌های باز می‌توانید برای سفارش مناسب اعلام آمادگی کنید.",
    },
    won: {
      title: "پروژه انتخاب‌شده یا قطعی ندارید",
      body: "اگر کارفرما شما را انتخاب کند، تا زمان پرداخت و بعد از آن اینجا می‌ماند.",
    },
    lost: {
      title: "پروژه از دست‌رفته‌ای نیست",
      body: "اگر کارفرما متخصص دیگری را انتخاب کند، تا ۱۴ روز اینجا می‌ماند.",
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
                : kycReady
                  ? "اول پروژه‌های نزدیک محدوده شما، بعد تازه‌ترها. قیمت و ایاب‌وذهاب را روی هر پیشنهاد تنظیم کنید."
                  : "پروژه‌های محدوده شما را ببینید؛ اعلام آمادگی بعد از تکمیل احراز هویت باز می‌شود."}
            </p>
            {!isMine && (
              <p className="mt-1.5 text-[11px] text-jar-muted font-medium">
                آخرین به‌روزرسانی:{" "}
                <span className="font-mono text-jar-primary font-bold">
                  {formatUpdatedAt(lastUpdatedAt)}
                </span>
                <span className="text-jar-muted/80"> · هر ۱۰ دقیقه خودکار</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isMine && (
              <button
                type="button"
                onClick={() => void refreshOpenFeed()}
                disabled={isRefreshing}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-jar-border bg-jar-surface px-3.5 text-[11px] font-bold text-jar-primary hover:bg-jar-soft transition-colors disabled:opacity-60"
              >
                {isRefreshing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {isRefreshing ? "در حال به‌روزرسانی…" : "به‌روزرسانی"}
              </button>
            )}

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
        </div>

        {!isMine && refreshError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-800 flex items-center justify-between gap-2">
            <span>{refreshError}</span>
            <button type="button" onClick={() => setRefreshError(null)} className="text-rose-700">
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {!isMine && !kycReady && (
          <div
            className={`rounded-2xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              kycDeadlineExpired
                ? "border-rose-200 bg-rose-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex items-start gap-2 min-w-0">
              <ShieldAlert
                className={`h-4 w-4 shrink-0 mt-0.5 ${
                  kycDeadlineExpired ? "text-rose-700" : "text-amber-700"
                }`}
              />
              <div className="space-y-0.5">
                <p
                  className={`text-xs font-black ${
                    kycDeadlineExpired ? "text-rose-950" : "text-amber-950"
                  }`}
                >
                  {kycDeadlineExpired
                    ? "مهلت ۷ روزه احراز هویت تمام شد"
                    : kycStatus === "PENDING"
                      ? "احراز هویت در صف بررسی جار"
                      : kycStatus === "FAILED"
                        ? "احراز هویت رد شده — اعلام آمادگی قفل است"
                        : kycDeadlineDaysLeft != null
                          ? `${faNum(kycDeadlineDaysLeft)} روز از مهلت ۷ روزه احراز باقی است`
                          : "احراز هویت برای اعلام آمادگی لازم است"}
                </p>
                <p
                  className={`text-[11px] font-medium leading-relaxed ${
                    kycDeadlineExpired ? "text-rose-900/90" : "text-amber-900/90"
                  }`}
                >
                  {kycDeadlineMessage ||
                    (kycStatus === "PENDING"
                      ? "پروژه‌ها را می‌بینید، اما تا تایید هویت نمی‌توانید پیشنهاد بفرستید."
                      : kycStatus === "FAILED"
                        ? "اطلاعات را اصلاح کنید و دوباره ارسال کنید؛ تا تایید مجدد پیشنهاد و تسویه ممکن نیست."
                        : "از تایید پرونده توسط جار، ۷ روز فرصت دارید هویت و شبا را تکمیل کنید.")}
                </p>
              </div>
            </div>
            <Link
              href="/specialist/onboarding/identity"
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-jar-primary px-4 text-[11px] font-bold text-white"
            >
              {kycStatus === "PENDING" ? "مشاهده وضعیت احراز" : "شروع احراز هویت"}
            </Link>
          </div>
        )}

        {applyNotice && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-950 flex items-center justify-between gap-2">
            <span>{applyNotice}</span>
            <button type="button" onClick={() => setApplyNotice(null)} className="text-amber-700">
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

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
          {!isMine && (
            <div className="flex flex-col items-center gap-2.5 pt-1">
              <p className="text-[11px] text-jar-muted font-medium">
                آخرین به‌روزرسانی:{" "}
                <span className="font-mono font-bold text-jar-primary">
                  {formatUpdatedAt(lastUpdatedAt)}
                </span>
              </p>
              <button
                type="button"
                onClick={() => void refreshOpenFeed()}
                disabled={isRefreshing}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-jar-border bg-jar-canvas px-4 text-xs font-bold text-jar-primary hover:bg-jar-soft transition-colors disabled:opacity-60"
              >
                {isRefreshing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {isRefreshing ? "در حال به‌روزرسانی…" : "به‌روزرسانی فهرست"}
              </button>
              <p className="text-[10px] text-jar-muted">هر ۱۰ دقیقه خودکار هم به‌روز می‌شود</p>
            </div>
          )}
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
          const locKind =
            order.locationContext?.kind ||
            (order.locationType === "SPECIALIST_ADVICE"
              ? "SPECIALIST_ADVICE"
              : order.locationType === "JAR_STUDIO"
                ? "JAR_STUDIO"
                : order.locationContext?.photoLocation
                  ? "JAR_LOCATION"
                  : "CUSTOM_PIN");

          const jarLoc = order.locationContext?.photoLocation ?? null;
          const approxArea =
            order.locationContext?.approxArea ||
            (order.districtOrCity
              ? `محدودهٔ تقریبی: ${order.districtOrCity}`
              : "محدودهٔ تقریبی روی نقشه");

          const locationKindLabel =
            locKind === "SPECIALIST_ADVICE"
              ? "مشورت لوکیشن با شما"
              : locKind === "JAR_STUDIO"
                ? "استودیو / عمارت جار"
                : locKind === "JAR_LOCATION"
                  ? "جار لوکیشن"
                  : "پین اختصاصی کارفرما";

          const previewUrls = Array.from(
            new Set([
              ...order.moodboardUrls,
              ...(jarLoc?.previewImageUrls || []),
              ...(jarLoc?.coverImageUrl ? [jarLoc.coverImageUrl] : []),
            ])
          ).slice(0, 5);

          const travelHint =
            order.travel != null
              ? null
              : locKind === "SPECIALIST_ADVICE"
                ? "ایاب‌وذهاب بعد از پیشنهاد لوکیشن در اعلام آمادگی مشخص می‌شود."
                : !specialistHasBase
                  ? "مبدأ کاری‌تان ثبت نشده — برای دیدن مبلغ ایاب‌وذهاب مبدأ را تنظیم کنید."
                  : "مختصات مقصد برای محاسبهٔ ایاب‌وذهاب در دسترس نیست.";

          const travelFeeShown = order.travel
            ? order.travel.isFree
              ? 0
              : order.travel.fee
            : null;
          const estimateTotal =
            travelFeeShown != null
              ? order.totalEstimatedPrice + travelFeeShown
              : order.totalEstimatedPrice;

          return (
            <div
              key={order.id}
              className="rounded-2xl border border-jar-border bg-jar-surface overflow-hidden flex flex-col"
            >
              {previewUrls.length > 0 ? (
                <div className="relative border-b border-jar-border bg-jar-canvas">
                  <div className="flex gap-1.5 overflow-x-auto p-2.5">
                    {previewUrls.map((imgUrl, idx) => (
                      <div
                        key={`${order.id}-prev-${idx}`}
                        className="relative h-20 w-[5.5rem] sm:h-24 sm:w-28 shrink-0 overflow-hidden rounded-xl border border-jar-border/80 bg-jar-border/20"
                      >
                        <Image
                          src={imgUrl}
                          alt={
                            idx < order.moodboardUrls.length
                              ? `نمونه کارفرما ${idx + 1}`
                              : `لوکیشن ${idx + 1}`
                          }
                          fill
                          className="object-cover"
                          sizes="112px"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                  <div className="absolute top-3 right-3 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
                    {order.moodboardUrls.length > 0
                      ? "نمونه / رفرنس کارفرما"
                      : "تصاویر جار لوکیشن"}
                  </div>
                </div>
              ) : null}

              <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-jar-logo">
                      <Sparkles className="h-3.5 w-3.5 text-jar-logo" />
                      <span className="truncate">{order.categoryTitle}</span>
                    </span>
                    <h3 className="text-base font-bold text-jar-primary pt-0.5 leading-snug">
                      آفیش {order.categoryTitle} ({faNum(order.durationHours)} ساعت)
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
                        زمان‌بندی: <b className="text-jar-primary">بهترین زمان با توافق متخصص</b>
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
                </div>

                {/* Location — approx only pre-pay */}
                <div className="rounded-2xl border border-jar-border bg-jar-canvas/70 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <MapPin className="h-4 w-4 text-jar-logo shrink-0 mt-0.5" />
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-[10px] font-bold text-jar-muted">{locationKindLabel}</p>
                        {jarLoc ? (
                          <p className="text-sm font-black text-jar-primary truncate">
                            {jarLoc.name}
                          </p>
                        ) : null}
                        <p className="text-xs font-bold text-jar-primary leading-relaxed">
                          {approxArea}
                        </p>
                        {locKind === "SPECIALIST_ADVICE" ? (
                          <p className="text-[10px] text-jar-muted font-medium leading-relaxed">
                            کارفرما از شما می‌خواهد لوکیشن مناسب پیشنهاد دهید؛ آدرس دقیق بعد از
                            پرداخت آزاد می‌شود.
                          </p>
                        ) : locKind === "CUSTOM_PIN" ? (
                          <p className="text-[10px] text-amber-900/90 font-medium leading-relaxed">
                            خارج از کاتالوگ جار لوکیشن · نقشه و آدرس دقیق بعد از پرداخت.
                          </p>
                        ) : (
                          <p className="text-[10px] text-jar-muted font-medium leading-relaxed">
                            فقط محدودهٔ تقریبی — پین دقیق بعد از پرداخت.
                          </p>
                        )}
                      </div>
                    </div>
                    {jarLoc ? (
                      <Link
                        href={`/locations/${jarLoc.slug}`}
                        target="_blank"
                        className="shrink-0 inline-flex items-center gap-1 rounded-full border border-jar-border bg-white px-2.5 py-1 text-[10px] font-bold text-jar-logo hover:bg-jar-soft"
                      >
                        صفحه لوکیشن
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : null}
                  </div>
                  {typeof order.travel?.distanceKm === "number" &&
                    order.travel.distanceKm <= 35 && (
                      <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-bold px-2 py-0.5">
                        نزدیک شما · {formatDistanceKm(order.travel.distanceKm)}
                      </span>
                    )}
                </div>

                {/* Travel */}
                <div className="rounded-2xl border border-jar-border bg-white px-3 py-2.5 flex items-start gap-2.5">
                  <Car className="h-4 w-4 text-jar-logo shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-[10px] font-bold text-jar-muted">ایاب‌وذهاب (برآورد جار)</p>
                    {order.travel ? (
                      <>
                        <p className="text-sm font-black font-mono text-jar-primary">
                          {order.travel.isFree
                            ? "رایگان"
                            : `${formatPrice(order.travel.fee)} تومان`}
                        </p>
                        <p className="text-[10px] text-jar-muted font-medium">
                          فاصلهٔ تقریبی {formatDistanceKm(order.travel.distanceKm)} از مبدأ شما · در
                          اعلام آمادگی قابل ویرایش است.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-jar-primary leading-relaxed">
                          {travelHint}
                        </p>
                        {!specialistHasBase && locKind !== "SPECIALIST_ADVICE" ? (
                          <Link
                            href="/specialist/profile"
                            className="inline-flex text-[10px] font-bold text-jar-logo hover:underline mt-0.5"
                          >
                            ثبت / ویرایش مبدأ کاری
                          </Link>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>

                {classifySpecialistOrder(order) === "won" &&
                  !order.contact &&
                  (order.status === "CONFIRMED" ||
                    order.status === "AWAITING_PAYMENT" ||
                    order.myInterest?.status === "SELECTED" ||
                    order.myInterest?.status === "ACCEPTED") && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-[11px] font-medium text-amber-950 leading-relaxed">
                      {order.status === "AWAITING_PAYMENT" || order.myInterest?.status === "SELECTED"
                        ? "شما انتخاب شده‌اید — به‌محض پرداخت کارفرما پروژه قطعی می‌شود. شماره تماس حدود ۲۴ ساعت پیش از شروع پروژه آزاد می‌شود."
                        : "پروژه قطعی شد. شماره تماس و نشانی دقیق حدود ۲۴ ساعت پیش از شروع پروژه در اختیارتان قرار می‌گیرد."}
                    </div>
                  )}

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

                {(order.projectDescription || order.referenceLink) && (
                  <div className="space-y-2 pt-0.5">
                    {order.projectDescription && (
                      <div className="space-y-1.5 bg-jar-canvas p-2.5 rounded-xl border border-jar-border/60">
                        <p className="text-[10px] font-bold text-jar-muted">توضیح کارفرما</p>
                        <p
                          className={`text-xs text-jar-muted leading-relaxed font-medium whitespace-pre-wrap break-words ${
                            expandedDescIds[order.id] ? "" : "line-clamp-3"
                          }`}
                        >
                          {order.projectDescription}
                        </p>
                        {order.projectDescription.trim().length > 120 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDescIds((prev) => ({
                                ...prev,
                                [order.id]: !prev[order.id],
                              }))
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-jar-logo hover:underline"
                          >
                            {expandedDescIds[order.id] ? (
                              <>
                                <ChevronUp className="h-3 w-3" />
                                کمتر
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3" />
                                مشاهده کامل
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {order.referenceLink && (
                      <a
                        href={
                          order.referenceLink.startsWith("http")
                            ? order.referenceLink
                            : `https://${order.referenceLink}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-jar-logo hover:underline font-bold"
                      >
                        <span>لینک نمونه / رفرنس درخواستی</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                {previewUrls.length === 0 && !order.referenceLink && (
                  <p className="text-[10px] text-jar-muted font-medium leading-relaxed">
                    کارفرما هنوز نمونه عکس یا لینک رفرنس نگذاشته — جزئیات را از توضیح و زمان بسنجید.
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-jar-border space-y-3 mt-auto">
                <div className="rounded-2xl border border-jar-border/80 bg-jar-canvas/50 px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-jar-muted font-medium">نرخ پایه پروژه</span>
                    <span className="font-mono font-bold text-jar-primary">
                      {formatPrice(order.totalEstimatedPrice)} ت
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-jar-muted font-medium">ایاب‌وذهاب</span>
                    <span className="font-mono font-bold text-jar-primary">
                      {travelFeeShown == null
                        ? "—"
                        : travelFeeShown === 0
                          ? "رایگان"
                          : `${formatPrice(travelFeeShown)} ت`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-jar-border/60 pt-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-jar-muted font-bold">برآورد قابل‌نمایش</span>
                      {order.isAutoPriced ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-white border border-jar-border text-jar-logo text-[9px] font-bold">
                          نرخ جار
                        </span>
                      ) : null}
                    </div>
                    <span className="text-base font-black text-jar-primary font-mono leading-none">
                      {formatPrice(estimateTotal)}{" "}
                      <span className="text-[11px] font-bold">تومان</span>
                    </span>
                  </div>
                  <p className="text-[9px] text-jar-muted font-medium leading-relaxed">
                    تسویه امن پس از توافق و پرداخت · قیمت نهایی در اعلام آمادگی شماست.
                  </p>
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

                {/* Legacy ASC only — new selections skip this and go to payment. */}
                {order.status === "AWAITING_SPECIALIST_CONFIRMATION" &&
                (order.myInterest?.status === "SELECTED" || order.hasApplied) ? (
                  <div className="space-y-2 rounded-2xl bg-jar-canvas border border-jar-border p-3.5 text-right">
                    <div className="flex items-center gap-2 text-jar-primary font-bold text-xs">
                      <Sparkles className="h-4 w-4 text-jar-logo shrink-0" />
                      <span>
                        کارفرما شما را انتخاب کرده است. با تأیید، نوبت پرداخت کارفرما می‌شود:
                      </span>
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
                        <span>تأیید آمادگی</span>
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
                  <div className="rounded-2xl border border-jar-border bg-jar-canvas p-3.5 text-right space-y-2.5">
                    <div className="flex items-center gap-2 text-jar-muted font-bold text-xs">
                      <XCircle className="h-4 w-4 shrink-0" />
                      <span>کارفرما متخصص دیگری را انتخاب کرد</span>
                    </div>
                    <p className="text-[11px] text-jar-muted leading-relaxed font-medium">
                      این پیشنهاد بسته شد. توکن مصرف‌شده برنمی‌گردد — برای سفارش‌های جدید از پروژه‌های باز اعلام آمادگی کنید.
                    </p>
                    <Link
                      href="/specialist/projects"
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-jar-primary px-4 text-[11px] font-bold text-white hover:bg-jar-primaryHover"
                    >
                      رفتن به پروژه‌های باز
                    </Link>
                  </div>
                ) : order.myInterest?.status === "ACCEPTED" ||
                  ((order.status === "CONFIRMED" ||
                    order.status === "COMPLETED" ||
                    order.status === "IN_PROGRESS") &&
                    (order.myInterest?.status === "SELECTED" ||
                      order.myInterest?.status === "ACCEPTED")) ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 w-full min-h-11 px-3 py-2 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>
                        {order.contact
                          ? "پروژه قطعی شد. اطلاعات تماس در کارت بالا آمده است."
                          : "پروژه قطعی شد. شماره و آدرس ۲۴ ساعت قبل از شروع کار آزاد می‌شود."}
                      </span>
                    </div>
                    {order.status === "CONFIRMED" && (
                      <Link
                        href={`/order/${order.id}`}
                        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-jar-border bg-jar-surface text-jar-primary text-[11px] font-bold hover:bg-jar-soft"
                      >
                        ثبت تحویل / پیگیری تسویه
                      </Link>
                    )}
                  </div>
                ) : order.myInterest?.status === "PENDING" ? (
                  <div className="flex items-center gap-1.5 w-full p-2.5 rounded-2xl bg-jar-canvas border border-jar-border text-jar-primary text-xs font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      {order.selectedSpecialistId
                        ? "کارفرما در حال نهایی کردن انتخاب است"
                        : "پیشنهاد شما ثبت شده است"}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleOpenInterestModal(order)}
                      disabled={!canAffordApply || !kycReady}
                      className="group flex h-11 w-full items-center justify-center gap-2 rounded-full bg-jar-primary hover:bg-jar-primaryHover text-white font-medium text-xs sm:text-sm shadow-none transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Send className="h-4 w-4" />
                      <span>
                        {!kycReady
                          ? kycStatus === "PENDING"
                            ? "منتظر تایید احراز هویت"
                            : "ابتدا احراز هویت کنید"
                          : canAffordApply
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
