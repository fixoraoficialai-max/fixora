"use client";

import { useState, useRef, useCallback } from "react";
import { Users, Zap, Download, RefreshCw, Smartphone, Monitor, Square, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea, FormField } from "@/components/ui/input";
import { TopBar } from "@/components/layout/TopBar";
import { cn } from "@/lib/utils";
import {
  UploadCard,
  ImagePreview,
  VideoPreview,
  EMPTY_UPLOAD,
  type UploadState,
} from "@/components/shared/media-upload";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_IMAGE_BYTES = 30 * 1024 * 1024; // 30 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const POLL_INTERVAL_MS = 10_000;
const MAX_POLLS = 60;

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "idle" | "submitted" | "polling" | "done" | "error";
type AspectRatio = "9:16" | "16:9" | "1:1";

// ─── Aspect ratio config ──────────────────────────────────────────────────────

const RATIO_OPTIONS: {
  value: AspectRatio;
  label: string;
  desc: string;
  Icon: LucideIcon;
  canvasClass: string;
}[] = [
  {
    value: "9:16",
    label: "9:16",
    desc: "TikTok / Reels",
    Icon: Smartphone,
    canvasClass: "max-w-[260px] aspect-[9/16]",
  },
  {
    value: "16:9",
    label: "16:9",
    desc: "YouTube",
    Icon: Monitor,
    canvasClass: "w-full aspect-[16/9]",
  },
  {
    value: "1:1",
    label: "1:1",
    desc: "Post",
    Icon: Square,
    canvasClass: "max-w-[340px] aspect-square",
  },
];

// ─── API helpers ─────────────────────────────────────────────────────────────

async function uploadToServer(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = (await res.json()) as {
    success: boolean;
    data?: { fileUrl: string };
    error?: { message: string };
  };
  if (!data.success || !data.data?.fileUrl) {
    throw new Error(data.error?.message ?? "Upload failed");
  }
  return data.data.fileUrl;
}

async function submitCloneJob(
  characterImageUrl: string,
  motionVideoUrl: string,
  prompt: string,
  aspectRatio: AspectRatio
): Promise<{ jobId: string; requestId: string }> {
  const res = await fetch("/api/clone/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ characterImageUrl, motionVideoUrl, prompt, aspectRatio }),
  });
  const data = (await res.json()) as {
    success: boolean;
    data?: { jobId: string; requestId: string };
    error?: { message: string };
  };
  if (!data.success || !data.data?.jobId || !data.data?.requestId) {
    throw new Error(data.error?.message ?? "Submit failed");
  }
  return data.data;
}

async function checkCloneStatus(
  jobId: string,
  requestId: string
): Promise<{ status: string; videoUrl?: string; reason?: string }> {
  const res = await fetch("/api/clone/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId, requestId }),
  });
  const data = (await res.json()) as {
    success: boolean;
    data?: { status: string; videoUrl?: string; reason?: string };
    error?: { message: string };
  };
  if (!data.success) throw new Error(data.error?.message ?? "Status check failed");
  return data.data ?? { status: "PENDING" };
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateImageFile(
  file: File,
  tCloneErrorImageType: string,
  tCloneErrorImageSize: string
): string | null {
  const name = file.name.toLowerCase();
  const isHeic = name.endsWith(".heic") || name.endsWith(".heif");
  const isImage = file.type.startsWith("image/") || isHeic;
  if (!isImage) return tCloneErrorImageType;
  if (file.size > MAX_IMAGE_BYTES) return tCloneErrorImageSize;
  return null;
}

