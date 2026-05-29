"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hasPermission, permissionsForRole } from "@/lib/rbac";
import { parseTimeToMinutes } from "@/lib/time-format";
import { writeAuditLog } from "@/server/audit";
import { sendAvailabilityUpdateRequestEmail } from "@/server/email/transactional";
import type { AvailabilityNotifyReason } from "@/server/email/templates";
import { formatShiftStartsAt } from "@/server/reminders/render";
import { requireTenantShell } from "@/server/tenant-context";

function canAssign(shell: Awaited<ReturnType<typeof requireTenantShell>>) {
  return shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), "assignment:write"),
  );
}

function canWriteSelfAvailability(shell: Awaited<ReturnType<typeof requireTenantShell>>) {
  return shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), "availability:write:self"),
  );
}

const ruleFieldsSchema = z.object({
  tenantSlug: z.string().min(1),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
});

const ruleIdSchema = z.object({
  tenantSlug: z.string().min(1),
  ruleId: z.string().uuid(),
});

function parseRuleMinutes(
  startTime: string,
  endTime: string,
  format: import("@prisma/client").TimeDisplayFormat,
) {
  const startMinute = parseTimeToMinutes(startTime, format);
  const endMinute = parseTimeToMinutes(endTime, format);
  if (startMinute === null || endMinute === null) throw new Error("Invalid time");
  if (startMinute >= endMinute) throw new Error("End time must be after start time");
  return { startMinute, endMinute };
}

export async function addAvailabilityRuleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = ruleFieldsSchema.safeParse({
    tenantSlug: formData.get("tenantSlug"),
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) throw new Error("Invalid form");

  const shell = await requireTenantShell(parsed.data.tenantSlug);
  if (!canWriteSelfAvailability(shell)) throw new Error("Forbidden");

  const { startMinute, endMinute } = parseRuleMinutes(
    parsed.data.startTime,
    parsed.data.endTime,
    shell.tenant.timeDisplayFormat,
  );

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

export async function updateAvailabilityRuleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = ruleFieldsSchema.extend({ ruleId: z.string().uuid() }).safeParse({
    tenantSlug: formData.get("tenantSlug"),
    ruleId: formData.get("ruleId"),
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) throw new Error("Invalid form");

  const shell = await requireTenantShell(parsed.data.tenantSlug);
  if (!canWriteSelfAvailability(shell)) throw new Error("Forbidden");

  const existing = await prisma.availabilityRule.findFirst({
    where: { id: parsed.data.ruleId, tenantUserId: shell.tenantUser.id },
  });
  if (!existing) throw new Error("Not found");

  const { startMinute, endMinute } = parseRuleMinutes(
    parsed.data.startTime,
    parsed.data.endTime,
    shell.tenant.timeDisplayFormat,
  );

  await prisma.availabilityRule.update({
    where: { id: existing.id },
    data: {
      dayOfWeek: parsed.data.dayOfWeek,
      startMinute,
      endMinute,
    },
  });

  revalidatePath(`/t/${parsed.data.tenantSlug}/availability`);
}

export async function deleteAvailabilityRuleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = ruleIdSchema.safeParse({
    tenantSlug: formData.get("tenantSlug"),
    ruleId: formData.get("ruleId"),
  });
  if (!parsed.success) throw new Error("Invalid form");

  const shell = await requireTenantShell(parsed.data.tenantSlug);
  if (!canWriteSelfAvailability(shell)) throw new Error("Forbidden");

  const deleted = await prisma.availabilityRule.deleteMany({
    where: { id: parsed.data.ruleId, tenantUserId: shell.tenantUser.id },
  });
  if (deleted.count === 0) throw new Error("Not found");

  revalidatePath(`/t/${parsed.data.tenantSlug}/availability`);
}

const exceptionFieldsSchema = z.object({
  tenantSlug: z.string().min(1),
  date: z.string().min(1),
  available: z.enum(["true", "false"]),
  note: z.string().max(500).optional(),
});

const exceptionIdSchema = z.object({
  tenantSlug: z.string().min(1),
  exceptionId: z.string().uuid(),
});

function parseExceptionDate(dateStr: string): Date {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return date;
}

