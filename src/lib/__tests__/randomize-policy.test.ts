import { describe, expect, it } from "vitest";

import {
  canRandomizeDay,
  canReplaceWholeWeek,
  wholeWeekBlockedMessage,
} from "../randomize-policy";

// Wednesday 2026-03-11; its week starts Monday 2026-03-09.
const TODAY = "2026-03-11";
const CURRENT_WEEK = "2026-03-09";
const NEXT_WEEK = "2026-03-16";
const LAST_WEEK = "2026-03-02";

describe("canReplaceWholeWeek", () => {
  it("allows any week that has not started yet, planned or not", () => {
    expect(canReplaceWholeWeek(NEXT_WEEK, false, TODAY)).toBe(true);
    expect(canReplaceWholeWeek(NEXT_WEEK, true, TODAY)).toBe(true);
    expect(canReplaceWholeWeek("2026-04-06", true, TODAY)).toBe(true);
  });

  it("allows the current week only while it is still empty", () => {
    expect(canReplaceWholeWeek(CURRENT_WEEK, false, TODAY)).toBe(true);
    expect(canReplaceWholeWeek(CURRENT_WEEK, true, TODAY)).toBe(false);
  });

  it("never allows a week that already ended", () => {
    expect(canReplaceWholeWeek(LAST_WEEK, false, TODAY)).toBe(false);
    expect(canReplaceWholeWeek(LAST_WEEK, true, TODAY)).toBe(false);
  });

  it("treats Monday as still-replaceable when that week has no plan", () => {
    expect(canReplaceWholeWeek(CURRENT_WEEK, false, CURRENT_WEEK)).toBe(true);
  });
});

describe("canRandomizeDay", () => {
  it("allows tomorrow and later", () => {
    expect(canRandomizeDay("2026-03-12", TODAY)).toBe(true);
    expect(canRandomizeDay("2026-03-15", TODAY)).toBe(true);
  });

  it("blocks today and past days", () => {
    expect(canRandomizeDay(TODAY, TODAY)).toBe(false);
    expect(canRandomizeDay("2026-03-10", TODAY)).toBe(false);
  });

  it("compares across month and year boundaries", () => {
    expect(canRandomizeDay("2027-01-01", "2026-12-31")).toBe(true);
    expect(canRandomizeDay("2026-12-31", "2027-01-01")).toBe(false);
  });
});

describe("wholeWeekBlockedMessage", () => {
  it("explains a past week separately from an already-planned current week", () => {
    expect(wholeWeekBlockedMessage(LAST_WEEK, "random", TODAY)).toBe(
      "Không random được thực đơn cho tuần đã qua"
    );
    expect(wholeWeekBlockedMessage(CURRENT_WEEK, "copy", TODAY)).toBe(
      "Tuần này đã có thực đơn — chỉ copy được cho tuần mới"
    );
  });
});
