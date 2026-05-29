"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hasPermission, permissionsForRole } from "@/lib/rbac";
import { writeAuditLog } from "@/server/audit";
import { requireTenantShell } from "@/server/tenant-context";

const ACTIVE_SWAP_STATUSES = ["REQUESTED", "PENDING_APPROVAL"] as const;

const requestSchema = z.object({
  tenantSlug: z.string().min(1),
  requesterAssignmentId: z.string().uuid(),
  targetAssignmentId: z.string().uuid(),
  message: z.string().max(2000).optional(),
});

const swapIdSchema = z.object({
  tenantSlug: z.string().min(1),
  swapId: z.string().uuid(),
});

function canApprove(shell: Awaited<ReturnType<typeof requireTenantShell>>) {
  return shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), "swap:approve"),
  );
}

function canRequest(shell: Awaited<ReturnType<typeof requireTenantShell>>) {
  return shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), "swap:request"),
  );
}

function revalidateSwapPaths(tenantSlug: string) {
  revalidatePath(`/t/${tenantSlug}/swaps`);
  revalidatePath(`/t/${tenantSlug}/schedule`);
  revalidatePath(`/t/${tenantSlug}/dashboard`);
}

async function assertNoActiveSwapOnAssignments(
  tenantId: string,
  assignmentIds: string[],
  excludeSwapId?: string,
) {
  const existing = await prisma.shiftSwap.findFirst({
    where: {
      tenantId,
      status: { in: [...ACTIVE_SWAP_STATUSES] },
      id: excludeSwapId ? { not: excludeSwapId } : undefined,
      OR: [
        { requesterAssignmentId: { in: assignmentIds } },
        { targetAssignmentId: { in: assignmentIds } },
      ],
    },
  });
  if (existing) throw new Error("An active swap already exists for one of these assignments");
}

export async function requestSwapFormAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = requestSchema.safeParse({
    tenantSlug: formData.get("tenantSlug"),
    requesterAssignmentId: formData.get("requesterAssignmentId"),
    targetAssignmentId: formData.get("targetAssignmentId"),
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) throw new Error("Invalid form");

  const shell = await requireTenantShell(parsed.data.tenantSlug);
  if (!canRequest(shell)) throw new Error("Forbidden");

  const now = new Date();
  const requesterAssignment = await prisma.shiftAssignment.findFirst({
    where: {
      id: parsed.data.requesterAssignmentId,
      tenantId: shell.tenant.id,
      userId: session.user.id,
    },
    include: { shift: true },
  });
  if (!requesterAssignment) throw new Error("Assignment not found");

  const targetAssignment = await prisma.shiftAssignment.findFirst({
    where: {
      id: parsed.data.targetAssignmentId,
      tenantId: shell.tenant.id,
    },
    include: { shift: true },
  });
  if (!targetAssignment) throw new Error("Target assignment not found");
  if (targetAssignment.userId === session.user.id) throw new Error("Cannot swap with yourself");
  if (targetAssignment.shiftId === requesterAssignment.shiftId) {
    throw new Error("Cannot swap within the same shift");
  }

  for (const shift of [requesterAssignment.shift, targetAssignment.shift]) {
    if (shift.status !== "PUBLISHED") throw new Error("Only published shifts can be swapped");
    if (shift.startsAt <= now) throw new Error("Only future shifts can be swapped");
  }

  await assertNoActiveSwapOnAssignments(shell.tenant.id, [
    requesterAssignment.id,
    targetAssignment.id,
  ]);

  const swap = await prisma.shiftSwap.create({
    data: {
      tenantId: shell.tenant.id,
      status: "REQUESTED",
      requesterAssignmentId: requesterAssignment.id,
      targetAssignmentId: targetAssignment.id,
      fromShiftId: requesterAssignment.shiftId,
      toShiftId: targetAssignment.shiftId,
      message: parsed.data.message,
    },
  });

  await writeAuditLog({
    tenantId: shell.tenant.id,
    actorUserId: session.user.id,
    action: "swap.request",
    entityType: "ShiftSwap",
    entityId: swap.id,
  });

  revalidateSwapPaths(parsed.data.tenantSlug);
}

export async function acceptSwapFormAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = swapIdSchema.safeParse({
    tenantSlug: formData.get("tenantSlug"),
    swapId: formData.get("swapId"),
  });
  if (!parsed.success) throw new Error("Invalid form");

  const shell = await requireTenantShell(parsed.data.tenantSlug);

  const swap = await prisma.shiftSwap.findFirst({
    where: {
      id: parsed.data.swapId,
      tenantId: shell.tenant.id,
      status: "REQUESTED",
    },
    include: { targetAssignment: true },
  });
  if (!swap?.targetAssignment) throw new Error("Swap not found");
  if (swap.targetAssignment.userId !== session.user.id) throw new Error("Forbidden");

  await prisma.shiftSwap.update({
    where: { id: swap.id },
    data: { status: "PENDING_APPROVAL" },
  });

  await writeAuditLog({
    tenantId: shell.tenant.id,
    actorUserId: session.user.id,
    action: "swap.accept",
    entityType: "ShiftSwap",
    entityId: swap.id,
  });

  revalidateSwapPaths(parsed.data.tenantSlug);
}

