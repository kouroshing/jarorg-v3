export type HomeCategory = {
  id: string;
  title: string;
  href: string;
  /** Tailwind grid placement for bento layout */
  className: string;
  /** Remote image URL (Unsplash). Falls back to gradient when omitted. */
  imageUrl?: string;
  /** Tailwind classes for next/image (e.g. object position on small cards). */
  imageClassName?: string;
  /** Fallback when no imageUrl */
  imageGradient: string;
};

export const HOME_CATEGORIES: HomeCategory[] = [
  {
    id: "portrait",
    title: "عکاسی پرتره",
    href: "/order",
    className: "col-span-2 row-span-2 min-h-[280px] sm:min-h-[320px]",
    imageUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop",
    imageGradient: "from-neutral-200 via-neutral-100 to-neutral-300",
  },
  {
    id: "product-video",
    title: "فیلم‌برداری محصول",
    href: "/order",
    className: "col-span-1 row-span-1 min-h-[140px]",
    imageUrl:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop",
    imageGradient: "from-zinc-200 via-zinc-100 to-zinc-300",
  },
  {
    id: "modeling",
    title: "مدلینگ",
    href: "/order",
    className: "col-span-1 row-span-1 min-h-[140px]",
    imageUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=800&auto=format&fit=crop&crop=faces",
    imageClassName: "object-cover object-[center_20%]",
    imageGradient: "from-stone-200 via-stone-100 to-stone-300",
  },
  {
    id: "commercial-photo",
    title: "عکاسی تجاری",
    href: "/order",
    className: "col-span-2 row-span-1 min-h-[150px] sm:col-span-1 sm:row-span-2 sm:min-h-0",
    imageUrl:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop",
    imageGradient: "from-gray-200 via-gray-100 to-gray-300",
  },
  {
    id: "event",
    title: "رویداد و مراسم",
    href: "/order",
    className: "col-span-2 row-span-1 min-h-[130px] sm:col-span-2 sm:min-h-[140px]",
    imageUrl:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=800&auto=format&fit=crop",
    imageGradient: "from-neutral-300 via-neutral-200 to-neutral-100",
  },
];

export const HOME_CITIES = [
  { id: "tehran", label: "تهران" },
  { id: "karaj", label: "کرج" },
  { id: "other", label: "سایر" },
] as const;
