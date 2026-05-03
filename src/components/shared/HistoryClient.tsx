"use client";

import { useState, useEffect, useCallback } from "react";
import { Film, Download, Trash2, Loader2, AlertCircle, Video as VideoIcon, ImageIcon, LayoutGrid } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { useTranslations } from "next-intl";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Video {
  id: string;
  url: string | null;
  status: string;
  duration: number | null;
  createdAt: Date;
  metadata: unknown;
  project: { id: string; name: string } | null;
}

interface GeneratedImage {
  id: string;
  imageUrl: string;
  sceneText: string | null;
  createdAt: Date;
}

interface Props {
  videos: Video[];
  images: GeneratedImage[];
}

type Filter = "all" | "videos" | "images";

type T = ReturnType<typeof useTranslations<"history">>;

// ─── URL helpers (pure, no side-effects) ─────────────────────────────────────

function downloadUrl(url: string, type: "video" | "image"): string {
  return `/api/download?url=${encodeURIComponent(url)}&type=${type}`;
}

function streamUrl(url: string): string {
  return `/api/download?url=${encodeURIComponent(url)}&type=video&stream=1`;
}

function toVideoPageUrl(imageUrl: string): string {
  return `/create/video?imageUrl=${encodeURIComponent(imageUrl)}`;
}

function getRequestId(metadata: unknown): string | null {
  if (metadata && typeof metadata === "object" && "requestId" in metadata) {
    return (metadata as { requestId: string }).requestId ?? null;
  }
  return null;
}

// ─── Filter actions (rendered in TopBar next to bell) ─────────────────────────

function FilterButtons({
  filter,
  onChange,
  t,
}: {
  filter: Filter;
  onChange: (f: Filter) => void;
  t: T;
}) {
  const options: { value: Filter; icon: React.ReactNode; label: string }[] = [
    { value: "all",    icon: <LayoutGrid className="h-3.5 w-3.5" />, label: t("filterAll") },
    { value: "videos", icon: <VideoIcon  className="h-3.5 w-3.5" />, label: t("filterVideos") },
    { value: "images", icon: <ImageIcon  className="h-3.5 w-3.5" />, label: t("filterImages") },
  ];

  return (
    <div className="flex gap-1">
      {options.map(({ value, icon, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
            filter === value
              ? "border-primary/40 bg-primary/15 text-primary-light"
              : "border-border text-text-muted hover:border-border-strong hover:text-text-secondary"
          )}
        >
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── API calls ───────────────────────────────────────────────────────────────

async function pollJobStatus(
  jobId: string,
  requestId: string
): Promise<{ status: string; videoUrl: string | null }> {
  const res = await fetch("/api/clone/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId, requestId }),
  });
  const data = await res.json() as {
    success: boolean;
    data?: { status: string; videoUrl?: string | null };
  };
  if (!data.success) throw new Error("Status check failed");
  return { status: data.data?.status ?? "PENDING", videoUrl: data.data?.videoUrl ?? null };
}

async function deleteRecord(type: "video" | "image", id: string): Promise<void> {
  const res = await fetch("/api/history", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, id }),
  });
  if (!res.ok) throw new Error("Delete failed");
}

// ─── Component ───────────────────────────────────────────────────────────────

