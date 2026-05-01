import { z } from "zod";
import { PLANS_LIST } from "@/lib/stripe";

// Valid plan IDs derived directly from the PLANS registry — no hardcoding.
const validPlanIds = PLANS_LIST.map((p) => p.id) as [string, ...string[]];

export const checkoutSchema = z.object({
  planId: z.enum(validPlanIds as [string, ...string[]], {
    required_error: "planId is required",
    invalid_type_error: "planId must be one of: STARTER, PRO, STUDIO",
  }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
