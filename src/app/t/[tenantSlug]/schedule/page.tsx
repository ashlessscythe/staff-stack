import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScheduleShiftsTable } from "@/components/schedule/schedule-shifts-table";
import { prisma } from "@/lib/db";
import { hasPermission, permissionsForRole } from "@/lib/rbac";
import { weekStartsOnFromSettings } from "@/lib/tenant-settings";
import { createShiftAction } from "@/server/actions/shifts";
import { requireTenantShell } from "@/server/tenant-context";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const shell = await requireTenantShell(tenantSlug);

  const canWrite = shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), "shift:write"),
  );
  const canAssign = shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), "assignment:write"),
  );

  const from = new Date();
  const to = new Date();
  to.setUTCDate(to.getUTCDate() + 30);

  const [shifts, sites, tenantUsers] = await Promise.all([
    prisma.shift.findMany({
      where: {
        tenantId: shell.tenant.id,
        deletedAt: null,
        startsAt: { gte: from, lte: to },
      },
      orderBy: { startsAt: "asc" },
      include: {
        site: true,
        assignments: true,
      },
    }),
    prisma.site.findMany({ where: { tenantId: shell.tenant.id } }),
    prisma.tenantUser.findMany({
      where: { tenantId: shell.tenant.id, isActive: true },
      include: { user: { select: { id: true, email: true, name: true } } },
    }),
  ]);

  const defaultSiteId = sites[0]?.id ?? "";

  const userEmailById = Object.fromEntries(tenantUsers.map((tu) => [tu.userId, tu.user.email]));
  const weekStartsOn = weekStartsOnFromSettings(shell.tenant.settings);

  const tableShifts = shifts.map((shift) => ({
    id: shift.id,
    title: shift.title,
    status: shift.status,
    startsAt: shift.startsAt.toISOString(),
    endsAt: shift.endsAt.toISOString(),
    site: { name: shift.site.name, timezone: shift.site.timezone },
    assignments: shift.assignments.map((a) => ({
      id: a.id,
      userId: a.userId,
      acknowledgedAt: a.acknowledgedAt?.toISOString() ?? null,
      checkInAt: a.checkInAt?.toISOString() ?? null,
    })),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Schedule</h1>
        <p className="text-sm text-zinc-500">Next 30 days · timezone shown per site</p>
      </div>

      {canWrite && defaultSiteId && (
        <Card>
          <CardHeader>
            <CardTitle>Create shift (draft)</CardTitle>
            <CardDescription>Requires shift:write on at least one site.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createShiftAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="tenantSlug" value={tenantSlug} />
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="siteId">Site</Label>
                <select
                  id="siteId"
                  name="siteId"
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  defaultValue={defaultSiteId}
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" placeholder="Floor coverage" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startsAt">Starts (ISO)</Label>
                <Input
                  id="startsAt"
                  name="startsAt"
                  type="text"
                  placeholder="2026-05-15T14:00:00.000Z"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endsAt">Ends (ISO)</Label>
                <Input
                  id="endsAt"
                  name="endsAt"
                  type="text"
                  placeholder="2026-05-15T22:00:00.000Z"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Create draft</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <ScheduleShiftsTable
        tenantSlug={tenantSlug}
        currentUserId={shell.tenantUser.userId}
        weekStartsOn={weekStartsOn}
        shifts={tableShifts}
        canWrite={canWrite}
        canAssign={canAssign}
        userEmailById={userEmailById}
        tenantUsers={tenantUsers.map((tu) => ({ userId: tu.userId, email: tu.user.email }))}
      />
    </div>
  );
}
