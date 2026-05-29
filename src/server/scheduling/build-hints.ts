import { evaluateScheduleConstraints } from "@/lib/scheduling-constraints";
import { schedulingSettingsFromTenant } from "@/lib/scheduling-settings";
import type { ConstraintHintSummary } from "@/components/schedule/constraint-hints";
import { serializeConstraintHint } from "@/components/schedule/constraint-hints";

import type { UserConstraintContext } from "./constraint-context";

export type ShiftLike = {
  id?: string;
  startsAt: Date;
  endsAt: Date;
  site: { timezone: string };
};

export function buildConstraintHintsForSchedule(
  shifts: ShiftLike[],
  tenantUserIds: string[],
  userIdByTenantUserId: Map<string, string>,
  contextByTenantUserId: Map<string, UserConstraintContext>,
  tenantSettings: unknown,
): Record<string, Record<string, ConstraintHintSummary>> {
  const settings = schedulingSettingsFromTenant(tenantSettings);
  const out: Record<string, Record<string, ConstraintHintSummary>> = {};

  for (const shift of shifts) {
    const row: Record<string, ConstraintHintSummary> = {};
    for (const tuId of tenantUserIds) {
      const userId = userIdByTenantUserId.get(tuId);
      if (!userId) continue;
      const ctx = contextByTenantUserId.get(tuId) ?? {
        rules: [],
        exceptions: [],
        ptoRequests: [],
      };
      const violations = evaluateScheduleConstraints({
        shiftStartsAt: shift.startsAt,
        shiftEndsAt: shift.endsAt,
        siteTimezone: shift.site.timezone,
        rules: ctx.rules,
        exceptions: ctx.exceptions,
        ptoRequests: ctx.ptoRequests,
        settings,
      });
      row[userId] = serializeConstraintHint(violations, settings);
    }
    if (shift.id) out[shift.id] = row;
  }
  return out;
}

export function hintForShift(
  shift: ShiftLike,
  context: UserConstraintContext,
  tenantSettings: unknown,
): ConstraintHintSummary {
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
  return serializeConstraintHint(violations, settings);
}
