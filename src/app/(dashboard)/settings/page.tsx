import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { User, Shield, Zap, Key } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, credits] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, image: true, createdAt: true, role: true },
    }),
    db.userCredits.findUnique({
      where: { userId: session.user.id },
      select: { balance: true, lifetime: true },
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title="Settings" description="Manage your account and preferences" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
        {/* Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-text-muted" />
              <CardTitle className="text-sm">Profile</CardTitle>
            </div>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <SettingRow label="Name" value={user.name ?? "—"} />
              <SettingRow label="Email" value={user.email} />
              <SettingRow label="Member since" value={new Date(user.createdAt).toLocaleDateString()} />
              <SettingRow label="Account type" value={user.role === "ADMIN" ? "Admin" : "Standard"} />
            </div>

            {/* TODO:INTEGRATION — Profile edit form */}
            <div className="mt-4 rounded-lg border border-dashed border-border bg-surface-elevated/50 p-3 text-xs text-text-muted text-center">
              Profile editing coming soon
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-text-muted" />
              <CardTitle className="text-sm">Security</CardTitle>
            </div>
            <CardDescription>Manage your password and security</CardDescription>
          </CardHeader>
          <CardContent>
            {/* TODO:INTEGRATION — Change password form */}
            <div className="rounded-lg border border-dashed border-border bg-surface-elevated/50 p-3 text-xs text-text-muted text-center">
              Password management coming soon
            </div>
          </CardContent>
        </Card>

        {/* Credits */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-text-muted" />
              <CardTitle className="text-sm">Credits & Usage</CardTitle>
            </div>
            <CardDescription>Your video generation credits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <SettingRow label="Current balance" value={`${credits?.balance ?? 0} credits`} highlight />
              <SettingRow label="Total granted" value={`${credits?.lifetime ?? 0} credits`} />
              <SettingRow label="Credits used" value={`${(credits?.lifetime ?? 0) - (credits?.balance ?? 0)} credits`} />
            </div>

            {/* Credit bar */}
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-overlay border border-border">
                <div
                  className="h-full rounded-full bg-gradient-primary transition-all"
                  style={{
                    width: `${Math.min(100, ((credits?.balance ?? 0) / Math.max(credits?.lifetime ?? 10, 1)) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-text-muted">
                {credits?.balance ?? 0} / {credits?.lifetime ?? 10} credits remaining
              </p>
            </div>

            {/* TODO:INTEGRATION — Stripe billing portal */}
            <div className="mt-4 rounded-lg border border-dashed border-border bg-surface-elevated/50 p-3 text-xs text-text-muted text-center">
              Upgrade plan · Billing portal — coming soon
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-text-muted" />
              <CardTitle className="text-sm">API Access</CardTitle>
            </div>
            <CardDescription>Manage API keys for external integrations</CardDescription>
          </CardHeader>
          <CardContent>
            {/* TODO:INTEGRATION — API key management */}
            <div className="rounded-lg border border-dashed border-border bg-surface-elevated/50 p-3 text-xs text-text-muted text-center">
              API key management coming soon
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
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
