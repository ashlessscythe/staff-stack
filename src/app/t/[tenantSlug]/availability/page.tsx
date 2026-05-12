import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db";
import { hasPermission, permissionsForRole } from "@/lib/rbac";
import { addAvailabilityRuleAction } from "@/server/actions/availability";
import { requireTenantShell } from "@/server/tenant-context";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function AvailabilityPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const shell = await requireTenantShell(tenantSlug);

  const canEdit = shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), "availability:write:self"),
  );

  const rules = await prisma.availabilityRule.findMany({
    where: { tenantUserId: shell.tenantUser.id },
    orderBy: { dayOfWeek: "asc" },
  });

  const pto = await prisma.ptoRequest.findMany({
    where: { tenantUserId: shell.tenantUser.id },
    orderBy: { startsOn: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Availability</h1>
        <p className="text-sm text-zinc-500">
          Weekly patterns and PTO requests for your user in this tenant.
        </p>
      </div>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Add weekly rule</CardTitle>
            <CardDescription>Minutes from midnight (local UI convention).</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={addAvailabilityRuleAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="tenantSlug" value={tenantSlug} />
              <div className="space-y-2">
                <Label htmlFor="dayOfWeek">Day</Label>
                <select
                  id="dayOfWeek"
                  name="dayOfWeek"
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                >
                  {days.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startMinute">Start minute</Label>
                <Input id="startMinute" name="startMinute" type="number" defaultValue={9 * 60} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endMinute">End minute</Label>
                <Input id="endMinute" name="endMinute" type="number" defaultValue={17 * 60} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Add rule</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your rules</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {rules.map((r) => (
              <li key={r.id}>
                {days[r.dayOfWeek]} · {r.startMinute}–{r.endMinute}
              </li>
            ))}
            {rules.length === 0 && <p className="text-zinc-500">No rules yet.</p>}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PTO</CardTitle>
          <CardDescription>Seeded requests appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {pto.map((p) => (
              <li key={p.id}>
                {p.startsOn.toDateString()} → {p.endsOn.toDateString()} · {p.status}
              </li>
            ))}
            {pto.length === 0 && <p className="text-zinc-500">No PTO.</p>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
