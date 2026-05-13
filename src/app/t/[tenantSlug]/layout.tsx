import Link from "next/link";

import { TenantUserMenu } from "@/components/tenant/tenant-user-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
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
    <div className="min-h-screen bg-[color:var(--ss-background)] text-[color:var(--ss-foreground)]">
      <header className="border-b border-[color:var(--ss-border)] bg-[color:var(--ss-surface)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--ss-muted-foreground)]">
              Tenant
            </p>
            <p className="text-lg font-semibold text-[color:var(--ss-foreground)]">
              {shell.tenant.name}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <nav className="flex flex-wrap items-center gap-3 text-sm">
              <Link
                className="text-[color:var(--ss-muted-foreground)] hover:text-[color:var(--ss-foreground)]"
                href={`/t/${tenantSlug}/dashboard`}
              >
                Dashboard
              </Link>
              <Link
                className="text-[color:var(--ss-muted-foreground)] hover:text-[color:var(--ss-foreground)]"
                href={`/t/${tenantSlug}/schedule`}
              >
                Schedule
              </Link>
              <Link
                className="text-[color:var(--ss-muted-foreground)] hover:text-[color:var(--ss-foreground)]"
                href={`/t/${tenantSlug}/swaps`}
              >
                Swaps
              </Link>
              <Link
                className="text-[color:var(--ss-muted-foreground)] hover:text-[color:var(--ss-foreground)]"
                href={`/t/${tenantSlug}/availability`}
              >
                Availability
              </Link>
              <Link
                className="text-[color:var(--ss-muted-foreground)] hover:text-[color:var(--ss-foreground)]"
                href={`/t/${tenantSlug}/files`}
              >
                Files
              </Link>
              <Link
                className="text-[color:var(--ss-muted-foreground)] hover:text-[color:var(--ss-foreground)]"
                href={`/t/${tenantSlug}/admin/api-keys`}
              >
                API keys
              </Link>
            </nav>
            <ThemeToggle />
            <TenantUserMenu user={shell.user} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
