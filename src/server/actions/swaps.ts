"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hasPermission, permissionsForRole } from "@/lib/rbac";
import { writeAuditLog } from "@/server/audit";
import { requireTenantShell } from "@/server/tenant-context";

function canApprove(shell: Awaited<ReturnType<typeof requireTenantShell>>) {
  return shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), "swap:approve"),
  );
}

export async function approveSwapFormAction(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const swapId = String(formData.get("swapId") ?? "");
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const shell = await requireTenantShell(tenantSlug);
  if (!canApprove(shell)) throw new Error("Forbidden");

  const swap = await prisma.shiftSwap.findFirst({
    where: { id: swapId, tenantId: shell.tenant.id, status: "REQUESTED" },
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

  revalidatePath(`/t/${tenantSlug}/swaps`);
  revalidatePath(`/t/${tenantSlug}/schedule`);
}

export async function denySwapFormAction(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const swapId = String(formData.get("swapId") ?? "");
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const shell = await requireTenantShell(tenantSlug);
  if (!canApprove(shell)) throw new Error("Forbidden");

  const existing = await prisma.shiftSwap.findFirst({
    where: { id: swapId, tenantId: shell.tenant.id, status: "REQUESTED" },
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

  revalidatePath(`/t/${tenantSlug}/swaps`);
}
