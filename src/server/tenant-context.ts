import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export type TenantShell = {
  tenant: { id: string; name: string; slug: string; settings: unknown; features: unknown };
  tenantUser: { id: string; userId: string };
  memberships: {
    siteId: string;
    siteName: string;
    role: import("@prisma/client").RoleKey;
    permissions: string[];
  }[];
};

export async function requireTenantShell(tenantSlug: string): Promise<TenantShell> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) notFound();

  const tenantUser = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: session.user.id } },
    include: {
      memberships: { include: { site: true } },
    },
  });
  if (!tenantUser?.isActive) notFound();

  return {
    tenant,
    tenantUser: { id: tenantUser.id, userId: tenantUser.userId },
    memberships: tenantUser.memberships.map((m) => ({
      siteId: m.siteId,
      siteName: m.site.name,
      role: m.role,
      permissions: m.permissions,
    })),
  };
}
