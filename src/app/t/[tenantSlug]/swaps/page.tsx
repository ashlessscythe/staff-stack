import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { hasPermission, permissionsForRole } from "@/lib/rbac";
import { approveSwapFormAction, denySwapFormAction } from "@/server/actions/swaps";
import { requireTenantShell } from "@/server/tenant-context";

export default async function SwapsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const shell = await requireTenantShell(tenantSlug);

  const canApprove = shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), "swap:approve"),
  );

  const swaps = await prisma.shiftSwap.findMany({
    where: { tenantId: shell.tenant.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      fromShift: { select: { title: true, startsAt: true } },
      toShift: { select: { title: true, startsAt: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Shift swaps</h1>
        <p className="text-sm text-zinc-500">Approve or deny requests (manager+).</p>
      </div>
      <div className="space-y-4">
        {swaps.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="text-base">{s.status}</CardTitle>
              <CardDescription>
                {s.fromShift.title} → {s.toShift.title}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {canApprove && s.status === "REQUESTED" && (
                <>
                  <form action={approveSwapFormAction}>
                    <input type="hidden" name="tenantSlug" value={tenantSlug} />
                    <input type="hidden" name="swapId" value={s.id} />
                    <Button type="submit" size="sm">
                      Approve
                    </Button>
                  </form>
                  <form action={denySwapFormAction}>
                    <input type="hidden" name="tenantSlug" value={tenantSlug} />
                    <input type="hidden" name="swapId" value={s.id} />
                    <Button type="submit" size="sm" variant="outline">
                      Deny
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        ))}
        {swaps.length === 0 && <p className="text-sm text-zinc-500">No swaps yet.</p>}
      </div>
    </div>
  );
}
