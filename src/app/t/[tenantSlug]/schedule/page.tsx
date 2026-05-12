import { formatInTimeZone } from "date-fns-tz";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db";
import { hasPermission, permissionsForRole } from "@/lib/rbac";
import {
  assignShiftFormAction,
  acknowledgeShiftFormAction,
  checkInFormAction,
  createShiftAction,
  markNoShowFormAction,
  publishShiftFormAction,
} from "@/server/actions/shifts";
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

      <div className="space-y-4">
        {shifts.map((shift) => {
          const tz = shift.site.timezone;
          return (
            <Card key={shift.id}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>{shift.title}</CardTitle>
                  <CardDescription>
                    {shift.site.name} · {shift.status} ·{" "}
                    {formatInTimeZone(shift.startsAt, tz, "MMM d, yyyy HH:mm")} →{" "}
                    {formatInTimeZone(shift.endsAt, tz, "HH:mm zzz")}
                  </CardDescription>
                </div>
                {canWrite && shift.status === "DRAFT" && (
                  <form action={publishShiftFormAction}>
                    <input type="hidden" name="tenantSlug" value={tenantSlug} />
                    <input type="hidden" name="shiftId" value={shift.id} />
                    <Button type="submit" size="sm" variant="secondary">
                      Publish
                    </Button>
                  </form>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs font-medium uppercase text-zinc-500">Assignments</p>
                <ul className="space-y-2 text-sm">
                  {shift.assignments.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center gap-2 border-b border-zinc-100 pb-2 dark:border-zinc-900"
                    >
                      <span className="font-mono text-xs">
                        {userEmailById[a.userId] ?? a.userId}
                      </span>
                      {a.userId === shell.tenantUser.userId && !a.acknowledgedAt && (
                        <form action={acknowledgeShiftFormAction}>
                          <input type="hidden" name="tenantSlug" value={tenantSlug} />
                          <input type="hidden" name="shiftId" value={shift.id} />
                          <Button type="submit" size="sm" variant="outline">
                            Acknowledge
                          </Button>
                        </form>
                      )}
                      {a.userId === shell.tenantUser.userId && a.acknowledgedAt && (
                        <span className="text-emerald-600">Acknowledged</span>
                      )}
                      {a.userId !== shell.tenantUser.userId && a.acknowledgedAt && (
                        <span className="text-emerald-600">Acknowledged</span>
                      )}
                      {a.userId !== shell.tenantUser.userId && !a.acknowledgedAt && (
                        <span className="text-zinc-400">Pending ack</span>
                      )}
                      {a.userId === shell.tenantUser.userId && !a.checkInAt && (
                        <form action={checkInFormAction}>
                          <input type="hidden" name="tenantSlug" value={tenantSlug} />
                          <input type="hidden" name="shiftId" value={shift.id} />
                          <Button type="submit" size="sm" variant="ghost">
                            Check in
                          </Button>
                        </form>
                      )}
                      {a.checkInAt && <span className="text-xs text-zinc-500">Checked in</span>}
                      {canAssign && a.userId !== shell.tenantUser.userId && (
                        <form action={markNoShowFormAction} className="inline">
                          <input type="hidden" name="tenantSlug" value={tenantSlug} />
                          <input type="hidden" name="shiftId" value={shift.id} />
                          <input type="hidden" name="userId" value={a.userId} />
                          <Button type="submit" size="sm" variant="destructive">
                            Mark no-show
                          </Button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
                {canAssign && (
                  <form
                    action={assignShiftFormAction}
                    className="flex flex-wrap items-end gap-2 pt-2"
                  >
                    <input type="hidden" name="tenantSlug" value={tenantSlug} />
                    <input type="hidden" name="shiftId" value={shift.id} />
                    <div className="space-y-1">
                      <Label htmlFor={`user-${shift.id}`}>Assign user</Label>
                      <select
                        id={`user-${shift.id}`}
                        name="userId"
                        className="h-10 min-w-[200px] rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                      >
                        {tenantUsers.map((tu) => (
                          <option key={tu.userId} value={tu.userId}>
                            {tu.user.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button type="submit" size="sm">
                      Assign
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
        {shifts.length === 0 && <p className="text-sm text-zinc-500">No shifts in this window.</p>}
      </div>
    </div>
  );
}
