"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hasPermission, permissionsForRole } from "@/lib/rbac";
import { parseTimeToMinutes } from "@/lib/time-format";
import { requireTenantShell } from "@/server/tenant-context";

const ruleSchema = z.object({
  tenantSlug: z.string().min(1),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
});

export async function addAvailabilityRuleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = ruleSchema.safeParse({
    tenantSlug: formData.get("tenantSlug"),
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) throw new Error("Invalid form");

  const shell = await requireTenantShell(parsed.data.tenantSlug);
  const ok = shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), "availability:write:self"),
  );
  if (!ok) throw new Error("Forbidden");

  const format = shell.tenant.timeDisplayFormat;
  const startMinute = parseTimeToMinutes(parsed.data.startTime, format);
  const endMinute = parseTimeToMinutes(parsed.data.endTime, format);
  if (startMinute === null || endMinute === null) throw new Error("Invalid time");
  if (startMinute >= endMinute) throw new Error("End time must be after start time");

  await prisma.availabilityRule.create({
    data: {
      tenantUserId: shell.tenantUser.id,
      dayOfWeek: parsed.data.dayOfWeek,
      startMinute,
      endMinute,
    },
  });

  revalidatePath(`/t/${parsed.data.tenantSlug}/availability`);
}
