/**
 * Stripe singleton + plan configuration.
 *
 * Single source of truth for:
 *  - Stripe client instance (initialized once at module level)
 *  - Plan definitions: priceId, credits, display metadata
 *
 * Rules:
 *  - Never import `stripe` from anywhere else — always from here.
 *  - Never hardcode a priceId in a route — always use PLANS.
 *  - Adding a new plan = add one entry to PLANS, nothing else.
 */

import Stripe from "stripe";

// ─── Stripe Client ────────────────────────────────────────────────────────────

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("[stripe] STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
});

// ─── Plan Registry ────────────────────────────────────────────────────────────

export type PlanId = "STARTER" | "PRO" | "STUDIO";

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  priceId: string;       // Stripe Price ID — loaded from env
  priceMonthly: number;  // Display price in USD cents (e.g. 1200 = $12.00)
  monthlyCredits: number;
  highlighted: boolean;  // Whether to highlight as "most popular"
  features: string[];
}

/**
 * Central plan registry. All Stripe priceIds come from environment variables.
 * This ensures we can switch between test/live keys without touching code.
 */
export const PLANS: Record<PlanId, PlanConfig> = {
  STARTER: {
    id:            "STARTER",
    name:          "Starter",
    description:   "Perfect for creators getting started",
    priceId:       process.env.STRIPE_PRICE_STARTER ?? "",
    priceMonthly:  1200,   // $12.00/month
    monthlyCredits: 80,
    highlighted:   false,
    features: [
      "80 credits / month",
      "~16 basic videos (5s)",
      "~8 Clone videos",
      "All AI models",
      "Project organization",
    ],
  },
  PRO: {
    id:            "PRO",
    name:          "Pro",
    description:   "For serious content creators",
    priceId:       process.env.STRIPE_PRICE_PRO ?? "",
    priceMonthly:  2900,   // $29.00/month
    monthlyCredits: 250,
    highlighted:   true,
    features: [
      "250 credits / month",
      "~50 basic videos (5s)",
      "~25 Clone videos",
      "All AI models",
      "Project organization",
      "Priority support",
    ],
  },
  STUDIO: {
    id:            "STUDIO",
    name:          "Studio",
    description:   "For agencies and power users",
    priceId:       process.env.STRIPE_PRICE_STUDIO ?? "",
    priceMonthly:  7900,   // $79.00/month
    monthlyCredits: 800,
    highlighted:   false,
    features: [
      "800 credits / month",
      "~160 basic videos (5s)",
      "~80 Clone videos",
      "All AI models",
      "Project organization",
      "Priority support",
      "Multi-Clone (4 characters)",
    ],
  },
} as const;

export const PLANS_LIST = Object.values(PLANS);

/**
 * Finds a plan by its Stripe priceId.
 * Used in webhook handlers to identify which plan was purchased.
 *
 * Returns undefined if no plan matches — caller must handle this case
 * (it means an unknown price was used, which should never happen in production).
 */
export function findPlanByPriceId(priceId: string): PlanConfig | undefined {
  return PLANS_LIST.find((p) => p.priceId === priceId);
}
