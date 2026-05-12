import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 },
    );
  }
  const { tenantId } = await params;
  const tu = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId: session.user.id } },
  });
  if (!tu?.isActive) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Tenant access denied" } },
      { status: 403 },
    );
  }

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
