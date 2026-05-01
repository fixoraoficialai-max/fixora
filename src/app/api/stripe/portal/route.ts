import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * Creates a Stripe Customer Portal session for the authenticated user.
 * The portal lets users manage their subscription: upgrade, downgrade, cancel,
 * update payment method, and view invoices — all handled by Stripe.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  // Rate limit: reuse auth tier (10 calls/min is more than enough for portal access)
  if (!checkRateLimit(`portal:${session.user.id}`, RATE_LIMITS.auth)) {
    return ApiErrors.tooManyRequests();
  }

  const userId = session.user.id;

  const subscription = await db.subscription.findUnique({
    where:  { userId },
    select: { stripeCustomerId: true },
  });

  // User has no Stripe customer yet — they haven't subscribed, nothing to manage
  if (!subscription?.stripeCustomerId) {
    return ApiErrors.notFound("Stripe subscription");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer:   subscription.stripeCustomerId,
      return_url: `${appUrl}/settings`,
    });

    return apiSuccess({ url: portalSession.url });
  } catch (err) {
    console.error("[stripe/portal] Error creating portal session:", err);
    return ApiErrors.internal();
  }
}
