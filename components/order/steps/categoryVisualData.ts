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
    imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop",
    badge: "پرمخاطب‌ترین",
    tag: "عقد، نامزدی، بله‌برون و فرمالیته عروسی",
    isFeatured: true,
  },
  "birthday-party": {
    imageUrl: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?q=80&w=600&auto=format&fit=crop",
    badge: "محبوب جشن‌ها",
    tag: "تم تولد، مهمانی خانوادگی و دورهمی",
  },
  "wedding-contract-video": {
    imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=600&auto=format&fit=crop",
    tag: "ثبت لحظه امضای سند و خواندن خطبه عقد",
  },
  "wedding-ceremony-video": {
    imageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=800&auto=format&fit=crop",
    badge: "کیفیت سینمایی",
    tag: "کلیپ باغ و عمارت، رونین و هلی‌شات",
    isFeatured: true,
  },
  "kids": {
    imageUrl: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?q=80&w=600&auto=format&fit=crop",
    tag: "آتلیه تخصصی یا فضای باز با صبر و حوصله",
  },
  "family": {
    imageUrl: "https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?q=80&w=800&auto=format&fit=crop",
    badge: "خاطره ماندگار",
    tag: "عکاسی دورهمی خانوادگی در منزل یا طبیعت",
    isFeatured: true,
  },
  "newborn": {
    imageUrl: "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?q=80&w=600&auto=format&fit=crop",
    tag: "تجهیزات گرمایشی، پوزیشن‌های ایمن و آرام نوزاد",
  },
  "couple-anniversary": {
    imageUrl: "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?q=80&w=600&auto=format&fit=crop",
    tag: "عکاسی عاشقانه دونفره، سالگرد و لایف‌استایل",
  },
  "pregnancy": {
    imageUrl: "https://images.unsplash.com/photo-1544126592-807ade215a0b?q=80&w=600&auto=format&fit=crop",
    tag: "استایلینگ مادر، نورپردازی ملایم و فرم لباس",
  },
  "portrait-avatar": {
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop",
    badge: "انتخاب برتر",
    tag: "پرتره چهره، رزومه کاری و پروفایل اینستاگرام",
    isFeatured: true,
  },
  "gender-reveal": {
    imageUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=600&auto=format&fit=crop",
    tag: "عکاسی از لحظه غافلگیری دودرنگ و بادکنک",
  },
  "birth-hospital": {
    imageUrl: "https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=600&auto=format&fit=crop",
    tag: "ثبت اولین نگاه و لحظات ورود به بیمارستان",
  },
  "pets": {
    imageUrl: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=600&auto=format&fit=crop",
    tag: "عکاسی سرعتی و باکیفیت از سگ و گربه خانگی",
  },
  "graduation": {
    imageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=600&auto=format&fit=crop",
    tag: "لباس فرم، تندیس، کلاه و فضای دانشگاه",
  },
  "personal-religious": {
    imageUrl: "https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=600&auto=format&fit=crop",
    tag: "مناسک معنوی، سفرهای زیارتی و نذورات",
  },
  "personal-sports": {
    imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop",
    tag: "پرتره فیتنس، ژست‌های بدنسازی و حرکات ورزشی",
  },
  "personal-other": {
    imageUrl: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?q=80&w=600&auto=format&fit=crop",
    tag: "پروژه‌های خلاقانه و موضوعات خاص کارفرما",
  },

  // ==========================================
  // ۱۷ دسته‌بندی تجاری و کسب‌وکار (COMMERCIAL)
  // ==========================================
  "commercial-arrangement": {
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop",
    badge: "مخصوص آنلاین‌شاپ",
    tag: "چیدمان اکسسوری، کالای مصرفی و دکوراتیو",
    isFeatured: true,
  },
  "hourly-daily-video": {
    imageUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=600&auto=format&fit=crop",
    tag: "آفیش تصویربردار با دوربین حرفه‌ای و استابلایزر",
  },
  "industrial-white-bg": {
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop",
    badge: "استاندارد دیجی‌کالا",
    tag: "زمینه سفید خالص و دوربری دقیق محصولات",
  },
  "commercial-teaser-video": {
    imageUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=800&auto=format&fit=crop",
    badge: "تیزر سازمانی",
    tag: "سناریونویسی، تصویربرداری سینمایی و صداگذاری",
    isFeatured: true,
  },
  "instagram-reels-video": {
    imageUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop",
    badge: "ترند اکسپلور",
    tag: "ویدیوهای کوتاه عمودی متناسب با الگوریتم",
    isFeatured: true,
  },
  "jewelry": {
    imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=600&auto=format&fit=crop",
    badge: "ماکروگرافی دقیق",
    tag: "عکاسی با جزئیات بالا از طلا، نقره و سنگ‌های قیمتی",
  },
  "modeling": {
    imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=800&auto=format&fit=crop",
    badge: "پرفروش پوشاک",
    tag: "عکاسی فشن، استایلینگ مانتو، لباس و اکسسوری",
    isFeatured: true,
  },
  "corporate-portrait": {
    imageUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=600&auto=format&fit=crop",
    tag: "برندینگ پرسنلی، پروفایل لینکدین مدیران و پرسنل",
  },
  "events-video": {
    imageUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=600&auto=format&fit=crop",
    tag: "پوشش همایش‌ها، نشست‌های خبری و کنفرانس‌ها",
  },
  "events-photo": {
    imageUrl: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?q=80&w=600&auto=format&fit=crop",
    tag: "عکاسی خبری و تشریفاتی از سخنرانان و مدعوین",
  },
  "course-recording": {
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop",
    tag: "ضبط دوره‌های آموزشی با پرده سبز یا دکور استودیو",
  },
  "food-beverage": {
    imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop",
    badge: "مخصوص کافه و رستوران",
    tag: "نورپردازی اشتهاآور از غذاها، نوشیدنی‌ها و منو",
    isFeatured: true,
  },
  "architecture-interior": {
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop",
    tag: "عکاسی واید با اصلاح پرسپکتیو از ویلا و دکوراسیون",
  },
  "production-line": {
    imageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=600&auto=format&fit=crop",
    tag: "عکاسی کارخانه، دستگاه‌های صنعتی و فرآیند تولید",
  },
  "commercial-religious": {
    imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=600&auto=format&fit=crop",
    tag: "پروژه‌های مذهبی سازمانی، موقوفات و اماکن متبرکه",
  },
  "commercial-sports": {
    imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop",
    tag: "تبلیغات باشگاه‌ها، مسابقات و تجهیزات ورزشی",
  },
  "commercial-other": {
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600&auto=format&fit=crop",
    tag: "سایر سفارشات ویژه تجاری و سفارشی",
  },
};
