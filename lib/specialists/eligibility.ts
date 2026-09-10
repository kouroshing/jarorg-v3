/**
 * When is a specialist allowed to take work?
 *
 * Two questions used to be answered by one number, which is why a specialist
 * could reach the job board with ten unreviewed uploads:
 *
 *   1. Has the specialist given us everything a reviewer needs?  — uploads
 *   2. Has a human approved them?                                — APPROVED work
 *
 * Only the first is computed here. The second is a decision an admin makes, so
 * `evaluateEligibility` never returns ACTIVE: the best it can say is "this file
 * is ready for review".
 */

export const MIN_PORTFOLIO_ITEMS_PER_CATEGORY = 10;
export const MIN_SELECTED_CATEGORIES = 3;

export type SpecialistStatus = "INCOMPLETE" | "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED";

/** The waiting room a specialist sits in between submitting and being approved. */
export const SPECIALIST_REVIEW_PATH = "/specialist/onboarding/review";

export const ONBOARDING_STEPS = [
  { id: "profile", href: "/specialist/onboarding/profile", label: "اطلاعات پایه", short: "پایه" },
  { id: "categories", href: "/specialist/onboarding/categories", label: "دسته‌بندی‌ها", short: "دسته" },
  { id: "portfolio", href: "/specialist/onboarding/portfolio", label: "نمونه‌کارها", short: "نمونه" },
  { id: "details", href: "/specialist/onboarding/details", label: "محل فعالیت", short: "محل" },
  { id: "terms", href: "/specialist/onboarding/terms", label: "تعهدنامه", short: "تعهد" },
  { id: "review", href: SPECIALIST_REVIEW_PATH, label: "بررسی ادمین", short: "بررسی" },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

export type PortfolioItemLike = {
  categorySlug: string;
  reviewStatus?: string | null;
};

export type EligibilityInput = {
  city?: string | null;
  baseLat?: number | null;
  baseLng?: number | null;
  agreedToTerms?: boolean | null;
  avatarUrl?: string | null;
  displayName?: string | null;
  portfolioItems: PortfolioItemLike[];
  /** JSON string of category slugs, as stored on SpecialistProfile. */
  selectedCategories?: string | null;
};

export type EligibilityResult = {
  /** Everything a reviewer needs is present. Not the same as being approved. */
  isSubmittable: boolean;
  /** The furthest state onboarding alone can reach. Never ACTIVE. */
  status: Extract<SpecialistStatus, "INCOMPLETE" | "PENDING_REVIEW">;
  hasDisplayName: boolean;
  hasAvatar: boolean;
  hasCategories: boolean;
  hasCity: boolean;
  hasBaseLocation: boolean;
  hasAgreedToTerms: boolean;
  /** Categories they offer that do not have enough uploaded work yet. */
  incompleteCategories: { slug: string; count: number }[];
  /** Categories with enough uploaded work — what the admin will look at. */
  submittableCategories: string[];
  /** Categories with enough APPROVED work — what they can be shown for. */
  qualifiedCategories: string[];
  nextStep: string;
  currentStepId: OnboardingStepId;
};

export function parseSelectedCategories(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === "string") : [];
  } catch {
    return [];
  }
}

function countByCategory(
  items: PortfolioItemLike[],
  predicate: (item: PortfolioItemLike) => boolean
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    if (!predicate(item)) continue;
    counts[item.categorySlug] = (counts[item.categorySlug] || 0) + 1;
  }
  return counts;
}

/** Everything that has not been rejected still counts towards submission. */
const isPendingOrApproved = (item: PortfolioItemLike) => item.reviewStatus !== "REJECTED";

/** Only vetted work decides what a specialist can be shown for. */
const isApproved = (item: PortfolioItemLike) =>
  !item.reviewStatus || item.reviewStatus === "APPROVED";

