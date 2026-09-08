# جار (Jar)

پلتفرم رزرو خدمات بصری — Next.js 14، Prisma، SQLite، OTP با IPPanel.

## دیپلوی روی Liara

### ۱. دیتابیس SQLite (بدون سرویس جدا)

فایل دیتابیس روی **دیسک پایدار `data`** ذخیره می‌شود:

```
/app/data/jar.db
```

در [`liara.json`](liara.json) دو دیسک تعریف شده: `data` به `/app/data` (دیتابیس) و `uploads` به
`/app/public/uploads` (عکس‌ها). هر دو با restart حفظ می‌شوند.

> ⚠️ **دیتابیس هرگز نباید زیر `public/` برود.** هر فایلی در `public/` بدون احراز هویت سرو می‌شود؛
> تا پیش از این، `public/uploads/jar.db` برای همه قابل دانلود بود. `next.config.mjs` حالا هر
> درخواستِ `*.db` را با ۴۰۴ پاسخ می‌دهد، ولی سد اصلی همان نگه‌داشتن فایل بیرون از `public/` است.

### ۲. متغیرهای محیطی (الزامی)

| متغیر | توضیح |
|--------|--------|
| `DATABASE_URL` | `file:../data/jar.db` |
| `AUTH_SECRET` | رشته تصادفی ۳۲+ کاراکتر |
| `ADMIN_MOBILE` | شماره ادمین (فقط سرور) |
| `IPPANEL_API_KEY` | کلید IPPanel |
| `IPPANEL_SENDER_NUMBER` | شماره فرستنده |
| `IPPANEL_PATTERN_OTP` | پترن OTP |
| `NEXT_PUBLIC_SITE_URL` | مثلاً `https://jarorg.ir` |

اختیاری: `IPPANEL_PATTERN_CUSTOMER`, `ADMIN_NOTIF_PATTERN_CODE`, `UPLOAD_ROOT`

### ۳. دیسک پایدار

در Liara یک دیسک بسازید و به مسیر `public/uploads` متصل کنید (در `liara.json` تعریف شده).

### ۴. استقرار

```bash
npm i -g @liara/cli
liara login
liara deploy
```

اسکریپت‌ها:

- `npm run build` → `prisma generate && next build`
- `npm start` → `next start`
- `npm run db:migrate:deploy` → `prisma migrate deploy`

### ۵. جداول دیتابیس (اولین بار روی سرور)

از shell اپ در Liara:

```bash
npx prisma migrate deploy
```

## توسعه محلی

```bash
cp .env.example .env
mkdir -p public/uploads/experts
npm install
npx prisma migrate dev
npm run dev
```

## ساختار مهم

- `app/create-project` — فرم ثبت لید
- `app/admin` — پنل لید و متخصصان
- `lib/auth` — OTP و سشن
- `liara.json` — تنظیمات Liara + mount دیسک
- `prisma/migrations` — تاریخچه migrationهای SQLite
