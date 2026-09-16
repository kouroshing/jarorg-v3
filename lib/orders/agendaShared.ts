/** Shared (client + server) types/helpers for work-agenda heatmaps. */

export type SpecialistAgendaEvent = {
  orderId: string;
  categoryTitle: string | null;
  scheduledAt: string;
  durationHours: number;
  endAt: string;
  /** Jalali date key matching StepDateTime dateStr (Persian digits). */
  dateKeyFa: string;
  /** English digits jalali YYYY/MM/DD for lookups. */
  dateKeyEn: string;
};

export function busyLevelFromHours(hours: number): 0 | 1 | 2 | 3 {
  if (hours <= 0) return 0;
  if (hours < 3) return 1;
  if (hours < 6) return 2;
  return 3;
}
