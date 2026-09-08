import { isAdminPhone } from "@/lib/auth/admin";

export type SessionRole = "user" | "admin";

export type DbUserRole = "USER" | "ADMIN" | "SPECIALIST";

export function sessionRoleFromPhone(phoneDigits: string): SessionRole {
  return isAdminPhone(phoneDigits) ? "admin" : "user";
}

export function dbRoleFromPhone(phoneDigits: string): DbUserRole {
  return isAdminPhone(phoneDigits) ? "ADMIN" : "USER";
}
