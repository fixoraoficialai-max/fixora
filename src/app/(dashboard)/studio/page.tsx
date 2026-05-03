import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Film, Clapperboard } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/layout/TopBar";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Studio — Fixora Video" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCharacterImageUrl(description: string | null): string | null {
  if (!description) return null;
  try {
    const parsed = JSON.parse(description) as { characterImageUrl?: string };
    return parsed.characterImageUrl ?? null;
  } catch {
    return null;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StudioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [projects, t] = await Promise.all([
    db.project.findMany({
      where: { userId: session.user.id, platform: "studio" },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id:          true,
        name:        true,
        description: true,
        status:      true,
        createdAt:   true,
        updatedAt:   true,
        _count: { select: { scenes: true, videos: true } },
      },
    }),
    getTranslations("studio"),
  ]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title={t("title")}
        description={t("desc")}
        actions={
          <Button size="sm" asChild>
            <Link href="/studio/new">
              <Plus className="h-4 w-4" />
              {t("newSeries")}
            </Link>
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {projects.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="rounded-2xl border border-border bg-surface p-8 max-w-sm">
              <Clapperboard className="h-12 w-12 text-text-muted mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                {t("emptyTitle")}
              </h2>
              <p className="text-sm text-text-muted mb-6">
                {t("emptyDesc")}
              </p>
              <Button asChild className="w-full">
                <Link href="/studio/new">
                  <Plus className="h-4 w-4" />
                  {t("createFirst")}
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          /* ── Series grid ── */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl">
            {projects.map((project) => {
              const characterUrl = parseCharacterImageUrl(project.description);
              return (
                <Link
                  key={project.id}
                  href={`/studio/${project.id}`}
                  className="group rounded-xl border border-border bg-surface p-5 hover:border-primary/40 hover:bg-surface-elevated transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {characterUrl ? (
                      <img
                        src={characterUrl}
                        alt={t("characterAlt")}
                        className="h-14 w-14 rounded-lg object-cover flex-shrink-0 border border-border"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-lg bg-surface-elevated border border-border flex items-center justify-center flex-shrink-0">
                        <Film className="h-6 w-6 text-text-muted" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text-primary truncate group-hover:text-primary-light transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-xs text-text-muted mt-1">
                        {t("scenesCount", { n: project._count.scenes })}
                        {" · "}
                        {t("videosGenerated", { n: project._count.videos })}
                      </p>
                      <p className="text-[11px] text-text-muted mt-2">
                        {formatRelativeTime(project.updatedAt)}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* New series card */}
            <Link
              href="/studio/new"
              className="rounded-xl border border-dashed border-border bg-surface p-5 hover:border-primary/40 hover:bg-surface-elevated transition-colors flex items-center justify-center gap-3 text-text-muted hover:text-primary-light"
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm font-medium">{t("newSeries")}</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
