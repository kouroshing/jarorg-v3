/**
 * Only allow same-origin relative paths in post-login redirects.
 * `new URL("https://evil.com", origin)` would otherwise win and send the
 * session to a third party.
 */
export function isSafeInternalPath(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  if (value.includes("://") || value.includes("\\")) return false;
  return true;
}

export function safeInternalPath(
  value: string | null | undefined,
  fallback = "/profile"
): string {
  return isSafeInternalPath(value) ? value : fallback;
}
