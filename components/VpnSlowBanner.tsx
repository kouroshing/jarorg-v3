"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const STORAGE_KEY = "jar_vpn_banner_dismissed_at";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

function looksLikeVpnOrAbroad(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    return tz !== "Asia/Tehran";
  } catch {
    return false;
  }
}

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

/**
 * Top-of-page tip (not an in-app notification). Soft-detects non-Tehran timezone.
 */
export default function VpnSlowBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (wasDismissedRecently()) return;
    if (!looksLikeVpnOrAbroad()) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="relative z-[60] border-b border-amber-200 bg-amber-50 text-amber-950"
      dir="rtl"
      role="status"
    >
      <div className="mx-auto flex max-w-6xl items-start gap-2 px-3 sm:px-4 py-2.5">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
        <p className="flex-1 text-[11px] sm:text-xs font-medium leading-relaxed text-right">
          به نظر می‌رسد از خارج ایران یا با VPN وارد شده‌اید. در این حالت ممکن است سرعت سایت
          کندتر شود؛ برای تجربهٔ بهتر موقتاً فیلترشکن را خاموش کنید.
        </p>
        <button
          type="button"
          aria-label="بستن اخطار"
          onClick={() => {
            try {
              localStorage.setItem(STORAGE_KEY, String(Date.now()));
            } catch {
              /* ignore */
            }
            setVisible(false);
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-white/80 text-amber-800 hover:bg-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
