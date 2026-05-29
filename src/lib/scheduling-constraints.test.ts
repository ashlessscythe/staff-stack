import { describe, expect, it } from "vitest";

import {
  evaluateScheduleConstraints,
  getShiftLocalWindow,
  isSchedulingBlocked,
  partitionViolations,
} from "./scheduling-constraints";
import { schedulingSettingsFromTenant } from "./scheduling-settings";

const NYC = "America/New_York";

function mon9to5(): { dayOfWeek: number; startMinute: number; endMinute: number }[] {
  return [{ dayOfWeek: 1, startMinute: 9 * 60, endMinute: 17 * 60 }];
}

describe("getShiftLocalWindow", () => {
  it("maps UTC instant to NYC local Monday 10:00–18:00", () => {
    const starts = new Date("2026-06-01T14:00:00.000Z");
    const ends = new Date("2026-06-01T22:00:00.000Z");
    const w = getShiftLocalWindow(starts, ends, NYC);
    expect(w.dayOfWeek).toBe(1);
    expect(w.startMinute).toBe(10 * 60);
    expect(w.endMinute).toBe(18 * 60);
    expect(w.spansMultipleDays).toBe(false);
  });
});

describe("evaluateScheduleConstraints", () => {
  const settings = schedulingSettingsFromTenant({});

  it("warns when no rules", () => {
    const starts = new Date("2026-06-01T14:00:00.000Z");
    const ends = new Date("2026-06-01T22:00:00.000Z");
    const v = evaluateScheduleConstraints({
      shiftStartsAt: starts,
      shiftEndsAt: ends,
      siteTimezone: NYC,
      rules: [],
      exceptions: [],
      ptoRequests: [],
      settings,
    });
    expect(v.some((x) => x.code === "NO_RULES")).toBe(true);
  });

  it("passes when shift inside Monday 9–5 rule", () => {
    const starts = new Date("2026-06-01T14:00:00.000Z");
    const ends = new Date("2026-06-01T21:00:00.000Z");
    const v = evaluateScheduleConstraints({
      shiftStartsAt: starts,
      shiftEndsAt: ends,
      siteTimezone: NYC,
      rules: mon9to5(),
      exceptions: [],
      ptoRequests: [],
      settings,
    });
    expect(v).toHaveLength(0);
  });

  it("warns when outside weekly window in warn mode", () => {
    const starts = new Date("2026-06-01T12:00:00.000Z");
    const ends = new Date("2026-06-01T14:00:00.000Z");
    const v = evaluateScheduleConstraints({
      shiftStartsAt: starts,
      shiftEndsAt: ends,
      siteTimezone: NYC,
      rules: mon9to5(),
      exceptions: [],
      ptoRequests: [],
      settings,
    });
    expect(v.some((x) => x.code === "OUTSIDE_RULE" && x.severity === "warning")).toBe(true);
  });

  it("errors on outside rule when enforce block", () => {
    const starts = new Date("2026-06-01T12:00:00.000Z");
    const ends = new Date("2026-06-01T14:00:00.000Z");
    const v = evaluateScheduleConstraints({
      shiftStartsAt: starts,
      shiftEndsAt: ends,
      siteTimezone: NYC,
      rules: mon9to5(),
      exceptions: [],
      ptoRequests: [],
      settings: { enforceAvailability: "block" },
    });
    expect(v.some((x) => x.code === "OUTSIDE_RULE" && x.severity === "error")).toBe(true);
  });

  it("blocks on approved PTO overlap", () => {
    const starts = new Date("2026-06-01T14:00:00.000Z");
    const ends = new Date("2026-06-01T22:00:00.000Z");
    const v = evaluateScheduleConstraints({
      shiftStartsAt: starts,
      shiftEndsAt: ends,
      siteTimezone: NYC,
      rules: mon9to5(),
      exceptions: [],
      ptoRequests: [
        {
          startsOn: new Date("2026-06-01T00:00:00.000Z"),
          endsOn: new Date("2026-06-03T00:00:00.000Z"),
          status: "APPROVED",
        },
      ],
      settings,
    });
    expect(v.some((x) => x.code === "PTO_APPROVED")).toBe(true);
  });

  it("skips weekly check when exception marks day available", () => {
    const starts = new Date("2026-06-01T12:00:00.000Z");
    const ends = new Date("2026-06-01T14:00:00.000Z");
    const v = evaluateScheduleConstraints({
      shiftStartsAt: starts,
      shiftEndsAt: ends,
      siteTimezone: NYC,
      rules: mon9to5(),
      exceptions: [{ date: new Date("2026-06-01T00:00:00.000Z"), available: true }],
      ptoRequests: [],
      settings,
    });
    expect(v).toHaveLength(0);
  });

  it("errors on exception unavailable", () => {
    const starts = new Date("2026-06-01T14:00:00.000Z");
    const ends = new Date("2026-06-01T22:00:00.000Z");
    const v = evaluateScheduleConstraints({
      shiftStartsAt: starts,
      shiftEndsAt: ends,
      siteTimezone: NYC,
      rules: mon9to5(),
      exceptions: [{ date: new Date("2026-06-01T00:00:00.000Z"), available: false }],
      ptoRequests: [],
      settings,
    });
    expect(v.some((x) => x.code === "EXCEPTION_UNAVAILABLE")).toBe(true);
  });
});

describe("isSchedulingBlocked", () => {
  it("blocks warnings without acknowledge", () => {
    const violations = [{ code: "NO_RULES" as const, severity: "warning" as const, message: "x" }];
    expect(isSchedulingBlocked(violations, schedulingSettingsFromTenant({}))).toBe(true);
    expect(
      isSchedulingBlocked(violations, schedulingSettingsFromTenant({}), { forceAssign: true }),
    ).toBe(false);
  });

  it("always blocks errors", () => {
    const violations = [
      { code: "PTO_APPROVED" as const, severity: "error" as const, message: "x" },
    ];
    expect(
      isSchedulingBlocked(violations, schedulingSettingsFromTenant({}), { forceAssign: true }),
    ).toBe(true);
  });

  it("partition treats OUTSIDE_RULE as blocking in block mode", () => {
    const violations = evaluateScheduleConstraints({
      shiftStartsAt: new Date("2026-06-01T12:00:00.000Z"),
      shiftEndsAt: new Date("2026-06-01T14:00:00.000Z"),
      siteTimezone: NYC,
      rules: mon9to5(),
      exceptions: [],
      ptoRequests: [],
      settings: { enforceAvailability: "block" },
    });
    const { blocking } = partitionViolations(violations, { enforceAvailability: "block" });
    expect(blocking.length).toBeGreaterThan(0);
  });
});
