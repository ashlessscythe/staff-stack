import { describe, expect, it } from "vitest";

import {
  formatMinuteOfDay,
  formatMinuteRange,
  normalizeTimeInput,
  parseTimeToMinutes,
  timeInputPlaceholder,
} from "@/lib/time-format";

describe("formatMinuteOfDay", () => {
  it("formats 12-hour times with am/pm", () => {
    expect(formatMinuteOfDay(9 * 60, "TWELVE_HOUR")).toBe("9am");
    expect(formatMinuteOfDay(17 * 60, "TWELVE_HOUR")).toBe("5pm");
    expect(formatMinuteOfDay(9 * 60 + 30, "TWELVE_HOUR")).toBe("9:30am");
    expect(formatMinuteOfDay(12 * 60, "TWELVE_HOUR")).toBe("12pm");
    expect(formatMinuteOfDay(0, "TWELVE_HOUR")).toBe("12am");
  });

  it("formats 24-hour times as HHMM", () => {
    expect(formatMinuteOfDay(9 * 60, "TWENTY_FOUR_HOUR")).toBe("0900");
    expect(formatMinuteOfDay(17 * 60, "TWENTY_FOUR_HOUR")).toBe("1700");
    expect(formatMinuteOfDay(9 * 60 + 5, "TWENTY_FOUR_HOUR")).toBe("0905");
  });
});

describe("formatMinuteRange", () => {
  it("joins start and end with an en dash", () => {
    expect(formatMinuteRange(9 * 60, 17 * 60, "TWELVE_HOUR")).toBe("9am–5pm");
    expect(formatMinuteRange(9 * 60, 17 * 60, "TWENTY_FOUR_HOUR")).toBe("0900–1700");
  });
});

describe("parseTimeToMinutes", () => {
  it("parses 12-hour input", () => {
    expect(parseTimeToMinutes("9am", "TWELVE_HOUR")).toBe(9 * 60);
    expect(parseTimeToMinutes("5pm", "TWELVE_HOUR")).toBe(17 * 60);
    expect(parseTimeToMinutes("9:30 am", "TWELVE_HOUR")).toBe(9 * 60 + 30);
    expect(parseTimeToMinutes("12:00 PM", "TWELVE_HOUR")).toBe(12 * 60);
  });

  it("parses 12-hour shorthand", () => {
    expect(parseTimeToMinutes("9a", "TWELVE_HOUR")).toBe(9 * 60);
    expect(parseTimeToMinutes("10p", "TWELVE_HOUR")).toBe(22 * 60);
    expect(parseTimeToMinutes("9:30a", "TWELVE_HOUR")).toBe(9 * 60 + 30);
    expect(parseTimeToMinutes("12 p", "TWELVE_HOUR")).toBe(12 * 60);
  });

  it("parses 24-hour input", () => {
    expect(parseTimeToMinutes("0900", "TWENTY_FOUR_HOUR")).toBe(9 * 60);
    expect(parseTimeToMinutes("1700", "TWENTY_FOUR_HOUR")).toBe(17 * 60);
    expect(parseTimeToMinutes("17:00", "TWENTY_FOUR_HOUR")).toBe(17 * 60);
  });

  it("returns null for invalid input", () => {
    expect(parseTimeToMinutes("9am", "TWENTY_FOUR_HOUR")).toBeNull();
    expect(parseTimeToMinutes("0900", "TWELVE_HOUR")).toBeNull();
    expect(parseTimeToMinutes("25:00", "TWENTY_FOUR_HOUR")).toBeNull();
  });
});

describe("normalizeTimeInput", () => {
  it("coalesces shorthand to canonical display", () => {
    expect(normalizeTimeInput("9a", "TWELVE_HOUR")).toBe("9am");
    expect(normalizeTimeInput("10p", "TWELVE_HOUR")).toBe("10pm");
    expect(normalizeTimeInput("900", "TWENTY_FOUR_HOUR")).toBe("0900");
  });

  it("returns original when unparseable", () => {
    expect(normalizeTimeInput("not-a-time", "TWELVE_HOUR")).toBe("not-a-time");
  });
});

describe("timeInputPlaceholder", () => {
  it("matches the active format", () => {
    expect(timeInputPlaceholder("TWELVE_HOUR")).toBe("9am or 9a");
    expect(timeInputPlaceholder("TWENTY_FOUR_HOUR")).toBe("0900");
  });
});