function validateVideoFile(
  file: File,
  tCloneErrorVideoType: string,
  tCloneErrorVideoSize: string
): string | null {
  if (!file.type.startsWith("video/")) return tCloneErrorVideoType;
  if (file.size > MAX_VIDEO_BYTES) return tCloneErrorVideoSize;
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClonePage() {
  const t = useTranslations("create");

  const [character, setCharacter] = useState<UploadState>(EMPTY_UPLOAD);
  const [motion, setMotion] = useState<UploadState>(EMPTY_UPLOAD);
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");

  const charInputRef = useRef<HTMLInputElement>(null);
  const motionInputRef = useRef<HTMLInputElement>(null);
  const pollCountRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearPollTimer() {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
  }

  // ─── Upload handlers ──────────────────────────────────────────────────────

  async function handleCharacterFile(file: File) {
    const err = validateImageFile(file, t("cloneErrorImageType"), t("cloneErrorImageSize"));
    if (err) { setError(err); return; }
    setError("");

    const isHeic =
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif");
    const preview = isHeic ? "__heic__" : URL.createObjectURL(file);

    setCharacter({ url: "", preview, uploading: true, fileName: file.name });
    try {
      const url = await uploadToServer(file);
      setCharacter({ url, preview, uploading: false, fileName: file.name });
    } catch (e) {
      if (preview !== "__heic__") URL.revokeObjectURL(preview);
      setError(e instanceof Error ? e.message : t("cloneErrorUploadImg"));
      setCharacter(EMPTY_UPLOAD);
    }
  }

  async function handleMotionFile(file: File) {
    const err = validateVideoFile(file, t("cloneErrorVideoType"), t("cloneErrorVideoSize"));
    if (err) { setError(err); return; }
    setError("");
    const preview = URL.createObjectURL(file);
    setMotion({ url: "", preview, uploading: true, fileName: file.name });
    try {
      const url = await uploadToServer(file);
      setMotion({ url, preview, uploading: false, fileName: file.name });
    } catch (e) {
      URL.revokeObjectURL(preview);
      setError(e instanceof Error ? e.message : t("cloneErrorUploadVid"));
      setMotion(EMPTY_UPLOAD);
    }
  }

  // ─── Polling ──────────────────────────────────────────────────────────────

  const startPolling = useCallback((jobId: string, requestId: string) => {
    pollCountRef.current = 0;
    setPhase("polling");

    async function poll() {
      if (pollCountRef.current >= MAX_POLLS) {
        setError(t("generationTimeout"));
        setPhase("error");
        return;
      }

      pollCountRef.current += 1;
      const elapsed = Math.round((pollCountRef.current * POLL_INTERVAL_MS) / 1000);
      setStatusMsg(`Generando… ${elapsed}s`);

      try {
        const result = await checkCloneStatus(jobId, requestId);

        if (result.status === "COMPLETED" && result.videoUrl) {
          setVideoUrl(result.videoUrl);
          setPhase("done");
          return;
        }

        if (result.status === "FAILED") {
          setError(result.reason ?? t("cloneErrorFailed"));
          setPhase("error");
          return;
        }

        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("cloneErrorConn"));
        setPhase("error");
      }
    }

    pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
  }, []);

  // ─── Generate ─────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!character.url) { setError(t("cloneErrorNoChar")); return; }
    if (!motion.url) { setError(t("cloneErrorNoMotion")); return; }
    if (prompt.trim().length < 5) { setError(t("cloneErrorNoPrompt")); return; }

    setPhase("submitted");
    setError("");
    setVideoUrl("");
    setStatusMsg("Procesando tu solicitud…");

    try {
      const { jobId, requestId } = await submitCloneJob(
        character.url,
        motion.url,
        prompt.trim(),
        aspectRatio
      );
      startPolling(jobId, requestId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar");
      setPhase("error");
    }
  }

  // ─── Reset ────────────────────────────────────────────────────────────────

  function reset() {
    clearPollTimer();
    if (character.preview && character.preview !== "__heic__")
      URL.revokeObjectURL(character.preview);
    if (motion.preview) URL.revokeObjectURL(motion.preview);
    setCharacter(EMPTY_UPLOAD);
    setMotion(EMPTY_UPLOAD);
    setPrompt("");
    setVideoUrl("");
    setPhase("idle");
    setStatusMsg("");
    setError("");
    pollCountRef.current = 0;
    if (charInputRef.current) charInputRef.current.value = "";
    if (motionInputRef.current) motionInputRef.current.value = "";
  }

  // ─── Derived state ────────────────────────────────────────────────────────

  const isProcessing = phase === "submitted" || phase === "polling";
  const canGenerate =
    !!character.url &&
    !!motion.url &&
    prompt.trim().length >= 5 &&
    !character.uploading &&
    !motion.uploading &&
    !isProcessing;

  const activeRatio = RATIO_OPTIONS.find((r) => r.value === aspectRatio)!;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title={t("cloneTitle")} description={t("cloneDesc")} />
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="mx-auto max-w-2xl">
          {error && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-5">

            {/* ── Upload row ── */}
            <div className="grid grid-cols-2 gap-4">

              {/* Character image — accepts HEIC, converted on server */}
              <UploadCard
                label={t("cloneCharLabel")}
                hint={t("cloneCharHint")}
                icon={<Users className="h-4 w-4 text-primary-light" />}
                dropLabel={<>Sube imagen<br />del personaje<br /><span className="text-[10px] opacity-60">JPG, PNG, HEIC</span></>}
                state={character}
                accept="image/jpeg, image/png, image/webp, image/heic, image/heif, .heic, .heif"
                inputRef={charInputRef}
                disabled={isProcessing}
                renderPreview={(state) => <ImagePreview state={state} />}
                onFile={handleCharacterFile}
                onClear={() => {
                  if (character.preview && character.preview !== "__heic__")
                    URL.revokeObjectURL(character.preview);
                  setCharacter(EMPTY_UPLOAD);
                  if (charInputRef.current) charInputRef.current.value = "";
                }}
              />

              <UploadCard
                label={t("cloneMotionLabel")}
                hint={t("cloneMotionHint")}
                icon={<Zap className="h-4 w-4 text-warning" />}
                dropLabel={<>Sube video<br />de movimiento<br /><span className="text-[10px] opacity-60">MP4, MOV, WebM</span></>}
                state={motion}
                accept="video/*"
                inputRef={motionInputRef}
                disabled={isProcessing}
                renderPreview={(state) => <VideoPreview state={state} />}
                onFile={handleMotionFile}
                onClear={() => {
                  if (motion.preview) URL.revokeObjectURL(motion.preview);
                  setMotion(EMPTY_UPLOAD);
                  if (motionInputRef.current) motionInputRef.current.value = "";
                }}
              />
            </div>

            {/* ── Aspect ratio selector ── */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Formato de salida
              </p>
              <div className="flex items-center gap-2">
                {RATIO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAspectRatio(opt.value)}
                    disabled={isProcessing}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-medium transition-all",
                      aspectRatio === opt.value
                        ? "border-primary/50 bg-primary/10 text-primary-light shadow-[0_0_12px_rgba(124,58,237,0.2)]"
                        : "border-border text-text-muted hover:border-border-strong hover:text-text-primary disabled:opacity-40"
                    )}
                  >
                    <opt.Icon className="h-3.5 w-3.5" />
                    <span className="font-semibold">{opt.label}</span>
                    <span className="opacity-50 text-[10px]">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Prompt & actions ── */}
            <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
              <FormField
                label={t("clonePromptLabel")}
                required
                hint={t("clonePromptHint")}
              >
                <Textarea
                  placeholder={t("clonePromptPlaceholder")}
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isProcessing}
                />
              </FormField>

              <div className="flex items-center justify-between pt-1 border-t border-border">
                <p className="text-xs text-text-muted">
                  Costo: <span className="text-warning font-medium">{t("cloneCost")}</span>
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={reset} disabled={isProcessing}>
                    <RefreshCw className="h-4 w-4" />
                    {t("clear")}
                  </Button>
                  <Button onClick={handleGenerate} disabled={!canGenerate} isLoading={isProcessing}>
                    <Users className="h-4 w-4" />
                    {isProcessing ? statusMsg || "Procesando…" : t("cloneGenerate")}
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Processing status ── */}
            {isProcessing && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 flex flex-col items-center gap-3">
                <Zap className="h-8 w-8 text-primary-light animate-pulse" />
                <p className="text-sm font-medium text-text-primary">{statusMsg}</p>
                <p className="text-xs text-text-muted text-center">
                  {t("generationWait")}
                </p>
                <p className="text-xs text-success">{t("creditsOnSuccess")}</p>
              </div>
            )}

            {/* ── Result ── */}
            {phase === "done" && videoUrl && (
              <div className="flex flex-col items-center gap-4">
                {/* Video preview with dynamic aspect ratio */}
                <div
                  className={cn(
                    "mx-auto w-full overflow-hidden rounded-2xl border border-border bg-black shadow-2xl",
                    activeRatio.canvasClass
                  )}
                >
                  <video
                    src={`/api/download?url=${encodeURIComponent(videoUrl)}&type=video&stream=1`}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Actions row */}
                <div className="w-full flex items-center justify-between px-1">
                  <p className="text-xs text-success font-medium">{t("cloneDone")}</p>
                  <div className="flex gap-2">
                    <a
                      href={`/api/download?url=${encodeURIComponent(videoUrl)}&type=video`}
                      download
                    >
                      <Button variant="secondary" size="sm">
                        <Download className="h-3.5 w-3.5" />
                        {t("download")}
                      </Button>
                    </a>
                    <Button variant="secondary" size="sm" onClick={reset}>
                      <RefreshCw className="h-3.5 w-3.5" />
                      {t("newOne")}
                    </Button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