export async function addAvailabilityExceptionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = exceptionFieldsSchema.safeParse({
    tenantSlug: formData.get("tenantSlug"),
    date: formData.get("date"),
    available: formData.get("available"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) throw new Error("Invalid form");

  const shell = await requireTenantShell(parsed.data.tenantSlug);
  if (!canWriteSelfAvailability(shell)) throw new Error("Forbidden");

  await prisma.availabilityException.create({
    data: {
      tenantUserId: shell.tenantUser.id,
      date: parseExceptionDate(parsed.data.date),
      available: parsed.data.available === "true",
      note: parsed.data.note,
    },
  });

  revalidatePath(`/t/${parsed.data.tenantSlug}/availability`);
}

export async function updateAvailabilityExceptionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = exceptionFieldsSchema.extend({ exceptionId: z.string().uuid() }).safeParse({
    tenantSlug: formData.get("tenantSlug"),
    exceptionId: formData.get("exceptionId"),
    date: formData.get("date"),
    available: formData.get("available"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) throw new Error("Invalid form");

  const shell = await requireTenantShell(parsed.data.tenantSlug);
  if (!canWriteSelfAvailability(shell)) throw new Error("Forbidden");

  const existing = await prisma.availabilityException.findFirst({
    where: { id: parsed.data.exceptionId, tenantUserId: shell.tenantUser.id },
  });
  if (!existing) throw new Error("Not found");

  await prisma.availabilityException.update({
    where: { id: existing.id },
    data: {
      date: parseExceptionDate(parsed.data.date),
      available: parsed.data.available === "true",
      note: parsed.data.note ?? null,
    },
  });

  revalidatePath(`/t/${parsed.data.tenantSlug}/availability`);
}

export async function deleteAvailabilityExceptionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = exceptionIdSchema.safeParse({
    tenantSlug: formData.get("tenantSlug"),
    exceptionId: formData.get("exceptionId"),
  });
  if (!parsed.success) throw new Error("Invalid form");

  const shell = await requireTenantShell(parsed.data.tenantSlug);
  if (!canWriteSelfAvailability(shell)) throw new Error("Forbidden");

  const deleted = await prisma.availabilityException.deleteMany({
    where: { id: parsed.data.exceptionId, tenantUserId: shell.tenantUser.id },
  });
  if (deleted.count === 0) throw new Error("Not found");

  revalidatePath(`/t/${parsed.data.tenantSlug}/availability`);
}

const notifySchema = z.object({
  tenantSlug: z.string().min(1),
  userId: z.string().uuid(),
  shiftId: z.string().uuid(),
  reasonCode: z.enum(["NO_RULES", "OUTSIDE_RULE"]),
  note: z.string().max(2000).optional(),
});

export type NotifyAvailabilityState =
  | { ok?: boolean; skipped?: boolean; error?: string }
  | Record<string, never>;

export async function notifyUpdateAvailabilityAction(
  _prev: NotifyAvailabilityState,
  formData: FormData,
): Promise<NotifyAvailabilityState> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const parsed = notifySchema.safeParse({
      tenantSlug: formData.get("tenantSlug"),
      userId: formData.get("userId"),
      shiftId: formData.get("shiftId"),
      reasonCode: formData.get("reasonCode"),
      note: formData.get("note") || undefined,
    });
    if (!parsed.success) return { error: "Invalid form" };

    const shell = await requireTenantShell(parsed.data.tenantSlug);
    if (!canAssign(shell)) return { error: "Forbidden" };

    const [user, shift] = await Promise.all([
      prisma.user.findFirst({
        where: {
          id: parsed.data.userId,
          tenantUsers: { some: { tenantId: shell.tenant.id, isActive: true } },
        },
        select: { id: true, email: true, name: true },
      }),
      prisma.shift.findFirst({
        where: { id: parsed.data.shiftId, tenantId: shell.tenant.id, deletedAt: null },
        include: { site: { select: { name: true, timezone: true } } },
      }),
    ]);
    if (!user?.email || !shift) return { error: "Not found" };

    const tenantUser = await prisma.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId: shell.tenant.id, userId: user.id } },
      include: { notificationPreference: true },
    });
    if (!tenantUser) return { error: "Not found" };
    if (tenantUser.notificationPreference?.emailEnabled === false) {
      return { skipped: true };
    }

    const result = await sendAvailabilityUpdateRequestEmail({
      to: user.email,
      recipientName: user.name,
      tenantName: shell.tenant.name,
      tenantSlug: parsed.data.tenantSlug,
      reasonCode: parsed.data.reasonCode as AvailabilityNotifyReason,
      managerNote: parsed.data.note,
      shiftTitle: shift.title,
      siteName: shift.site.name,
      shiftStartsAtLabel: formatShiftStartsAt(shift.startsAt, shift.site.timezone),
    });

    if ("skipped" in result && result.skipped) {
      return { skipped: true };
    }

    await writeAuditLog({
      tenantId: shell.tenant.id,
      actorUserId: session.user.id,
      action: "availability.notify",
      entityType: "User",
      entityId: user.id,
      metadata: {
        shiftId: parsed.data.shiftId,
        reasonCode: parsed.data.reasonCode,
      },
    });

    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}
