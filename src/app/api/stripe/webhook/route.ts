import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

/** Stripe webhook stub: verify signature with the official Stripe SDK in production. */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, { status: 501 });
  }

  if (!req.headers.get("stripe-signature")) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const raw = await req.text();
  let eventId: string;
  try {
    const evt = JSON.parse(raw) as { id?: string };
    if (!evt.id) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    eventId = evt.id;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await prisma.processedStripeEvent.upsert({
    where: { eventId },
    create: { eventId },
    update: {},
  });

  return NextResponse.json({ received: true });
}
