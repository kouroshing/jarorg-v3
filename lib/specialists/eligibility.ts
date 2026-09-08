/**
 * When is a specialist allowed to take work?
 *
 * This was answered in two places that disagreed. saveSpecialistDetailsAction
 * activated on "at least ten items in *some* category"; /api/specialist/publish
 * demanded ten in *every* selected category — and then never wrote the status
 * at all, so it reported success while the profile stayed INCOMPLETE. Every
 * specialist profile in the database is INCOMPLETE, including the one named
 * "approved specialist".
 *
 * One rule now, here.
 */

export const MIN_PORTFOLIO_ITEMS_PER_CATEGORY = 10;

export type SpecialistStatus = "INCOMPLETE" | "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED";

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
  isEligible: boolean;
  status: Extract<SpecialistStatus, "INCOMPLETE" | "ACTIVE">;
  hasCity: boolean;
  hasBaseLocation: boolean;
  hasAgreedToTerms: boolean;
  /** Categories the specialist offers that do not yet have enough approved work. */
  incompleteCategories: { slug: string; count: number }[];
  /** Categories that clear the bar — what they can actually be shown for. */
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

/**
 * Counts only APPROVED work. The old checks counted every uploaded file, so 47
 * of the 49 items in the database — all still PENDING — were being treated as
 * vetted, which made the admin review widget decorative.
 */
function countApprovedByCategory(items: PortfolioItemLike[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    if (item.reviewStatus && item.reviewStatus !== "APPROVED") continue;
    counts[item.categorySlug] = (counts[item.categorySlug] || 0) + 1;
  }
  return counts;
}

export function evaluateEligibility(input: EligibilityInput): EligibilityResult {
  const counts = countApprovedByCategory(input.portfolioItems);

  // What they said they offer; falling back to whatever they have uploaded, so
  // a specialist who never picked categories explicitly is still assessed.
  const declared = parseSelectedCategories(input.selectedCategories);
  const categories = declared.length > 0 ? declared : Object.keys(counts);

  const qualifiedCategories = categories.filter(
    (slug) => (counts[slug] || 0) >= MIN_PORTFOLIO_ITEMS_PER_CATEGORY
  );
  const incompleteCategories = categories
    .filter((slug) => (counts[slug] || 0) < MIN_PORTFOLIO_ITEMS_PER_CATEGORY)
    .map((slug) => ({ slug, count: counts[slug] || 0 }));

  const hasCity = Boolean(input.city && input.city.trim().length > 0);
  const hasBaseLocation =
    Number.isFinite(input.baseLat) &&
    Number.isFinite(input.baseLng) &&
    !(input.baseLat === 0 && input.baseLng === 0);
  const hasAgreedToTerms = input.agreedToTerms === true;

  // At least one category they can actually be shown for, plus the details Jar
  // needs to quote travel and to hold them to the terms.
  const isEligible =
    qualifiedCategories.length > 0 && hasCity && hasBaseLocation && hasAgreedToTerms;

  let nextStep = "/specialist/projects";
  if (qualifiedCategories.length === 0) {
    nextStep = "/specialist/onboarding/portfolio";
  } else if (!hasCity || !hasBaseLocation || !hasAgreedToTerms) {
    nextStep = "/specialist/onboarding/details";
  }

  return {
    isEligible,
    status: isEligible ? "ACTIVE" : "INCOMPLETE",
    hasCity,
    hasBaseLocation,
    hasAgreedToTerms,
    incompleteCategories,
    qualifiedCategories,
    nextStep,
  };
}
