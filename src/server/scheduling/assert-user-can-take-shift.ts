import { redirect } from "next/navigation";

import {
  evaluateScheduleConstraints,
  isSchedulingBlocked,
  partitionViolations,
  violationCodesParam,
  type ScheduleViolation,
} from "@/lib/scheduling-constraints";
import { schedulingSettingsFromTenant } from "@/lib/scheduling-settings";

import {
  loadConstraintContextForTenantUser,
  type UserConstraintContext,
} from "./constraint-context";

export type ShiftForConstraints = {
  startsAt: Date;
  endsAt: Date;
  site: { timezone: string };
};

export type EvaluateUserShiftResult = {
  violations: ScheduleViolation[];
  blocking: ScheduleViolation[];
  warnings: ScheduleViolation[];
};

export function evaluateUserForShift(
  shift: ShiftForConstraints,
  context: UserConstraintContext,
  tenantSettings: unknown,
): EvaluateUserShiftResult {
  const settings = schedulingSettingsFromTenant(tenantSettings);
  const violations = evaluateScheduleConstraints({
    shiftStartsAt: shift.startsAt,
    shiftEndsAt: shift.endsAt,
    siteTimezone: shift.site.timezone,
    rules: context.rules,
    exceptions: context.exceptions,
    ptoRequests: context.ptoRequests,
    settings,
  });
  const { blocking, warnings } = partitionViolations(violations, settings);
  return { violations, blocking, warnings };
}

export class SchedulingConstraintError extends Error {
  constructor(
    message: string,
    readonly violations: ScheduleViolation[],
  ) {
    super(message);
    this.name = "SchedulingConstraintError";
  }
}

export function constraintErrorMessage(violations: ScheduleViolation[]): string {
  const primary = violations.find((v) => v.severity === "error") ?? violations[0];
  return primary ? `Scheduling constraint: ${primary.message}` : "Scheduling constraint violated";
}

export async function assertUserCanTakeShift(opts: {
  tenantUserId: string;
  shift: ShiftForConstraints;
  tenantSettings: unknown;
  forceAssign?: boolean;
  acknowledgeWarnings?: boolean;
  /** When set, redirect instead of throw on block. */
  redirectTo?: string;
}): Promise<EvaluateUserShiftResult> {
  const context = await loadConstraintContextForTenantUser(opts.tenantUserId);
  const result = evaluateUserForShift(opts.shift, context, opts.tenantSettings);

  const blocked = isSchedulingBlocked(
    result.violations,
    schedulingSettingsFromTenant(opts.tenantSettings),
    {
      forceAssign: opts.forceAssign,
      acknowledgeWarnings: opts.acknowledgeWarnings,
    },
  );

  if (blocked) {
    if (opts.redirectTo) {
      const codes = violationCodesParam(result.violations);
      const sep = opts.redirectTo.includes("?") ? "&" : "?";
      redirect(`${opts.redirectTo}${sep}codes=${encodeURIComponent(codes)}`);
    }
    throw new SchedulingConstraintError(
      constraintErrorMessage(result.violations),
      result.violations,
    );
  }

  return result;
}
