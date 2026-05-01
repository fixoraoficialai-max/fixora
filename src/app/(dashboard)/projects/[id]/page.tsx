import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Layers, Clock, Film, AlertCircle } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProjectStatusBadge, VideoStatusBadge } from "@/components/ui/badge";
import { formatDate, formatDuration, formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Project" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await db.project.findUnique({
    where: { id, userId: session.user.id },
    include: {
      scenes: { orderBy: { order: "asc" } },
      videos: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!project) notFound();

  const totalDuration = project.scenes.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title={project.name}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href="/projects">
                <ArrowLeft className="h-4 w-4" />
                Projects
              </Link>
            </Button>
            {project.scenes.length > 0 && (
              <Button size="sm" asChild>
                <Link href={`/create/video`}>
                  Generate Video
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <ProjectStatusBadge status={project.status} />
              <span className="text-xs text-text-muted">
                Updated {formatRelativeTime(project.updatedAt)}
              </span>
            </div>
            {project.description && (
              <p className="text-sm text-text-muted max-w-xl">{project.description}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="flex flex-col gap-1">
            <p className="text-xs text-text-muted">Scenes</p>
            <p className="text-2xl font-bold text-text-primary tabular-nums">{project.scenes.length}</p>
          </Card>
          <Card className="flex flex-col gap-1">
            <p className="text-xs text-text-muted">Total duration</p>
            <p className="text-2xl font-bold text-text-primary tabular-nums">{formatDuration(totalDuration)}</p>
          </Card>
          <Card className="flex flex-col gap-1">
            <p className="text-xs text-text-muted">Videos generated</p>
            <p className="text-2xl font-bold text-text-primary tabular-nums">{project.videos.length}</p>
          </Card>
        </div>

        {/* Scenes */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-text-primary flex items-center gap-2">
            <Layers className="h-4 w-4 text-text-muted" />
            Scenes
          </h2>
          {project.scenes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-text-muted text-sm">
              No scenes yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {project.scenes.map((scene, index) => (
                <Card key={scene.id} className="flex flex-col gap-2">
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary-light">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary leading-relaxed">{scene.prompt}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
                        {scene.visualStyle && (
                          <span className="rounded-full border border-border px-2 py-0.5">{scene.visualStyle}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />{scene.duration}s
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Video history */}
        {project.videos.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-text-primary flex items-center gap-2">
              <Film className="h-4 w-4 text-text-muted" />
              Generation History
            </h2>
            <div className="flex flex-col gap-2">
              {project.videos.map((video) => (
                <Card key={video.id}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-elevated">
                        {video.status === "FAILED" ? (
                          <AlertCircle className="h-5 w-5 text-danger" />
                        ) : (
                          <Film className="h-5 w-5 text-text-muted" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">Generation #{video.id.slice(-8)}</p>
                        <p className="text-xs text-text-muted">{formatDate(video.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <VideoStatusBadge status={video.status} />
                      {video.url && (
                        <Button variant="secondary" size="sm" asChild>
                          <a href={video.url} target="_blank" rel="noopener noreferrer">View</a>
                        </Button>
                      )}
                    </div>
                  </div>
                  {video.errorMessage && (
                    <p className="mt-2 text-xs text-danger border-t border-border pt-2">{video.errorMessage}</p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}