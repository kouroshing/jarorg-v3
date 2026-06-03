import {
  Package,
  Film,
  Shirt,
  Building2,
  Users,
  Factory,
  UserRound,
  Heart,
  Cake,
  Baby,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import type { ServiceId } from "@/lib/projects/services";
import {
  PHOTOGRAPHY_CATEGORIES,
  PHOTOGRAPHY_LOCATIONS,
  type PhotographyCategoryId,
  type PhotographyLocationId,
} from "@/lib/projects/photography-form";

const CATEGORY_LABELS = Object.fromEntries(
  PHOTOGRAPHY_CATEGORIES.map((c) => [c.id, c.label])
) as Record<PhotographyCategoryId, string>;

const LOCATION_LABELS = Object.fromEntries(
  PHOTOGRAPHY_LOCATIONS.map((l) => [l.id, l.label])
) as Record<PhotographyLocationId, string>;

export const SERVICE_AUDIENCES = ["commercial", "personal"] as const;
export type ServiceAudience = (typeof SERVICE_AUDIENCES)[number];

export const AUDIENCE_LABELS: Record<ServiceAudience, string> = {
  commercial: "خدمات تجاری (سازمانی)",
  personal: "خدمات شخصی",
};

export type ServiceOffering = {
  id: string;
  audience: ServiceAudience;
  label: string;
  icon: LucideIcon;
  /** Legacy service key for step-2 / photography workflow */
  serviceKey: ServiceId;
  serviceType: string;
};

export const SERVICE_OFFERINGS: ServiceOffering[] = [
  {
    id: "commercial_product",
    audience: "commercial",
    label: "عکاسی محصول و تبلیغاتی",
    icon: Package,
    serviceKey: "photography",
    serviceType: "Photography",
  },
  {
    id: "commercial_reels",
    audience: "commercial",
    label: "ساخت ریلز و تیزر اینستاگرام",
    icon: Film,
    serviceKey: "social_content",
    serviceType: "SocialContent",
  },
  {
    id: "commercial_fashion",
    audience: "commercial",
    label: "عکاسی مدلینگ و پوشاک",
    icon: Shirt,
    serviceKey: "photography",
    serviceType: "Photography",
  },
  {
    id: "commercial_architecture",
    audience: "commercial",
    label: "معماری و دکوراسیون",
    icon: Building2,
    serviceKey: "photography",
    serviceType: "Photography",
  },
  {
    id: "commercial_event",
    audience: "commercial",
    label: "پوشش همایش و رویداد",
    icon: Users,
    serviceKey: "photography",
    serviceType: "Photography",
  },
  {
    id: "commercial_industrial",
    audience: "commercial",
    label: "عکاسی صنعتی",
    icon: Factory,
    serviceKey: "photography",
    serviceType: "Photography",
  },
  {
    id: "personal_portrait",
    audience: "personal",
    label: "عکاسی پرتره و پروفایل",
    icon: UserRound,
    serviceKey: "photography",
    serviceType: "Photography",
  },
  {
    id: "personal_wedding",
    audience: "personal",
    label: "عروسی و فرمالیته",
    icon: Heart,
    serviceKey: "photography",
    serviceType: "Photography",
  },
  {
    id: "personal_party",
    audience: "personal",
    label: "تولد و دورهمی",
    icon: Cake,
    serviceKey: "photography",
    serviceType: "Photography",
  },
  {
    id: "personal_kids",
    audience: "personal",
    label: "کودک و بارداری",
    icon: Baby,
    serviceKey: "photography",
    serviceType: "Photography",
  },
  {
    id: "personal_graduation",
    audience: "personal",
    label: "فارغ‌التحصیلی",
    icon: GraduationCap,
    serviceKey: "photography",
    serviceType: "Photography",
  },
];

export const OFFERING_IDS = SERVICE_OFFERINGS.map((o) => o.id) as [
  string,
  ...string[],
];

export function getOfferingsForAudience(
  audience: ServiceAudience
): ServiceOffering[] {
  return SERVICE_OFFERINGS.filter((o) => o.audience === audience);
}

export function getOfferingById(id: string | null): ServiceOffering | undefined {
  if (!id) return undefined;
  return SERVICE_OFFERINGS.find((o) => o.id === id);
}

export function getStep2TitleForOffering(offering: ServiceOffering | undefined): string {
  if (!offering) return "جزئیات پروژه";
  return `جزئیات: ${offering.label}`;
}

export type OfferingDetailsPayload = {
  audience: ServiceAudience;
  offeringId: string;
  offeringLabel: string;
  serviceKey: ServiceId;
  photography?: {
    categories: string[];
    locationType: string;
  };
};

export function buildOfferingServiceDetailsJson(
  offering: ServiceOffering,
  photography: OfferingDetailsPayload["photography"] | null
): string {
  const payload: OfferingDetailsPayload = {
    audience: offering.audience,
    offeringId: offering.id,
    offeringLabel: offering.label,
    serviceKey: offering.serviceKey,
    ...(photography ? { photography } : {}),
  };
  return JSON.stringify(payload);
}

export function composeBriefWithOffering(
  offering: ServiceOffering,
  notes: string,
  photography?: OfferingDetailsPayload["photography"] | null
): string {
  const sections: string[] = [
    `دسته: ${AUDIENCE_LABELS[offering.audience]}`,
    `خدمت: ${offering.label}`,
  ];

  if (offering.serviceKey === "photography" && photography) {
    const cats = photography.categories
      .map((id) => CATEGORY_LABELS[id as PhotographyCategoryId])
      .filter(Boolean);
    if (cats.length) {
      sections.push(`نوع عکاسی: ${cats.join("، ")}`);
    }
    if (photography.locationType) {
      sections.push(
        `فضای پروژه: ${LOCATION_LABELS[photography.locationType as PhotographyLocationId]}`
      );
    }
  }

  const trimmed = notes.trim();
  if (trimmed) sections.push(trimmed);

  return sections.join("\n\n");
}
