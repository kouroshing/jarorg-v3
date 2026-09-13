export interface CategoryVisualMeta {
  imageUrl: string;
  badge?: string;
  tag: string;
  isFeatured?: boolean;
}

export const CATEGORY_VISUAL_MAP: Record<string, CategoryVisualMeta> = {
  // ==========================================
  // ۱۷ دسته‌بندی شخصی و مراسم (PERSONAL)
  // ==========================================
  "wedding-ceremony": {
    imageUrl: "/images/categories/wedding-ceremony.jpg",
    badge: "پرمخاطب‌ترین",
    tag: "عقد، نامزدی، بله‌برون و فرمالیته عروسی",
    isFeatured: true,
  },
  "birthday-party": {
    imageUrl: "/images/categories/birthday-party.jpg",
    badge: "محبوب جشن‌ها",
    tag: "تم تولد، مهمانی خانوادگی و دورهمی",
  },
  "wedding-contract-video": {
    imageUrl: "/images/categories/wedding-contract-video.jpg",
    tag: "ثبت لحظه امضای سند و خواندن خطبه عقد",
  },
  "wedding-ceremony-video": {
    imageUrl: "/images/categories/wedding-ceremony-video.jpg",
    badge: "کیفیت سینمایی",
    tag: "کلیپ باغ و عمارت، رونین و هلی‌شات",
    isFeatured: true,
  },
  "kids": {
    imageUrl: "/images/categories/kids.jpg",
    tag: "آتلیه تخصصی یا فضای باز با صبر و حوصله",
  },
  "family": {
    imageUrl: "/images/categories/family.jpg",
    badge: "خاطره ماندگار",
    tag: "عکاسی دورهمی خانوادگی در منزل یا طبیعت",
    isFeatured: true,
  },
  "newborn": {
    imageUrl: "/images/categories/newborn.jpg",
    tag: "تجهیزات گرمایشی، پوزیشن‌های ایمن و آرام نوزاد",
  },
  "couple-anniversary": {
    imageUrl: "/images/categories/couple-anniversary.jpg",
    tag: "عکاسی عاشقانه دونفره، سالگرد و لایف‌استایل",
  },
  "pregnancy": {
    imageUrl: "/images/categories/pregnancy.jpg",
    tag: "استایلینگ مادر، نورپردازی ملایم و فرم لباس",
  },
  "portrait-avatar": {
    imageUrl: "/images/categories/portrait-avatar.jpg",
    badge: "انتخاب برتر",
    tag: "پرتره چهره، رزومه کاری و پروفایل اینستاگرام",
    isFeatured: true,
  },
  "gender-reveal": {
    imageUrl: "/images/categories/gender-reveal.jpg",
    tag: "عکاسی از لحظه غافلگیری دودرنگ و بادکنک",
  },
  "birth-hospital": {
    imageUrl: "/images/categories/birth-hospital.jpg",
    tag: "ثبت اولین نگاه و لحظات ورود به بیمارستان",
  },
  "pets": {
    imageUrl: "/images/categories/pets.jpg",
    tag: "عکاسی سرعتی و باکیفیت از سگ و گربه خانگی",
  },
  "graduation": {
    imageUrl: "/images/categories/graduation.jpg",
    tag: "لباس فرم، تندیس، کلاه و فضای دانشگاه",
  },
  "personal-religious": {
    imageUrl: "/images/categories/personal-religious.jpg",
    tag: "مناسک معنوی، سفرهای زیارتی و نذورات",
  },
  "personal-sports": {
    imageUrl: "/images/categories/personal-sports.jpg",
    tag: "پرتره فیتنس، ژست‌های بدنسازی و حرکات ورزشی",
  },
  "personal-other": {
    imageUrl: "/images/categories/personal-other.jpg",
    tag: "پروژه‌های خلاقانه و موضوعات خاص کارفرما",
  },

  // ==========================================
  // ۱۷ دسته‌بندی تجاری و کسب‌وکار (COMMERCIAL)
  // ==========================================
  "commercial-arrangement": {
    imageUrl: "/images/categories/commercial-arrangement.jpg",
    badge: "مخصوص آنلاین‌شاپ",
    tag: "چیدمان اکسسوری، کالای مصرفی و دکوراتیو",
    isFeatured: true,
  },
  "hourly-daily-video": {
    imageUrl: "/images/categories/hourly-daily-video.jpg",
    tag: "آفیش تصویربردار با دوربین حرفه‌ای و استابلایزر",
  },
  "industrial-white-bg": {
    imageUrl: "/images/categories/industrial-white-bg.jpg",
    badge: "استاندارد دیجی‌کالا",
    tag: "زمینه سفید خالص و دوربری دقیق محصولات",
  },
  "commercial-teaser-video": {
    imageUrl: "/images/categories/commercial-teaser-video.jpg",
    badge: "تیزر سازمانی",
    tag: "سناریونویسی، تصویربرداری سینمایی و صداگذاری",
    isFeatured: true,
  },
  "instagram-reels-video": {
    imageUrl: "/images/categories/instagram-reels-video.jpg",
    badge: "ترند اکسپلور",
    tag: "ویدیوهای کوتاه عمودی متناسب با الگوریتم",
    isFeatured: true,
  },
  "jewelry": {
    imageUrl: "/images/categories/jewelry.jpg",
    badge: "ماکروگرافی دقیق",
    tag: "عکاسی با جزئیات بالا از طلا، نقره و سنگ‌های قیمتی",
  },
  "modeling": {
    imageUrl: "/images/categories/modeling.jpg",
    badge: "پرفروش پوشاک",
    tag: "عکاسی فشن، استایلینگ مانتو، لباس و اکسسوری",
    isFeatured: true,
  },
  "corporate-portrait": {
    imageUrl: "/images/categories/corporate-portrait.jpg",
    tag: "برندینگ پرسنلی، پروفایل لینکدین مدیران و پرسنل",
  },
  "events-video": {
    imageUrl: "/images/categories/events-video.jpg",
    tag: "پوشش همایش‌ها، نشست‌های خبری و کنفرانس‌ها",
  },
  "events-photo": {
    imageUrl: "/images/categories/events-photo.jpg",
    tag: "عکاسی خبری و تشریفاتی از سخنرانان و مدعوین",
  },
  "course-recording": {
    imageUrl: "/images/categories/course-recording.jpg",
    tag: "ضبط دوره‌های آموزشی با پرده سبز یا دکور استودیو",
  },
  "food-beverage": {
    imageUrl: "/images/categories/food-beverage.jpg",
    badge: "مخصوص کافه و رستوران",
    tag: "نورپردازی اشتهاآور از غذاها، نوشیدنی‌ها و منو",
    isFeatured: true,
  },
  "architecture-interior": {
    imageUrl: "/images/categories/architecture-interior.jpg",
    tag: "عکاسی واید با اصلاح پرسپکتیو از ویلا و دکوراسیون",
  },
  "production-line": {
    imageUrl: "/images/categories/production-line.jpg",
    tag: "عکاسی کارخانه، دستگاه‌های صنعتی و فرآیند تولید",
  },
  "commercial-religious": {
    imageUrl: "/images/categories/commercial-religious.jpg",
    tag: "پروژه‌های مذهبی سازمانی، موقوفات و اماکن متبرکه",
  },
  "commercial-sports": {
    imageUrl: "/images/categories/commercial-sports.jpg",
    tag: "تبلیغات باشگاه‌ها، مسابقات و تجهیزات ورزشی",
  },
  "commercial-other": {
    imageUrl: "/images/categories/commercial-other.jpg",
    tag: "سایر سفارشات ویژه تجاری و سفارشی",
  },
};
