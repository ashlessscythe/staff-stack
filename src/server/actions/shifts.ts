"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hasPermission, permissionsForRole } from "@/lib/rbac";
import { writeAuditLog } from "@/server/audit";
import { assertUserCanTakeShift } from "@/server/scheduling/assert-user-can-take-shift";
import { tenantUserIdForUser } from "@/server/scheduling/constraint-context";
import { requireTenantShell } from "@/server/tenant-context";

function canOnAnySite(
  shell: Awaited<ReturnType<typeof requireTenantShell>>,
  permission: import("@/lib/rbac").Permission,
) {
  return shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), permission),
  );
}

const createShiftSchema = z.object({
  tenantSlug: z.string().min(1),
  siteId: z.string().uuid(),
  title: z.string().min(1).max(200),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
});

export async function createShiftAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = createShiftSchema.safeParse({
    tenantSlug: formData.get("tenantSlug"),
    siteId: formData.get("siteId"),
    title: formData.get("title"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
  });
  if (!parsed.success) {
    redirect(`/t/${String(formData.get("tenantSlug"))}/schedule?error=validation`);
  }

  const shell = await requireTenantShell(parsed.data.tenantSlug);
  if (!canOnAnySite(shell, "shift:write")) {
    redirect(`/t/${parsed.data.tenantSlug}/schedule?error=forbidden`);
  }

  const siteOk = shell.memberships.some((m) => m.siteId === parsed.data.siteId);
  if (!siteOk) redirect(`/t/${parsed.data.tenantSlug}/schedule?error=site`);

  const shift = await prisma.shift.create({
    data: {
      tenantId: shell.tenant.id,
      siteId: parsed.data.siteId,
      title: parsed.data.title,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      status: "DRAFT",
    },
  });

  await writeAuditLog({
    tenantId: shell.tenant.id,
    actorUserId: session.user.id,
    action: "shift.create",
    entityType: "Shift",
    entityId: shift.id,
    metadata: { siteId: parsed.data.siteId },
  });

  revalidatePath(`/t/${parsed.data.tenantSlug}/schedule`);
  redirect(`/t/${parsed.data.tenantSlug}/schedule`);
}

export async function publishShiftAction(tenantSlug: string, shiftId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const shell = await requireTenantShell(tenantSlug);
  if (!canOnAnySite(shell, "shift:write")) throw new Error("Forbidden");

  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, tenantId: shell.tenant.id, deletedAt: null },
  });
  if (!shift) throw new Error("Not found");

  await prisma.shift.update({
    where: { id: shift.id },
    data: { status: "PUBLISHED" },
  });

  await writeAuditLog({
    tenantId: shell.tenant.id,
    actorUserId: session.user.id,
    action: "shift.publish",
    entityType: "Shift",
    entityId: shift.id,
  });

  revalidatePath(`/t/${tenantSlug}/schedule`);
}

export async function assignShiftAction(
  tenantSlug: string,
  shiftId: string,
  userId: string,
  opts?: { forceAssign?: boolean },
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const shell = await requireTenantShell(tenantSlug);
  if (!canOnAnySite(shell, "assignment:write")) throw new Error("Forbidden");

  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, tenantId: shell.tenant.id, deletedAt: null },
    include: { site: { select: { timezone: true } } },
  });
  if (!shift) throw new Error("Not found");

  const tenantUserId = await tenantUserIdForUser(shell.tenant.id, userId);
  if (!tenantUserId) throw new Error("User not in tenant");

  await assertUserCanTakeShift({
    tenantUserId,
    shift: {
      startsAt: shift.startsAt,
      endsAt: shift.endsAt,
      site: shift.site,
    },
    tenantSettings: shell.tenant.settings,
    forceAssign: opts?.forceAssign,
    redirectTo: `/t/${tenantSlug}/schedule?assignError=constraints`,
  });

  await prisma.shiftAssignment.upsert({
    where: { shiftId_userId: { shiftId, userId } },
    create: { tenantId: shell.tenant.id, shiftId, userId },
    update: {},
  });

  await writeAuditLog({
    tenantId: shell.tenant.id,
    actorUserId: session.user.id,
    action: "shift.assign",
    entityType: "ShiftAssignment",
    metadata: { shiftId, userId },
  });

  revalidatePath(`/t/${tenantSlug}/schedule`);
}

export async function acknowledgeShiftAction(tenantSlug: string, shiftId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const shell = await requireTenantShell(tenantSlug);

  const assignment = await prisma.shiftAssignment.findFirst({
    where: { shiftId, userId: session.user.id, tenantId: shell.tenant.id },
  });
  if (!assignment) throw new Error("Not found");

  await prisma.shiftAssignment.update({
    where: { id: assignment.id },
    data: { acknowledgedAt: new Date() },
  });

  await writeAuditLog({
    tenantId: shell.tenant.id,
    actorUserId: session.user.id,
    action: "shift.ack",
    entityType: "ShiftAssignment",
    entityId: assignment.id,
  });

  revalidatePath(`/t/${tenantSlug}/schedule`);
}

export async function checkInAction(tenantSlug: string, shiftId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const shell = await requireTenantShell(tenantSlug);

  const assignment = await prisma.shiftAssignment.findFirst({
    where: { shiftId, userId: session.user.id, tenantId: shell.tenant.id },
  });
  if (!assignment) throw new Error("Not found");

  await prisma.shiftAssignment.update({
    where: { id: assignment.id },
    data: { checkInAt: new Date() },
  });

  revalidatePath(`/t/${tenantSlug}/schedule`);
}

export async function markNoShowAction(tenantSlug: string, shiftId: string, userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const shell = await requireTenantShell(tenantSlug);
  if (!canOnAnySite(shell, "assignment:write")) throw new Error("Forbidden");

  const assignment = await prisma.shiftAssignment.findFirst({
    where: { shiftId, userId, tenantId: shell.tenant.id },
  });
  if (!assignment) throw new Error("Not found");

  await prisma.shiftAssignment.update({
    where: { id: assignment.id },
    data: {
      noShowMarkedAt: new Date(),
      noShowMarkedByUserId: session.user.id,
    },
  });

  await writeAuditLog({
    tenantId: shell.tenant.id,
    actorUserId: session.user.id,
    action: "shift.noshow",
    entityType: "ShiftAssignment",
    entityId: assignment.id,
    metadata: { targetUserId: userId },
  });

  revalidatePath(`/t/${tenantSlug}/schedule`);
}

export async function publishShiftFormAction(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const shiftId = String(formData.get("shiftId") ?? "");
  await publishShiftAction(tenantSlug, shiftId);
}

export async function acknowledgeShiftFormAction(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const shiftId = String(formData.get("shiftId") ?? "");
  await acknowledgeShiftAction(tenantSlug, shiftId);
}

export async function checkInFormAction(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const shiftId = String(formData.get("shiftId") ?? "");
  await checkInAction(tenantSlug, shiftId);
}

export async function markNoShowFormAction(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const shiftId = String(formData.get("shiftId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  await markNoShowAction(tenantSlug, shiftId, userId);
}

export async function assignShiftFormAction(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const shiftId = String(formData.get("shiftId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const forceAssign = formData.get("forceAssign") === "1";
  await assignShiftAction(tenantSlug, shiftId, userId, { forceAssign });
}
