"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Star } from "lucide-react";
import {
  getOrderReviewStateAction,
  submitOrderReviewAction,
  type OrderReviewState,
} from "@/app/actions/orderReviewActions";

function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="p-0.5 disabled:opacity-50"
          aria-label={`${n} ستاره`}
        >
          <Star
            className={`h-7 w-7 transition-colors ${
              n <= shown
                ? "fill-amber-400 text-amber-500"
                : "fill-transparent text-neutral-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function ReadOnlyStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${
            n <= rating
              ? "fill-amber-400 text-amber-500"
              : "fill-transparent text-neutral-300"
          }`}
        />
      ))}
    </div>
  );
}

export default function OrderReviewPanel({
  orderId,
  role,
}: {
  orderId: string;
  role: "client" | "specialist" | "admin";
}) {
  const router = useRouter();
  const [state, setState] = useState<OrderReviewState | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getOrderReviewStateAction(orderId);
      if (cancelled) return;
      if (res.success && res.state) {
        setState(res.state);
      } else {
        setError(res.error || "خطا");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (role === "admin") return null;

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 flex items-center justify-center gap-2 text-xs text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        در حال بارگذاری نظرسنجی…
      </div>
    );
  }

  if (!state || (!state.canReview && !state.alreadySubmitted && !state.windowExpired && !state.peerReview)) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setError("لطفاً امتیاز ۱ تا ۵ را انتخاب کنید.");
      return;
    }
    setError(null);
    setOk(null);
    startTransition(async () => {
      const res = await submitOrderReviewAction({
        orderId,
        rating,
        comment: comment.trim() || null,
      });
      if (!res.success) {
        setError(res.error || "ثبت نشد");
        return;
      }
      setOk(res.message || "ثبت شد");
      const refreshed = await getOrderReviewStateAction(orderId);
      if (refreshed.success && refreshed.state) setState(refreshed.state);
      router.refresh();
    });
  };

  return (
    <div
      className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4 shadow-sm"
      dir="rtl"
      id="order-review"
    >
      <div className="space-y-1">
        <h2 className="text-sm font-black text-neutral-900 flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
          نظرسنجی پایان پروژه
        </h2>
        <p className="text-[11px] text-neutral-500 leading-relaxed">
          {state.canReview
            ? `به ${state.revieweeLabel} امتیاز بدهید. مهلت: ${state.daysLeft?.toLocaleString("fa-IR") ?? "—"} روز.`
            : state.alreadySubmitted
              ? "نظر شما برای این پروژه ثبت شده است."
              : state.windowExpired
                ? "مهلت ثبت نظر برای این پروژه به پایان رسیده است."
                : null}
        </p>
      </div>

      {state.canReview && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col items-center gap-2 py-1">
            <StarPicker value={rating} onChange={setRating} disabled={isPending} />
            <span className="text-[11px] font-bold text-neutral-500">
              {rating > 0
                ? `${rating.toLocaleString("fa-IR")} از ۵`
                : "یک ستاره انتخاب کنید"}
            </span>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="نظر کوتاه (اختیاری)"
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-900 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/5"
            disabled={isPending}
          />
          <button
            type="submit"
            disabled={isPending || rating < 1}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 text-xs font-bold text-white hover:bg-neutral-800 disabled:opacity-40"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            ثبت نظر
          </button>
        </form>
      )}

      {state.myReview && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-900 text-xs font-bold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            نظر شما
          </div>
          <ReadOnlyStars rating={state.myReview.rating} />
          {state.myReview.comment ? (
            <p className="text-[11px] text-emerald-900/80 leading-relaxed">
              {state.myReview.comment}
            </p>
          ) : null}
        </div>
      )}

      {state.peerReview && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 space-y-1.5">
          <p className="text-[11px] font-bold text-neutral-700">نظر طرف مقابل</p>
          <ReadOnlyStars rating={state.peerReview.rating} />
          {state.peerReview.comment ? (
            <p className="text-[11px] text-neutral-600 leading-relaxed">
              {state.peerReview.comment}
            </p>
          ) : null}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
      {ok && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          {ok}
        </div>
      )}
    </div>
  );
}
