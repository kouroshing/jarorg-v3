/**
 * Single source of truth for Order.status.
 *
 * SQLite has no enums, so the column is a plain String. Before this module the
 * allowed set was written out by hand in seven places — the schema comment, the
 * admin dropdown, the admin validator, the admin dashboard query, the
 * specialist job board, the cancel button, and the order detail page — and they
 * had drifted apart. Two spellings of "cancelled" were both live, and rows
 * existed in states no list mentioned. Everything now reads from here.
 */

/** Canonical states, in the order an order moves through them. */
export const ORDER_STATUSES = [
  "PENDING_REVIEW",
  "CONTACTED",
  "IN_PROGRESS",
  "PENDING_DEPOSIT",
  "DEPOSIT_PAID",
  "MATCHING",
  "HAS_APPLICANTS",
  "AWAITING_PAYMENT",
  "AWAITING_SPECIALIST_CONFIRMATION",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Values written by older code that still sit in the database.
 * `MATCHED` was a second name for `CONFIRMED` — the applicants list already
 * treated the two identically — and `CANCELED` is the one-L spelling.
 */
const ORDER_STATUS_ALIASES: Record<string, OrderStatus> = {
  MATCHED: "CONFIRMED",
  CANCELED: "CANCELLED",
  PENDING: "PENDING_REVIEW",
};

const ORDER_STATUS_SET = new Set<string>(ORDER_STATUSES);

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && ORDER_STATUS_SET.has(value);
}

/**
 * Maps any stored value onto a canonical status. Unknown values fall back to
 * `PENDING_REVIEW` so an order is never invisible because of a typo — the
 * failure mode that hid half the orders from the admin dashboard.
 */
export function parseOrderStatus(value: string | null | undefined): OrderStatus {
  if (!value) return "PENDING_REVIEW";
  if (isOrderStatus(value)) return value;
  return ORDER_STATUS_ALIASES[value] ?? "PENDING_REVIEW";
}

/**
 * Every stored value that should be matched when querying for `status`.
 * Use this in Prisma `in:` filters so rows still holding a legacy value are
 * not silently excluded.
 */
export function storedValuesFor(...statuses: OrderStatus[]): string[] {
  const wanted = new Set<string>(statuses);
  for (const [alias, canonical] of Object.entries(ORDER_STATUS_ALIASES)) {
    if (wanted.has(canonical)) wanted.add(alias);
  }
  return [...wanted];
}

/* ------------------------------------------------------------------ *
 * Groupings — each replaces a hand-written array that had drifted.
 * ------------------------------------------------------------------ */

/** Handled by the Jar team directly; the marketplace is not involved yet. */
export const ADMIN_TRIAGE_STATUSES = [
  "PENDING_REVIEW",
  "CONTACTED",
  "IN_PROGRESS",
] as const satisfies readonly OrderStatus[];

/** Listed on the specialist job board and open to new proposals. */
export const OPEN_TO_APPLICANTS_STATUSES = [
  "DEPOSIT_PAID",
  "MATCHING",
  "HAS_APPLICANTS",
] as const satisfies readonly OrderStatus[];

/** The client may still cancel without involving support. */
export const CLIENT_CANCELLABLE_STATUSES = [
  "PENDING_REVIEW",
  "CONTACTED",
  "IN_PROGRESS",
  "PENDING_DEPOSIT",
  "DEPOSIT_PAID",
  "MATCHING",
  "HAS_APPLICANTS",
  "AWAITING_PAYMENT",
] as const satisfies readonly OrderStatus[];

/**
 * Any live project that blocks the client from opening a second order.
 * Only COMPLETED / CANCELLED free the slot.
 */
export const ACTIVE_CLIENT_ORDER_STATUSES = [
  "PENDING_REVIEW",
  "CONTACTED",
  "IN_PROGRESS",
  "PENDING_DEPOSIT",
  "DEPOSIT_PAID",
  "MATCHING",
  "HAS_APPLICANTS",
  "AWAITING_PAYMENT",
  "AWAITING_SPECIALIST_CONFIRMATION",
  "CONFIRMED",
] as const satisfies readonly OrderStatus[];

/**
 * Out on the marketplace — the client sees the "searching for a specialist"
 * screen. Wider than OPEN_TO_APPLICANTS because an order awaiting its deposit
 * is already presented to the client as in progress.
 */
export const ON_MARKET_STATUSES = [
  "PENDING_DEPOSIT",
  "DEPOSIT_PAID",
  "MATCHING",
  "HAS_APPLICANTS",
] as const satisfies readonly OrderStatus[];

/** A specialist is locked in; the job is no longer on the board. */
export const MATCHED_STATUSES = [
  "AWAITING_PAYMENT",
  "AWAITING_SPECIALIST_CONFIRMATION",
  "CONFIRMED",
] as const satisfies readonly OrderStatus[];

/**
 * Payment has cleared into escrow. Contact details are released and the two
 * sides may talk; before this the specialist has never seen a phone number.
 */
export const PAID_STATUSES = [
  "CONFIRMED",
  "COMPLETED",
] as const satisfies readonly OrderStatus[];

export function isPaid(status: string): boolean {
  return (PAID_STATUSES as readonly string[]).includes(parseOrderStatus(status));
}

