// All app date calculations use Vietnam time, independent of the server's timezone (UTC on serverless).
// The app passes dates as "yyyy-MM-dd" ISO strings; @db.Date columns are stored at UTC midnight.

export const APP_TZ = "Asia/Ho_Chi_Minh";

const vnDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date in Vietnam time, formatted as "yyyy-MM-dd". */
export function todayISO(now: Date = new Date()): string {
  return vnDateFormat.format(now);
}

/** ISO string -> Date at UTC midnight (matching Prisma's @db.Date storage). */
export function isoToDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Date from an @db.Date column -> ISO string. */
export function dateToISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  const d = isoToDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return dateToISO(d);
}

/** Day of week: 0 = Monday ... 6 = Sunday. */
export function weekdayIndex(iso: string): number {
  return (isoToDate(iso).getUTCDay() + 6) % 7;
}

/** Monday for the week containing the given date. */
export function weekStartISO(iso: string): string {
  return addDaysISO(iso, -weekdayIndex(iso));
}

export const DAY_LABELS = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ nhật",
] as const;

export const DAY_LABELS_SHORT = [
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "CN",
] as const;

/** "dd/MM" */
export function formatDM(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** "Monday, 01/09" */
export function formatDayFull(iso: string): string {
  return `${DAY_LABELS[weekdayIndex(iso)]}, ${formatDM(iso)}`;
}

/** "01/09 – 07/09" for the week starting at weekStart. */
export function weekRangeLabel(weekStart: string): string {
  return `${formatDM(weekStart)} – ${formatDM(addDaysISO(weekStart, 6))}`;
}

/** Seven ISO dates for the week. */
export function weekDaysISO(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
}

const WEEK_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Normalize ?w= — invalid input falls back to the current week; off-week dates are shifted to Monday. */
export function normalizeWeekParam(w: string | undefined): string {
  if (!w || !WEEK_ISO_RE.test(w) || Number.isNaN(isoToDate(w).getTime())) {
    return weekStartISO(todayISO());
  }
  return weekStartISO(w);
}
