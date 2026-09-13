/**
 * Client-facing specialist identity: keep first name(s), mask family name
 * to a single letter so full surnames never leak in marketplace previews.
 *
 * «محسن عصار» → «محسن . ع»
 * «سید محسن عصار» → «سید محسن . ع»
 */
export function formatPublicSpecialistName(
  fullName: string | null | undefined,
  fallback = "متخصص جار"
): string {
  const raw = (fullName || "").trim().replace(/\s+/g, " ");
  if (!raw) return fallback;

  const parts = raw.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0];

  const family = parts[parts.length - 1];
  const given = parts.slice(0, -1).join(" ");
  const initial = family.charAt(0);
  if (!given || !initial) return raw;

  return `${given} . ${initial}`;
}
