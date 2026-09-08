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
  LogOut
} from "lucide-react";
import { logout } from "@/app/actions/authActions";
import { updateUserDisplayName } from "@/app/actions/profileActions";

const inputClasses =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-black placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[#FACC15]";

export default function EditProfileForm({
  initialName,
  phoneDisplay
}: {
  initialName: string;
  phoneDisplay: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateUserDisplayName(name);
      if (result.success) {
        setMessage("success");
        router.refresh();
      } else {
        setMessage(result.error);
      }
    });
  };

  return (
    <div className="space-y-8 text-right" dir="rtl">
      
      {/* Header with Back Button */}
      <header className="flex items-center justify-between border-b border-gray-150 pb-4">
        <h1 className="text-base font-black text-black">ویرایش مشخصات حساب</h1>
        <Link
          href="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 border border-gray-150 text-gray-500 hover:bg-gray-100 transition active:scale-95"
          title="بازگشت به پروفایل"
        >
          <ArrowRight className="h-4.5 w-4.5" />
        </Link>
      </header>

      {/* Main Edit Form Card */}
      <div className="rounded-2xl border border-gray-150 bg-white p-6 space-y-6 shadow-sm">
        
        {/* Phone number - Read Only */}
        <div>
          <span className="mb-2 block text-xs font-black text-black">
            شماره موبایل
          </span>
          <div
            className="flex items-center gap-2 rounded-xl border border-gray-150 bg-gray-50 px-4 py-3 text-sm text-gray-600 font-mono"
            dir="ltr"
          >
            <Phone className="h-4 w-4 shrink-0 text-gray-400" />
            {phoneDisplay}
          </div>
          <p className="mt-1.5 text-[9px] font-bold text-gray-400">
            شماره موبایل از حساب شما خوانده می‌شود و قابل تغییر نیست.
          </p>
        </div>

        {/* Display Name Input */}
        <label className="block">
          <span className="mb-2 block text-xs font-black text-black">
            نام و نام خانوادگی
          </span>
          <div className="relative">
            <User className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
          <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-650">
            <CheckCircle2 className="h-4 w-4" />
            تغییرات با موفقیت ذخیره شد
          </p>
        )}
        {message && message !== "success" && (
          <p className="text-xs font-bold text-red-650">{message}</p>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !name.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-2.5 text-xs font-black text-black shadow-sm transition-transform duration-200 hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <>
                در حال ذخیره...
                <Loader2 className="h-4 w-4 animate-spin" />
              </>
            ) : (
              "ذخیره تغییرات"
            )}
          </button>
        </div>

      </div>

      {/* Logout Action at the Bottom */}
      <div className="pt-6 border-t border-gray-100 flex justify-center">
        <button
          type="button"
          onClick={() => logout()}
          className="flex h-11 items-center justify-center gap-2 px-6 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-xs font-black transition active:scale-95 w-full max-w-xs"
        >
          <LogOut className="h-4 w-4" />
          خروج از حساب کاربری
        </button>
      </div>

    </div>
  );
}
