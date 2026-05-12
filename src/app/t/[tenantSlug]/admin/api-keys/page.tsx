import { CreateApiKeyForm } from "@/components/admin/create-api-key-form";
import { requireTenantShell } from "@/server/tenant-context";

export default async function AdminApiKeysPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  await requireTenantShell(tenantSlug);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">API keys</h1>
      <CreateApiKeyForm tenantSlug={tenantSlug} />
    </div>
  );
}
