/** App-level enums (stored as String in SQLite; use native enums when on MySQL). */

export const USER_ROLES = ["USER", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PROJECT_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELED",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

const LEGACY_STATUS_MAP: Record<string, ProjectStatus> = {
  pending_review: "PENDING",
  contacted: "IN_PROGRESS",
  meeting_scheduled: "IN_PROGRESS",
  converted: "IN_PROGRESS",
  invoiced: "IN_PROGRESS",
  in_progress: "IN_PROGRESS",
  completed: "COMPLETED",
  canceled: "CANCELED",
};

export function parseUserRole(value: string): UserRole {
  return value === "ADMIN" ? "ADMIN" : "USER";
}

export function parseProjectStatus(value: string): ProjectStatus {
  if ((PROJECT_STATUSES as readonly string[]).includes(value)) {
    return value as ProjectStatus;
  }
  if (LEGACY_STATUS_MAP[value]) {
    return LEGACY_STATUS_MAP[value];
  }
  return "PENDING";
}
