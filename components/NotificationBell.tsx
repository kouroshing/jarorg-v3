"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Check, Info, AlertTriangle, CheckCheck, Loader2, Sparkles } from "lucide-react";
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createTestNotification
} from "@/app/actions/jarchiActions";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string | Date;
}

export default function NotificationBell({ isAdmin = false }: { isAdmin?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch notifications and unread count on mount / when opened
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const listRes = await getUserNotifications();
      const countRes = await getUnreadCount();
      if (listRes.success && listRes.data) {
        setNotifications(listRes.data);
      }
      if (countRes.success) {
        setUnreadCount(countRes.data ?? 0);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up polling interval every 30 seconds for live notifications
    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchData(); // Refresh list when opening
    }
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsActionPending(true);
    try {
      const res = await markAsRead(id);
      if (res.success) {
        setNotifications(prev =>
          prev.map(item => (item.id === id ? { ...item, isRead: true } : item))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsActionPending(true);
    try {
      const res = await markAllAsRead();
      if (res.success) {
        setNotifications(prev => prev.map(item => ({ ...item, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleSendTestNotification = async () => {
    setIsActionPending(true);
    try {
      const res = await createTestNotification();
      if (res.success && res.data) {
        const newNotif = res.data;
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsActionPending(false);
    }
  };

  const getRelativeTimeString = (dateInput: Date | string) => {
    const date = new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "چند لحظه پیش";
    if (diffMin < 60) return `${diffMin.toLocaleString("fa-IR")} دقیقه پیش`;
    if (diffHr < 24) return `${diffHr.toLocaleString("fa-IR")} ساعت پیش`;
    return `${diffDay.toLocaleString("fa-IR")} روز پیش`;
  };

  return (
    <div className="relative font-sans text-right select-none" ref={containerRef} dir="rtl">
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200 active:scale-95 md:h-10 md:w-10 ${
          isOpen
            ? "border-slate-300 bg-slate-50 text-slate-900"
            : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 text-slate-650 hover:text-slate-900"
        }`}
        aria-label="اعلان‌ها"
      >
        <Bell className="h-4 w-4 md:h-[18px] md:w-[18px]" strokeWidth={2.2} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white ring-2 ring-white">
            {unreadCount.toLocaleString("fa-IR")}
          </span>
        )}
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="fixed inset-x-4 top-20 sm:absolute sm:top-full sm:left-0 sm:inset-x-auto sm:mt-2 w-auto sm:w-[350px] sm:max-w-[350px] origin-top-left z-[100] bg-white dark:bg-gray-900 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 rounded-2xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/40">
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span>اعلان‌های من</span>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-700 text-[9px] font-black px-2 py-0.5 rounded-full">
                  {unreadCount.toLocaleString("fa-IR")} جدید
                </span>
              )}
            </h4>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isActionPending}
                className="text-[9px] font-black text-[#006097] hover:text-[#004b75] transition flex items-center gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                خوانده شدن همه
              </button>
            )}
          </div>

          {/* List Area */}
          <div className="max-h-[360px] overflow-y-auto scrollbar-none p-3 space-y-2.5">
            {isLoading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                <span className="text-[10px] font-bold">در حال دریافت اعلان‌ها...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                <Bell className="h-8 w-8 text-slate-200" strokeWidth={1.5} />
                <span className="text-[10px] font-bold">هیچ اعلانی برای شما ثبت نشده است</span>
              </div>
            ) : (
              notifications.map((item) => {
                const isWarning = item.type === "WARNING";
                const isSuccess = item.type === "SUCCESS";
                
                let iconColor = "bg-blue-50 text-blue-500";
                let Icon = Info;
                if (isWarning) {
                  iconColor = "bg-amber-50 text-amber-500";
                  Icon = AlertTriangle;
                } else if (isSuccess) {
                  iconColor = "bg-emerald-50 text-emerald-500";
                  Icon = Check;
                }

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl flex items-start gap-3 transition-all duration-200 border border-slate-100/50 ${
                      item.isRead ? "bg-white hover:bg-slate-50/30" : "bg-slate-50/70 hover:bg-slate-50"
                    }`}
                  >
                    {/* Unread indicator */}
                    {!item.isRead && (
                      <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    )}

                    {/* Notification icon */}
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="text-[11px] font-black text-slate-900 truncate">{item.title}</h5>
                        <span className="text-[9px] font-semibold text-slate-400 shrink-0">
                          {getRelativeTimeString(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                        {item.message}
                      </p>
                      
                      {/* Mark single as read button */}
                      {!item.isRead && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(item.id, e)}
                          disabled={isActionPending}
                          className="text-[9px] font-bold text-[#006097] hover:underline mt-1 block"
                        >
                          خواندم
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Admin Tools Panel */}
          {isAdmin && (
            <div className="p-3 border-t border-slate-100 bg-slate-50/30 flex justify-center">
              <button
                type="button"
                onClick={handleSendTestNotification}
                disabled={isActionPending}
                className="w-full h-8 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition text-[9px] font-black flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Sparkles className="h-3 w-3 text-amber-400" />
                ارسال اعلان تستی (مخصوص ادمین)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
