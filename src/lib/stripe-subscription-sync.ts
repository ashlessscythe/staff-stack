import { Prisma, type SubscriptionStatus } from "@prisma/client";
import type Stripe from "stripe";

import { tenantFeatures } from "@/lib/rbac";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function mapStripeSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status,
): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
    case "paused":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "unpaid":
      return "UNPAID";
    case "incomplete":
    case "incomplete_expired":
    default:
      return "INCOMPLETE";
  }
}

/** Whether paid-plan entitlements (Tenant.features.billing) should be on. */
export function billingEntitledForSubscriptionStatus(status: SubscriptionStatus): boolean {
  return status === "ACTIVE" || status === "PAST_DUE";
}

async function resolveTenantId(
  tx: Prisma.TransactionClient,
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const metaTenant = subscription.metadata?.tenantId?.trim();
  if (metaTenant && isUuid(metaTenant)) {
    const byMeta = await tx.tenant.findUnique({ where: { id: metaTenant }, select: { id: true } });
    if (byMeta) return byMeta.id;
  }

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (!customerId) return null;

  const row = await tx.stripeCustomer.findUnique({
    where: { stripeCustomerId: customerId },
    select: { tenantId: true },
  });
  return row?.tenantId ?? null;
}

export async function syncStripeSubscription(
  tx: Prisma.TransactionClient,
  subscription: Stripe.Subscription,
): Promise<void> {
  const tenantId = await resolveTenantId(tx, subscription);
  if (!tenantId) {
    console.warn("[stripe webhook] skip subscription sync: unresolved tenant", subscription.id);
    return;
  }

  const status = mapStripeSubscriptionStatus(subscription.status);
  const entitled = billingEntitledForSubscriptionStatus(status);
  const currentPeriodEnd =
    subscription.ended_at != null ? new Date(subscription.ended_at * 1000) : null;

  await tx.subscription.upsert({
    where: { tenantId },
    create: {
      tenantId,
      stripeSubscriptionId: subscription.id,
      status,
      currentPeriodEnd,
    },
    update: {
      stripeSubscriptionId: subscription.id,
      status,
      currentPeriodEnd,
    },
  });

  const tenant = await tx.tenant.findUnique({
    where: { id: tenantId },
    select: { features: true },
  });
  if (!tenant) return;

  const nextFeatures: Prisma.InputJsonValue = {
    ...tenantFeatures(tenant.features),
    billing: entitled,
  };

  await tx.tenant.update({
    where: { id: tenantId },
    data: { features: nextFeatures },
  });
}

export async function applyVerifiedStripeEvent(
  tx: Prisma.TransactionClient,
  event: Stripe.Event,
): Promise<void> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncStripeSubscription(tx, event.data.object as Stripe.Subscription);
      return;
    default:
      return;
  }
}
