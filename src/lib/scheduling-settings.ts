import { z } from "zod";

const schedulingSchema = z.object({
  enforceAvailability: z.enum(["warn", "block"]).optional(),
});

const tenantSettingsSchema = z.object({
  scheduling: schedulingSchema.optional(),
});

export type SchedulingSettings = {
  enforceAvailability: "warn" | "block";
};

export function schedulingSettingsFromTenant(settings: unknown): SchedulingSettings {
  const parsed = tenantSettingsSchema.safeParse(settings);
  const enforce = parsed.success ? parsed.data.scheduling?.enforceAvailability : undefined;
  return { enforceAvailability: enforce ?? "warn" };
}
