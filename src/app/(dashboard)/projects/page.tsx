import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FolderOpen, Film } from "lucide-react";
import type { Metadata } from "next";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TopBar } from "@/components/layout/TopBar";
import { ProjectStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [projects, t] = await Promise.all([
    db.project.findMany({
      where:   { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, name: true, description: true,
        status: true, aspectRatio: true, platform: true,
        createdAt: true, updatedAt: true,
        _count: { select: { scenes: true, videos: true } },
      },
    }),
    getTranslations("projects"),
  ]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title={t("title")}
        description={t("scenes", { n: projects.length })}
        actions={
          <Button size="sm" asChild>
            <Link href="/projects/new">
              <Plus className="h-4 w-4" />
              {t("newProject")}
            </Link>
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {projects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={t("noProjectsTitle")}
            description={t("noProjectsDesc")}
            action={{ label: t("createProject"), onClick: () => {} }}
            className="mt-8"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card interactive glow className="h-full group">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                        <FolderOpen className="h-5 w-5 text-primary" />
                      </div>
                      <ProjectStatusBadge status={project.status} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-primary leading-tight truncate">
                        {project.name}
                      </p>
                      {project.description && (
                        <p className="mt-1 text-sm text-text-muted line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-text-muted border-t border-border pt-3">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />
                          {t("scenes", { n: project._count.scenes })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Film className="h-3 w-3" />
                          {t("videos", { n: project._count.videos })}
                        </span>
                      </div>
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
  );
}
