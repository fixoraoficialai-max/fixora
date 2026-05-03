"use client";

import { useState } from "react";
import { Check, Loader2, Zap, Star, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import type { PlanId, PlanConfig } from "@/lib/stripe";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UpgradePlanButtonProps {
  /** Plans list — passed from the server component to avoid importing stripe on the client */
  plans: PlanConfig[];
  /** Current plan of the authenticated user */
  currentPlan: PlanId | "FREE";
  /** Whether the user has an active Stripe subscription (shows "Manage" instead of plans) */
  hasActiveSubscription: boolean;
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

const PLAN_ICONS: Record<PlanId, React.ReactNode> = {
  STARTER: <Zap    className="h-4 w-4" />,
  PRO:     <Star   className="h-4 w-4" />,
  STUDIO:  <Building2 className="h-4 w-4" />,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function UpgradePlanButton({
  plans,
  currentPlan,
  hasActiveSubscription,
}: UpgradePlanButtonProps) {
  const [loading, setLoading] = useState<PlanId | "portal" | null>(null);
  const [error, setError]     = useState<string | null>(null);

  // ── Checkout ───────────────────────────────────────────────────────────────

  async function handleUpgrade(planId: PlanId) {
    setLoading(planId);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ planId }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error?.message ?? "Could not start checkout. Try again.");
        return;
      }

      // Redirect to Stripe-hosted checkout page
      window.location.href = json.data.url;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  // ── Manage subscription ───────────────────────────────────────────────────

  async function handleManage() {
    setLoading("portal");
    setError(null);

    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error?.message ?? "Could not open billing portal. Try again.");
        return;
      }

      window.location.href = json.data.url;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mt-4 flex flex-col gap-4">
      {error && <FormAlert variant="error">{error}</FormAlert>}

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {plans.map((plan) => {
          const isCurrent  = currentPlan === plan.id;
          const isLoadingThis = loading === plan.id;

          return (
            <div
              key={plan.id}
              className={[
                "relative flex flex-col gap-3 rounded-xl border p-4 transition-all",
                plan.highlighted
                  ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-surface-elevated/40",
              ].join(" ")}
            >
              {/* "Most popular" badge */}
              {plan.highlighted && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-2.5 py-0.5 text-[10px] font-semibold text-white whitespace-nowrap">
                  Most popular
                </span>
              )}

              {/* Header */}
              <div className="flex items-center gap-2">
                <span className="text-primary-light">{PLAN_ICONS[plan.id]}</span>
                <span className="text-sm font-semibold text-text-primary">{plan.name}</span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-text-primary">
                  ${(plan.priceMonthly / 100).toFixed(0)}
                </span>
                <span className="text-xs text-text-muted">/month</span>
              </div>

              {/* Features */}
              <ul className="flex flex-col gap-1.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-text-muted">
                    <Check className="h-3 w-3 mt-0.5 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                variant={plan.highlighted ? "primary" : "secondary"}
                className="w-full mt-2"
                disabled={isCurrent || isLoadingThis || loading !== null}
                onClick={() => handleUpgrade(plan.id)}
                id={`upgrade-btn-${plan.id.toLowerCase()}`}
                aria-label={isCurrent ? `Current plan: ${plan.name}` : `Upgrade to ${plan.name}`}
              >
                {isLoadingThis ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing…</>
                ) : isCurrent ? (
                  <><Check className="h-3.5 w-3.5" /> Current plan</>
                ) : (
                  `Upgrade to ${plan.name}`
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Manage existing subscription */}
      {hasActiveSubscription && (
        <Button
          variant="secondary"
          className="w-full"
          disabled={loading !== null}
          onClick={handleManage}
          id="manage-subscription-btn"
        >
          {loading === "portal" ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Opening portal…</>
          ) : (
            "Manage subscription"
          )}
        </Button>
      )}
    </div>
  );
}
