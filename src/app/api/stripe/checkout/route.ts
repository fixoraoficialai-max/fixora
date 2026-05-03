import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { stripe, PLANS } from "@/lib/stripe";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { checkoutSchema } from "@/lib/validations/stripe";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return ApiErrors.unauthorized();

  // Rate limit: 10 checkout attempts/min per user
  if (!checkRateLimit(`checkout:${session.user.id}`, RATE_LIMITS.auth)) {
    return ApiErrors.tooManyRequests();
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return ApiErrors.validation(parsed.error.flatten().fieldErrors);

  const { planId } = parsed.data;
  const plan = PLANS[planId as keyof typeof PLANS];

  // Guard: priceId must be configured (env var missing = deployment misconfiguration)
  if (!plan.priceId) {
    return ApiErrors.internal();
  }

  const userId    = session.user.id;
  const userEmail = session.user.email;
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL!;

  // Fetch or create the Stripe customer for this user
  const stripeCustomerId = await resolveStripeCustomer(userId, userEmail);
  if (!stripeCustomerId) return ApiErrors.internal();

  const checkoutSession = await stripe.checkout.sessions.create({
    customer:   stripeCustomerId,
    mode:       "subscription",
    line_items: [{ price: plan.priceId, quantity: 1 }],

    // Metadata passed to the webhook so we can identify the user + plan
    subscription_data: {
      metadata: { userId, planId },
    },

    // Strict: only allow the email that belongs to this account
    customer_email: undefined, // customer is already set — no email override

    success_url: `${appUrl}/settings?checkout=success`,
    cancel_url:  `${appUrl}/settings?checkout=canceled`,

    // Prevent users from changing the quantity
    allow_promotion_codes: false,
  });

  if (!checkoutSession.url) return ApiErrors.internal();

  return apiSuccess({ url: checkoutSession.url });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the existing Stripe customer ID for this user, creating one if needed.
 * The ID is persisted in the Subscription record for future lookups.
 *
 * Returns null on Stripe API failure — caller must return 500.
 */
async function resolveStripeCustomer(
  userId: string,
  email: string
): Promise<string | null> {
  try {
    // Check if this user already has a Stripe customer
    const existing = await db.subscription.findUnique({
      where:  { userId },
      select: { stripeCustomerId: true },
    });

    if (existing?.stripeCustomerId) return existing.stripeCustomerId;

    // Create a new Stripe customer and persist the ID immediately
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });

    await db.subscription.upsert({
      where:  { userId },
      update: { stripeCustomerId: customer.id },
      create: {
        userId,
        stripeCustomerId: customer.id,
        plan:             "FREE",
        monthlyCredits:   0,
      },
    });

    return customer.id;
  } catch {
    return null;
  }
}
