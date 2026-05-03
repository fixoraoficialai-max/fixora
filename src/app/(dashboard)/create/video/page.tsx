"use client";

import { useState, useEffect, useRef } from "react";
import { Video, Download, RefreshCw, Zap, X, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea, FormField } from "@/components/ui/input";
import { TopBar } from "@/components/layout/TopBar";
import { cn } from "@/lib/utils";

type AspectRatio = "LANDSCAPE" | "PORTRAIT" | "SQUARE";
type Duration = "5" | "10";

const ASPECT_OPTIONS = [
  { value: "PORTRAIT" as AspectRatio, label: "9:16", desc: "TikTok, Reels" },
  { value: "LANDSCAPE" as AspectRatio, label: "16:9", desc: "YouTube" },
  { value: "SQUARE" as AspectRatio, label: "1:1", desc: "Instagram" },
];

const MOOD_VALUES = [
  { key: "moodMotivacional" as const, emoji: "\u{1F4AA}", value: "motivational, epic, uplifting atmosphere" },
  { key: "moodTriste"       as const, emoji: "\u{1F622}", value: "sad, melancholic, emotional atmosphere" },
  { key: "moodFeliz"        as const, emoji: "\u{1F60A}", value: "happy, joyful, bright and cheerful atmosphere" },
  { key: "moodEpico"        as const, emoji: "⚡",    value: "epic, dramatic, powerful cinematic atmosphere" },
  { key: "moodGracioso"     as const, emoji: "\u{1F602}", value: "funny, playful, lighthearted atmosphere" },
  { key: "moodDramatico"    as const, emoji: "\u{1F3AD}", value: "dramatic, intense, dark atmosphere" },
];

