import Link from "next/link";

import { SchedulingEnforcementForm } from "@/components/admin/scheduling-enforcement-form";
import { TimeDisplayFormatForm } from "@/components/admin/time-display-format-form";
import { schedulingSettingsFromTenant } from "@/lib/scheduling-settings";
import { hasPermission, permissionsForRole } from "@/lib/rbac";
import { requireTenantShell } from "@/server/tenant-context";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const shell = await requireTenantShell(tenantSlug);

  const canRead = shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), "tenant:settings:read"),
  );
  if (!canRead) {
    return (
      <p className="text-sm text-zinc-500">You do not have permission to view tenant settings.</p>
    );
  }

  const canWrite = shell.memberships.some((m) =>
    hasPermission(permissionsForRole(m.role, m.permissions), "tenant:settings:write"),
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Admin</p>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Settings</h1>
        <p className="text-sm text-zinc-500">
          Tenant-wide preferences.{" "}
          <Link className="underline hover:text-zinc-700" href={`/t/${tenantSlug}/admin`}>
            Back to admin
          </Link>
        </p>
      </div>

      {canWrite ? (
        <div className="space-y-6">
          <TimeDisplayFormatForm
            tenantSlug={tenantSlug}
            currentFormat={shell.tenant.timeDisplayFormat}
          />
          <SchedulingEnforcementForm
            tenantSlug={tenantSlug}
            currentMode={schedulingSettingsFromTenant(shell.tenant.settings).enforceAvailability}
          />
        </div>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Current time display:{" "}
          {shell.tenant.timeDisplayFormat === "TWENTY_FOUR_HOUR"
            ? "24-hour (0900)"
            : "12-hour (9am)"}
        </p>
      )}
    </div>
  );
}
