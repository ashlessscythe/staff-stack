import { NextResponse } from "next/server";

import { authenticateTenantApiRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const authResult = await authenticateTenantApiRequest(req, tenantId);
  if (!authResult.ok) return authResult.response;

  const sites = await prisma.site.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, timezone: true, address: true },
  });

  return NextResponse.json({ data: sites });
}