export function HistoryClient({ videos: initialVideos, images: initialImages }: Props) {
  const t = useTranslations("history");
  const [videos, setVideos]   = useState(initialVideos);
  const [images, setImages]   = useState(initialImages);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter]   = useState<Filter>("all");

  const description =
    filter === "videos" ? t("descVideos", { n: videos.length }) :
    filter === "images" ? t("descImages", { n: images.length }) :
    t("descBoth", { videos: videos.length, images: images.length });

  /** Updates a single video's fields in state without mutating the array. */
  const updateVideo = useCallback((id: string, patch: Partial<Video>) => {
    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }, []);

  // Auto-recover pending jobs every 10 seconds.
  useEffect(() => {
    const pending = videos.filter((v) => v.status === "PENDING");
    if (pending.length === 0) return;

    async function checkOne(video: Video) {
      const requestId = getRequestId(video.metadata);
      if (!requestId) return;

      try {
        const { status, videoUrl } = await pollJobStatus(video.id, requestId);
        if (status === "COMPLETED" && videoUrl) {
          updateVideo(video.id, { status: "COMPLETED", url: videoUrl });
        } else if (status === "FAILED") {
          updateVideo(video.id, { status: "FAILED" });
        }
      } catch {
        // Silent — will retry on next interval tick.
      }
    }

    const interval = setInterval(() => {
      videos.filter((v) => v.status === "PENDING").forEach(checkOne);
    }, 10_000);

    return () => clearInterval(interval);
  }, [videos, updateVideo]);

  async function handleDelete(type: "video" | "image", id: string) {
    setDeletingId(id);
    try {
      await deleteRecord(type, id);
      if (type === "video") setVideos((prev) => prev.filter((v) => v.id !== id));
      else setImages((prev) => prev.filter((i) => i.id !== id));
    } catch {
      alert(t("deleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  const showVideos = filter === "all" || filter === "videos";
  const showImages = filter === "all" || filter === "images";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title={t("title")}
        description={description}
        actions={<FilterButtons filter={filter} onChange={setFilter} t={t} />}
      />

      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Videos ── */}
        {showVideos && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Film className="h-5 w-5 text-primary-light" />
              <h2 className="text-base font-semibold text-text-primary">{t("videosSection")}</h2>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary-light">
                {videos.length}
              </span>
            </div>

            {videos.length === 0 ? (
              <p className="text-sm text-text-muted">{t("noVideos")}</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {videos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    deletingId={deletingId}
                    onDelete={(id) => handleDelete("video", id)}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Divider: only when showing both ── */}
        {showVideos && showImages && (
          <div className="border-t border-border mb-8" />
        )}

        {/* ── Images ── */}
        {showImages && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Download className="h-5 w-5 text-primary-light" />
              <h2 className="text-base font-semibold text-text-primary">{t("imagesSection")}</h2>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary-light">
                {images.length}
              </span>
            </div>

            {images.length === 0 ? (
              <p className="text-sm text-text-muted">{t("noImages")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((image) => (
                  <ImageCard
                    key={image.id}
                    image={image}
                    deletingId={deletingId}
                    onDelete={(id) => handleDelete("image", id)}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VideoCard({
  video,
  deletingId,
  onDelete,
  t,
}: {
  video: Video;
  deletingId: string | null;
  onDelete: (id: string) => void;
  t: T;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <VideoPreview video={video} t={t} />
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-text-primary truncate">
            {video.project?.name ?? "Quick Generate"}
          </p>
          {video.duration && (
            <span className="text-xs text-text-muted">{video.duration}s</span>
          )}
        </div>
        <p className="text-xs text-text-muted">{formatDate(video.createdAt)}</p>
        <div className="flex gap-2">
          {video.url && (
            <a
              href={downloadUrl(video.url, "video")}
              download
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-xs text-text-secondary hover:bg-surface-elevated transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              {t("download")}
            </a>
          )}
          <button
            onClick={() => onDelete(video.id)}
            disabled={deletingId === video.id}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-danger/30 bg-danger/5 py-1.5 px-3 text-xs text-danger hover:bg-danger/10 transition-all disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deletingId === video.id ? "..." : t("delete")}
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoPreview({ video, t }: { video: Video; t: T }) {
  if (video.url) {
    return (
      <video
        src={streamUrl(video.url)}
        className="w-full aspect-video object-cover bg-surface-elevated"
        controls
        playsInline
      />
    );
  }
  if (video.status === "FAILED") {
    return (
      <div className="w-full aspect-video bg-danger/5 flex flex-col items-center justify-center gap-2">
        <AlertCircle className="h-8 w-8 text-danger/50" />
        <p className="text-[10px] text-danger/70 font-medium">{t("generationError")}</p>
      </div>
    );
  }
  return (
    <div className="w-full aspect-video bg-surface-elevated flex flex-col items-center justify-center gap-2">
      <Loader2 className="h-8 w-8 text-primary-light animate-spin" />
      <p className="text-[10px] text-text-muted font-medium">{t("processing")}</p>
    </div>
  );
}

function ImageCard({
  image,
  deletingId,
  onDelete,
  t,
}: {
  image: GeneratedImage;
  deletingId: string | null;
  onDelete: (id: string) => void;
  t: T;
}) {
  return (
    <div className="relative rounded-xl overflow-hidden border border-border group">
      <img
        src={image.imageUrl}
        alt={image.sceneText ?? "Generated image"}
        className="w-full aspect-[9/16] object-cover bg-surface-elevated"
      />
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
        <div className="flex justify-between">
          <a
            href={downloadUrl(image.imageUrl, "image")}
            download
            className="flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1 text-xs text-white hover:bg-white/30 transition-colors"
          >
            <Download className="h-3 w-3" />
            {t("download")}
          </a>
          <button
            onClick={() => onDelete(image.id)}
            disabled={deletingId === image.id}
            className="flex items-center gap-1 rounded-lg bg-danger/80 px-2 py-1 text-xs text-white hover:bg-danger transition-colors disabled:opacity-40"
          >
            <Trash2 className="h-3 w-3" />
            {deletingId === image.id ? "..." : t("delete")}
          </button>
        </div>
        <a
          href={toVideoPageUrl(image.imageUrl)}
          className="flex items-center gap-1 rounded-lg bg-primary/80 px-2 py-1 text-xs text-white hover:bg-primary transition-colors justify-center"
        >
          <Film className="h-3 w-3" />
          {t("createVideo")}
        </a>
      </div>
      {image.sceneText && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-white text-xs line-clamp-2">{image.sceneText}</p>
        </div>
      )}
    </div>
  );
}
