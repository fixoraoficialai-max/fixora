"use client";

import { useState, useEffect, useRef } from "react";
import { Video, Download, RefreshCw, Zap, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea, FormField } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

type AspectRatio = "LANDSCAPE" | "PORTRAIT" | "SQUARE";
type Duration = "5" | "10";

const ASPECT_OPTIONS = [
  { value: "PORTRAIT" as AspectRatio, label: "9:16", desc: "TikTok, Reels" },
  { value: "LANDSCAPE" as AspectRatio, label: "16:9", desc: "YouTube" },
  { value: "SQUARE" as AspectRatio, label: "1:1", desc: "Instagram" },
];

const MOODS = [
  { label: "Motivacional", emoji: "\u{1F4AA}", value: "motivational, epic, uplifting atmosphere" },
  { label: "Triste", emoji: "\u{1F622}", value: "sad, melancholic, emotional atmosphere" },
  { label: "Feliz", emoji: "\u{1F60A}", value: "happy, joyful, bright and cheerful atmosphere" },
  { label: "Epico", emoji: "\u26A1", value: "epic, dramatic, powerful cinematic atmosphere" },
  { label: "Gracioso", emoji: "\u{1F602}", value: "funny, playful, lighthearted atmosphere" },
  { label: "Dramatico", emoji: "\u{1F3AD}", value: "dramatic, intense, dark atmosphere" },
];

export default function QuickVideoPage() {
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
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) { setError("Solo se permiten imagenes o videos"); return; }
    if (file.size > 50 * 1024 * 1024) { setError("El archivo debe ser menor a 50MB"); return; }
    setError("");
    const isVid = file.type.startsWith("video/");
    setIsVideo(isVid);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);

    if (isVid) {
      // For video - store as object URL for preview, upload for API
      setIsUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json() as { success: boolean; data?: { imageUrl: string }; error?: { message: string } };
        if (!data.success) throw new Error(data.error?.message ?? "Error subiendo video");
        setImageUrl(data.data?.imageUrl ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error subiendo video");
        setImagePreview("");
      } finally {
        setIsUploading(false);
      }
    } else {
      // For image - upload normally
      setIsUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json() as { success: boolean; data?: { imageUrl: string }; error?: { message: string } };
        if (!data.success) throw new Error(data.error?.message ?? "Error subiendo imagen");
        setImageUrl(data.data?.imageUrl ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error subiendo imagen");
        setImagePreview("");
      } finally {
        setIsUploading(false);
      }
    }
  }

  function handleClearImage() {
    setImageUrl("");
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (trimmed.length < 5) { setError("Escribe al menos 5 caracteres"); return; }
    setIsLoading(true);
    setError("");
    setVideoUrl("");
    const selectedMood = MOODS.find(m => m.value === mood);
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
      if (!data.success) throw new Error(data.error?.message ?? "Error generando video");
      setVideoUrl(data.data?.videoUrl ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salio mal");
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
    <div className="mx-auto max-w-2xl py-8 px-4">
      <PageHeader
        title="Generar Video"
        description="Genera un video desde texto o a partir de una imagen"
        backHref="/create"
        backLabel="Create"
      />
      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">

          <FormField label="Imagen de referencia (opcional)" hint="Sube una imagen o pega una URL para convertirla en video">
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
                    <p className="text-white text-sm">Subiendo...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-6 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
                  <Upload className="h-8 w-8 text-text-muted mb-2" />
                  <p className="text-sm text-text-muted">Haz clic para subir imagen o video</p>
                  <p className="text-xs text-text-muted mt-1">PNG, JPG, MP4 hasta 50MB</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*,video/mp4,video/mov,video/webm" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-text-muted">o pega una URL</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <input type="url" placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => { setImageUrl(e.target.value); setImagePreview(e.target.value); }}
                  className="flex h-10 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/60 transition-colors" />
              </div>
            )}
          </FormField>

          <FormField label="Extender video existente (opcional)" hint="Pega la URL de un video generado para continuar la escena con Grok">
            <div className="flex items-center gap-2">
              <input
                type="url"
                placeholder="https://... URL del video a extender"
                value={extendVideoUrl}
                onChange={(e) => setExtendVideoUrl(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/60 transition-colors"
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

          <FormField label="Prompt" required hint="Describe el movimiento y accion del video">
            <Textarea placeholder="The character walks confidently, cinematic slow motion..." rows={4}
              value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </FormField>

          <FormField label="Mood del Video">
            <div className="grid grid-cols-3 gap-2">
              {MOODS.map((m) => (
                <button key={m.value} type="button" onClick={() => setMood(mood === m.value ? "" : m.value)}
                  className={cn("flex flex-col items-center rounded-xl border p-3 text-xs font-medium transition-all",
                    mood === m.value ? "border-primary/40 bg-primary/10 text-primary-light" : "border-border text-text-muted hover:border-border-strong")}>
                  <span className="text-2xl mb-1">{m.emoji}</span>{m.label}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Formato">
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

          <FormField label="Duracion">
            <div className="flex gap-3">
              {(["5", "10"] as Duration[]).map((d) => (
                <button key={d} type="button" onClick={() => setDuration(d)}
                  className={cn("flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                    duration === d ? "border-primary/40 bg-primary/10 text-primary-light" : "border-border text-text-muted hover:border-border-strong")}>
                  {d} segundos
                </button>
              ))}
            </div>
          </FormField>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex items-center justify-between pt-1 border-t border-border">
            <p className="text-xs text-text-muted">Costo: <span className="text-warning font-medium">5 creditos</span></p>
            <Button onClick={handleGenerate} disabled={prompt.trim().length < 5 || isLoading || isUploading} isLoading={isLoading}>
              <Video className="h-4 w-4" />
              {isLoading ? "Generando video..." : "Generar Video"}
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="rounded-xl border border-border bg-surface p-6 flex flex-col items-center gap-3">
            <Zap className="h-8 w-8 text-primary-light animate-pulse" />
            <p className="text-sm font-medium text-text-primary">Generando tu video...</p>
            <p className="text-xs text-text-muted">Esto puede tardar 1-2 minutos</p>
          </div>
        )}

        {videoUrl && (
          <div className="rounded-xl border border-border overflow-hidden">
            <video src={"/api/download?url=" + encodeURIComponent(videoUrl) + "&type=video&stream=1"} controls autoPlay loop playsInline className="w-full" />
            <div className="flex items-center justify-between px-4 py-3 bg-surface-elevated border-t border-border">
              <p className="text-xs text-success font-medium">Video generado</p>
              <div className="flex gap-2">
                <a href={"/api/download?url=" + encodeURIComponent(videoUrl) + "&type=video"} download>
                  <Button variant="secondary" size="sm">
                    <Download className="h-3.5 w-3.5" />Descargar
                  </Button>
                </a>
                <Button variant="secondary" size="sm" onClick={handleReset}>
                  <RefreshCw className="h-3.5 w-3.5" />Nuevo
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
