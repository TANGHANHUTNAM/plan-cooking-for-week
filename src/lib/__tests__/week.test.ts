import { describe, expect, it } from "vitest";
import {
  addDaysISO,
  formatDayFull,
  normalizeWeekParam,
  todayISO,
  weekDaysISO,
  weekStartISO,
  weekdayIndex,
} from "../week";

describe("week helpers (giờ Việt Nam)", () => {
  it("todayISO đổi ngày theo múi giờ VN, không theo UTC", () => {
    // 18:00 UTC = 01:00 hôm sau giờ VN
    expect(todayISO(new Date("2026-08-30T18:00:00Z"))).toBe("2026-08-31");
    // 03:00 UTC = 10:00 cùng ngày giờ VN
    expect(todayISO(new Date("2026-08-30T03:00:00Z"))).toBe("2026-08-30");
  });

  it("weekStartISO luôn về Thứ 2", () => {
    expect(weekStartISO("2026-08-30")).toBe("2026-08-24"); // Chủ nhật -> T2 trước đó
    expect(weekStartISO("2026-08-24")).toBe("2026-08-24"); // Thứ 2 giữ nguyên
    expect(weekStartISO("2026-08-26")).toBe("2026-08-24"); // Thứ 4
  });

  it("weekdayIndex: T2=0 ... CN=6", () => {
    expect(weekdayIndex("2026-08-24")).toBe(0);
    expect(weekdayIndex("2026-08-30")).toBe(6);
  });

  it("addDaysISO qua ranh giới tháng", () => {
    expect(addDaysISO("2026-08-30", 2)).toBe("2026-09-01");
    expect(addDaysISO("2026-09-01", -1)).toBe("2026-08-31");
  });

  it("weekDaysISO trả 7 ngày liên tiếp", () => {
    const days = weekDaysISO("2026-08-24");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-08-24");
    expect(days[6]).toBe("2026-08-30");
  });

  it("normalizeWeekParam chống input xấu", () => {
    expect(normalizeWeekParam("2026-08-26")).toBe("2026-08-24");
    const current = weekStartISO(todayISO());
    expect(normalizeWeekParam(undefined)).toBe(current);
    expect(normalizeWeekParam("abc")).toBe(current);
    expect(normalizeWeekParam("2026-13-99")).toBe(current);
  });

  it("formatDayFull hiển thị tiếng Việt", () => {
    expect(formatDayFull("2026-08-24")).toBe("Thứ 2, 24/08");
    expect(formatDayFull("2026-08-30")).toBe("Chủ nhật, 30/08");
  });
});
