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

export type SpecialistStatus = "INCOMPLETE" | "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED";

/** The waiting room a specialist sits in between submitting and being approved. */
export const SPECIALIST_REVIEW_PATH = "/specialist/onboarding/review";

export type PortfolioItemLike = {
  categorySlug: string;
  reviewStatus?: string | null;
};

export type EligibilityInput = {
  city?: string | null;
  baseLat?: number | null;
  baseLng?: number | null;
  agreedToTerms?: boolean | null;
  portfolioItems: PortfolioItemLike[];
  /** JSON string of category slugs, as stored on SpecialistProfile. */
  selectedCategories?: string | null;
};

export type EligibilityResult = {
  /** Everything a reviewer needs is present. Not the same as being approved. */
  isSubmittable: boolean;
  /** The furthest state onboarding alone can reach. Never ACTIVE. */
  status: Extract<SpecialistStatus, "INCOMPLETE" | "PENDING_REVIEW">;
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

  // What they said they offer; falling back to whatever they have uploaded, so
  // a specialist who never picked categories explicitly is still assessed.
  const declared = parseSelectedCategories(input.selectedCategories);
  const categories = declared.length > 0 ? declared : Object.keys(uploaded);

  const submittableCategories = categories.filter(
    (slug) => (uploaded[slug] || 0) >= MIN_PORTFOLIO_ITEMS_PER_CATEGORY
  );
  const qualifiedCategories = categories.filter(
    (slug) => (approved[slug] || 0) >= MIN_PORTFOLIO_ITEMS_PER_CATEGORY
  );
  const incompleteCategories = categories
    .filter((slug) => (uploaded[slug] || 0) < MIN_PORTFOLIO_ITEMS_PER_CATEGORY)
    .map((slug) => ({ slug, count: uploaded[slug] || 0 }));

  const hasCity = Boolean(input.city && input.city.trim().length > 0);
  const hasBaseLocation =
    Number.isFinite(input.baseLat) &&
    Number.isFinite(input.baseLng) &&
    !(input.baseLat === 0 && input.baseLng === 0);
  const hasAgreedToTerms = input.agreedToTerms === true;

  // One category worth of work, plus the details Jar needs to quote travel and
  // to hold them to the terms.
  const isSubmittable =
    submittableCategories.length > 0 && hasCity && hasBaseLocation && hasAgreedToTerms;

  let nextStep = SPECIALIST_REVIEW_PATH;
  if (submittableCategories.length === 0) {
    nextStep = "/specialist/onboarding/portfolio";
  } else if (!hasCity || !hasBaseLocation || !hasAgreedToTerms) {
    nextStep = "/specialist/onboarding/details";
  }

  return {
    isSubmittable,
    status: isSubmittable ? "PENDING_REVIEW" : "INCOMPLETE",
    hasCity,
    hasBaseLocation,
    hasAgreedToTerms,
    incompleteCategories,
    submittableCategories,
    qualifiedCategories,
    nextStep,
  };
}

/**
 * Where a specialist belongs right now. Status wins over eligibility: someone
 * waiting on a reviewer must not be bounced back through onboarding just
 * because their work is not approved yet.
 */
export function specialistLandingPath(
  status: string | null | undefined,
  eligibility: EligibilityResult
): string {
  if (status === "ACTIVE") return "/specialist/projects";
  if (status === "PENDING_REVIEW" || status === "SUSPENDED") return SPECIALIST_REVIEW_PATH;
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
