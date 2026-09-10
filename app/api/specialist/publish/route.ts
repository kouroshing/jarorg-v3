import { NextResponse } from "next/server";
import { publishSpecialistProfile } from "@/app/actions/specialistPortfolioActions";

export const dynamic = "force-dynamic";

/**
 * Thin wrapper over the submit-for-review action.
 *
 * This route used to carry its own copy of the rules — three categories instead
 * of one, raw uploads instead of reviewed work — and wrote `status` directly.
 * Two places deciding who is allowed to take work is one place too many.
 */
export async function POST() {
  const result = await publishSpecialistProfile();

  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
