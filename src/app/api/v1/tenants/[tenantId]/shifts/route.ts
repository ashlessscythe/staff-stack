import { NextResponse } from "next/server";

import { authenticateTenantApiRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const authResult = await authenticateTenantApiRequest(req, tenantId);
  if (!authResult.ok) return authResult.response;

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where = {
    tenantId,
    deletedAt: null as Date | null,
    ...(siteId ? { siteId } : {}),
    ...(from && to
      ? {
          startsAt: { gte: new Date(from), lte: new Date(to) },
        }
      : {}),
  };

  const shifts = await prisma.shift.findMany({
    where,
    orderBy: { startsAt: "asc" },
    take: 200,
    select: {
      id: true,
      siteId: true,
      title: true,
      startsAt: true,
      endsAt: true,
      status: true,
      recurrenceRule: true,
    },
  });

  return NextResponse.json({ data: shifts });
}
