// Who may still be randomized, and when. A plan is only useful before it is cooked, so
// randomization is limited to meals that are still ahead of the household:
// - a whole week may be randomized/copied only while it has not started (or is still empty today),
// - a single meal may be randomized only from tomorrow onward.
// ISO "yyyy-MM-dd" strings compare correctly with < and >, so no Date objects are needed here.

import { todayISO, weekStartISO } from "@/lib/week";

/**
 * Whole-week replacement (random week / copy last week) is for weeks that have not started yet.
 * The current week is the one exception, and only while it has no plan at all — that first
 * generation is what turns an empty week into a usable one.
 */
export function canReplaceWholeWeek(
  weekStart: string,
  hasPlan: boolean,
  today: string = todayISO()
): boolean {
  const currentWeekStart = weekStartISO(today);
  if (weekStart > currentWeekStart) return true;
  if (weekStart < currentWeekStart) return false;
  return !hasPlan;
}

/** A single meal may be randomized only from tomorrow onward — today and past days are settled. */
export function canRandomizeDay(
  dateISO: string,
  today: string = todayISO()
): boolean {
  return dateISO > today;
}

/** Why a whole-week replacement was refused — `verb` is the Vietnamese action ("random", "copy"). */
export function wholeWeekBlockedMessage(
  weekStart: string,
  verb: string,
  today: string = todayISO()
): string {
  return weekStart < weekStartISO(today)
    ? `Không ${verb} được thực đơn cho tuần đã qua`
    : `Tuần này đã có thực đơn — chỉ ${verb} được cho tuần mới`;
}

/** Shown when a random is attempted on today or an earlier day. */
export const RANDOM_DAY_BLOCKED_MESSAGE =
  "Chỉ random được món từ ngày mai trở đi";
