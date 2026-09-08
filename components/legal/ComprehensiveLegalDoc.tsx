import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface ComprehensiveLegalDocProps {
  initialFocus?: "privacy" | "terms";
}

export function ComprehensiveLegalDoc({ initialFocus = "privacy" }: ComprehensiveLegalDocProps) {
  return (
    <div className="w-full min-h-screen bg-[#FAF9F5] py-8 sm:py-14" dir="rtl">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        
        {/* Navigation Bar / Return */}
        <div className="mb-6 flex items-center justify-between text-xs sm:text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-medium text-[#66605B] hover:text-[#141413] transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            <span>بازگشت به صفحه اصلی</span>
          </Link>

          <div className="flex items-center gap-4 text-[#66605B] font-medium text-xs">
            <span>تاریخ آخرین بازنگری: شهریور ۱۴۰۵</span>
          </div>
        </div>

        {/* Clean Standard Document Paper */}
        <article className="rounded-2xl sm:rounded-3xl border border-[#E5E0D8] bg-white p-6 sm:p-12 shadow-xs text-[#141413]">
          
          {/* Header */}
          <header className="border-b border-[#E5E0D8] pb-8 mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#141413] leading-tight mb-4 text-balance">
              سند جامع شرایط، قوانین استفاده و حریم خصوصی پلتفرم «جار»
            </h1>

            <div className="rounded-xl border border-[#E5E0D8] bg-[#FAF9F5] p-4 sm:p-5 text-xs sm:text-sm text-[#66605B] leading-relaxed">
              این سند یک قرارداد حقوقی و الزام‌آور بین کاربر (اعم از کارفرما/مشتری و متخصص عکاسی و فیلم‌برداری) و پلتفرم هوشمند خدمات بصری «جار» است. استفاده از سامانه، ثبت سفارش، اعلام آمادگی برای پروژه‌ها و یا تکمیل فرآیند عضویت به منزله مطالعه دقیق، آگاهی کامل و قبولی بدون قید و شرط تمامی مفاد این سند، طبق مواد ۱۰، ۲۱۹ و ۱۲۵۷ قانون مدنی و قانون تجارت الکترونیکی جمهوری اسلامی ایران مصوب ۱۳۸۲ است.
            </div>

            {/* Quick Table of Contents */}
            <nav aria-label="فهرست بخش‌های سند" className="mt-6 pt-6 border-t border-[#E5E0D8]">
              <span className="block text-xs font-medium text-[#66605B] mb-3">فهرست بخش‌های سند:</span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm font-bold text-[#141413]">
                <li>
                  <a href="#privacy" className="hover:underline">
                    بخش اول: سیاست حفظ حریم خصوصی و محرمانگی (NDA)
                  </a>
                </li>
                <li>
                  <a href="#definitions" className="hover:underline">
                    بخش دوم: تعاریف و اصطلاحات
                  </a>
                </li>
                <li>
                  <a href="#membership" className="hover:underline">
                    بخش سوم: قوانین عضویت، اهلیت و حساب کاربری
                  </a>
                </li>
                <li>
                  <a href="#order-flow" className="hover:underline">
                    بخش چهارم: فرآیند ثبت سفارش و تایید دوطرفه
                  </a>
                </li>
                <li>
                  <a href="#financial" className="hover:underline">
                    بخش پنجم: نظام مالی، بیعانه و شرایط انصراف
                  </a>
                </li>
                <li>
                  <a href="#safety" className="hover:underline">
                    بخش ششم: الزامات رفتاری، ایمنی و تجهیزات
                  </a>
                </li>
                <li>
                  <a href="#dispute" className="hover:underline">
                    بخش هفتم: حل اختلاف و داوری
                  </a>
                </li>
                <li>
                  <a href="#electronic-signature" className="hover:underline">
                    بخش هشتم: اعتبار امضای الکترونیک
                  </a>
                </li>
              </ul>
            </nav>
          </header>

          {/* Document Content */}
          <div className="space-y-10 text-xs sm:text-sm leading-relaxed text-slate-700">

            {/* SECTION 1 */}
            <section id="privacy" className="scroll-mt-24 space-y-4">
              <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-950 border-b border-slate-100 pb-2">
                بخش اول: سیاست حفظ حریم خصوصی و محرمانگی اطلاعات (Privacy Policy & NDA)
              </h2>
              <p className="text-slate-800 font-medium">
                رعایت حریم شخصی، امنیت تصاویر و حفظ اسرار کاربران، خط قرمز بنیادین پلتفرم «جار» است. مفاد این بخش نحوه ذخیره‌سازی، پردازش و حفاظت از داده‌ها را تشریح می‌کند:
              </p>

              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  ۱. داده‌های جمع‌آوری‌شده
                </h3>
                <ul className="list-disc list-inside space-y-2 pr-2 text-slate-700">
                  <li>
                    <strong className="text-slate-900">اطلاعات هویتی و ارتباطی:</strong> شامل نام، نام خانوادگی، شماره تلفن همراه معتبر (تأییدشده از طریق رمز یکبارمصرف پیامکی)، آدرس پست الکترونیکی، و در مراحل تسویه متخصصان، کد ملی و شماره شبای منطبق با نام کاربر.
                  </li>
                  <li>
                    <strong className="text-slate-900">داده‌های مکانی و پروژه:</strong> موقعیت مکانی اعلام‌شده برای عکاسی/فیلم‌برداری، محدوده فعالیت متخصص، و آدرس‌های ثبت‌شده در پیش‌فاکتور سفارش.
                  </li>
                  <li>
                    <strong className="text-slate-900">اسناد تصویری و نیازمندی‌ها (Moodboard):</strong> تصاویر رفرنس، لینک‌های نمونه، توضیحات پروژه و سناریوهای بارگذاری‌شده توسط مشتری جهت تفهیم سبک بصری.
                  </li>
                  <li>
                    <strong className="text-slate-900">اطلاعات فنی و نشست‌ها:</strong> آدرس IP، شناسه یکتای دستگاه، نسخه مرورگر، لاگ‌های زمان ورود و تایید سفارش جهت استناد در ثبت الکترونیکی قراردادها.
                  </li>
                </ul>
              </div>

              <div className="space-y-3 pt-4">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  ۲. حفاظت اختصاصی از تصاویر و محرمانگی پروژه‌ها (Digital NDA)
                </h3>
                <ul className="list-disc list-inside space-y-2 pr-2 text-slate-700">
                  <li>
                    <strong className="text-slate-900">اصل عدم دسترسی عمومی:</strong> کلیه عکس‌ها و فیلم‌های ثبت‌شده در پروژه‌های جار (به‌ویژه شاخه‌های خصوصی نظیر عقد، بله‌برون، عروسی، بارداری، نوزاد، کودک، خانوادگی و پرتره) در زمره اسناد کاملاً محرمانه تلقی می‌شوند.
                  </li>
                  <li>
                    <strong className="text-slate-900">ممنوعیت مطلق انتشار بدون رضایت کتبی/دیجیتال:</strong> نه سامانه جار و نه هیچ‌یک از متخصصین عکاس/فیلمبردار تحت هیچ شرایطی مجاز به انتشار، اشتراک‌گذاری، نمایش به غیر یا استفاده تبلیغاتی از تصاویر پروژه‌ها نیستند.
                  </li>
                  <li>
                    <strong className="text-slate-900">مکانیزم رسمی نمونه‌کارسازی (Portfolio Consent):</strong> متخصص صرفاً می‌تواند پس از اتمام کار، از طریق قابلیت رسمی درون سامانه برای حداکثر تعداد معینی فریم عکس مشخص از کارفرما درخواست اجازه انتشار نماید. تنها در صورت تأیید دیجیتال و صریح کارفرما در پنل کاربری، متخصص منحصراً مجاز به نمایش همان فریم‌های تاییدشده در پورتفولیوی اختصاصی خود در جار خواهد بود.
                  </li>
                  <li>
                    <strong className="text-slate-900">ذخیره‌سازی و رمزنگاری:</strong> انتقال فایل‌ها از طریق پروتکل‌های امن و آلبوم خصوصی آنلاین با لینک دسترسی رمزگذاری‌شده انجام می‌پذیرد و دسترسی صرفاً از طریق احراز شماره موبایل مالک سفارش امکان‌پذیر است.
                  </li>
                </ul>
              </div>

              <div className="space-y-3 pt-4">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  ۳. اصل حفاظت از شماره تماس و آدرس پیش از قطعیت پروژه
                </h3>
                <p className="text-slate-700">به منظور مهار ریسک‌های امنیتی و حفظ سلامت مارکت‌پلیس:</p>
                <ul className="list-disc list-inside space-y-2 pr-2 text-slate-700">
                  <li>
                    شماره تماس مستقیم و آدرس دقیق پلاک/واحد کارفرما تا پیش از پرداخت بیعانه و تأیید قطعی پروژه (CONFIRMED) توسط متخصص، از دید متخصصان متقاضی پنهان (Mask) می‌ماند.
                  </li>
                  <li>
                    متقابلاً شماره تماس مستقیم متخصص نیز پس از تایید نهایی همکاری در اختیار کارفرما قرار خواهد گرفت.
                  </li>
                </ul>
              </div>
            </section>

            {/* SECTION 2 */}
            <section id="definitions" className="scroll-mt-24 space-y-4 pt-6 border-t border-slate-200">
              <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-950 border-b border-slate-100 pb-2">
                بخش دوم: تعاریف و اصطلاحات
              </h2>
              <ul className="list-disc list-inside space-y-3 pr-2 text-slate-700">
                <li>
                  <strong className="text-slate-900">سامانه / جار:</strong> پلتفرم نرم‌افزاری و بازارگاه برخط (Marketplace) خدمات عکاسی و فیلم‌برداری تحت دامنه و نشان تجاری «جار».
                </li>
                <li>
                  <strong className="text-slate-900">مشتری / کارفرما:</strong> هر شخص حقیقی یا حقوقی که جهت ثبت تقاضای تصویربرداری، دریافت قیمت و رزرو عکاس/فیلمبردار در سامانه اقدام به ثبت سفارش می‌کند.
                </li>
                <li>
                  <strong className="text-slate-900">متخصص:</strong> اشخاص حقیقی صاحب صلاحیت، تجربه و تجهیزات تخصصی عکاسی و فیلم‌برداری که پس از احراز شماره تماس، بارگذاری نمونه‌کارهای استاندارد (حداقل ۱۰ نمونه در هر شاخه انتخابی) و پذیرش تعهدنامه‌ها، در سامانه فعال شده‌اند.
                </li>
                <li>
                  <strong className="text-slate-900">سفارش (Order):</strong> درخواست خدمت ثبت‌شده توسط مشتری شامل شاخه عکاسی، مدت‌زمان، زمان‌بندی، بازه نرخ ساعتی، موقعیت مکانی و پیوست‌های سناریو.
                </li>
                <li>
                  <strong className="text-slate-900">تأیید دوطرفه (Two-Way Confirmation):</strong> مکانیسم اختصاصی جار که طی آن تعهد قطعی اجرای پروژه تنها پس از «انتخاب متخصص توسط کارفرما» و سپس «تأیید پذیرش توسط متخصص منتخب» ایجاد می‌شود.
                </li>
              </ul>
            </section>

            {/* SECTION 3 */}
            <section id="membership" className="scroll-mt-24 space-y-4 pt-6 border-t border-slate-200">
              <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-950 border-b border-slate-100 pb-2">
                بخش سوم: قوانین عضویت، اهلیت و حساب کاربری
              </h2>
              <ul className="list-disc list-inside space-y-3 pr-2 text-slate-700">
                <li>
                  <strong className="text-slate-900">اهلیت قانونی:</strong> تنها اشخاصی که حداقل ۱۸ سال تمام هجری شمسی داشته و دارای اهلیت مدنی و صلاحیت قانونی باشند مجاز به عضویت و ایجاد حساب کاربری هستند.
                </li>
                <li>
                  <strong className="text-slate-900">صحت اطلاعات:</strong> کاربر متعهد به درج اطلاعات هویتی صحیح و به‌روز است. هرگونه مغایرت شماره همراه با هویت واقعی یا ثبت اطلاعات نامعتبر موجب تعلیق حساب و حق پیگیری قانونی برای جار خواهد بود.
                </li>
                <li>
                  <strong className="text-slate-900">حساب کاربری انفرادی:</strong> هر شخص حقیقی صرفاً مجاز به ایجاد یک حساب کاربری است. واگذاری، فروش یا اجاره حساب کاربری به اشخاص ثالث اکیداً ممنوع بوده و مسئولیت تمامی فعالیت‌های انجام‌شده با هر حساب مستقیماً بر عهده صاحب شماره موبایل احراز شده است.
                </li>
                <li>
                  <strong className="text-slate-900">غربالگری و استانداردهای پورتفولیو:</strong> جار این حق را برای خود محفوظ می‌دارد که نمایش پورتفولیو، وضعیت فعالیت (ACTIVE) و دسترسی متخصصان به فید سفارش‌ها را منوط به رعایت کفایت کیفی (از جمله حداقل ۱۰ نمونه‌کار استاندارد در هر دسته‌بندی فعال) و عدم گزارش تخلف نماید.
                </li>
              </ul>
            </section>

            {/* SECTION 4 */}
            <section id="order-flow" className="scroll-mt-24 space-y-4 pt-6 border-t border-slate-200">
              <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-950 border-b border-slate-100 pb-2">
                بخش چهارم: فرآیند ثبت سفارش، تعهدات و تایید دوطرفه
              </h2>
              
              <div className="space-y-3">
                <p>
                  <strong className="text-slate-900">ماهیت خدمات جار:</strong> جار یک بازارگاه نرم‌افزاری دوسویه مدیریت‌شده (Curated Marketplace) است که زمینه دسترسی کارفرما به شبکه متخصصان مستقل را بر پایه استانداردهای قیمت‌گذاری ساعتی فراهم می‌سازد؛ متخصصان ارائه‌دهنده خدمت، پیمانکاران مستقل هستند و رابطه استخدامی یا کارگری با جار ندارند.
                </p>

                <div className="pt-2">
                  <strong className="text-slate-900 block mb-2">چرخه تأیید سفارش:</strong>
                  <ol className="list-decimal list-inside space-y-1.5 pr-2 text-slate-700">
                    <li>پس از پرداخت ۵۰٪ مبلغ بیعانه، سفارش در تابلوی متناسب با تخصص و محدوده متخصصان منتشر می‌شود.</li>
                    <li>متخصصان با بررسی شرایط، تمایل خود را با ثبت پیشنهاد اعلام می‌کنند.</li>
                    <li>کارفرما از میان متقاضیان، پورتفولیوها را بررسی و یک متخصص را انتخاب می‌نماید (AWAITING_SPECIALIST_CONFIRMATION).</li>
                    <li>متخصص موظف است ظرف بازه زمانی مشخص انتخاب مشتری را تأیید یا در صورت تعارض تقویمی رد نماید.</li>
                    <li>با تأیید متخصص، پروژه قطعی (CONFIRMED) شده و اطلاعات هماهنگی میدانی مبادله می‌گردد.</li>
                  </ol>
                </div>

                <p className="pt-2">
                  <strong className="text-slate-900">ممنوعیت دور زدن پلتفرم (Non-Circumvention):</strong> توافق طرفین برای لغو صوری سفارش در سامانه و اجرای پروژه به صورت مستقیم در خارج از پلتفرم، به منظور تضییع حقوق جار یا فرار از کارمزد، تخلف صریح قراردادی محسوب شده و موجب تعلیق دائمی حساب هر دو طرف، مطالبه وجه‌التزام خسارت و سلب کلیه پوشش‌های امنیتی و بیمه‌ای پروژه خواهد شد.
                </p>
              </div>
            </section>

            {/* SECTION 5 */}
            <section id="financial" className="scroll-mt-24 space-y-4 pt-6 border-t border-slate-200">
              <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-950 border-b border-slate-100 pb-2">
                بخش پنجم: نظام مالی، بیعانه، تسویه و شرایط انصراف
              </h2>

              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  ۱. ساختار پرداخت دو مرحله‌ای (Escrow Model)
                </h3>
                <ul className="list-disc list-inside space-y-2 pr-2 text-slate-700">
                  <li>
                    <strong className="text-slate-900">مرحله اول (بیعانه ۵۰٪):</strong> هنگام ثبت سفارش، ۵۰٪ از مبلغ برآورد پایه (حاصلضرب ساعت در نرخ انتخابی) جهت تثبیت تقاضا و رزرو در درگاه بانکی پرداخت و نزد حساب امانی سامانه نگهداری می‌شود.
                  </li>
                  <li>
                    <strong className="text-slate-900">مرحله دوم (تسویه مابقی + الحاقات):</strong> ۵۰٪ مابقی مبلغ به همراه هزینه‌های توافق‌شده افزوده (نظیر ایاب‌وذهاب خارج از محدوده مصوب، ساعت‌های اضافه صحنه یا لوکیشن‌های اختصاصی) باید پس از اجرای پروژه و پیش از آزادسازی/دانلود فایل‌های ویرایش‌شده نهایی تسویه گردد.
                  </li>
                </ul>
              </div>

              <div className="space-y-3 pt-3">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  ۲. ضوابط لغو و انصراف توسط مشتری (Cancellation Policy)
                </h3>
                <ul className="list-disc list-inside space-y-2 pr-2 text-slate-700">
                  <li>
                    <strong className="text-slate-900">لغو پیش از تعیین متخصص یا بیش از ۲۴ ساعت مانده به اجرا:</strong> در صورتی که سفارش هنوز متخصص قطعی نداشته باشد یا تا بیش از ۲۴ ساعت مانده به زمان اجرای پروژه لغو شود، کل مبلغ پرداختی به اعتبار کیف‌پول کارفرما منظور می‌گردد (در موارد فورس‌ماژور مستند مانند حوادث غیرمترقبه، استرداد نقدی بانکی مقدور است).
                  </li>
                  <li>
                    <strong className="text-slate-900">لغو در کمتر از ۲۴ ساعت مانده به موعد:</strong> با توجه به رزرو اختصاصی وقت و رد سایر پروژه‌ها توسط عکاس، مبلغ بیعانه ۵۰٪ مسترد نخواهد شد و به عنوان خسارت لغو نابهنگام و هزینه رزرو بین عکاس و پلتفرم تسهیم می‌گردد.
                  </li>
                  <li>
                    <strong className="text-slate-900">عدم حضور در صحنه:</strong> در صورت عدم حضور کارفرما در محل و ساعت مقرر بدون هماهنگی قبلی، پس از گذشت ۴۵ دقیقه، سفارش اجراشده تلقی شده و کارفرما ملزم به تسویه کامل خواهد بود.
                  </li>
                </ul>
              </div>

              <div className="space-y-3 pt-3">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  ۳. ضوابط انصراف و بدقولی متخصص
                </h3>
                <p className="text-slate-700">
                  در صورتی که متخصصی پس از تأیید نهایی (CONFIRMED)، بدون عذر موجه قانونی اقدام به انصراف نماید، موظف به پرداخت خسارت لغو به میزان ۲,۰۰۰,۰۰۰ تومان به پلتفرم/مشتری بوده، امتیاز عملکردی وی تنزل یافته و جار متعهد به جایگزینی فوری متخصص هم‌رده بدون دریافت وجه اضافی از مشتری خواهد بود.
                </p>
              </div>

              <div className="space-y-3 pt-3">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  ۴. تسویه حساب با متخصص
                </h3>
                <p className="text-slate-700">
                  وجوه حق‌الزحمه سهم متخصص پس از کسر کارمزد قانونی پلتفرم، حداکثر ظرف مدت ۷ روز کاری پس از تحویل کامل فایل‌ها و اعلام رضایت کارفرما (یا عدم ثبت اعتراض موجه ظرف مهلت مقرر) به شماره شبای ثبت‌شده به نام شخص متخصص واریز می‌گردد.
                </p>
              </div>
            </section>

            {/* SECTION 6 */}
            <section id="safety" className="scroll-mt-24 space-y-4 pt-6 border-t border-slate-200">
              <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-950 border-b border-slate-100 pb-2">
                بخش ششم: الزامات رفتاری، ایمنی و حفاظت از تجهیزات
              </h2>
              <ul className="list-disc list-inside space-y-3 pr-2 text-slate-700">
                <li>
                  <strong className="text-slate-900">رعایت شئونات و قوانین کشور:</strong> طرفین متعهد به رعایت کامل قوانین جاری، هنجارهای اجتماعی و شئونات اخلاقی در طول زمان برگزاری پروژه هستند.
                </li>
                <li>
                  <strong className="text-slate-900">تجهیزات و محیط ایمن:</strong> حمل، محافظت و سلامت تجهیزات تخصصی تصویربرداری بر عهده عکاس است؛ با این حال، هرگونه خسارت عمدی یا ناشی از تقصیر سنگین کارفرما یا حاضرین در محیط ایشان به دوربین، لنز و ادوات نورپردازی، طبق نظر کارشناس رسمی، موجب مسئولیت مدنی و الزام کارفرما به جبران کامل خسارت خواهد بود.
                </li>
                <li>
                  در صورت نامتعارف بودن یا ناامن بودن محیط فیزیکی پروژه به گونه‌ای که سلامت جانی یا تجهیزات را تهدید کند، متخصص مجاز به توقف کار، ترک موقعیت و گزارش فوری به پشتیبانی جار است.
                </li>
              </ul>
            </section>

            {/* SECTION 7 */}
            <section id="dispute" className="scroll-mt-24 space-y-4 pt-6 border-t border-slate-200">
              <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-950 border-b border-slate-100 pb-2">
                بخش هفتم: حل اختلاف و داوری (Dispute Resolution)
              </h2>
              <ul className="list-disc list-inside space-y-3 pr-2 text-slate-700">
                <li>
                  در صورت بروز هرگونه اختلاف نظر در خصوص کیفیت فریم‌های تحویلی، زمان‌بندی حضور یا تطابق خروجی با سبک درخواستی، «واحد کنترل کیفی و داوری جار» به عنوان مرجع حل اختلاف و داور مرضی‌الطرفین تعیین می‌گردد.
                </li>
                <li>
                  مبنای داوری شامل لاگ‌های زمانی سامانه، پیام‌های مبادله‌شده درون پلتفرم، تصاویر بارگذاری‌شده در مودبورد اولیه و نمونه‌کارهای پروفایل متخصص خواهد بود. رأی واحد داوری جار برای طرفین نافذ، نهایی و قطعی است.
                </li>
              </ul>
            </section>

            {/* SECTION 8 */}
            <section id="electronic-signature" className="scroll-mt-24 space-y-4 pt-6 border-t border-slate-200">
              <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-950 border-b border-slate-100 pb-2">
                بخش هشتم: توافق از راه دور و اعتبار امضای الکترونیک
              </h2>
              <p className="font-bold text-slate-900">
                مطابق با مواد ۶، ۱۲ و ۱۴ قانون تجارت الکترونیکی مصوب ۱۳۸۲:
              </p>
              <ul className="list-disc list-inside space-y-3 pr-2 text-slate-700">
                <li>
                  تیک زدن چک‌باکس‌های مربوط به شرایط و تعهدنامه‌ها، کلیک بر روی دکمه‌های «ثبت نهایی»، «اعلام آمادگی» و هرگونه تأیید مرحله‌ای در بستر سامانه، به منزله امضای الکترونیکی مطمئن و انتساب قطعی اراده کاربر به پذیرش اسناد حقوقی حاضر است.
                </li>
                <li>
                  ثبت‌های فنی، فراداده‌ها (Metadata)، لاگ‌های سرور، تاریخ و ساعت ثبت تراکنش‌ها و آی‌پی کاربران به عنوان ادله الکترونیک معتبر و غیرقابل انکار در کلیه مراجع قضایی و شبه‌قضایی مسموع و دارای ارزش اثباتی سند رسمی است.
                </li>
              </ul>
            </section>

          </div>

          {/* Clean Document Footer */}
          <footer className="mt-12 pt-8 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              <p className="font-bold text-slate-700">پلتفرم هوشمند خدمات بصری جار (Jarorg)</p>
              <p className="mt-0.5">پشتیبانی و امور قراردادها: ۰۹۱۰۰۱۳۸۳۸۳</p>
            </div>
            <div className="text-slate-400">
              نسخه معتبر و مصوب سامانه
            </div>
          </footer>

        </article>

      </div>
    </div>
  );
}
