/** Shared constants for bilateral order reviews (safe for client + server). */

export const REVIEW_WINDOW_DAYS = 14;

export const REVIEW_DIRECTION = {
  CLIENT_TO_SPECIALIST: "CLIENT_TO_SPECIALIST",
  SPECIALIST_TO_CLIENT: "SPECIALIST_TO_CLIENT",
} as const;

export type ReviewDirection =
  (typeof REVIEW_DIRECTION)[keyof typeof REVIEW_DIRECTION];
