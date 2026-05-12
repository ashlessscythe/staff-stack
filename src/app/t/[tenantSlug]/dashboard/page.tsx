import { prisma } from "@/lib/db";
import { permissionsForRole, hasPermission } from "@/lib/rbac";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTenantShell } from "@/server/tenant-context";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const shell = await requireTenantShell(tenantSlug);
  const primaryRole = shell.memberships[0]?.role;
  const perms = primaryRole
    ? permissionsForRole(primaryRole, shell.memberships[0]?.permissions ?? [])
    : [];

  const [shiftCount, pendingSwaps] = await Promise.all([
    prisma.shift.count({ where: { tenantId: shell.tenant.id, deletedAt: null } }),
    prisma.shiftSwap.count({ where: { tenantId: shell.tenant.id, status: "REQUESTED" } }),
  ]);

  const canWriteShift = hasPermission(perms, "shift:write");

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
        <Card>
          <CardHeader>
            <CardTitle>Pending swaps</CardTitle>
            <CardDescription>Awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{pendingSwaps}</p>
          </CardContent>
        </Card>
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
