import {
  SwapRequestCard,
  SwapsEmptyHint,
  type SwapCardData,
} from "@/components/swaps/swap-request-card";
import { prisma } from "@/lib/db";
import { hasPermission, permissionsForRole } from "@/lib/rbac";
import { buildSwapConstraintSummaries } from "@/server/scheduling/swap-constraint-summary";
import { requireTenantShell } from "@/server/tenant-context";

const ACTIVE_STATUSES = ["REQUESTED", "PENDING_APPROVAL"] as const;

const swapInclude = {
  fromShift: {
    select: {
      title: true,
      startsAt: true,
      endsAt: true,
      site: { select: { timezone: true } },
    },
  },
  toShift: {
    select: {
      title: true,
      startsAt: true,
      endsAt: true,
      site: { select: { timezone: true } },
    },
  },
  requesterAssignment: { select: { userId: true } },
  targetAssignment: { select: { userId: true } },
} as const;

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

export default async function SwapsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ swapError?: string; swapId?: string; codes?: string }>;
}) {
  const { tenantSlug } = await params;
  const sp = await searchParams;
  const shell = await requireTenantShell(tenantSlug);
  const userId = shell.tenantUser.userId;

  const canApprove = shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), "swap:approve"),
  );
  const canRequest = shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), "swap:request"),
  );

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

  const constraintSwaps = [...incoming, ...awaitingApproval];
  const constraintSummaries = await buildSwapConstraintSummaries(
    shell.tenant.id,
    constraintSwaps,
    shell.tenant.settings,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Shift swaps</h1>
        <p className="text-sm text-zinc-500">
          Request swaps from the schedule, respond to incoming requests, and track approval status.
        </p>
      </div>

      {sp.swapError === "constraints" && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          Swap blocked by scheduling constraints
          {sp.codes ? ` (${sp.codes.replace(/,/g, ", ")})` : ""}.
          {sp.swapId ? ` Swap ${sp.swapId.slice(0, 8)}…` : ""}
        </p>
      )}

      <section id="needs-response" className="scroll-mt-8 space-y-4">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Needs your response</h2>
        <div className="space-y-4">
          {incoming.map((s) => (
            <SwapRequestCard
              key={s.id}
              swap={toSwapCard(s, emailByUserId)}
              tenantSlug={tenantSlug}
              showAcceptDecline
              constraintSummary={constraintSummaries[s.id]}
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
                constraintSummary={constraintSummaries[s.id]}
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
