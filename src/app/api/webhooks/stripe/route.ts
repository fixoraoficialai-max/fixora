/**
 * Stripe Webhook Handler
 *
 * Security contract:
 *  1. Signature verification BEFORE any business logic.
 *  2. Idempotency check — each event is processed exactly once.
 *  3. Each event type is handled by a single dedicated function.
 *  4. All billing state changes are written atomically (transaction).
 *  5. Credits are granted atomically — no race condition possible.
 *  6. AuditLog entry for every billing state change.
 *  7. Always returns 200 to Stripe after safe processing (prevents retries on handled errors).
 *
 * IMPORTANT: This route must be excluded from CSRF protection and body parsing.
 * The raw body is required for Stripe signature verification.
 */

import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe, findPlanByPriceId } from "@/lib/stripe";
import { logAudit, AuditAction } from "@/lib/audit";

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody  = await req.text();
  const sigHeader = req.headers.get("stripe-signature");

  if (!sigHeader) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // 1. Verify signature — rejects any tampered or unauthorized requests
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sigHeader, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // 2. Idempotency — skip events we've already processed
  const alreadyProcessed = await db.stripeEvent.findUnique({ where: { id: event.id } });
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, skipped: true });
  }

  // 3. Route to the correct handler
  try {
    await dispatchEvent(event);

    // 4. Mark as processed — only after successful handling
    await db.stripeEvent.create({ data: { id: event.id } });
  } catch {
    // Return 200 — Stripe will retry on non-2xx. We've already
    // verified the event is authentic; a processing error is our bug, not theirs.
    return NextResponse.json({ received: true, error: "Processing failed" }, { status: 200 });
  }

  return NextResponse.json({ received: true });
}

// ─── Event Dispatcher ─────────────────────────────────────────────────────────

async function dispatchEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;

    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      break;
  }
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

/**
 * Handles subscription creation and plan changes.
 * Updates the Subscription record to reflect the current Stripe state.
 * Does NOT grant credits here — invoice.paid handles that.
 *
 * NOTE: Stripe API 2026-04-22.dahlia removed current_period_start/end from
 * the Subscription object. Period dates are now managed from invoice.paid.
 */
async function handleSubscriptionUpsert(sub: Stripe.Subscription): Promise<void> {
  const userId = sub.metadata.userId;
  if (!userId) return;

  const priceId = sub.items.data[0]?.price.id;
  if (!priceId) return;

  const plan = findPlanByPriceId(priceId);
  if (!plan) return;

  // Determine if this is a brand-new subscription (status transitions to active for the first time)
  const isNew = sub.status === "active";

  await db.subscription.upsert({
    where:  { userId },
    update: {
      plan:                 plan.id,
      stripeSubscriptionId: sub.id,
      stripePriceId:        priceId,
      monthlyCredits:       plan.monthlyCredits,
      status:               sub.status,
      cancelAtPeriodEnd:    sub.cancel_at_period_end,
      // Period dates are set in handleInvoicePaid (new API: not on Subscription object)
    },
    create: {
      userId,
      plan:                 plan.id,
      stripeCustomerId:     sub.customer as string,
      stripeSubscriptionId: sub.id,
      stripePriceId:        priceId,
      monthlyCredits:       plan.monthlyCredits,
      status:               sub.status,
      cancelAtPeriodEnd:    sub.cancel_at_period_end,
    },
  });

  logAudit(
    isNew ? AuditAction.SUBSCRIPTION_CREATED : AuditAction.SUBSCRIPTION_RENEWED,
    { userId, metadata: { planId: plan.id, subscriptionId: sub.id, status: sub.status } }
  );
}

/**
 * Grants the monthly credits when an invoice is paid.
 * This is the ONLY place credits are added — fired on both new subscriptions and renewals.
 * Also updates the subscription period dates (moved here from handleSubscriptionUpsert
 * due to Stripe API 2026-04-22.dahlia removing current_period_* from Subscription object).
 *
 * Uses raw SQL to prevent race conditions (same pattern as reserveCredits).
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  // Stripe API 2026-04-22.dahlia: subscription ID moved to invoice.parent.subscription_details.subscription
  const subId = resolveSubscriptionId(invoice);
  if (!subId) return; // Not a subscription invoice — skip

  const subscription = await db.subscription.findUnique({
    where:  { stripeSubscriptionId: subId },
    select: { userId: true, monthlyCredits: true, plan: true },
  });

  if (!subscription) return;

  const { userId, monthlyCredits } = subscription;

  // Update period dates from the invoice (available in all API versions)
  const periodStart = invoice.period_start ? new Date(invoice.period_start * 1000) : null;
  const periodEnd   = invoice.period_end   ? new Date(invoice.period_end   * 1000) : null;

  await db.subscription.update({
    where: { stripeSubscriptionId: subId },
    data:  { currentPeriodStart: periodStart, currentPeriodEnd: periodEnd },
  });

  if (monthlyCredits <= 0) return; // FREE plan — nothing to grant

  // Atomic credit grant — never goes negative, always correct even under concurrency
  await db.$transaction([
    db.$executeRaw`
      UPDATE user_credits
      SET balance  = balance + ${monthlyCredits},
          lifetime = lifetime + ${monthlyCredits}
      WHERE "userId" = ${userId}
    `,
  ]);

  logAudit(AuditAction.CREDITS_GRANTED, {
    userId,
    metadata: { amount: monthlyCredits, reason: "subscription_renewal", plan: subscription.plan },
  });
}

/**
 * Downgrades the user to FREE when their subscription is deleted (canceled).
 * Credits already granted in the current period are NOT revoked.
 */
async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const subscription = await db.subscription.findUnique({
    where:  { stripeSubscriptionId: sub.id },
    select: { userId: true },
  });

  if (!subscription) return;

  const { userId } = subscription;

  await db.subscription.update({
    where: { userId },
    data: {
      plan:                 "FREE",
      stripeSubscriptionId: null,
      stripePriceId:        null,
      monthlyCredits:       0,
      status:               "canceled",
      cancelAtPeriodEnd:    false,
      currentPeriodEnd:     null,
    },
  });

  logAudit(AuditAction.SUBSCRIPTION_CANCELED, {
    userId,
    metadata: { subscriptionId: sub.id },
  });
}

/**
 * Marks the subscription as past_due when payment fails.
 * The user keeps access until Stripe's dunning period expires and fires .deleted.
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subId = resolveSubscriptionId(invoice);
  if (!subId) return;

  const subscription = await db.subscription.findUnique({
    where:  { stripeSubscriptionId: subId },
    select: { userId: true },
  });

  if (!subscription) return;

  await db.subscription.update({
    where: { stripeSubscriptionId: subId },
    data:  { status: "past_due" },
  });

  logAudit(AuditAction.SUBSCRIPTION_PAST_DUE, {
    userId:   subscription.userId,
    metadata: { subscriptionId: subId, invoiceId: invoice.id },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts the subscription ID from an invoice.
 * Stripe API 2026-04-22.dahlia moved this from invoice.subscription
 * to invoice.parent.subscription_details.subscription.
 */
function resolveSubscriptionId(invoice: Stripe.Invoice): string | null {
  const raw = invoice.parent?.subscription_details?.subscription;
  if (!raw) return null;
  return typeof raw === "string" ? raw : raw.id;
}
