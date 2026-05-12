import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

type AuditInput = {
  tenantId: string | null;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
};

export async function writeAuditLog(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? undefined,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      ip: input.ip ?? undefined,
      userAgent: input.userAgent ?? undefined,
    },
  });
}
