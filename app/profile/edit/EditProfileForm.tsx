"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Phone,
  User,
  Loader2,
  CheckCircle2,
  LogOut,
} from "lucide-react";
import { logout } from "@/app/actions/authActions";
import { updateUserDisplayName } from "@/app/actions/profileActions";
import SaveFeedbackToast from "@/components/ui/SaveFeedbackToast";

const inputClasses =
  "w-full rounded-xl border border-jar-border bg-jar-canvas px-4 py-3 text-sm text-jar-primary placeholder:text-jar-muted/60 outline-none transition-all duration-200 focus:border-jar-logo focus:ring-2 focus:ring-jar-logo/20";

export default function EditProfileForm({
  initialName,
  phoneDisplay,
}: {
  initialName: string;
  phoneDisplay: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateUserDisplayName(name);
      if (result.success) {
        setMessage("success");
        setToastOpen(true);
        router.refresh();
      } else {
        setMessage(result.error);
      }
    });
  };

  return (
    <div className="space-y-8 text-right" dir="rtl">
      <header className="flex items-center justify-between border-b border-jar-border pb-4">
        <h1 className="text-base font-black text-jar-primary">ویرایش مشخصات حساب</h1>
        <Link
          href="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-jar-canvas border border-jar-border text-jar-muted hover:bg-jar-soft transition active:scale-95"
          title="بازگشت به پروفایل"
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <div className="space-y-6">
        <div>
          <span className="mb-2 block text-xs font-black text-jar-primary">شماره موبایل</span>
          <div
            className="flex items-center gap-2 rounded-xl border border-jar-border bg-jar-canvas px-4 py-3 text-sm text-jar-muted font-mono"
            dir="ltr"
          >
            <Phone className="h-4 w-4 shrink-0 text-jar-muted" />
            {phoneDisplay}
          </div>
          <p className="mt-1.5 text-xs font-medium text-jar-muted">
            شماره موبایل از حساب شما خوانده می‌شود و قابل تغییر نیست.
          </p>
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-black text-jar-primary">
            نام و نام خانوادگی
          </span>
          <div className="relative">
            <User className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-jar-muted" />
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setMessage(null);
              }}
              placeholder="نام و نام خانوادگی"
              className={`${inputClasses} pr-11`}
            />
          </div>
        </label>

        {message === "success" && (
          <p
            role="status"
            aria-live="polite"
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            تغییرات با موفقیت ذخیره شد
          </p>
        )}
        {message && message !== "success" && (
          <p role="status" aria-live="polite" className="text-xs font-bold text-rose-600">
            {message}
          </p>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !name.trim()}
            className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              message === "success"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-jar-primary hover:bg-jar-primaryHover"
            }`}
          >
            {isPending ? (
              <>
                در حال ذخیره...
                <Loader2 className="h-4 w-4 animate-spin" />
              </>
            ) : message === "success" ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                ذخیره شد
              </>
            ) : (
              "ذخیره تغییرات"
            )}
          </button>
        </div>
      </div>

      <div className="pt-6 border-t border-jar-border flex justify-center">
        <button
          type="button"
          onClick={() => logout()}
          className="flex h-11 items-center justify-center gap-2 px-6 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition active:scale-95 w-full max-w-xs"
        >
          <LogOut className="h-4 w-4" />
          خروج از حساب کاربری
        </button>
      </div>

      <SaveFeedbackToast
        open={toastOpen}
        message="ذخیره شد — مشخصات حساب به‌روز شد"
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}
