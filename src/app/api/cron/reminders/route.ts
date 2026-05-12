import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const secret = process.env.INTERNAL_CRON_SECRET;
  const isVercelCron = process.env.VERCEL === "1" && req.headers.get("x-vercel-cron") === "1";
  const authorized =
    isVercelCron || (secret && req.headers.get("authorization") === `Bearer ${secret}`);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const rows = await prisma.reminderScheduled.findMany({
    where: { status: "pending", sendAt: { lte: now } },
    take: 100,
  });

  for (const row of rows) {
    await prisma.reminderScheduled.update({
      where: { id: row.id },
      data: { status: "sent" },
    });
  }

  return NextResponse.json({ processed: rows.length });
}
