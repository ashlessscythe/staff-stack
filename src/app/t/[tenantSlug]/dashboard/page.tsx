import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { hasPermission, permissionsForRole } from "@/lib/rbac";
import { getActionableSwapCount } from "@/lib/swap-counts";
import { requireTenantShell } from "@/server/tenant-context";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const shell = await requireTenantShell(tenantSlug);
  const userId = shell.tenantUser.userId;

  const canApprove = shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), "swap:approve"),
  );
  const canRequest = shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), "swap:request"),
  );
  const primaryRole = shell.memberships[0]?.role;
  const perms = primaryRole
    ? permissionsForRole(primaryRole, shell.memberships[0]?.permissions ?? [])
    : [];
  const canWriteShift = hasPermission(perms, "shift:write");

  const [shiftCount, swapSummary] = await Promise.all([
    prisma.shift.count({ where: { tenantId: shell.tenant.id, deletedAt: null } }),
    getActionableSwapCount(shell.tenant.id, userId, canApprove, canRequest),
  ]);

  const swapsHref = `/t/${tenantSlug}/swaps${swapSummary.hrefSuffix}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
        <p className="text-sm text-zinc-500">Overview for {shell.tenant.slug}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Shifts</CardTitle>
            <CardDescription>Total shifts in tenant</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{shiftCount}</p>
          </CardContent>
        </Card>
        <Link
          href={swapsHref}
          className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          <Card className="h-full transition-colors group-hover:border-zinc-400 dark:group-hover:border-zinc-600">
            <CardHeader>
              <CardTitle>Pending swaps</CardTitle>
              <CardDescription>{swapSummary.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">{swapSummary.count}</p>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Your access</CardTitle>
            <CardDescription>Primary site role</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm">{primaryRole ?? "none"}</p>
            <p className="mt-2 text-xs text-zinc-500">
              shift:write: {canWriteShift ? "yes" : "no"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
