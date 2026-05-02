import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FolderOpen, Film, Zap, TrendingUp, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TopBar } from "@/components/layout/TopBar";
import { ProjectStatusBadge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [stats, recentProjects] = await Promise.all([
    getDashboardStats(userId),
    getRecentProjects(userId),
  ]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title="Dashboard"
        description={`Welcome back, ${session.user.name?.split(" ")[0] ?? "there"}`}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={FolderOpen}
            label="Total Projects"
            value={stats.totalProjects}
            color="primary"
          />
          <StatCard
            icon={Film}
            label="Videos Generated"
            value={stats.totalVideos}
            color="accent"
          />
          <StatCard
            icon={TrendingUp}
            label="This Month"
            value={stats.thisMonthVideos}
            color="success"
          />
          <StatCard
            icon={Zap}
            label="Credits Left"
            value={stats.creditsLeft}
            color="warning"
          />
        </div>

        {/* Recent Projects */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Recent Projects</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/projects">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {recentProjects.length === 0 ? (
            <EmptyDashboard />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recentProjects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card interactive glow className="h-full">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                          <FolderOpen className="h-4 w-4 text-primary" />
                        </div>
                        <ProjectStatusBadge status={project.status} />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary text-sm leading-tight truncate">
                          {project.name}
                        </p>
                        {project.description && (
                          <p className="mt-0.5 text-xs text-text-muted line-clamp-2">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-text-muted">
                        <span>{project._count.scenes} scene{project._count.scenes !== 1 ? "s" : ""}</span>
                        <span>{formatRelativeTime(project.updatedAt)}</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: "primary" | "accent" | "success" | "warning";
}

const colorMap = {
  primary: "bg-primary/10 border-primary/20 text-primary",
  accent: "bg-accent/10 border-accent/20 text-accent",
  success: "bg-success/10 border-success/20 text-success",
  warning: "bg-warning/10 border-warning/20 text-warning",
};

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className={`inline-flex w-fit rounded-lg border p-2.5 ${colorMap[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-2xl font-bold text-text-primary tabular-nums">{value}</p>
        <p className="text-xs text-text-muted">{label}</p>
      </div>
    </Card>
  );
}

function EmptyDashboard() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-surface/50 py-16 text-center">
      <div className="rounded-xl border border-border bg-surface-elevated p-4">
        <Film className="h-8 w-8 text-text-muted" />
      </div>
      <div>
        <p className="font-semibold text-text-primary">No projects yet</p>
        <p className="mt-1 text-sm text-text-muted">
          Create your first AI video project to get started.
        </p>
      </div>
      <Button asChild>
        <Link href="/projects/new">
          <Plus className="h-4 w-4" />
          Create your first video
        </Link>
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Data fetching (server-side)
// ─────────────────────────────────────────────
async function getDashboardStats(userId: string) {
  const [totalProjects, totalVideos, thisMonthVideos, credits] =
    await Promise.all([
      db.project.count({ where: { userId } }),
      db.video.count({ where: { userId } }),
      db.video.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      db.userCredits.findUnique({
        where: { userId },
        select: { balance: true },
      }),
    ]);

  return {
    totalProjects,
    totalVideos,
    thisMonthVideos,
    creditsLeft: credits?.balance ?? 0,
  };
}

async function getRecentProjects(userId: string) {
  return db.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 6,
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      updatedAt: true,
      _count: { select: { scenes: true } },
    },
  });
}
