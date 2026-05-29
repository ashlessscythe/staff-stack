import Link from "next/link";

import { hasPermission, permissionsForRole } from "@/lib/rbac";
import { requireTenantShell } from "@/server/tenant-context";

const LINKS = [
  {
    href: "settings",
    title: "Settings",
    description: "Time display and other tenant preferences.",
    permission: "tenant:settings:read" as const,
  },
  {
    href: "api-keys",
    title: "API keys",
    description: "Create and manage programmatic access tokens.",
    permission: "api:key:manage" as const,
  },
];

export default async function AdminPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const shell = await requireTenantShell(tenantSlug);

  const visible = LINKS.filter((link) =>
    shell.memberships.some((m) =>
      hasPermission(permissionsForRole(m.role, m.permissions), link.permission),
    ),
  );

  if (visible.length === 0) {
    return (
      <p className="text-sm text-zinc-500">You do not have permission to access admin tools.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Admin</h1>
        <p className="text-sm text-zinc-500">Manage tenant configuration and integrations.</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {visible.map((link) => (
          <li key={link.href}>
            <Link
              href={`/t/${tenantSlug}/admin/${link.href}`}
              className="block rounded-lg border border-zinc-200 p-4 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{link.title}</p>
              <p className="mt-1 text-sm text-zinc-500">{link.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
