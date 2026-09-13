# مستندات جامع پنل مدیریت جار (Admin)

راهنمای معماری، صفحات عملیاتی، RBAC و توسعهٔ پنل ادمین پلتفرم **جار**. شِل اصلی روی `@premieroctet/next-admin` (Next.js App Router + Prisma) است؛ صفحه‌های عملیاتی سفارشی با نوار `AdminOpsBar` به هم وصل شده‌اند.

---

## ۱. نقشهٔ صفحات و مسیرها

| مسیر | نقش | مجوز |
| --- | --- | --- |
| `/admin` | کار امروز — صف‌های فوری + Audit اخیر | `dashboard` |
| `/admin/review` | صف بررسی متخصص / نمونه‌کار / KYC | `specialists_review` |
| `/admin/message` | ارسال پیام دستی (جارچی) | `messages_send` |
| `/admin/stats` | آمار و نمودار ۳۰روزه | `stats_view` |
| `/admin/staff` | مدیریت ادمین‌های چندنقشه | `admins_manage` |
| `/admin/Order` … | CRUD NextAdmin سفارش و مدل‌ها | بر اساس مدل |
| `/admin/AuditLog` | لاگ حسابرسی (فقط خواندنی) | `dashboard` / سوپر |

نوار ثابت عملیات (`components/admin/AdminOpsBar.tsx`) در `app/admin/layout.tsx` برای همهٔ این مسیرها نمایش داده می‌شود.

---

## ۲. کار امروز (`AdminDashboard`)

صفحهٔ اصلی دیگر KPI پراکنده نیست؛ صف‌محور است:

1. **میز تایید سفارش** — `PENDING_REVIEW` / `NEEDS_CLIENT_EDIT` با Approve / درخواست ویرایش / لغو
2. **صف تسویه** — تایید با کد رهگیری / رد با بازگشت کیف پول
3. **تطبیق گیرکرده** — بدون متقاضی یا قدیمی‌تر از ۴۸ ساعت؛ باز کردن سفارش، انتخاب متقاضی، لغو
4. **پرداخت گیرکرده** — `AWAITING_PAYMENT` با اکشن باز کردن / لغو
5. **آخرین Audit** — ۱۲ اقدام اخیر + لینک به آرشیو کامل

داده‌ها در `app/admin/[[...nextadmin]]/page.tsx` لود و به `AdminDashboard` پاس می‌شوند.

---

## ۳. ساختار فایل‌های کلیدی

```text
app/admin/
  layout.tsx                 # resolveAdminAccess + OpsBar
  [[...nextadmin]]/page.tsx  # NextAdmin + داشبورد کار امروز
  review|stats|message|staff # صفحات سفارشی
components/admin/
  AdminOpsBar.tsx
  AdminDashboard.tsx
  AdminOrderTriageQueue.tsx
  AdminFollowUpQueue.tsx     # matching + payment
  AdminWithdrawalQueue.tsx
  AdminAuditStrip.tsx
  AdminConfirmDialog.tsx     # جایگزین window.confirm
  SpecialistReviewBoard.tsx
  …
lib/auth/
  admin.ts / adminAccess.ts / adminPermissions.ts
lib/admin/
  options.tsx / formatters.tsx / translations.ts
app/actions/
  adminActionHandlers.ts / adminStaffActions.ts / adminMessageActions.ts
```

---

## ۴. RBAC و امنیت

1. **سوپرادمین**: `ADMIN_MOBILE` — همه مجوزها؛ در `admin_staff` قفل نمی‌شود.
2. **کارکنان**: جدول `AdminStaff` + `/admin/staff` با نقش‌های OPS / FINANCE / SUPPORT / CUSTOM.
3. **مجوزها** (allowlist سرور):  
   `dashboard` · `orders_manage` · `specialists_review` · `finance_manage` ·  
   `messages_send` · `stats_view` · `settings_manage` · `admins_manage`
4. **لایه‌ها**: Middleware (JWT) → Layout (`resolveAdminAccess`) → API/Action (`requireAdminPermission`).
5. اکشن‌های حساس در `AuditLog` ثبت می‌شوند.

---

## ۵. مدل‌های NextAdmin (خلاصه)

گروه‌های سایدبار: عملیات / مالی / کاربران / آکادمی / سیستم / **آرشیو** (گالری و لید قدیمی).  
مدل‌های اصلی: Order, ProjectInterest, User, SpecialistProfile, PortfolioItem, Transaction, WithdrawalRequest, Plan, DiscountCode, Course, Purchase, Notification*, PwaSettings, AuditLog (read-only).

---

## ۶. اکشن‌های کسب‌وکار مهم

| اکشن | نتیجه |
| --- | --- |
| Approve سفارش | → `MATCHING` |
| درخواست ویرایش | → `NEEDS_CLIENT_EDIT` + نوتیف |
| لغو ادمین | → `CANCELLED` + یادداشت |
| انتخاب متقاضی | → `AWAITING_PAYMENT` |
| تایید/رد نمونه‌کار و متخصص | نوتیف + Audit |
| KYC دستی | VERIFIED / FAILED |
| تسویه | APPROVED (+tracking) / REJECTED (+refund) |

دیالوگ‌های مخرب از `AdminConfirmDialog` یا فرم یادداشت استفاده می‌کنند؛ `window.confirm` در مسیرهای عملیاتی اصلی حذف شده است.

---

## ۷. وضعیت فازهای محصول (بسته)

| فاز | وضعیت |
| --- | --- |
| هفته ۱ — OpsBar، KPI صف، آرشیو سایدبار | ✅ |
| هفته ۲–۳ — triage / متقاضیان / تسویه | ✅ |
| آمار + جارچی | ✅ |
| چند ادمین RBAC | ✅ |
| Audit روی کار امروز | ✅ |
| میز matching و پرداخت گیرکرده | ✅ |
| جایگزینی confirm خام | ✅ |

باقی‌ماندهٔ آگاهانه: دو شِل NextAdmin + صفحات سفارشی (با OpsBar پل شده)؛ یکپارچه‌سازی کامل در یک فریم اختیاری است نه بلاکر عملیات.

---

## ۸. توسعه

1. مدل جدید → Prisma migrate → `lib/admin/options.tsx` + نگاشت مجوز در `adminPermissions.ts`
2. اکشن با ورودی → دیالوگ در `components/admin` + Server Action + `AuditLog`
3. صف جدید روی کار امروز → کوئری در `[[...nextadmin]]/page.tsx` + بخش در `AdminDashboard`

---

**تیم جار · به‌روزرسانی: سپتامبر ۲۰۲۶**
