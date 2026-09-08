/** App-level enums (stored as String in SQLite; use native enums when on MySQL). */

// User roles live in lib/auth/roles.ts. This file used to declare its own
// USER_ROLES = ["USER", "ADMIN"] with a parseUserRole() that mapped anything
// unrecognised to "USER" — which would have quietly demoted every SPECIALIST
// the first time somebody called it. Nothing did, and both are now gone.

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

export function parseProjectStatus(value: string): ProjectStatus {
  if ((PROJECT_STATUSES as readonly string[]).includes(value)) {
    return value as ProjectStatus;
  }
  if (LEGACY_STATUS_MAP[value]) {
    return LEGACY_STATUS_MAP[value];
  }
  return "PENDING";
}
