"use server";

import { TimeDisplayFormat } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hasPermission, permissionsForRole } from "@/lib/rbac";
import { writeAuditLog } from "@/server/audit";
import { requireTenantShell } from "@/server/tenant-context";

const timeDisplaySchema = z.object({
  tenantSlug: z.string().min(1),
  timeDisplayFormat: z.nativeEnum(TimeDisplayFormat),
});

const schedulingEnforcementSchema = z.object({
  tenantSlug: z.string().min(1),
  enforceAvailability: z.enum(["warn", "block"]),
});

export type TenantSettingsFormState = { error?: string; saved?: boolean };

export async function updateTimeDisplayFormatAction(
  _prev: TenantSettingsFormState,
  formData: FormData,
): Promise<TenantSettingsFormState> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const parsed = timeDisplaySchema.safeParse({
      tenantSlug: formData.get("tenantSlug"),
      timeDisplayFormat: formData.get("timeDisplayFormat"),
    });
    if (!parsed.success) return { error: "Invalid form" };

    const shell = await requireTenantShell(parsed.data.tenantSlug);
    const canWrite = shell.memberships.some((m) =>
      hasPermission(permissionsForRole(m.role, m.permissions), "tenant:settings:write"),
    );
    if (!canWrite) return { error: "Forbidden" };

    await prisma.tenant.update({
      where: { id: shell.tenant.id },
      data: { timeDisplayFormat: parsed.data.timeDisplayFormat },
    });

    await writeAuditLog({
      tenantId: shell.tenant.id,
      actorUserId: session.user.id,
      action: "tenant.settings.timeDisplayFormat",
      entityType: "Tenant",
      entityId: shell.tenant.id,
      metadata: { timeDisplayFormat: parsed.data.timeDisplayFormat },
    });

    revalidatePath(`/t/${parsed.data.tenantSlug}/admin/settings`);
    revalidatePath(`/t/${parsed.data.tenantSlug}/availability`);
    return { saved: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateSchedulingEnforcementAction(
  _prev: TenantSettingsFormState,
  formData: FormData,
): Promise<TenantSettingsFormState> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const parsed = schedulingEnforcementSchema.safeParse({
      tenantSlug: formData.get("tenantSlug"),
      enforceAvailability: formData.get("enforceAvailability"),
    });
    if (!parsed.success) return { error: "Invalid form" };

    const shell = await requireTenantShell(parsed.data.tenantSlug);
    const canWrite = shell.memberships.some((m) =>
      hasPermission(permissionsForRole(m.role, m.permissions), "tenant:settings:write"),
    );
    if (!canWrite) return { error: "Forbidden" };

    const current =
      typeof shell.tenant.settings === "object" && shell.tenant.settings !== null
        ? (shell.tenant.settings as Record<string, unknown>)
        : {};
    const scheduling =
      typeof current.scheduling === "object" && current.scheduling !== null
        ? { ...(current.scheduling as Record<string, unknown>) }
        : {};

    await prisma.tenant.update({
      where: { id: shell.tenant.id },
      data: {
        settings: {
          ...current,
          scheduling: {
            ...scheduling,
            enforceAvailability: parsed.data.enforceAvailability,
          },
        },
      },
    });

    await writeAuditLog({
      tenantId: shell.tenant.id,
      actorUserId: session.user.id,
      action: "tenant.settings.scheduling",
      entityType: "Tenant",
      entityId: shell.tenant.id,
      metadata: { enforceAvailability: parsed.data.enforceAvailability },
    });

    revalidatePath(`/t/${parsed.data.tenantSlug}/admin/settings`);
    revalidatePath(`/t/${parsed.data.tenantSlug}/schedule`);
    return { saved: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}
