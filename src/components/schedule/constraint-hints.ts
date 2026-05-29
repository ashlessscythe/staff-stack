import { partitionViolations, type ScheduleViolation } from "@/lib/scheduling-constraints";
import type { SchedulingSettings } from "@/lib/scheduling-settings";

export type ConstraintHintSummary = {
  blocking: { code: string; message: string }[];
  warnings: { code: string; message: string }[];
};

export function serializeConstraintHint(
  violations: ScheduleViolation[],
  settings: SchedulingSettings,
): ConstraintHintSummary {
  const { blocking, warnings } = partitionViolations(violations, settings);
  return {
    blocking: blocking.map((v) => ({ code: v.code, message: v.message })),
    warnings: warnings.map((v) => ({ code: v.code, message: v.message })),
  };
}
