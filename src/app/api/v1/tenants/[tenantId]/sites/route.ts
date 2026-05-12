import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

async function assertTenantAccess(tenantId: string, userId: string) {
  const tu = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
  if (!tu?.isActive) return null;
  return tu;
}

export async function GET(_req: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 },
    );
  }
  const { tenantId } = await params;
  const ok = await assertTenantAccess(tenantId, session.user.id);
  if (!ok) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Tenant access denied" } },
      { status: 403 },
    );
  }

  const sites = await prisma.site.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, timezone: true, address: true },
  });

  return NextResponse.json({ data: sites });
}