export default function QuickVideoPage() {
  const t = useTranslations("create");

  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("PORTRAIT");
  const [duration, setDuration] = useState<Duration>("5");
  const [mood, setMood] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const [extendVideoUrl, setExtendVideoUrl] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const img = params.get("imageUrl");
    if (img) {
      const decoded = decodeURIComponent(img);
      setImageUrl(decoded);
      setImagePreview(decoded);
    }
  }, []);

  async function handleFileUpload(file: File) {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError(t("videoErrorType"));
      return;
    }
    if (file.size > 50 * 1024 * 1024) { setError(t("videoErrorSize")); return; }
    setError("");
    const isVid = file.type.startsWith("video/");
    setIsVideo(isVid);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json() as { success: boolean; data?: { imageUrl: string }; error?: { message: string } };
      if (!data.success) throw new Error(data.error?.message ?? (isVid ? t("videoErrorUploadVid") : t("videoErrorUploadImg")));
      setImageUrl(data.data?.imageUrl ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : (isVid ? t("videoErrorUploadVid") : t("videoErrorUploadImg")));
      setImagePreview("");
    } finally {
      setIsUploading(false);
    }
  }

  function handleClearImage() {
    setImageUrl("");
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (trimmed.length < 5) { setError(t("videoErrorMin")); return; }
    setIsLoading(true);
    setError("");
    setVideoUrl("");
    const selectedMood = MOOD_VALUES.find(m => m.value === mood);
    const finalPrompt = selectedMood ? trimmed + ", " + selectedMood.value : trimmed;
    try {
      const res = await fetch("/api/generate/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          aspectRatio,
          duration,
          ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
        }),
      });
      const data = await res.json() as { success: boolean; data?: { videoUrl: string }; error?: { message: string } };
      if (!data.success) throw new Error(data.error?.message ?? t("videoErrorMin"));
      setVideoUrl(data.data?.videoUrl ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("videoErrorMin"));
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setPrompt("");
    setImageUrl("");
    setImagePreview("");
    setVideoUrl("");
    setMood("");
    setError("");
    setIsVideo(false);
    setExtendVideoUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title={t("videoTitle")} description={t("videoDesc")} />
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="mx-auto max-w-2xl flex flex-col gap-5">
        <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">

          <FormField label={t("videoRefLabel")} hint={t("videoRefHint")}>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border">
                {isVideo ? (
                  <video src={imagePreview} className="w-full max-h-48 object-cover" controls playsInline preload="metadata" />
                ) : (
                  <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover" />
                )}
                <button type="button" onClick={handleClearImage}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors">
                  <X className="h-4 w-4" />
                </button>
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <p className="text-white text-sm">{t("videoUploading")}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-6 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
                  <Upload className="h-8 w-8 text-text-muted mb-2" />
                  <p className="text-sm text-text-muted">{t("videoClickUpload")}</p>
                  <p className="text-xs text-text-muted mt-1">{t("videoUploadFormat")}</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*,video/mp4,video/mov,video/webm" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-text-muted">{t("videoOrPasteUrl")}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <input type="url" placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => { setImageUrl(e.target.value); setImagePreview(e.target.value); }}
                  className="flex h-10 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/60 transition-colors" />
              </div>
            )}
          </FormField>

          <FormField label={t("videoExtendLabel")} hint={t("videoExtendHint")}>
            <div className="flex items-center gap-2">
              <input
                type="url"
                placeholder={t("videoExtendPlaceholder")}
                value={extendVideoUrl}
                onChange={(e) => setExtendVideoUrl(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/60 transition-colors"
              />
              {extendVideoUrl && (
                <button type="button" onClick={() => setExtendVideoUrl("")}
                  className="flex-shrink-0 rounded-md p-1 text-text-muted hover:text-danger transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {extendVideoUrl && (
              <video src={extendVideoUrl} className="mt-2 rounded-lg max-h-40 border border-border w-full" controls playsInline />
            )}
          </FormField>

          <FormField label={t("videoPromptLabel")} required hint={t("videoPromptHint")}>
            <Textarea placeholder="The character walks confidently, cinematic slow motion..." rows={4}
              value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </FormField>

          <FormField label={t("videoMoodLabel")}>
            <div className="grid grid-cols-3 gap-2">
              {MOOD_VALUES.map((m) => (
                <button key={m.value} type="button" onClick={() => setMood(mood === m.value ? "" : m.value)}
                  className={cn("flex flex-col items-center rounded-xl border p-3 text-xs font-medium transition-all",
                    mood === m.value ? "border-primary/40 bg-primary/10 text-primary-light" : "border-border text-text-muted hover:border-border-strong")}>
                  <span className="text-2xl mb-1">{m.emoji}</span>{t(m.key)}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label={t("videoFormatLabel")}>
            <div className="flex gap-3">
              {ASPECT_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setAspectRatio(opt.value)}
                  className={cn("flex flex-col items-center rounded-xl border px-4 py-3 text-xs font-medium transition-all flex-1",
                    aspectRatio === opt.value ? "border-primary/40 bg-primary/10 text-primary-light" : "border-border text-text-muted hover:border-border-strong")}>
                  <span className="text-sm font-bold">{opt.label}</span>
                  <span className="opacity-70">{opt.desc}</span>
                </button>
              ))}
            </div>
          </FormField>

          <FormField label={t("videoDurationLabel")}>
            <div className="flex gap-3">
              {(["5", "10"] as Duration[]).map((d) => (
                <button key={d} type="button" onClick={() => setDuration(d)}
                  className={cn("flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                    duration === d ? "border-primary/40 bg-primary/10 text-primary-light" : "border-border text-text-muted hover:border-border-strong")}>
                  {t("videoSeconds", { n: d })}
                </button>
              ))}
            </div>
          </FormField>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex items-center justify-between pt-1 border-t border-border">
            <p className="text-xs text-text-muted">Costo: <span className="text-warning font-medium">{t("videoCost")}</span></p>
            <Button onClick={handleGenerate} disabled={prompt.trim().length < 5 || isLoading || isUploading} isLoading={isLoading}>
              <Video className="h-4 w-4" />
              {isLoading ? t("videoGenerating") : t("videoGenerate")}
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="rounded-xl border border-border bg-surface p-6 flex flex-col items-center gap-3">
            <Zap className="h-8 w-8 text-primary-light animate-pulse" />
            <p className="text-sm font-medium text-text-primary">{t("videoGenWait")}</p>
            <p className="text-xs text-text-muted">{t("videoGenWaitSub")}</p>
          </div>
        )}

        {videoUrl && (
          <div className="rounded-xl border border-border overflow-hidden">
            <video src={"/api/download?url=" + encodeURIComponent(videoUrl) + "&type=video&stream=1"} controls autoPlay loop playsInline className="w-full" />
            <div className="flex items-center justify-between px-4 py-3 bg-surface-elevated border-t border-border">
              <p className="text-xs text-success font-medium">{t("videoGenerated")}</p>
              <div className="flex gap-2">
                <a href={"/api/download?url=" + encodeURIComponent(videoUrl) + "&type=video"} download>
                  <Button variant="secondary" size="sm">
                    <Download className="h-3.5 w-3.5" />{t("download")}
                  </Button>
                </a>
                <Button variant="secondary" size="sm" onClick={handleReset}>
                  <RefreshCw className="h-3.5 w-3.5" />{t("newOne")}
                </Button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
