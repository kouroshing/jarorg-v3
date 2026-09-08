import { HookError, NextAdminOptions } from "@premieroctet/next-admin";
import CancelOrderDialog from "@/components/admin/CancelOrderDialog";
import RejectPortfolioDialog from "@/components/admin/RejectPortfolioDialog";
import { approvePortfolioAction } from "@/app/actions/adminActionHandlers";
import { prisma } from "@/lib/prisma";
import { RenderBadges, RenderImageGallery } from "./formatters";
import AdminBrandHeader from "@/components/admin/AdminBrandHeader";
import { ORDER_STATUSES, isOrderStatus } from "@/lib/orders/status";

export const options: NextAdminOptions = {
  title: "جار و جار آموز",
  forceColorScheme: "light",
  defaultColorScheme: "light",
  sidebar: {
    groups: [
      {
        title: "سفارش‌ها و مارکت‌پلیس",
        models: ["Order", "ProjectInterest"],
      },
      {
        title: "کاربران و متخصصان",
        models: ["User", "SpecialistProfile", "PortfolioItem", "Expert"],
      },
      {
        title: "مالی و اشتراک‌ها",
        models: ["Transaction", "WithdrawalRequest", "Plan", "DiscountCode"],
      },
      {
        title: "گالری آنلاین و فروش عکس",
        models: ["GalleryProject", "GalleryPhoto", "GalleryOrder", "GalleryPurchase"],
      },
      {
        title: "آکادمی جارآموز",
        models: ["Course", "Purchase"],
      },
      {
        title: "سیستم و ارتباطات",
        models: ["Notification", "NotificationTemplate", "PwaSettings", "Project"],
      },
      {
        title: "امنیت و حسابرسی",
        models: ["AuditLog"],
      },
    ],
  },
  model: {
    Order: {
      title: "سفارش‌های پروژه‌ها (Orders)",
      icon: "CalendarDaysIcon",
      aliases: {
        id: "شناسه سفارش",
        createdAt: "تاریخ ثبت",
        categorySlug: "اسلاگ دسته",
        categoryTitle: "شاخه‌ی خدمات",
        status: "وضعیت سفارش",
        hourlyRate: "نرخ ساعتی (تومان)",
        durationHours: "مدت زمان (ساعت)",
        totalEstimatedPrice: "مبلغ کل برآورد (تومان)",
        isAutoPriced: "قیمت‌گذاری هوشمند",
        isFlexibleSchedule: "زمان‌بندی منعطف",
        bookingDate: "تاریخ انتخابی",
        timeSlot: "ساعت انتخابی",
        locationType: "نوع لوکیشن",
        locationAddress: "آدرس دقیق",
        districtOrCity: "شهر / منطقه",
        contactName: "نام کارفرما",
        contactPhone: "شماره تماس کارفرما",
        adminCancelNote: "یادداشت لغو اداری",
        projectDescription: "توضیحات و سناریو",
        referenceLink: "لینک رفرنس",
        moodboardUrls: "مودبورد تصاویر",
        user: "حساب کارفرما",
        selectedSpecialist: "متخصص منتخب",
        interests: "پیشنهادات متخصصان",
      },
      actions: [
        {
          type: "dialog",
          id: "cancel-order",
          title: "لغو سفارش",
          icon: "XCircleIcon",
          style: "destructive",
          canExecute: (order) => order.status !== "CANCELLED" && order.status !== "COMPLETED",
          component: <CancelOrderDialog />,
        },
      ],
      list: {
        display: [
          "categoryTitle",
          "status",
          "totalEstimatedPrice",
          "moodboardUrls",
          "contactName",
          "contactPhone",
          "districtOrCity",
          "bookingDate",
          "timeSlot",
          "createdAt",
        ],
        search: ["id", "categoryTitle", "contactName", "contactPhone", "districtOrCity"],
        fields: {
          totalEstimatedPrice: {
            formatter: (price) => `${Number(price || 0).toLocaleString("fa-IR")} تومان`,
          },
          moodboardUrls: {
            formatter: (val) => RenderImageGallery(val),
          },
          contactName: {
            formatter: (name) => (name && String(name).trim()) ? String(name).trim() : "— (بدون نام)",
          },
          contactPhone: {
            formatter: (p) => p ? String(p) : "—",
          },
          districtOrCity: {
            formatter: (c) => c ? String(c) : "—",
          },
          bookingDate: {
            formatter: (d) => d ? String(d) : "—",
          },
          timeSlot: {
            formatter: (t) => t ? String(t) : "—",
          },
        },
      },
      edit: {
        display: [
          "categorySlug",
          "categoryTitle",
          "status",
          "adminCancelNote",
          "hourlyRate",
          "durationHours",
          "totalEstimatedPrice",
          "isAutoPriced",
          "isFlexibleSchedule",
          "bookingDate",
          "timeSlot",
          "locationType",
          "locationAddress",
          "districtOrCity",
          "projectDescription",
          "referenceLink",
          "moodboardUrls",
          "contactName",
          "contactPhone",
          "user",
          "selectedSpecialist",
          "interests",
        ],
        fields: {
          status: {
            validate: (value) =>
              isOrderStatus(value) ||
              `وضعیت نامعتبر است. مقادیر مجاز: ${ORDER_STATUSES.join(", ")}`,
          },
          moodboardUrls: {
            format: "json",
          },
        },
        hooks: {
          beforeDb: async (data) => {
            if (data.status && !isOrderStatus(data.status)) {
              throw new HookError(400, {
                error: `وضعیت نامعتبر است: ${data.status}. مقادیر مجاز عبارتند از: ${ORDER_STATUSES.join(", ")}`,
              });
            }

            if (data.status && typeof data.status === "string") {
              try {
                await prisma.auditLog.create({
                  data: {
                    actorId: "admin",
                    action: "ORDER_STATUS_CHANGED",
                    targetModel: "Order",
                    targetId: (data.id as string) || "order",
                    note: `تغییر وضعیت سفارش به: ${data.status}`,
                  },
                });
              } catch (err) {
                console.error("Failed to write audit log in beforeDb:", err);
              }
            }

            return data;
          },
        },
      },
    },
    ProjectInterest: {
      title: "پیشنهادات متخصصان (Interests)",
      icon: "HandRaisedIcon",
      aliases: {
        id: "شناسه",
        order: "سفارش مرتبط",
        specialist: "متخصص متقاضی",
        message: "پیام متخصص",
        proposedPrice: "قیمت پیشنهادی (تومان)",
        status: "وضعیت پیشنهاد",
        createdAt: "زمان ثبت",
      },
      list: {
        display: ["order", "specialist", "proposedPrice", "status", "createdAt"],
        search: ["id", "message"],
        fields: {
          proposedPrice: {
            formatter: (price) => price ? `${Number(price).toLocaleString("fa-IR")} تومان` : "توافقی / اولیه",
          },
        },
      },
    },
    User: {
      title: "کاربران و اعضا (Users)",
      icon: "UsersIcon",
      toString: (user) => `${user.displayName || "کاربر بدون نام"} (${user.phone}) - ${user.role}`,
      aliases: {
        id: "شناسه کاربر",
        phone: "شماره موبایل",
        displayName: "نام و نام‌خانوادگی",
        role: "نقش سیستمی",
        specialistRoles: "تخصص‌ها",
        locationTypes: "انواع لوکیشن",
        equipment: "تجهیزات تخصصی",
        pricingGenres: "تعرفه‌ها به تفکیک ژانر",
        studioImages: "تصاویر آتلیه",
        walletBalance: "موجودی کیف‌پول (تومان)",
        city: "شهر فعالیت",
        planId: "پلن اشتراک",
        planExpiresAt: "انقضای پلن",
        requestedBlueTick: "درخواست تیک آبی",
        createdAt: "تاریخ عضویت",
      },
      list: {
        display: [
          "phone",
          "displayName",
          "role",
          "specialistRoles",
          "locationTypes",
          "equipment",
          "walletBalance",
          "city",
          "requestedBlueTick",
          "createdAt",
        ],
        search: ["phone", "displayName", "city"],
        fields: {
          displayName: {
            formatter: (name) => (name && String(name).trim()) ? String(name).trim() : "— (بدون نام)",
          },
          city: {
            formatter: (c) => c ? String(c) : "—",
          },
          walletBalance: {
            formatter: (balance) => `${Number(balance || 0).toLocaleString("fa-IR")} تومان`,
          },
          specialistRoles: {
            formatter: (val) => RenderBadges(val, "bg-amber-50 text-amber-800 border-amber-200"),
          },
          locationTypes: {
            formatter: (val) => RenderBadges(val, "bg-blue-50 text-blue-700 border-blue-200"),
          },
          equipment: {
            formatter: (val) => RenderBadges(val, "bg-emerald-50 text-emerald-800 border-emerald-200"),
          },
          pricingGenres: {
            formatter: (val) => RenderBadges(val, "bg-purple-50 text-purple-800 border-purple-200"),
          },
          studioImages: {
            formatter: (val) => RenderImageGallery(val),
          },
        },
      },
      edit: {
        fields: {
          specialistRoles: { format: "json" },
          locationTypes: { format: "json" },
          equipment: { format: "json" },
          pricingGenres: { format: "json" },
          studioImages: { format: "json" },
        },
      },
    },
    SpecialistProfile: {
      title: "پروفایل‌های متخصصان (Specialists)",
      icon: "BriefcaseIcon",
      aliases: {
        id: "شناسه",
        user: "حساب کاربری",
        status: "وضعیت تایید",
        city: "شهر",
        workArea: "محدوده فعالیت",
        bio: "بیوگرافی",
        equipmentSummary: "تجهیزات تخصصی",
        selectedCategories: "دسته‌بندی‌های فعال",
        portfolioReview: "بررسی نمونه‌کارهای عکاس/فیلمبردار",
        agreedToTerms: "تایید قرارداد و تعهدنامه",
        termsAgreedAt: "تاریخ امضا",
        createdAt: "تاریخ ایجاد",
      },
      list: {
        display: [
          "user",
          "status",
          "selectedCategories",
          "city",
          "workArea",
          "agreedToTerms",
          "createdAt",
        ],
        search: ["city", "workArea", "equipmentSummary"],
        fields: {
          city: {
            formatter: (c) => c ? String(c) : "—",
          },
          workArea: {
            formatter: (w) => w ? String(w) : "—",
          },
          selectedCategories: {
            formatter: (val) => RenderBadges(val, "bg-indigo-50 text-indigo-700 border-indigo-200"),
          },
        },
      },
      edit: {
        display: [
          "user",
          "status",
          "city",
          "workArea",
          "bio",
          "equipmentSummary",
          "selectedCategories",
          "portfolioReview",
          "agreedToTerms",
          "termsAgreedAt",
        ],
        customFields: {
          portfolioReview: {
            helperText: "بررسی کیفی نمونه‌کارها، تایید یا رد آثار و ارسال پیامک راهنما",
          },
        },
        fields: {
          selectedCategories: { format: "json" },
        },
      },
    },
    PortfolioItem: {
      title: "نمونه‌کارهای متخصصان (Portfolio)",
      icon: "PhotoIcon",
      aliases: {
        id: "شناسه",
        specialist: "پروفایل متخصص",
        categorySlug: "دسته‌بندی",
        categoryType: "نوع (شخصی/تجاری)",
        mediaType: "فرمت رسانه",
        fileUrl: "آدرس فایل",
        title: "عنوان",
        caption: "توضیحات",
        reviewStatus: "وضعیت بررسی",
        rejectionReason: "علت رد اثر",
        createdAt: "تاریخ بارگذاری",
      },
      actions: [
        {
          type: "server",
          id: "approve-portfolio",
          title: "تایید نمونه‌کار",
          icon: "CheckCircleIcon",
          canExecute: (item: any) => item.reviewStatus !== "APPROVED",
          action: async (ids) => {
            return approvePortfolioAction(ids);
          },
        },
        {
          type: "dialog",
          id: "reject-portfolio",
          title: "رد نمونه‌کار + ارسال دلیل",
          icon: "XCircleIcon",
          style: "destructive",
          canExecute: (item: any) => item.reviewStatus !== "REJECTED",
          component: <RejectPortfolioDialog />,
        },
      ],
      list: {
        display: [
          "specialist",
          "fileUrl",
          "categorySlug",
          "categoryType",
          "mediaType",
          "title",
          "reviewStatus",
          "createdAt",
        ],
        search: ["categorySlug", "title", "fileUrl", "reviewStatus"],
        fields: {
          fileUrl: {
            formatter: (url) => (
              <a
                href={String(url)}
                target="_blank"
                rel="noreferrer"
                className="block w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 hover:opacity-80 transition-opacity"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={String(url)} alt="نمونه‌کار" className="w-full h-full object-cover" />
              </a>
            ),
          },
          title: {
            formatter: (t) => t ? String(t) : "—",
          },
          reviewStatus: {
            formatter: (status) => {
              if (status === "APPROVED") {
                return (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    تایید شده
                  </span>
                );
              }
              if (status === "REJECTED") {
                return (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    رد شده
                  </span>
                );
              }
              return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                  در انتظار بررسی
                </span>
              );
            },
          },
        },
      },
      edit: {
        display: [
          "specialist",
          "categorySlug",
          "categoryType",
          "mediaType",
          "fileUrl",
          "title",
          "caption",
          "reviewStatus",
          "rejectionReason",
        ],
      },
    },
    Transaction: {
      title: "تراکنش‌های اشتراک (Transactions)",
      icon: "CreditCardIcon",
      aliases: {
        id: "شناسه",
        user: "کاربر",
        plan: "پلن خریداری‌شده",
        amount: "مبلغ (تومان)",
        durationMonths: "مدت (ماه)",
        discountCode: "کد تخفیف",
        status: "وضعیت پرداخت",
        authority: "کد پیگیری درگاه (Authority)",
        refId: "شماره مرجع بانکی (RefID)",
        createdAt: "تاریخ",
      },
      list: {
        display: ["user", "plan", "amount", "status", "refId", "createdAt"],
        search: ["authority", "refId"],
        fields: {
          amount: {
            formatter: (amount) => `${Number(amount || 0).toLocaleString("fa-IR")} تومان`,
          },
        },
      },
    },
    WithdrawalRequest: {
      title: "درخواست‌های تسویه حساب (Withdrawals)",
      icon: "BanknotesIcon",
      aliases: {
        id: "شناسه",
        user: "متخصص درخواست‌دهنده",
        amount: "مبلغ تسویه (تومان)",
        shabaNumber: "شماره شبا",
        status: "وضعیت تسویه",
        trackingCode: "کد رهگیری بانکی",
        createdAt: "تاریخ ثبت",
      },
      list: {
        display: ["user", "amount", "shabaNumber", "status", "trackingCode", "createdAt"],
        search: ["shabaNumber", "trackingCode"],
        fields: {
          amount: {
            formatter: (amount) => `${Number(amount || 0).toLocaleString("fa-IR")} تومان`,
          },
        },
      },
    },
    Plan: {
      title: "تعرفه‌ها و پلن‌های اشتراک (Plans)",
      icon: "SparklesIcon",
      aliases: {
        id: "شناسه",
        key: "کلید پلن (Key)",
        nameFa: "نام فارسی پلن",
        price3Months: "قیمت ۳ ماهه (تومان)",
        price12Months: "قیمت ۱۲ ماهه (تومان)",
        maxStorage: "حداکثر فضای ابری (بایت)",
        dailyApplicationLimit: "سقف درخواست روزانه پروژه",
        features: "لیست قابلیت‌ها",
      },
      list: {
        display: [
          "key",
          "nameFa",
          "dailyApplicationLimit",
          "price3Months",
          "price12Months",
          "maxStorage",
        ],
        fields: {
          features: {
            formatter: (val) => RenderBadges(val, "bg-teal-50 text-teal-800 border-teal-200"),
          },
        },
      },
      edit: {
        fields: {
          dailyApplicationLimit: {
            helperText:
              "چند پروژه در روز، متخصصِ این پلن می‌تواند درخواست بدهد. این تنها مزیتی است که مستقیم به درآمد متخصص وصل است. صفر یعنی نامحدود.",
          },
        },
      },
    },
    DiscountCode: {
      title: "کدهای تخفیف (Discount Codes)",
      icon: "TagIcon",
      aliases: {
        id: "شناسه",
        code: "کد تخفیف",
        discountPercent: "درصد تخفیف",
        maxAmount: "سقف تخفیف (تومان)",
        targetPlan: "پلن هدف",
        targetPhone: "شماره تلفن مجاز",
        usedCount: "دفعات استفاده‌شده",
        maxUsage: "حداکثر ظرفیت استفاده",
        isActive: "فعال بودن",
        expiresAt: "تاریخ انقضا",
      },
      list: {
        display: ["code", "discountPercent", "usedCount", "maxUsage", "isActive", "expiresAt"],
        search: ["code", "targetPhone"],
      },
    },
    Course: {
      title: "دوره‌های جارآموز (Courses)",
      icon: "AcademicCapIcon",
      aliases: {
        id: "شناسه",
        title: "عنوان دوره",
        slug: "اسلاگ",
        price: "قیمت (تومان)",
        spotplayerCourseId: "شناسه دوره در SpotPlayer",
        createdAt: "تاریخ ایجاد",
      },
      list: {
        display: ["title", "price", "spotplayerCourseId", "createdAt"],
        search: ["title", "slug"],
        fields: {
          price: {
            formatter: (price) => `${Number(price || 0).toLocaleString("fa-IR")} تومان`,
          },
        },
      },
    },
    Purchase: {
      title: "خریدهای جارآموز (Course Purchases)",
      icon: "ShoppingBagIcon",
      aliases: {
        id: "شناسه",
        user: "خریدار",
        course: "دوره",
        status: "وضعیت پرداخت",
        amount: "مبلغ (تومان)",
        authority: "Authority درگاه",
        refId: "شماره مرجع بانکی",
        licenseKey: "کلید لایسنس اسپات‌پلیر",
        createdAt: "تاریخ خرید",
      },
      list: {
        display: ["user", "course", "status", "amount", "licenseKey", "createdAt"],
        search: ["authority", "refId", "licenseKey"],
        fields: {
          amount: {
            formatter: (amount) => `${Number(amount || 0).toLocaleString("fa-IR")} تومان`,
          },
        },
      },
    },
    GalleryProject: {
      title: "پروژه‌های گالری تحویل فایل (Gallery Projects)",
      icon: "FolderIcon",
      aliases: {
        id: "شناسه",
        user: "عکاس مالک گالری",
        title: "عنوان پروژه",
        slug: "اسلاگ اختصاصی",
        accessCode: "کد دسترسی مشتری",
        price: "قیمت هر شات عکس (تومان)",
        createdAt: "تاریخ ایجاد",
      },
      list: {
        display: ["user", "title", "slug", "accessCode", "price", "createdAt"],
        search: ["title", "slug", "accessCode"],
      },
    },
    GalleryPhoto: {
      title: "تصاویر گالری (Gallery Photos)",
      icon: "CameraIcon",
      aliases: {
        id: "شناسه",
        project: "پروژه گالری",
        fileName: "نام فایل",
        fileSize: "حجم فایل (بایت)",
        originalUrl: "آدرس فایل باکیفیت",
        watermarkedUrl: "پیش‌نمایش واترمارک",
        createdAt: "تاریخ بارگذاری",
      },
      list: {
        display: ["project", "fileName", "fileSize", "createdAt"],
        search: ["fileName"],
      },
    },
    GalleryOrder: {
      title: "سفارش‌های خرید عکس گالری (Gallery Orders)",
      icon: "ReceiptPercentIcon",
      aliases: {
        id: "شناسه",
        phone: "شماره موبایل خریدار",
        project: "پروژه گالری",
        amount: "مبلغ سفارش (تومان)",
        status: "وضعیت پرداخت",
        authority: "Authority",
        refId: "RefID",
        createdAt: "تاریخ",
      },
      list: {
        display: ["phone", "project", "amount", "status", "refId", "createdAt"],
        search: ["phone", "authority", "refId"],
        fields: {
          amount: {
            formatter: (amount) => `${Number(amount || 0).toLocaleString("fa-IR")} تومان`,
          },
        },
      },
    },
    GalleryPurchase: {
      title: "خریدهای نهایی‌شده گالری (Gallery Purchases)",
      icon: "CheckBadgeIcon",
      aliases: {
        id: "شناسه",
        project: "پروژه",
        clientPhone: "تلفن خریدار",
        purchasedPhotoIds: "شناسه عکس‌های خریداری‌شده",
        createdAt: "تاریخ",
      },
      list: {
        display: ["project", "clientPhone", "purchasedPhotoIds", "createdAt"],
        search: ["clientPhone"],
        fields: {
          purchasedPhotoIds: {
            formatter: (val) => RenderBadges(val, "bg-sky-50 text-sky-800 border-sky-200"),
          },
        },
      },
    },
    Notification: {
      title: "اعلان‌های کاربران (Notifications)",
      icon: "BellIcon",
      aliases: {
        id: "شناسه",
        user: "کاربر دریافت‌کننده",
        title: "عنوان پیام",
        message: "متن پیام",
        type: "نوع اعلان",
        channel: "کانال ارسال (درون‌برنامه‌ای/پیامک)",
        isRead: "خوانده‌شده",
        createdAt: "تاریخ ارسال",
      },
      list: {
        display: ["user", "title", "type", "channel", "isRead", "createdAt"],
        search: ["title", "message"],
      },
    },
    NotificationTemplate: {
      title: "قالب‌های پیام سیستم (Jarchi Templates)",
      icon: "EnvelopeIcon",
      aliases: {
        id: "شناسه",
        slug: "اسلاگ یکتا",
        title: "عنوان قالب",
        content: "متن قالب اعلان",
        updatedAt: "آخرین بروزرسانی",
      },
      list: {
        display: ["slug", "title", "updatedAt"],
        search: ["slug", "title", "content"],
      },
    },
    PwaSettings: {
      title: "تنظیمات پلتفرم و مارکت‌پلیس",
      icon: "Cog6ToothIcon",
      aliases: {
        id: "شناسه",
        shortName: "نام کوتاه اپلیکیشن",
        fullName: "نام کامل اپلیکیشن",
        description: "توضیحات",
        themeColor: "رنگ تم",
        galleryCommission: "درصد کارمزد فروش عکس گالری",
        specialistCommission: "درصد کمیسیون جار از دستمزد متخصص",
        travelFreeRadiusKm: "شعاع رایگان ایاب‌وذهاب (کیلومتر)",
        travelRatePerKm: "نرخ ایاب‌وذهاب به ازای هر کیلومتر (تومان)",
        freeDailyApplicationLimit: "سقف درخواست روزانه — پلن رایگان",
        noApplicantTimeoutHours: "مهلت بی‌درخواست ماندن سفارش (ساعت)",
        selectionReminderHours: "یادآوری به کارفرما پس از (ساعت)",
        selectionTimeoutDays: "بستن سفارش بی‌پاسخ پس از (روز)",
        showIosPrompt: "نمایش پرامپت نصب در iOS",
      },
      list: {
        display: [
          "shortName",
          "specialistCommission",
          "travelRatePerKm",
          "travelFreeRadiusKm",
          "freeDailyApplicationLimit",
          "selectionTimeoutDays",
        ],
      },
      edit: {
        fields: {
          specialistCommission: {
            helperText:
              "درصدی که جار از دستمزد متخصص برمی‌دارد. از هزینه ایاب‌وذهاب کمیسیون گرفته نمی‌شود. صفر یعنی بدون کمیسیون.",
          },
          travelRatePerKm: {
            helperText:
              "هزینه هر کیلومتر فراتر از شعاع رایگان. رفت‌وبرگشت حساب می‌شود. صفر یعنی ایاب‌وذهاب رایگان است.",
          },
          travelFreeRadiusKm: {
            helperText: "تا این فاصله هیچ هزینه ایاب‌وذهابی از مشتری گرفته نمی‌شود.",
          },
          freeDailyApplicationLimit: {
            helperText:
              "متخصص بدون پلن فعال، روزانه چند پروژه می‌تواند درخواست بدهد. سقف پلن‌های پولی در بخش «پلن‌ها» تنظیم می‌شود. صفر یعنی نامحدود.",
          },
          noApplicantTimeoutHours: {
            helperText: "پس از این مدت، سفارشی که هیچ متخصصی درخواست نداده به تیم جار گزارش می‌شود.",
          },
          selectionTimeoutDays: {
            helperText:
              "اگر کارفرما در این مدت هیچ متخصصی را انتخاب نکند، سفارش بسته و متخصص‌ها آزاد می‌شوند.",
          },
        },
      },
    },
    Project: {
      title: "لیدهای مشاوره فرم قدیمی (Leads)",
      icon: "DocumentTextIcon",
      aliases: {
        id: "شناسه لید",
        serviceType: "نوع خدمت",
        city: "شهر",
        contactName: "نام متقاضی",
        contactPhone: "شماره تماس",
        budget: "بازه بودجه",
        status: "وضعیت لید",
        serviceDetails: "جزئیات فنی فرم",
        adminNotes: "یادداشت ادمین",
        createdAt: "تاریخ ثبت",
      },
      list: {
        display: ["serviceType", "city", "contactName", "contactPhone", "budget", "serviceDetails", "status", "createdAt"],
        search: ["contactName", "contactPhone", "city"],
        fields: {
          contactName: {
            formatter: (name) => (name && String(name).trim()) ? String(name).trim() : "— (بدون نام)",
          },
          city: {
            formatter: (c) => c ? String(c) : "—",
          },
          budget: {
            formatter: (b) => b ? String(b) : "—",
          },
          serviceDetails: {
            formatter: (val) => RenderBadges(val, "bg-slate-100 text-slate-800 border-slate-300"),
          },
        },
      },
      edit: {
        fields: {
          serviceDetails: { format: "json" },
        },
      },
    },
    Expert: {
      title: "عکاسان ویژه آزمایشی (Experts)",
      icon: "UserGroupIcon",
      aliases: {
        id: "شناسه",
        name: "نام عکاس",
        imageUrl: "آدرس تصویر",
        description: "بیوگرافی",
        isActive: "وضعیت نمایش",
        createdAt: "تاریخ ثبت",
      },
      list: {
        display: ["name", "isActive", "createdAt"],
        search: ["name"],
      },
    },
    AuditLog: {
      title: "لاگ‌های حسابرسی و تغییرات (Audit Logs)",
      icon: "ClipboardDocumentListIcon",
      permissions: [],
      aliases: {
        id: "شناسه لاگ",
        actorId: "شناسه اقدام‌کننده",
        action: "نوع عملیات",
        targetModel: "مدل هدف",
        targetId: "شناسه رکورد",
        note: "توضیحات و یادداشت",
        createdAt: "زمان ثبت",
      },
      list: {
        display: ["action", "targetModel", "targetId", "actorId", "note", "createdAt"],
        search: ["action", "targetModel", "targetId", "actorId", "note"],
        fields: {
          action: {
            formatter: (action) => (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-900 text-white shadow-xs">
                {String(action)}
              </span>
            ),
          },
          note: {
            formatter: (note) => (
              <span className="text-xs text-slate-700 font-medium max-w-md line-clamp-2" title={String(note || "")}>
                {String(note || "—")}
              </span>
            ),
          },
        },
      },
      edit: {
        display: ["action", "targetModel", "targetId", "actorId", "note", "createdAt"],
      },
    },
  },
};
