import {
  SwapRequestCard,
  SwapsEmptyHint,
  type SwapCardData,
} from "@/components/swaps/swap-request-card";
import { prisma } from "@/lib/db";
import { hasPermission, permissionsForRole } from "@/lib/rbac";
import { requireTenantShell } from "@/server/tenant-context";

const ACTIVE_STATUSES = ["REQUESTED", "PENDING_APPROVAL"] as const;

function toSwapCard(
  swap: {
    id: string;
    status: string;
    message: string | null;
    fromShift: { title: string; startsAt: Date };
    toShift: { title: string; startsAt: Date };
    requesterAssignment: { userId: string };
    targetAssignment: { userId: string } | null;
  },
  emailByUserId: Record<string, string>,
): SwapCardData {
  return {
    id: swap.id,
    status: swap.status,
    message: swap.message,
    fromShift: swap.fromShift,
    toShift: swap.toShift,
    requesterEmail:
      emailByUserId[swap.requesterAssignment.userId] ?? swap.requesterAssignment.userId,
    targetEmail: swap.targetAssignment
      ? (emailByUserId[swap.targetAssignment.userId] ?? swap.targetAssignment.userId)
      : "—",
  };
}

export default async function SwapsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const shell = await requireTenantShell(tenantSlug);
  const userId = shell.tenantUser.userId;

  const canApprove = shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), "swap:approve"),
  );
  const canRequest = shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), "swap:request"),
  );

  const swapInclude = {
    fromShift: { select: { title: true, startsAt: true } },
    toShift: { select: { title: true, startsAt: true } },
    requesterAssignment: { select: { userId: true } },
    targetAssignment: { select: { userId: true } },
  } as const;

  const [tenantUsers, incoming, outgoing, awaitingApproval] = await Promise.all([
    prisma.tenantUser.findMany({
      where: { tenantId: shell.tenant.id, isActive: true },
      include: { user: { select: { id: true, email: true } } },
    }),
    prisma.shiftSwap.findMany({
      where: {
        tenantId: shell.tenant.id,
        status: "REQUESTED",
        targetAssignment: { userId },
      },
      orderBy: { createdAt: "desc" },
      include: swapInclude,
    }),
    canRequest
      ? prisma.shiftSwap.findMany({
          where: {
            tenantId: shell.tenant.id,
            requesterAssignment: { userId },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: swapInclude,
        })
      : Promise.resolve([]),
    canApprove
      ? prisma.shiftSwap.findMany({
          where: { tenantId: shell.tenant.id, status: "PENDING_APPROVAL" },
          orderBy: { createdAt: "desc" },
          include: swapInclude,
        })
      : Promise.resolve([]),
  ]);

  const emailByUserId = Object.fromEntries(tenantUsers.map((tu) => [tu.userId, tu.user.email]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Shift swaps</h1>
        <p className="text-sm text-zinc-500">
          Request swaps from the schedule, respond to incoming requests, and track approval status.
        </p>
      </div>

      <section id="needs-response" className="scroll-mt-8 space-y-4">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Needs your response</h2>
        <div className="space-y-4">
          {incoming.map((s) => (
            <SwapRequestCard
              key={s.id}
              swap={toSwapCard(s, emailByUserId)}
              tenantSlug={tenantSlug}
              showAcceptDecline
            />
          ))}
          {incoming.length === 0 && (
            <p className="text-sm text-zinc-500">No incoming swap requests.</p>
          )}
        </div>
      </section>

      {canRequest && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Your requests</h2>
          <div className="space-y-4">
            {outgoing.map((s) => (
              <SwapRequestCard
                key={s.id}
                swap={toSwapCard(s, emailByUserId)}
                tenantSlug={tenantSlug}
                showCancel={ACTIVE_STATUSES.includes(s.status as (typeof ACTIVE_STATUSES)[number])}
              />
            ))}
            {outgoing.length === 0 && <SwapsEmptyHint tenantSlug={tenantSlug} />}
          </div>
        </section>
      )}

      {canApprove && (
        <section id="awaiting-approval" className="scroll-mt-8 space-y-4">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Awaiting manager approval
          </h2>
          <div className="space-y-4">
            {awaitingApproval.map((s) => (
              <SwapRequestCard
                key={s.id}
                swap={toSwapCard(s, emailByUserId)}
                tenantSlug={tenantSlug}
                showApproveDeny
              />
            ))}
            {awaitingApproval.length === 0 && (
              <p className="text-sm text-zinc-500">No swaps awaiting manager approval.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
