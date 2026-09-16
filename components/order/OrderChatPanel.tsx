"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, MessageCircle, Send, Shield } from "lucide-react";
import {
  listOrderMessagesAction,
  sendOrderMessageAction,
  type OrderChatMessageView,
} from "@/app/actions/orderChatActions";
import { formatJalaliDate } from "@/lib/date/jalali";

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    const time = d.toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${formatJalaliDate(d)} · ${time}`;
  } catch {
    return "";
  }
}

export default function OrderChatPanel({
  orderId,
  role,
  readOnly = false,
}: {
  orderId: string;
  role: "client" | "specialist" | "admin";
  /** Admin dispute review — no composer. */
  readOnly?: boolean;
}) {
  const [messages, setMessages] = useState<OrderChatMessageView[]>([]);
  const [canSend, setCanSend] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    const res = await listOrderMessagesAction(orderId);
    if (!res.success) {
      setError(res.error || "خطا در بارگذاری گفتگو");
      setLoading(false);
      return;
    }
    setMessages(res.messages || []);
    setCanSend(Boolean(res.canSend) && !readOnly && role !== "admin");
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") {
        listOrderMessagesAction(orderId).then((res) => {
          if (res.success && res.messages) setMessages(res.messages);
        });
      }
    }, 12000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, readOnly, role]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isPending || !canSend) return;
    setError(null);
    startTransition(async () => {
      const res = await sendOrderMessageAction({ orderId, body: text });
      if (!res.success) {
        setError(res.error || "ارسال نشد");
        return;
      }
      setDraft("");
      if (res.message) {
        setMessages((prev) => [...prev, res.message!]);
      } else {
        await load();
      }
    });
  };

  const adminView = role === "admin" || readOnly;

  return (
    <div
      className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden"
      dir="rtl"
      id="order-chat"
    >
      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3 bg-neutral-50/80">
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircle className="h-4 w-4 text-[#CC785C] shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-black text-neutral-900">گفتگوی هماهنگی</h2>
            <p className="text-[11px] text-neutral-500 truncate">
              {adminView
                ? "مشاهده فقط‌خواندنی برای بررسی اختلاف"
                : "متن کوتاه برای هماهنگی قبل از شوت — شماره تماس نزدیک زمان پروژه آزاد می‌شود"}
            </p>
          </div>
        </div>
        {adminView && (
          <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-bold text-neutral-600">
            <Shield className="h-3 w-3" />
            ادمین
          </span>
        )}
      </div>

      <div
        ref={listRef}
        className="max-h-[340px] overflow-y-auto px-3 py-3 space-y-2.5 bg-neutral-50/40"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-neutral-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            در حال بارگذاری…
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-white py-8 px-4 text-center">
            <p className="text-xs font-bold text-neutral-600">هنوز پیامی نیست</p>
            <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
              {adminView
                ? "در این سفارش گفتگویی ثبت نشده است."
                : "اولین پیام را بفرستید تا هماهنگی روی جار ثبت شود."}
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.isMine && !adminView;
            const alignEnd = adminView ? m.side === "specialist" : !mine;
            return (
              <div
                key={m.id}
                className={`flex ${alignEnd ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-right ${
                    mine
                      ? "bg-neutral-900 text-white rounded-br-md"
                      : m.side === "specialist"
                        ? "bg-white border border-neutral-200 text-neutral-900 rounded-bl-md"
                        : "bg-emerald-50 border border-emerald-100 text-emerald-950 rounded-bl-md"
                  }`}
                >
                  <div
                    className={`flex items-center justify-between gap-3 mb-1 ${
                      mine ? "text-white/70" : "text-neutral-400"
                    }`}
                  >
                    <span className="text-[10px] font-bold">{m.senderLabel}</span>
                    <span className="text-[10px] font-mono">{formatTime(m.createdAt)}</span>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                    {m.body}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mx-3 mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700">
          {error}
        </div>
      )}

      {canSend ? (
        <form
          onSubmit={handleSend}
          className="border-t border-neutral-100 p-3 flex items-end gap-2 bg-white"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
            rows={2}
            placeholder="پیام خود را بنویسید…"
            className="min-h-[44px] max-h-28 flex-1 resize-y rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-900 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/5"
            disabled={isPending}
          />
          <button
            type="submit"
            disabled={isPending || !draft.trim()}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-40 transition-colors"
            title="ارسال"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      ) : adminView ? (
        <div className="border-t border-neutral-100 px-4 py-2.5 text-[11px] text-neutral-500 bg-neutral-50">
          این گفتگو برای داوری اختلاف فقط‌خواندنی است.
        </div>
      ) : null}
    </div>
  );
}
