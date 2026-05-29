import { formatInTimeZone, toZonedTime } from "date-fns-tz";

import type { SchedulingSettings } from "@/lib/scheduling-settings";

export type ConstraintSeverity = "warning" | "error";

export type ScheduleViolationCode =
  | "NO_RULES"
  | "OUTSIDE_RULE"
  | "EXCEPTION_UNAVAILABLE"
  | "PTO_APPROVED"
  | "PTO_REQUESTED"
  | "MULTI_DAY_SHIFT";

export type ScheduleViolation = {
  code: ScheduleViolationCode;
  severity: ConstraintSeverity;
  message: string;
};

export type AvailabilityRuleInput = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

export type AvailabilityExceptionInput = {
  date: Date;
  available: boolean;
};

export type PtoRequestInput = {
  startsOn: Date;
  endsOn: Date;
  status: "REQUESTED" | "APPROVED" | "DENIED" | "CANCELLED";
};

export type EvaluateScheduleConstraintsInput = {
  shiftStartsAt: Date;
  shiftEndsAt: Date;
  siteTimezone: string;
  rules: AvailabilityRuleInput[];
  exceptions: AvailabilityExceptionInput[];
  ptoRequests: PtoRequestInput[];
  settings: SchedulingSettings;
};

export type ShiftLocalWindow = {
  localStartDate: string;
  localEndDate: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  spansMultipleDays: boolean;
};

/** Local calendar date as YYYY-MM-DD in the site timezone. */
export function toLocalDateKey(instant: Date, timeZone: string): string {
  return formatInTimeZone(instant, timeZone, "yyyy-MM-dd");
}

/** Minutes from local midnight for an instant in the site timezone. */
export function toLocalMinuteOfDay(instant: Date, timeZone: string): number {
  const h = Number(formatInTimeZone(instant, timeZone, "H"));
  const m = Number(formatInTimeZone(instant, timeZone, "m"));
  return h * 60 + m;
}

/** `getDay()`-compatible index: 0 = Sunday .. 6 = Saturday in site local time. */
export function toLocalDayOfWeek(instant: Date, timeZone: string): number {
  const zoned = toZonedTime(instant, timeZone);
  return zoned.getDay();
}

export function getShiftLocalWindow(
  shiftStartsAt: Date,
  shiftEndsAt: Date,
  timeZone: string,
): ShiftLocalWindow {
  const localStartDate = toLocalDateKey(shiftStartsAt, timeZone);
  const localEndDate = toLocalDateKey(shiftEndsAt, timeZone);
  return {
    localStartDate,
    localEndDate,
    dayOfWeek: toLocalDayOfWeek(shiftStartsAt, timeZone),
    startMinute: toLocalMinuteOfDay(shiftStartsAt, timeZone),
    endMinute: toLocalMinuteOfDay(shiftEndsAt, timeZone),
    spansMultipleDays: localStartDate !== localEndDate,
  };
}

