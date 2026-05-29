import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AvailabilityRuleForm } from "@/components/availability/availability-rule-form";
import { formatMinuteRange } from "@/lib/time-format";
import { prisma } from "@/lib/db";
import { hasPermission, permissionsForRole } from "@/lib/rbac";
import { requireTenantShell } from "@/server/tenant-context";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

      <Card>
        <CardHeader>
          <CardTitle>Your rules</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {rules.map((r) => (
              <li key={r.id}>
                {days[r.dayOfWeek]} ·{" "}
                {formatMinuteRange(r.startMinute, r.endMinute, timeDisplayFormat)}
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
