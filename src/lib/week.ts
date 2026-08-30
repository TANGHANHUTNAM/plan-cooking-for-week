// Mọi phép tính ngày của app quy về múi giờ Việt Nam, độc lập với giờ server (UTC trên serverless).
// Ngày được truyền trong app dưới dạng chuỗi ISO "yyyy-MM-dd"; cột @db.Date lưu ở UTC midnight.

export const APP_TZ = "Asia/Ho_Chi_Minh";

const vnDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Ngày hôm nay theo giờ Việt Nam, dạng "yyyy-MM-dd". */
export function todayISO(now: Date = new Date()): string {
  return vnDateFormat.format(now);
}

/** Chuỗi ISO -> Date tại UTC midnight (khớp cách Prisma lưu @db.Date). */
export function isoToDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Date từ cột @db.Date -> chuỗi ISO. */
export function dateToISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  const d = isoToDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return dateToISO(d);
}

/** Thứ trong tuần: 0 = Thứ 2 ... 6 = Chủ nhật. */
export function weekdayIndex(iso: string): number {
  return (isoToDate(iso).getUTCDay() + 6) % 7;
}

/** Thứ 2 của tuần chứa ngày đã cho. */
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

export const DAY_LABELS_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

/** "dd/MM" */
export function formatDM(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** "Thứ 2, 01/09" */
export function formatDayFull(iso: string): string {
  return `${DAY_LABELS[weekdayIndex(iso)]}, ${formatDM(iso)}`;
}

/** "01/09 – 07/09" cho tuần bắt đầu weekStart. */
export function weekRangeLabel(weekStart: string): string {
  return `${formatDM(weekStart)} – ${formatDM(addDaysISO(weekStart, 6))}`;
}

/** 7 ngày ISO của tuần. */
export function weekDaysISO(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
}

const WEEK_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Chuẩn hóa tham số ?w= — sai định dạng thì về tuần hiện tại, lệch ngày thì kéo về Thứ 2. */
export function normalizeWeekParam(w: string | undefined): string {
  if (!w || !WEEK_ISO_RE.test(w) || Number.isNaN(isoToDate(w).getTime())) {
    return weekStartISO(todayISO());
  }
  return weekStartISO(w);
}
