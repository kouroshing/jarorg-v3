export const PROJECT_BUDGET_OPTIONS = [
  {
    id: "under_5m",
    label: "اقتصادی (زیر ۵ میلیون تومان)",
  },
  {
    id: "standard_5_15m",
    label: "استاندارد (۵ تا ۱۵ میلیون تومان)",
  },
  {
    id: "above_15m",
    label: "پروژه بزرگ (بالای ۱۵ میلیون تومان)",
  },
  {
    id: "consultation",
    label: "توافقی / نیاز به مشاوره دارم",
  },
] as const;

export type ProjectBudgetId = (typeof PROJECT_BUDGET_OPTIONS)[number]["id"];

export const DEFAULT_PROJECT_BUDGET: ProjectBudgetId = "consultation";

export const PROJECT_BUDGET_IDS = PROJECT_BUDGET_OPTIONS.map((o) => o.id) as [
  ProjectBudgetId,
  ...ProjectBudgetId[],
];

export function getBudgetLabel(id: string | null | undefined): string {
  const found = PROJECT_BUDGET_OPTIONS.find((o) => o.id === id);
  return found?.label ?? "—";
}

const VIP_BUDGET_IDS: ProjectBudgetId[] = ["above_15m", "consultation"];

/** VIP success message when budget is large project or consultation. */
export function isVipBudget(id: string | null | undefined): boolean {
  return !!id && (VIP_BUDGET_IDS as readonly string[]).includes(id);
}
