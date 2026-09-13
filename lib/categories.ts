export type CategoryType = "PERSONAL" | "COMMERCIAL";
export type MediaType = "IMAGE" | "VIDEO" | "ALL";

export interface ServiceCategory {
  slug: string;
  title: string;
  type: CategoryType;
  mediaType: MediaType;
  description?: string;
  iconName?: string;
}

export const PERSONAL_CATEGORIES: ServiceCategory[] = [
  {
    slug: "wedding-ceremony",
    title: "عکاسی عقد - بله برون - فرمالیته عروسی",
    type: "PERSONAL",
    mediaType: "IMAGE",
    iconName: "Heart",
  },
  {
    slug: "birthday-party",
    title: "عکاسی تولد - مهمانی - دورهمی",
    type: "PERSONAL",
    mediaType: "IMAGE",
    iconName: "PartyPopper",
  },
  {
    slug: "wedding-contract-video",
    title: "فیلمبرداری مراسم عقد",
    type: "PERSONAL",
    mediaType: "VIDEO",
    iconName: "ScrollText",
  },
  {
    slug: "wedding-ceremony-video",
    title: "فیلمبرداری مراسم عروسی",
    type: "PERSONAL",
    mediaType: "VIDEO",
    iconName: "Film",
  },
  {
    slug: "kids",
    title: "عکاسی کودک",
    type: "PERSONAL",
    mediaType: "IMAGE",
    iconName: "Smile",
  },
  {
    slug: "family",
    title: "عکاسی خانوادگی",
    type: "PERSONAL",
    mediaType: "IMAGE",
    iconName: "Users",
  },
  {
    slug: "newborn",
    title: "عکاسی نوزاد",
    type: "PERSONAL",
    mediaType: "IMAGE",
    iconName: "Baby",
  },
  {
    slug: "couple-anniversary",
    title: "عکاسی زوج و سالگرد",
    type: "PERSONAL",
    mediaType: "IMAGE",
    iconName: "CalendarHeart",
  },
  {
    slug: "pregnancy",
    title: "عکاسی بارداری",
    type: "PERSONAL",
    mediaType: "IMAGE",
    iconName: "Sprout",
  },
  {
    slug: "portrait-avatar",
    title: "عکاسی چهره - پروفایل",
    type: "PERSONAL",
    mediaType: "IMAGE",
    iconName: "ScanFace",
  },
  {
    slug: "gender-reveal",
    title: "عکاسی جشن تعیین جنسیت",
    type: "PERSONAL",
    mediaType: "IMAGE",
    iconName: "Gift",
  },
  {
    slug: "birth-hospital",
    title: "عکاسی و فیلمبرداری زایمان در بیمارستان",
    type: "PERSONAL",
    mediaType: "ALL",
    iconName: "Stethoscope",
  },
  {
    slug: "pets",
    title: "عکاسی حیوانات خانگی",
    type: "PERSONAL",
    mediaType: "IMAGE",
    iconName: "PawPrint",
  },
  {
    slug: "graduation",
    title: "عکاسی فارغ التحصیلی",
    type: "PERSONAL",
    mediaType: "IMAGE",
    iconName: "GraduationCap",
  },
  {
    slug: "personal-religious",
    title: "عکاسی مذهبی (شخصی)",
    type: "PERSONAL",
    mediaType: "IMAGE",
    iconName: "MoonStar",
  },
  {
    slug: "personal-sports",
    title: "عکاسی ورزشی (شخصی)",
    type: "PERSONAL",
    mediaType: "IMAGE",
    iconName: "Dumbbell",
  },
  {
    slug: "personal-other",
    title: "عکاسی غیره (شخصی)",
    type: "PERSONAL",
    mediaType: "ALL",
    iconName: "Palette",
  },
];