export function evaluateEligibility(input: EligibilityInput): EligibilityResult {
  const uploaded = countByCategory(input.portfolioItems, isPendingOrApproved);
  const approved = countByCategory(input.portfolioItems, isApproved);

  const declared = parseSelectedCategories(input.selectedCategories);
  const hasCategories = declared.length >= MIN_SELECTED_CATEGORIES;
  // Only assess categories they explicitly offer — never invent defaults.
  const categories = hasCategories ? declared : [];

  const submittableCategories = categories.filter(
    (slug) => (uploaded[slug] || 0) >= MIN_PORTFOLIO_ITEMS_PER_CATEGORY
  );
  const qualifiedCategories = categories.filter(
    (slug) => (approved[slug] || 0) >= MIN_PORTFOLIO_ITEMS_PER_CATEGORY
  );
  const incompleteCategories = categories
    .filter((slug) => (uploaded[slug] || 0) < MIN_PORTFOLIO_ITEMS_PER_CATEGORY)
    .map((slug) => ({ slug, count: uploaded[slug] || 0 }));

  const hasDisplayName = Boolean(input.displayName && input.displayName.trim().length >= 2);
  const hasAvatar = Boolean(input.avatarUrl && input.avatarUrl.trim().length > 0);
  const hasCity = Boolean(input.city && input.city.trim().length > 0);
  const hasBaseLocation =
    Number.isFinite(input.baseLat) &&
    Number.isFinite(input.baseLng) &&
    !(input.baseLat === 0 && input.baseLng === 0);
  const hasAgreedToTerms = input.agreedToTerms === true;

  const isSubmittable =
    hasDisplayName &&
    hasAvatar &&
    hasCategories &&
    submittableCategories.length > 0 &&
    hasCity &&
    hasBaseLocation &&
    hasAgreedToTerms;

  let nextStep = SPECIALIST_REVIEW_PATH;
  let currentStepId: OnboardingStepId = "review";

  if (!hasDisplayName || !hasAvatar) {
    nextStep = "/specialist/onboarding/profile";
    currentStepId = "profile";
  } else if (!hasCategories) {
    nextStep = "/specialist/onboarding/categories";
    currentStepId = "categories";
  } else if (submittableCategories.length === 0) {
    nextStep = "/specialist/onboarding/portfolio";
    currentStepId = "portfolio";
  } else if (!hasCity || !hasBaseLocation) {
    nextStep = "/specialist/onboarding/details";
    currentStepId = "details";
  } else if (!hasAgreedToTerms) {
    nextStep = "/specialist/onboarding/terms";
    currentStepId = "terms";
  }

  return {
    isSubmittable,
    status: isSubmittable ? "PENDING_REVIEW" : "INCOMPLETE",
    hasDisplayName,
    hasAvatar,
    hasCategories,
    hasCity,
    hasBaseLocation,
    hasAgreedToTerms,
    incompleteCategories,
    submittableCategories,
    qualifiedCategories,
    nextStep,
    currentStepId,
  };
}

/**
 * Where a specialist belongs right now. Status wins over eligibility: someone
 * waiting on a reviewer must not be bounced back through onboarding just
 * because their work is not approved yet.
 */
export function specialistLandingPath(
  status: string | null | undefined,
  eligibility: EligibilityResult,
  kycStatus?: string | null,
  reviewNote?: string | null
): string {
  if (status === "ACTIVE") {
    // After qualitative approval, incomplete KYC nudges to identity — projects
    // stay reachable from the shell, but this is the recommended next step.
    if (kycStatus && kycStatus !== "VERIFIED" && kycStatus !== "PENDING") {
      return "/specialist/onboarding/identity";
    }
    return "/specialist/projects";
  }
  if (status === "PENDING_REVIEW" || status === "SUSPENDED") return SPECIALIST_REVIEW_PATH;

  // Rejected files stay INCOMPLETE but carry a reviewNote — show that note on
  // the review page instead of bouncing through a self-redirect loop.
  if (status === "INCOMPLETE" && reviewNote && reviewNote.trim().length > 0) {
    return SPECIALIST_REVIEW_PATH;
  }

  // A complete INCOMPLETE file (eligibility says "review") must not land on the
  // waiting room — send them to terms so they can explicitly resubmit.
  if (eligibility.nextStep === SPECIALIST_REVIEW_PATH) {
    return "/specialist/onboarding/terms";
  }

  return eligibility.nextStep;
}

/**
 * The status onboarding is allowed to write.
 *
 * An approved specialist editing their working profile must not be knocked back
 * into the review queue, and nothing here may hand out ACTIVE — only an admin
 * does that.
 */
export function resolveOnboardingStatus(
  current: string | null | undefined,
  eligibility: EligibilityResult
): Extract<SpecialistStatus, "INCOMPLETE" | "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED"> {
  if (current === "ACTIVE" || current === "SUSPENDED") {
    return current;
  }
  return eligibility.status;
}

export function stepIndex(stepId: OnboardingStepId): number {
  return ONBOARDING_STEPS.findIndex((s) => s.id === stepId);
}
