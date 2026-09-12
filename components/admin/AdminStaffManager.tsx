"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  ADMIN_PERMISSION_LABELS,
  ADMIN_PERMISSIONS,
  ADMIN_ROLE_LABELS,
  ADMIN_ROLE_KEYS,
  type AdminPermission,
  type AdminRoleKey,
  permissionsForRoleKey,
} from "@/lib/auth/adminPermissions";
import {
  deactivateAdminStaffAction,
  listAdminStaffAction,
  upsertAdminStaffAction,
} from "@/app/actions/adminStaffActions";
import { CheckCircle2, Loader2, Shield, UserPlus, Ban } from "lucide-react";
import { toPersianDigits } from "@/lib/date/jalali";

type StaffRow = {
  id: string;
  phone: string;
  label: string | null;
  roleKey: string;
  permissions: AdminPermission[];
  isActive: boolean;
  createdAt: string;
  createdByPhone: string | null;
  note: string | null;
};

function localPhoneDisplay(digits: string) {
  if (digits.startsWith("98") && digits.length >= 12) {
    return "0" + digits.slice(2);
  }
  return digits;
}

export default function AdminStaffManager() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");
  const [roleKey, setRoleKey] = useState<AdminRoleKey>("OPS");
  const [customPerms, setCustomPerms] = useState<AdminPermission[]>([]);
  const [note, setNote] = useState("");

  const reload = async () => {
    setLoading(true);
    const res = await listAdminStaffAction();
    setLoading(false);
    if (!res.success) {
      setError(res.error || "خطا");
      return;
    }
    setRows(res.staff);
  };

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    if (roleKey !== "CUSTOM") {
      setCustomPerms([...permissionsForRoleKey(roleKey)]);
    }
  }, [roleKey]);

  const togglePerm = (p: AdminPermission) => {
    setRoleKey("CUSTOM");
    setCustomPerms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const save = () => {
    setError(null);
    setOk(null);
    startTransition(async () => {
      const res = await upsertAdminStaffAction({
        phone,
        label,
        roleKey,
        permissions: customPerms,
        note,
        isActive: true,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setOk(res.message || "ذخیره شد");
      setPhone("");
      setLabel("");
      setNote("");
      setRoleKey("OPS");
      await reload();
    });
  };

  const deactivate = (id: string) => {
    if (!window.confirm("دسترسی این ادمین غیرفعال شود؟")) return;
    setError(null);
    startTransition(async () => {
      const res = await deactivateAdminStaffAction(id);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setOk(res.message || "غیرفعال شد");
      await reload();
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6" dir="rtl">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-2">
        <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          مدیریت ادمین‌ها و نقش‌ها
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          سوپرادمین (شماره محیطی) همیشه همه دسترسی‌ها را دارد و اینجا ثبت نمی‌شود. ادمین‌های
          جدید فقط بعد از ورود با OTP همان شماره فعال می‌شوند. لغو دسترسی بلافاصله در سرور
          اعمال می‌شود؛ برای پاک شدن نقش از نشست، یک‌بار خروج/ورود لازم است.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
          {error}
        </div>
      )}
      {ok && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" />
          {ok}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
        <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
          <UserPlus className="h-4 w-4" />
          افزودن / به‌روزرسانی ادمین
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-slate-600">موبایل</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912…"
              className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
              dir="ltr"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-slate-600">نام نمایشی</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
              placeholder="مثلاً پشتیبانی صبح"
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-[11px] font-bold text-slate-600">نقش از پیش‌تعریف‌شده</span>
          <select
            value={roleKey}
            onChange={(e) => setRoleKey(e.target.value as AdminRoleKey)}
            className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
          >
            {ADMIN_ROLE_KEYS.map((k) => (
              <option key={k} value={k}>
                {ADMIN_ROLE_LABELS[k]}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-600">مجوزها</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ADMIN_PERMISSIONS.map((p) => (
              <label
                key={p}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={customPerms.includes(p)}
                  onChange={() => togglePerm(p)}
                  className="rounded border-slate-300"
                />
                <span className="font-bold text-slate-800">
                  {ADMIN_PERMISSION_LABELS[p]}
                </span>
              </label>
            ))}
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-[11px] font-bold text-slate-600">یادداشت (اختیاری)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
          />
        </label>

        <button
          type="button"
          disabled={isPending || !phone.trim()}
          onClick={save}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-bold text-white disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          ذخیره ادمین
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-black text-slate-900">لیست کارکنان ادمین</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">هنوز ادمین کارکنانه‌ای ثبت نشده.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className={`rounded-xl border p-3 ${
                  row.isActive ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-70"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {row.label || "بدون نام"}{" "}
                      <span className="text-[10px] font-bold text-slate-500">
                        ({ADMIN_ROLE_LABELS[row.roleKey as AdminRoleKey] || row.roleKey})
                      </span>
                      {!row.isActive && (
                        <span className="mr-1 text-[10px] text-rose-600">غیرفعال</span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5" dir="ltr">
                      {localPhoneDisplay(row.phone)}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      {row.permissions.map((p) => ADMIN_PERMISSION_LABELS[p]).join(" · ")}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      ثبت: {toPersianDigits(new Date(row.createdAt).toLocaleDateString("fa-IR"))}
                    </p>
                  </div>
                  {row.isActive && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => deactivate(row.id)}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[11px] font-bold text-rose-800"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      غیرفعال
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
