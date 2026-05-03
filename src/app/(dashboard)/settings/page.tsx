import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { User, Shield, Zap, MessageSquare } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { PLANS_LIST } from "@/lib/stripe";
import { getTranslations } from "next-intl/server";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/shared/CollapsibleSection";
import { ProfileEditForm } from "@/features/settings/components/ProfileEditForm";
import { ChangePasswordForm } from "@/features/settings/components/ChangePasswordForm";
import { UpgradePlanButton } from "@/features/settings/components/UpgradePlanButton";
import { FeedbackForm } from "@/features/settings/components/FeedbackForm";
import { LanguageSelector } from "@/components/shared/LanguageSelector";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, credits, subscription, t] = await Promise.all([
    db.user.findUnique({
      where:  { id: session.user.id },
      select: { id: true, name: true, email: true, image: true, createdAt: true, role: true, password: true },
    }),
    db.userCredits.findUnique({
      where:  { userId: session.user.id },
      select: { balance: true, lifetime: true },
    }),
    db.subscription.findUnique({
      where:  { userId: session.user.id },
      select: { plan: true, status: true, stripeSubscriptionId: true, currentPeriodEnd: true },
    }),
    getTranslations("settings"),
  ]);

  if (!user) redirect("/login");

  const currentPlan           = subscription?.plan ?? "FREE";
  const hasActiveSubscription =
    !!subscription?.stripeSubscriptionId &&
    (subscription.status === "active" || subscription.status === "trialing");

  const balance  = credits?.balance  ?? 0;
  const lifetime = credits?.lifetime ?? 10;
  const used     = lifetime - balance;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title={t("pageTitle")} description={t("pageDescription")} />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* ── Feedback ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-text-muted" />
              <CardTitle>{t("contactTitle")}</CardTitle>
            </div>
            <CardDescription>{t("contactDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <FeedbackForm />
          </CardContent>
        </Card>

        {/* ── Profile — collapsible ─────────────────────────────────────── */}
        <CollapsibleSection
          icon={<User className="h-4 w-4" />}
          title={t("profileTitle")}
          description={t("profileDescription")}
        >
          <div className="flex flex-col gap-3 pt-4">
            <SettingRow label={t("labelName")}        value={user.name ?? "—"} />
            <SettingRow label={t("labelEmail")}       value={user.email} />
            <SettingRow
              label={t("labelMemberSince")}
              value={new Date(user.createdAt).toLocaleDateString()}
            />
            <SettingRow
              label={t("labelAccountType")}
              value={user.role === "ADMIN" ? t("labelAdmin") : t("labelStandard")}
            />
          </div>

          <ProfileEditForm initialName={user.name ?? ""} />
          <LanguageSelector />
        </CollapsibleSection>

        {/* ── Security — collapsible ────────────────────────────────────── */}
        <CollapsibleSection
          icon={<Shield className="h-4 w-4" />}
          title={t("securityTitle")}
          description={t("securityDescription")}
        >
          <ChangePasswordForm hasPassword={!!user.password} />
        </CollapsibleSection>

        {/* ── Credits & Plan ────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-text-muted" />
              <CardTitle className="text-sm">{t("creditsTitle")}</CardTitle>
            </div>
            <CardDescription>{t("creditsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <SettingRow
                label={t("labelCurrentPlan")}
                value={currentPlan}
                highlight={currentPlan !== "FREE"}
              />
              <SettingRow
                label={t("labelCurrentBalance")}
                value={`${balance} ${t("creditsUnit")}`}
                highlight
              />
              <SettingRow
                label={t("labelTotalGranted")}
                value={`${lifetime} ${t("creditsUnit")}`}
              />
              <SettingRow
                label={t("labelCreditsUsed")}
                value={`${used} ${t("creditsUnit")}`}
              />
              {subscription?.currentPeriodEnd && (
                <SettingRow
                  label={t("labelNextRenewal")}
                  value={new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                />
              )}
            </div>

            {/* Credit progress bar */}
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-overlay border border-border">
                <div
                  className="h-full rounded-full bg-gradient-primary transition-all"
                  style={{ width: `${Math.min(100, (balance / Math.max(lifetime, 1)) * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-text-muted">
                {t("creditsRemaining", { balance, lifetime })}
              </p>
            </div>

            <UpgradePlanButton
              plans={PLANS_LIST}
              currentPlan={currentPlan as "FREE" | "STARTER" | "PRO" | "STUDIO"}
              hasActiveSubscription={hasActiveSubscription}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── SettingRow ───────────────────────────────────────────────────────────────

function SettingRow({
  label,
  value,
  highlight,
}: {
  label:     string;
  value:     string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <p className="text-sm text-text-muted">{label}</p>
      <p className={`text-sm font-medium ${highlight ? "text-primary-light" : "text-text-primary"}`}>
        {value}
      </p>
    </div>
  );
}
