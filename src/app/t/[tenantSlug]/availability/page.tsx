import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AvailabilityExceptionForm } from "@/components/availability/availability-exception-form";
import { AvailabilityExceptionsList } from "@/components/availability/availability-exceptions-list";
import { AvailabilityRuleForm } from "@/components/availability/availability-rule-form";
import { AvailabilityRulesList } from "@/components/availability/availability-rules-list";
import { prisma } from "@/lib/db";
import { hasPermission, permissionsForRole } from "@/lib/rbac";
import { requireTenantShell } from "@/server/tenant-context";

export default async function AvailabilityPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const shell = await requireTenantShell(tenantSlug);
  const timeDisplayFormat = shell.tenant.timeDisplayFormat;

  const canEdit = shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), "availability:write:self"),
  );

  const rules = await prisma.availabilityRule.findMany({
    where: { tenantUserId: shell.tenantUser.id },
    orderBy: { dayOfWeek: "asc" },
  });

  const [exceptions, pto] = await Promise.all([
    prisma.availabilityException.findMany({
      where: { tenantUserId: shell.tenantUser.id },
      orderBy: { date: "desc" },
      take: 30,
    }),
    prisma.ptoRequest.findMany({
      where: { tenantUserId: shell.tenantUser.id },
      orderBy: { startsOn: "desc" },
      take: 20,
    }),
  ]);

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
            <CardDescription>
              Times use your tenant&apos;s display format (
              {timeDisplayFormat === "TWENTY_FOUR_HOUR" ? "0900 / 1700" : "9am / 5pm"}).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvailabilityRuleForm tenantSlug={tenantSlug} timeDisplayFormat={timeDisplayFormat} />
          </CardContent>
        </Card>
      )}

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Add date exception</CardTitle>
            <CardDescription>
              Override a specific date (day off or extra availability).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvailabilityExceptionForm tenantSlug={tenantSlug} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your rules</CardTitle>
        </CardHeader>
        <CardContent>
          <AvailabilityRulesList
            tenantSlug={tenantSlug}
            timeDisplayFormat={timeDisplayFormat}
            canEdit={canEdit}
            rules={rules.map((r) => ({
              id: r.id,
              dayOfWeek: r.dayOfWeek,
              startMinute: r.startMinute,
              endMinute: r.endMinute,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Date exceptions</CardTitle>
        </CardHeader>
        <CardContent>
          <AvailabilityExceptionsList
            tenantSlug={tenantSlug}
            canEdit={canEdit}
            exceptions={exceptions.map((e) => ({
              id: e.id,
              date: e.date.toISOString().slice(0, 10),
              available: e.available,
              note: e.note,
            }))}
          />
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
