import { z } from "zod";

import type { AppTheme } from "@/lib/ui-theme";

const rawThemeSchema = z.enum(["corporate", "day", "night", "neon", "cyberpunk"]);

/**
 * Maps `Tenant.settings.theme` to a UI preset.
 */
export function tenantThemeHint(settings: unknown): AppTheme {
  const parsed = z.object({ theme: rawThemeSchema.optional() }).safeParse(settings);
  const raw = parsed.success ? parsed.data.theme : undefined;
  return raw ?? "corporate";
}

export function weekStartsOnFromSettings(settings: unknown): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const parsed = z
    .object({ weekStartsOn: z.number().int().min(0).max(6).optional() })
    .safeParse(settings);
  const v = parsed.success ? parsed.data.weekStartsOn : undefined;
  if (v === undefined) return 1;
  if (v < 0 || v > 6) return 1;
  return v as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}
