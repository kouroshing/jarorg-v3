export const PHOTOGRAPHY_CATEGORIES = [
  { id: "portrait", label: "پرتره و شخصی" },
  { id: "product", label: "محصول و تجاری" },
  { id: "fashion", label: "پوشاک و فشن" },
  { id: "event", label: "رویداد و مراسم" },
  { id: "architecture", label: "معماری و دکوراسیون" },
] as const;

export type PhotographyCategoryId =
  (typeof PHOTOGRAPHY_CATEGORIES)[number]["id"];

export const PHOTOGRAPHY_LOCATIONS = [
  { id: "studio", label: "استودیو (آتلیه)", icon: "studio" as const },
  { id: "on_location", label: "فضای باز / محل مشتری", icon: "outdoor" as const },
] as const;

export type PhotographyLocationId =
  (typeof PHOTOGRAPHY_LOCATIONS)[number]["id"];

export type PhotographyDetails = {
  categories: PhotographyCategoryId[];
  locationType: PhotographyLocationId;
};

export type ServiceDetailsPayload = {
  photography?: PhotographyDetails;
  audience?: string;
  offeringId?: string;
  offeringLabel?: string;
  serviceKey?: string;
};

const CATEGORY_LABELS = Object.fromEntries(
  PHOTOGRAPHY_CATEGORIES.map((c) => [c.id, c.label])
) as Record<PhotographyCategoryId, string>;

const LOCATION_LABELS = Object.fromEntries(
  PHOTOGRAPHY_LOCATIONS.map((l) => [l.id, l.label])
) as Record<PhotographyLocationId, string>;

export function getStep2Title(service: string | null): string {
  const titles: Record<string, string> = {
    photography: "جزئیات پروژه عکاسی",
    videography: "جزئیات پروژه فیلم‌برداری",
    modeling: "جزئیات پروژه مدلینگ",
    social_content: "جزئیات تولید محتوا",
    post_production: "جزئیات تدوین و پست‌پروداکشن",
    aerial: "جزئیات هلی‌شات و هوایی",
  };
  return titles[service ?? ""] ?? "جزئیات پروژه";
}

export function composeBriefText(
  service: string,
  notes: string,
  photography?: PhotographyDetails | null
): string {
  const sections: string[] = [];

  if (service === "photography" && photography) {
    const cats = photography.categories
      .map((id) => CATEGORY_LABELS[id])
      .filter(Boolean);
    if (cats.length) {
      sections.push(`نوع عکاسی: ${cats.join("، ")}`);
    }
    if (photography.locationType) {
      sections.push(`فضای پروژه: ${LOCATION_LABELS[photography.locationType]}`);
    }
  }

  const trimmedNotes = notes.trim();
  if (trimmedNotes) {
    sections.push(trimmedNotes);
  }

  return sections.join("\n\n") || trimmedNotes;
}

export function buildServiceDetailsJson(
  service: string,
  photography: PhotographyDetails | null
): string | null {
  if (service !== "photography" || !photography) return null;
  const payload: ServiceDetailsPayload = { photography };
  return JSON.stringify(payload);
}

