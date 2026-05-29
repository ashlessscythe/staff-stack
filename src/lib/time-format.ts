import type { TimeDisplayFormat } from "@prisma/client";

export function formatMinuteOfDay(minutes: number, format: TimeDisplayFormat): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;

  if (format === "TWENTY_FOUR_HOUR") {
    return `${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}`;
  }

  const period = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 || 12;
  if (m === 0) return `${hour12}${period}`;
  return `${hour12}:${String(m).padStart(2, "0")}${period}`;
}

export function formatMinuteRange(
  startMinute: number,
  endMinute: number,
  format: TimeDisplayFormat,
): string {
  return `${formatMinuteOfDay(startMinute, format)}–${formatMinuteOfDay(endMinute, format)}`;
}

function parseTwelveHourMinutes(input: string): number | null {
  const match = input.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (!match) return null;
  let h = Number.parseInt(match[1] ?? "", 10);
  const m = Number.parseInt(match[2] ?? "0", 10);
  const pm = (match[3] ?? "").toLowerCase() === "pm";
  if (h < 1 || h > 12 || m > 59) return null;
  if (h === 12) h = pm ? 12 : 0;
  else if (pm) h += 12;
  return h * 60 + m;
}

function expandTwelveHourShorthand(input: string): string {
  const collapsed = input.trim().toLowerCase().replace(/\s+/g, "");
  return collapsed
    .replace(/^(\d{1,2}(?::\d{2})?)a(?:\.m?)?\.?$/i, "$1am")
    .replace(/^(\d{1,2}(?::\d{2})?)p(?:\.m?)?\.?$/i, "$1pm");
}

function parseTwentyFourHourMinutes(input: string): number | null {
  const collapsed = input.trim().replace(/\s+/g, "");
  const match = collapsed.match(/^(\d{1,2}):?(\d{2})$/);
  if (!match) return null;
  const h = Number.parseInt(match[1] ?? "", 10);
  const m = Number.parseInt(match[2] ?? "", 10);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export function parseTimeToMinutes(input: string, format: TimeDisplayFormat): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (format === "TWENTY_FOUR_HOUR") {
    return parseTwentyFourHourMinutes(trimmed);
  }

  return parseTwelveHourMinutes(expandTwelveHourShorthand(trimmed));
}

/** Canonical display string for a user-typed time, or the original if unparseable. */
export function normalizeTimeInput(input: string, format: TimeDisplayFormat): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  const minutes = parseTimeToMinutes(trimmed, format);
  if (minutes === null) return trimmed;
  return formatMinuteOfDay(minutes, format);
}

export function timeInputPlaceholder(format: TimeDisplayFormat): string {
  return format === "TWENTY_FOUR_HOUR" ? "0900" : "9am or 9a";
}
