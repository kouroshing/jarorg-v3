import {
  Camera,
  Video,
  Sparkles,
  Share2,
  Clapperboard,
  Plane,
  type LucideIcon,
} from "lucide-react";

export const SERVICE_IDS = [
  "photography",
  "videography",
  "modeling",
  "social_content",
  "post_production",
  "aerial",
] as const;

export type ServiceId = (typeof SERVICE_IDS)[number];

export type ServiceOption = {
  id: ServiceId;
  label: string;
  description: string;
  icon: LucideIcon;
  serviceType: string;
};

export const PROJECT_SERVICES: ServiceOption[] = [
  {
    id: "photography",
    label: "عکاسی",
    description: "پرتره، محصول، رویداد",
    icon: Camera,
    serviceType: "Photography",
  },
  {
    id: "videography",
    label: "فیلم‌برداری",
    description: "تیزر، مستند، موشن",
    icon: Video,
    serviceType: "Videography",
  },
  {
    id: "modeling",
    label: "مدلینگ",
    description: "کاستینگ و هماهنگی",
    icon: Sparkles,
    serviceType: "Modeling",
  },
  {
    id: "social_content",
    label: "تولید محتوای شبکه‌های اجتماعی",
    description: "ریلز، استوری، کمپین",
    icon: Share2,
    serviceType: "SocialContent",
  },
  {
    id: "post_production",
    label: "تدوین و پست‌پروداکشن",
    description: "تدوین، رنگ، موشن",
    icon: Clapperboard,
    serviceType: "PostProduction",
  },
  {
    id: "aerial",
    label: "هلی‌شات و هوایی",
    description: "نمای هوایی، درون",
    icon: Plane,
    serviceType: "Aerial",
  },
];

export const SERVICE_TYPE_MAP: Record<ServiceId, string> = Object.fromEntries(
  PROJECT_SERVICES.map((s) => [s.id, s.serviceType])
) as Record<ServiceId, string>;

export const SERVICE_TYPE_LABELS_FA: Record<string, string> = {
  Photography: "عکاسی",
  Videography: "فیلم‌برداری",
  Modeling: "مدلینگ",
  SocialContent: "تولید محتوای شبکه‌های اجتماعی",
  PostProduction: "تدوین و پست‌پروداکشن",
  Aerial: "هلی‌شات و هوایی",
  Combo: "ترکیبی",
  Other: "سفارشی",
};

export function getServiceTypeLabel(serviceType: string): string {
  return SERVICE_TYPE_LABELS_FA[serviceType] ?? serviceType;
}

/** Resolve display label from stored serviceDetails JSON when present. */
export function getProjectServiceLabel(
  serviceType: string,
  serviceDetails: string | null | undefined
): string {
  if (serviceDetails) {
    try {
      const parsed = JSON.parse(serviceDetails) as { offeringLabel?: string };
      if (parsed.offeringLabel?.trim()) return parsed.offeringLabel.trim();
    } catch {
      /* ignore */
    }
  }
  return getServiceTypeLabel(serviceType);
}
