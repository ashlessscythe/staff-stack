"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hasPermission, permissionsForRole } from "@/lib/rbac";
import { requireTenantShell } from "@/server/tenant-context";

const ruleSchema = z.object({
  tenantSlug: z.string().min(1),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startMinute: z.coerce
    .number()
    .int()
    .min(0)
    .max(24 * 60),
  endMinute: z.coerce
    .number()
    .int()
    .min(0)
    .max(24 * 60),
});

export async function addAvailabilityRuleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = ruleSchema.safeParse({
    tenantSlug: formData.get("tenantSlug"),
    dayOfWeek: formData.get("dayOfWeek"),
    startMinute: formData.get("startMinute"),
    endMinute: formData.get("endMinute"),
  });
  if (!parsed.success) throw new Error("Invalid form");

  const shell = await requireTenantShell(parsed.data.tenantSlug);
  const ok = shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), "availability:write:self"),
  );
  if (!ok) throw new Error("Forbidden");

  await prisma.availabilityRule.create({
    data: {
      tenantUserId: shell.tenantUser.id,
      dayOfWeek: parsed.data.dayOfWeek,
      startMinute: parsed.data.startMinute,
      endMinute: parsed.data.endMinute,
    },
  });

  revalidatePath(`/t/${parsed.data.tenantSlug}/availability`);
}
