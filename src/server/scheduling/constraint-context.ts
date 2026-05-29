import { prisma } from "@/lib/db";
import type {
  AvailabilityExceptionInput,
  AvailabilityRuleInput,
  PtoRequestInput,
} from "@/lib/scheduling-constraints";

export type UserConstraintContext = {
  rules: AvailabilityRuleInput[];
  exceptions: AvailabilityExceptionInput[];
  ptoRequests: PtoRequestInput[];
};

export async function loadConstraintContextForTenantUser(
  tenantUserId: string,
  opts?: { dateFrom?: Date; dateTo?: Date },
): Promise<UserConstraintContext> {
  const [rules, exceptions, ptoRequests] = await Promise.all([
    prisma.availabilityRule.findMany({
      where: { tenantUserId },
      select: { dayOfWeek: true, startMinute: true, endMinute: true },
    }),
    prisma.availabilityException.findMany({
      where: {
        tenantUserId,
        ...(opts?.dateFrom && opts?.dateTo
          ? { date: { gte: opts.dateFrom, lte: opts.dateTo } }
          : {}),
      },
      select: { date: true, available: true },
    }),
    prisma.ptoRequest.findMany({
      where: {
        tenantUserId,
        status: { in: ["REQUESTED", "APPROVED"] },
        ...(opts?.dateFrom && opts?.dateTo
          ? {
              startsOn: { lte: opts.dateTo },
              endsOn: { gte: opts.dateFrom },
            }
          : {}),
      },
      select: { startsOn: true, endsOn: true, status: true },
    }),
  ]);

  return {
    rules,
    exceptions,
    ptoRequests: ptoRequests.map((p) => ({
      startsOn: p.startsOn,
      endsOn: p.endsOn,
      status: p.status,
    })),
  };
}

export async function loadConstraintContextBatch(
  tenantUserIds: string[],
  dateRange?: { from: Date; to: Date },
): Promise<Map<string, UserConstraintContext>> {
  if (tenantUserIds.length === 0) return new Map();

  const dateFilter =
    dateRange != null ? { date: { gte: dateRange.from, lte: dateRange.to } } : undefined;
  const ptoFilter =
    dateRange != null
      ? { startsOn: { lte: dateRange.to }, endsOn: { gte: dateRange.from } }
      : undefined;

  const [rules, exceptions, ptoRequests] = await Promise.all([
    prisma.availabilityRule.findMany({
      where: { tenantUserId: { in: tenantUserIds } },
      select: { tenantUserId: true, dayOfWeek: true, startMinute: true, endMinute: true },
    }),
    prisma.availabilityException.findMany({
      where: { tenantUserId: { in: tenantUserIds }, ...dateFilter },
      select: { tenantUserId: true, date: true, available: true },
    }),
    prisma.ptoRequest.findMany({
      where: {
        tenantUserId: { in: tenantUserIds },
        status: { in: ["REQUESTED", "APPROVED"] },
        ...ptoFilter,
      },
      select: { tenantUserId: true, startsOn: true, endsOn: true, status: true },
    }),
  ]);

  const map = new Map<string, UserConstraintContext>();
  for (const id of tenantUserIds) {
    map.set(id, { rules: [], exceptions: [], ptoRequests: [] });
  }
  for (const r of rules) {
    map.get(r.tenantUserId)!.rules.push({
      dayOfWeek: r.dayOfWeek,
      startMinute: r.startMinute,
      endMinute: r.endMinute,
    });
  }
  for (const e of exceptions) {
    map.get(e.tenantUserId)!.exceptions.push({ date: e.date, available: e.available });
  }
  for (const p of ptoRequests) {
    map.get(p.tenantUserId)!.ptoRequests.push({
      startsOn: p.startsOn,
      endsOn: p.endsOn,
      status: p.status,
    });
  }
  return map;
}

export async function tenantUserIdForUser(
  tenantId: string,
  userId: string,
): Promise<string | null> {
  const tu = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { id: true },
  });
  return tu?.id ?? null;
}
