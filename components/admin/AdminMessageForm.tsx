"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Loader2, Search, Send, CheckCircle2 } from "lucide-react";
import {
  listNotificationTemplatesForAdmin,
  searchUsersForAdminMessage,
  sendAdminUserMessageAction,
} from "@/app/actions/adminMessageActions";

type UserHit = { id: string; displayName: string | null; phone: string };
type Tpl = { id: string; slug: string; title: string; content: string };

export default function AdminMessageForm() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<UserHit[]>([]);
  const [selected, setSelected] = useState<UserHit | null>(null);
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [templateSlug, setTemplateSlug] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void listNotificationTemplatesForAdmin().then((res) => {
      if (res.success) setTemplates(res.templates);
    });
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      setSearching(true);
      void searchUsersForAdminMessage(query).then((res) => {
        setSearching(false);
        if (res.success) setHits(res.users);
      });
    }, 280);
    return () => window.clearTimeout(t);
  }, [query]);

  const applyTemplate = (slug: string) => {
    setTemplateSlug(slug);
    const tpl = templates.find((x) => x.slug === slug);
    if (!tpl) return;
    setTitle(tpl.title);
    setMessage(tpl.content);
  };

  const send = () => {
    if (!selected) {
      setError("ابتدا کاربر را انتخاب کنید.");
      return;
    }
    setError(null);
    setOk(null);
    startTransition(async () => {
      const res = await sendAdminUserMessageAction({
        userId: selected.id,
        title,
        message,
        link: link.trim() || undefined,
        templateSlug: templateSlug || undefined,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setOk(res.message);
      setTitle("");
      setMessage("");
      setLink("");
      setTemplateSlug("");
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5" dir="rtl">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4 shadow-xs">
        <div>
          <h1 className="text-lg font-black text-slate-900">ارسال پیام جارچی</h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            پیام درون‌برنامه‌ای برای کاربر. می‌توانید از قالب‌ها استفاده کنید؛ متغیر{" "}
            <code className="text-[10px] bg-slate-100 px-1 rounded">{"{{user_name}}"}</code>{" "}
            خودکار پر می‌شود. پیامک آزاد فعلاً پشتیبانی نمی‌شود (فقط پترن).
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-700">جستجوی کاربر (نام یا موبایل)</span>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              placeholder="مثلاً ۰۹۱۲… یا نام"
              className="w-full h-11 rounded-xl border border-slate-200 bg-white pr-10 pl-3 text-sm"
            />
            {searching && (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
            )}
          </div>
        </label>

        {selected ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 flex items-center justify-between gap-2">
            <span>
              گیرنده: {selected.displayName || "بدون نام"} ·{" "}
              <span dir="ltr" className="font-mono">
                {selected.phone}
              </span>
            </span>
            <button
              type="button"
              className="text-[10px] font-bold text-emerald-800 underline"
              onClick={() => setSelected(null)}
            >
              تغییر
            </button>
          </div>
        ) : hits.length > 0 ? (
          <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {hits.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(u);
                    setHits([]);
                    setQuery(u.displayName || u.phone);
                  }}
                  className="w-full text-right px-3 py-2.5 text-xs hover:bg-slate-50"
                >
                  <span className="font-bold text-slate-900">
                    {u.displayName || "بدون نام"}
                  </span>
                  <span className="text-slate-500 mr-2 font-mono" dir="ltr">
                    {u.phone}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {templates.length > 0 && (
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700">قالب آماده (اختیاری)</span>
            <select
              value={templateSlug}
              onChange={(e) => applyTemplate(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">بدون قالب — نوشتن دستی</option>
              {templates.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.title} ({t.slug})
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-700">عنوان</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
            placeholder="عنوان اعلان"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-700">متن پیام</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="متن اعلان برای کاربر"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-700">لینک (اختیاری)</span>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-mono"
            placeholder="/order/… یا /profile"
            dir="ltr"
          />
        </label>

        {error && (
          <p className="text-xs font-bold text-rose-700 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
            {error}
          </p>
        )}
        {ok && (
          <p className="text-xs font-bold text-emerald-800 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            {ok}
          </p>
        )}

        <button
          type="button"
          disabled={isPending || !selected}
          onClick={send}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          ارسال اعلان
        </button>
      </div>
    </div>
  );
}
