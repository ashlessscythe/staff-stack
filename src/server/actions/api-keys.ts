"use server";

import crypto from "node:crypto";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hasPermission, isFeatureEnabled, permissionsForRole } from "@/lib/rbac";
import { writeAuditLog } from "@/server/audit";
import { requireTenantShell } from "@/server/tenant-context";

export type ApiKeyFormState = { error?: string; token?: string };

export async function createApiKeyAction(
  _prev: ApiKeyFormState,
  formData: FormData,
): Promise<ApiKeyFormState> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const tenantSlug = String(formData.get("tenantSlug") ?? "");
    const name = String(formData.get("name") ?? "default");
    const shell = await requireTenantShell(tenantSlug);

    if (!isFeatureEnabled(shell.tenant.features, "apiKeys", false)) {
      return { error: "Premium feature disabled for tenant" };
    }

    const canManage = shell.memberships.some((m) =>
      hasPermission(permissionsForRole(m.role, m.permissions), "api:key:manage"),
    );
    if (!canManage) return { error: "Forbidden" };

    const raw = crypto.randomBytes(32).toString("hex");
    const prefix = raw.slice(0, 8);
    const hashedKey = crypto.createHash("sha256").update(`ssk_${raw}`).digest("hex");

    await prisma.apiKey.create({
      data: {
        tenantId: shell.tenant.id,
        name: name.slice(0, 80),
        hashedKey,
        prefix,
      },
    });

    await writeAuditLog({
      tenantId: shell.tenant.id,
      actorUserId: session.user.id,
      action: "apikey.create",
      entityType: "ApiKey",
      metadata: { prefix },
    });

    revalidatePath(`/t/${tenantSlug}/admin/api-keys`);
    return { token: `ssk_${raw}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}