function dateKeyFromDateOnly(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftOverlapsPto(
  localStartDate: string,
  localEndDate: string,
  pto: PtoRequestInput,
): boolean {
  const ptoStart = dateKeyFromDateOnly(pto.startsOn);
  const ptoEnd = dateKeyFromDateOnly(pto.endsOn);
  return localStartDate <= ptoEnd && localEndDate >= ptoStart;
}

function findExceptionForDate(
  exceptions: AvailabilityExceptionInput[],
  localDate: string,
): AvailabilityExceptionInput | undefined {
  return exceptions.find((e) => dateKeyFromDateOnly(e.date) === localDate);
}

function shiftContainedInRule(window: ShiftLocalWindow, rule: AvailabilityRuleInput): boolean {
  if (rule.dayOfWeek !== window.dayOfWeek) return false;
  return window.startMinute >= rule.startMinute && window.endMinute <= rule.endMinute;
}

export const VIOLATION_MESSAGES: Record<ScheduleViolationCode, string> = {
  NO_RULES: "No weekly availability rules on file",
  OUTSIDE_RULE: "Shift is outside declared weekly availability",
  EXCEPTION_UNAVAILABLE: "Marked unavailable on this date",
  PTO_APPROVED: "Approved PTO overlaps this shift",
  PTO_REQUESTED: "Pending PTO request overlaps this shift",
  MULTI_DAY_SHIFT: "Shift spans multiple local calendar days",
};

export function evaluateScheduleConstraints(
  input: EvaluateScheduleConstraintsInput,
): ScheduleViolation[] {
  const violations: ScheduleViolation[] = [];
  const window = getShiftLocalWindow(input.shiftStartsAt, input.shiftEndsAt, input.siteTimezone);

  for (const pto of input.ptoRequests) {
    if (pto.status !== "APPROVED" && pto.status !== "REQUESTED") continue;
    if (!shiftOverlapsPto(window.localStartDate, window.localEndDate, pto)) continue;
    const code = pto.status === "APPROVED" ? "PTO_APPROVED" : "PTO_REQUESTED";
    violations.push({
      code,
      severity: pto.status === "APPROVED" ? "error" : "warning",
      message: VIOLATION_MESSAGES[code],
    });
  }

  const dayException = findExceptionForDate(input.exceptions, window.localStartDate);
  if (dayException?.available === false) {
    violations.push({
      code: "EXCEPTION_UNAVAILABLE",
      severity: "error",
      message: VIOLATION_MESSAGES.EXCEPTION_UNAVAILABLE,
    });
    return violations;
  }

  const skipWeekly = dayException?.available === true;

  if (!skipWeekly) {
    if (input.rules.length === 0) {
      violations.push({
        code: "NO_RULES",
        severity: "warning",
        message: VIOLATION_MESSAGES.NO_RULES,
      });
    } else if (window.spansMultipleDays) {
      violations.push({
        code: "MULTI_DAY_SHIFT",
        severity: "warning",
        message: VIOLATION_MESSAGES.MULTI_DAY_SHIFT,
      });
    } else {
      const matching = input.rules.filter((r) => shiftContainedInRule(window, r));
      if (matching.length === 0) {
        const severity: ConstraintSeverity =
          input.settings.enforceAvailability === "block" ? "error" : "warning";
        violations.push({
          code: "OUTSIDE_RULE",
          severity,
          message: VIOLATION_MESSAGES.OUTSIDE_RULE,
        });
      }
    }
  }

  return violations;
}

export function partitionViolations(
  violations: ScheduleViolation[],
  settings: SchedulingSettings,
): { blocking: ScheduleViolation[]; warnings: ScheduleViolation[] } {
  const blocking: ScheduleViolation[] = [];
  const warnings: ScheduleViolation[] = [];
  for (const v of violations) {
    if (v.severity === "error") {
      blocking.push(v);
    } else if (settings.enforceAvailability === "block") {
      blocking.push(v);
    } else {
      warnings.push(v);
    }
  }
  return { blocking, warnings };
}

export function canProceedWithWarnings(
  warnings: ScheduleViolation[],
  acknowledged: boolean,
): boolean {
  return warnings.length === 0 || acknowledged;
}

/** Errors always block; warnings require forceAssign or acknowledgeWarnings. */
export function isSchedulingBlocked(
  violations: ScheduleViolation[],
  settings: SchedulingSettings,
  opts: { forceAssign?: boolean; acknowledgeWarnings?: boolean } = {},
): boolean {
  const { blocking, warnings } = partitionViolations(violations, settings);
  if (blocking.length > 0) return true;
  const acknowledged = !!(opts.forceAssign || opts.acknowledgeWarnings);
  return !canProceedWithWarnings(warnings, acknowledged);
}

export function violationCodesParam(violations: ScheduleViolation[]): string {
  return [...new Set(violations.map((v) => v.code))].join(",");
}