export const COMMERCIAL_CATEGORIES: ServiceCategory[] = [
  {
    slug: "commercial-arrangement",
    title: "عکاسی تبلیغاتی چیدمان",
    type: "COMMERCIAL",
    mediaType: "IMAGE",
    iconName: "LayoutGrid",
  },
  {
    slug: "hourly-daily-video",
    title: "فیلمبرداری ساعتی و روزانه",
    type: "COMMERCIAL",
    mediaType: "VIDEO",
    iconName: "Clock",
  },
  {
    slug: "industrial-white-bg",
    title: "عکاسی صنعتی و زمینه سفید",
    type: "COMMERCIAL",
    mediaType: "IMAGE",
    iconName: "Package",
  },
  {
    slug: "commercial-teaser-video",
    title: "فیلمبرداری کلیپ و تیزر تبلیغاتی حرفه‌ای",
    type: "COMMERCIAL",
    mediaType: "VIDEO",
    iconName: "Clapperboard",
  },
  {
    slug: "instagram-reels-video",
    title: "فیلمبرداری ریلز و تیزر تبلیغاتی اینستاگرام",
    type: "COMMERCIAL",
    mediaType: "VIDEO",
    iconName: "Smartphone",
  },
  {
    slug: "jewelry",
    title: "عکاسی طلا و جواهر",
    type: "COMMERCIAL",
    mediaType: "IMAGE",
    iconName: "Gem",
  },
  {
    slug: "modeling",
    title: "عکاسی مدلینگ",
    type: "COMMERCIAL",
    mediaType: "IMAGE",
    iconName: "Shirt",
  },
  {
    slug: "corporate-portrait",
    title: "عکاسی پرتره سازمانی",
    type: "COMMERCIAL",
    mediaType: "IMAGE",
    iconName: "Briefcase",
  },
  {
    slug: "events-video",
    title: "فیلمبرداری همایش و رویدادها",
    type: "COMMERCIAL",
    mediaType: "VIDEO",
    iconName: "Presentation",
  },
  {
    slug: "events-photo",
    title: "عکاسی همایش و رویداد",
    type: "COMMERCIAL",
    mediaType: "IMAGE",
    iconName: "Mic2",
  },
  {
    slug: "course-recording",
    title: "فیلمبرداری دوره آموزشی",
    type: "COMMERCIAL",
    mediaType: "VIDEO",
    iconName: "MonitorPlay",
  },
  {
    slug: "food-beverage",
    title: "عکاسی تبلیغاتی غذا",
    type: "COMMERCIAL",
    mediaType: "IMAGE",
    iconName: "Utensils",
  },
  {
    slug: "architecture-interior",
    title: "عکاسی معماری و دکوراسیون",
    type: "COMMERCIAL",
    mediaType: "IMAGE",
    iconName: "Building",
  },
  {
    slug: "production-line",
    title: "عکاسی خط تولید",
    type: "COMMERCIAL",
    mediaType: "IMAGE",
    iconName: "Factory",
  },
  {
    slug: "commercial-religious",
    title: "عکاسی مذهبی (تجاری)",
    type: "COMMERCIAL",
    mediaType: "IMAGE",
    iconName: "Landmark",
  },
  {
    slug: "commercial-sports",
    title: "عکاسی ورزشی (تجاری)",
    type: "COMMERCIAL",
    mediaType: "IMAGE",
    iconName: "Trophy",
  },
  {
    slug: "commercial-other",
    title: "عکاسی غیره (تجاری)",
    type: "COMMERCIAL",
    mediaType: "ALL",
    iconName: "Shapes",
  },
];

export const ALL_CATEGORIES: ServiceCategory[] = [
  ...PERSONAL_CATEGORIES,
  ...COMMERCIAL_CATEGORIES,
];

export const CATEGORIES_BY_SLUG: Record<string, ServiceCategory> =
  ALL_CATEGORIES.reduce((acc, cat) => {
    acc[cat.slug] = cat;
    return acc;
  }, {} as Record<string, ServiceCategory>);

export function getCategoryBySlug(slug: string): ServiceCategory | undefined {
  return CATEGORIES_BY_SLUG[slug];
}

export function getCategoryTitle(slug: string): string {
  return CATEGORIES_BY_SLUG[slug]?.title || slug;
}