/** Nothing further happens to the order. */
export const TERMINAL_STATUSES = [
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly OrderStatus[];

/**
 * Waiting on someone at Jar. Drives the admin dashboard's "needs action"
 * count and queue — which previously counted only MATCHING and
 * HAS_APPLICANTS and so never showed a newly submitted order.
 */
export const NEEDS_ADMIN_ACTION_STATUSES = [
  "PENDING_REVIEW",
  "MATCHING",
  "HAS_APPLICANTS",
] as const satisfies readonly OrderStatus[];

export function isAdminTriage(status: string): boolean {
  return (ADMIN_TRIAGE_STATUSES as readonly string[]).includes(parseOrderStatus(status));
}

export function isOpenToApplicants(status: string): boolean {
  return (OPEN_TO_APPLICANTS_STATUSES as readonly string[]).includes(parseOrderStatus(status));
}

export function isOnMarket(status: string): boolean {
  return (ON_MARKET_STATUSES as readonly string[]).includes(parseOrderStatus(status));
}

export function isClientCancellable(status: string): boolean {
  return (CLIENT_CANCELLABLE_STATUSES as readonly string[]).includes(parseOrderStatus(status));
}

export function isActiveClientOrder(status: string): boolean {
  return (ACTIVE_CLIENT_ORDER_STATUSES as readonly string[]).includes(parseOrderStatus(status));
}

export function isMatched(status: string): boolean {
  return (MATCHED_STATUSES as readonly string[]).includes(parseOrderStatus(status));
}

export function isTerminal(status: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(parseOrderStatus(status));
}

/* ------------------------------------------------------------------ *
 * Presentation
 * ------------------------------------------------------------------ */

export type OrderStatusPresentation = {
  /** Shown to the client on the order page. */
  label: string;
  /** Shown to admins, who need to see the raw value too. */
  adminLabel: string;
  badgeBg: string;
  textColor: string;
};

export const ORDER_STATUS_PRESENTATION: Record<OrderStatus, OrderStatusPresentation> = {
  PENDING_REVIEW: {
    label: "در حال بررسی توسط تیم جار",
    adminLabel: "در حال بررسی اولیه ادمین",
    badgeBg: "bg-[#CC785C]/10 text-[#CC785C] border-[#CC785C]/20",
    textColor: "text-[#CC785C]",
  },
  CONTACTED: {
    label: "تماس گرفته شد / در حال پیگیری",
    adminLabel: "تماس گرفته شد / در حال پیگیری",
    badgeBg: "bg-sky-100 text-sky-950 border-sky-300",
    textColor: "text-sky-900",
  },
  IN_PROGRESS: {
    label: "در حال انجام پروژه",
    adminLabel: "در حال انجام پروژه",
    badgeBg: "bg-emerald-100 text-emerald-950 border-emerald-300",
    textColor: "text-emerald-900",
  },
  PENDING_DEPOSIT: {
    label: "در حال بررسی و هماهنگی",
    adminLabel: "در انتظار پرداخت بیعانه",
    badgeBg: "bg-[#CC785C]/10 text-[#CC785C] border-[#CC785C]/20",
    textColor: "text-[#CC785C]",
  },
  DEPOSIT_PAID: {
    label: "در حال بررسی و هماهنگی",
    adminLabel: "بیعانه پرداخت شده",
    badgeBg: "bg-[#CC785C]/10 text-[#CC785C] border-[#CC785C]/20",
    textColor: "text-[#CC785C]",
  },
  MATCHING: {
    label: "در حال جستجوی متخصص",
    adminLabel: "در حال جستجو و تطبیق متخصص",
    badgeBg: "bg-[#CC785C]/10 text-[#CC785C] border-[#CC785C]/20",
    textColor: "text-[#CC785C]",
  },
  HAS_APPLICANTS: {
    label: "متخصصان اعلام آمادگی کردند",
    adminLabel: "دارای پیشنهاد متخصصان",
    badgeBg: "bg-indigo-100 text-indigo-900 border-indigo-300",
    textColor: "text-indigo-800",
  },
  AWAITING_PAYMENT: {
    label: "در انتظار پرداخت شما",
    adminLabel: "متخصص انتخاب شده، در انتظار پرداخت",
    badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
    textColor: "text-amber-800",
  },
  AWAITING_SPECIALIST_CONFIRMATION: {
    label: "در انتظار تأیید متخصص منتخب",
    adminLabel: "در انتظار تایید متخصص",
    badgeBg: "bg-purple-100 text-purple-900 border-purple-300",
    textColor: "text-purple-800",
  },
  CONFIRMED: {
    label: "پروژه قطعی شده",
    adminLabel: "سفارش قطعی و تایید شده",
    badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
    textColor: "text-emerald-800",
  },
  COMPLETED: {
    label: "تکمیل شده و تحویل داده شد",
    adminLabel: "پروژه انجام و تحویل شده",
    badgeBg: "bg-slate-100 text-slate-900 border-slate-300",
    textColor: "text-slate-800",
  },
  CANCELLED: {
    label: "لغو شده",
    adminLabel: "لغو شده",
    badgeBg: "bg-rose-100 text-rose-900 border-rose-300",
    textColor: "text-rose-800",
  },
};

export function orderStatusPresentation(status: string): OrderStatusPresentation {
  return ORDER_STATUS_PRESENTATION[parseOrderStatus(status)];
}

/** Options for the admin status dropdown, in flow order. */
export const ORDER_STATUS_OPTIONS = ORDER_STATUSES.map((value) => ({
  value,
  label: `${ORDER_STATUS_PRESENTATION[value].adminLabel} (${value})`,
}));
