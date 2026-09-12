import { isSuperAdminPhone } from "@/lib/auth/admin";

/**
 * Single source of truth for roles.
 *
 * Two vocabularies, deliberately: the session carries only what the middleware
 * needs to gate a route, while the database records what a person actually is.
 * They are not interchangeable — a SPECIALIST has the "user" session role.
 *
 * Staff admins (AdminStaff) get session role "admin" at login via
 * resolveAdminAccessByPhone — not via isSuperAdminPhone alone.
 */
export type SessionRole = "user" | "admin";

export const DB_USER_ROLES = ["USER", "ADMIN", "SPECIALIST"] as const;
export type DbUserRole = (typeof DB_USER_ROLES)[number];

export function isDbUserRole(value: unknown): value is DbUserRole {
  return typeof value === "string" && (DB_USER_ROLES as readonly string[]).includes(value);
}

/** Normalizes a stored role, defaulting to USER rather than throwing. */
export function parseDbUserRole(value: string | null | undefined): DbUserRole {
  const upper = value?.toUpperCase();
  return isDbUserRole(upper) ? upper : "USER";
}

export function isSpecialistRole(value: string | null | undefined): boolean {
  return parseDbUserRole(value) === "SPECIALIST";
}

/** Super-admin phone only (sync). Staff admins are resolved async at login. */
export function sessionRoleFromPhone(phoneDigits: string): SessionRole {
  return isSuperAdminPhone(phoneDigits) ? "admin" : "user";
}

export function dbRoleFromPhone(phoneDigits: string): DbUserRole {
  return isSuperAdminPhone(phoneDigits) ? "ADMIN" : "USER";
}