export async function declineSwapFormAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = swapIdSchema.safeParse({
    tenantSlug: formData.get("tenantSlug"),
    swapId: formData.get("swapId"),
  });
  if (!parsed.success) throw new Error("Invalid form");

  const shell = await requireTenantShell(parsed.data.tenantSlug);

  const swap = await prisma.shiftSwap.findFirst({
    where: {
      id: parsed.data.swapId,
      tenantId: shell.tenant.id,
      status: "REQUESTED",
    },
    include: { targetAssignment: true },
  });
  if (!swap?.targetAssignment) throw new Error("Swap not found");
  if (swap.targetAssignment.userId !== session.user.id) throw new Error("Forbidden");

  await prisma.shiftSwap.update({
    where: { id: swap.id },
    data: { status: "TARGET_DECLINED", reviewedByUserId: session.user.id, reviewedAt: new Date() },
  });

  await writeAuditLog({
    tenantId: shell.tenant.id,
    actorUserId: session.user.id,
    action: "swap.decline",
    entityType: "ShiftSwap",
    entityId: swap.id,
  });

  revalidateSwapPaths(parsed.data.tenantSlug);
}

export async function cancelSwapFormAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = swapIdSchema.safeParse({
    tenantSlug: formData.get("tenantSlug"),
    swapId: formData.get("swapId"),
  });
  if (!parsed.success) throw new Error("Invalid form");

  const shell = await requireTenantShell(parsed.data.tenantSlug);

  const swap = await prisma.shiftSwap.findFirst({
    where: {
      id: parsed.data.swapId,
      tenantId: shell.tenant.id,
      status: { in: [...ACTIVE_SWAP_STATUSES] },
    },
    include: { requesterAssignment: true },
  });
  if (!swap) throw new Error("Swap not found");
  if (swap.requesterAssignment.userId !== session.user.id) throw new Error("Forbidden");

  await prisma.shiftSwap.update({
    where: { id: swap.id },
    data: { status: "CANCELLED" },
  });

  await writeAuditLog({
    tenantId: shell.tenant.id,
    actorUserId: session.user.id,
    action: "swap.cancel",
    entityType: "ShiftSwap",
    entityId: swap.id,
  });

  revalidateSwapPaths(parsed.data.tenantSlug);
}

export async function approveSwapFormAction(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const swapId = String(formData.get("swapId") ?? "");
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const shell = await requireTenantShell(tenantSlug);
  if (!canApprove(shell)) throw new Error("Forbidden");

  const swap = await prisma.shiftSwap.findFirst({
    where: { id: swapId, tenantId: shell.tenant.id, status: "PENDING_APPROVAL" },
    include: {
      requesterAssignment: true,
      targetAssignment: true,
    },
  });
  if (!swap?.targetAssignment) throw new Error("Invalid swap");
  const targetAssignment = swap.targetAssignment;

  await prisma.$transaction(async (tx) => {
    const reqUser = swap.requesterAssignment.userId;
    const tgtUser = targetAssignment.userId;

    await tx.shiftAssignment.update({
      where: { id: swap.requesterAssignmentId },
      data: { userId: tgtUser },
    });
    await tx.shiftAssignment.update({
      where: { id: swap.targetAssignmentId! },
      data: { userId: reqUser },
    });

    await tx.shiftSwap.update({
      where: { id: swap.id },
      data: { status: "APPROVED", reviewedByUserId: session.user.id, reviewedAt: new Date() },
    });
  });

  await writeAuditLog({
    tenantId: shell.tenant.id,
    actorUserId: session.user.id,
    action: "swap.approve",
    entityType: "ShiftSwap",
    entityId: swap.id,
  });

  revalidateSwapPaths(tenantSlug);
}

export async function denySwapFormAction(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const swapId = String(formData.get("swapId") ?? "");
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const shell = await requireTenantShell(tenantSlug);
  if (!canApprove(shell)) throw new Error("Forbidden");

  const existing = await prisma.shiftSwap.findFirst({
    where: { id: swapId, tenantId: shell.tenant.id, status: "PENDING_APPROVAL" },
  });
  if (!existing) return;

  await prisma.shiftSwap.update({
    where: { id: swapId },
    data: { status: "DENIED", reviewedByUserId: session.user.id, reviewedAt: new Date() },
  });

  await writeAuditLog({
    tenantId: shell.tenant.id,
    actorUserId: session.user.id,
    action: "swap.deny",
    entityType: "ShiftSwap",
    entityId: swapId,
  });

  revalidateSwapPaths(tenantSlug);
}
