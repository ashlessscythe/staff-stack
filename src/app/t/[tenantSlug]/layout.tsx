import Link from "next/link";

import { TenantUserMenu } from "@/components/tenant/tenant-user-menu";
import { requireTenantShell } from "@/server/tenant-context";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const shell = await requireTenantShell(tenantSlug);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Tenant</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {shell.tenant.name}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <nav className="flex flex-wrap items-center gap-3 text-sm">
              <Link
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                href={`/t/${tenantSlug}/dashboard`}
              >
                Dashboard
              </Link>
              <Link
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                href={`/t/${tenantSlug}/schedule`}
              >
                Schedule
              </Link>
              <Link
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                href={`/t/${tenantSlug}/swaps`}
              >
                Swaps
              </Link>
              <Link
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                href={`/t/${tenantSlug}/availability`}
              >
                Availability
              </Link>
              <Link
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                href={`/t/${tenantSlug}/files`}
              >
                Files
              </Link>
              <Link
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                href={`/t/${tenantSlug}/admin/api-keys`}
              >
                API keys
              </Link>
            </nav>
            <TenantUserMenu user={shell.user} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
