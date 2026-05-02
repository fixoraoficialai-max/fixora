"use client";

import { useState, useRef, useCallback } from "react";
import { Users, Upload, X, Zap, Download, RefreshCw, Film, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea, FormField } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  UploadCard,
  ImagePreview,
  VideoPreview,
  EMPTY_UPLOAD,
  type UploadState
} from "@/components/shared/media-upload";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_IMAGE_BYTES = 30 * 1024 * 1024; // 30 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const POLL_INTERVAL_MS = 10_000;
const MAX_POLLS = 60;

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "idle" | "submitted" | "polling" | "done" | "error";


// ─── API helpers ─────────────────────────────────────────────────────────────

async function uploadToServer(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json() as {
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
  prompt: string
): Promise<{ jobId: string; requestId: string }> {
  const res = await fetch("/api/clone/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ characterImageUrl, motionVideoUrl, prompt }),
  });
  const data = await res.json() as {
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
  const data = await res.json() as {
    success: boolean;
    data?: { status: string; videoUrl?: string; reason?: string };
    error?: { message: string };
  };
  if (!data.success) throw new Error(data.error?.message ?? "Status check failed");
  return data.data ?? { status: "PENDING" };
}

// ─── Validation (client-side pre-check — server does the real conversion) ────

function validateImageFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const isHeic = name.endsWith(".heic") || name.endsWith(".heif");
  const isImage = file.type.startsWith("image/") || isHeic;
  if (!isImage) return "Solo se permiten imágenes (JPG, PNG, WebP, HEIC)";
  if (file.size > MAX_IMAGE_BYTES) return "La imagen es demasiado grande (máx 30MB)";
  return null;
}

function validateVideoFile(file: File): string | null {
  if (!file.type.startsWith("video/")) return "Solo se permiten videos (MP4, MOV, WebM)";
  if (file.size > MAX_VIDEO_BYTES) return "El video es demasiado grande (máx 50MB)";
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClonePage() {
  const [character, setCharacter] = useState<UploadState>(EMPTY_UPLOAD);
  const [motion, setMotion] = useState<UploadState>(EMPTY_UPLOAD);
  const [prompt, setPrompt] = useState("");
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

  // ─── Upload handlers ────────────────────────────────────────────────────────

  async function handleCharacterFile(file: File) {
    const err = validateImageFile(file);
    if (err) { setError(err); return; }
    setError("");

    // For HEIC: no browser preview possible — show a "file ready" placeholder instead
    const isHeic = file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif");
    const preview = isHeic ? "__heic__" : URL.createObjectURL(file);

    setCharacter({ url: "", preview, uploading: true, fileName: file.name });
    try {
      // Server handles HEIC→JPEG conversion + downscaling transparently
      const url = await uploadToServer(file);
      setCharacter({ url, preview, uploading: false, fileName: file.name });
    } catch (e) {
      if (preview !== "__heic__") URL.revokeObjectURL(preview);
      setError(e instanceof Error ? e.message : "Error subiendo imagen");
      setCharacter(EMPTY_UPLOAD);
    }
  }

  async function handleMotionFile(file: File) {
    const err = validateVideoFile(file);
    if (err) { setError(err); return; }
    setError("");
    const preview = URL.createObjectURL(file);
    setMotion({ url: "", preview, uploading: true, fileName: file.name });
    try {
      const url = await uploadToServer(file);
      setMotion({ url, preview, uploading: false, fileName: file.name });
    } catch (e) {
      URL.revokeObjectURL(preview);
      setError(e instanceof Error ? e.message : "Error subiendo video");
      setMotion(EMPTY_UPLOAD);
    }
  }

  // ─── Polling ────────────────────────────────────────────────────────────────

  const startPolling = useCallback((jobId: string, requestId: string) => {
    pollCountRef.current = 0;
    setPhase("polling");

    async function poll() {
      if (pollCountRef.current >= MAX_POLLS) {
        setError(
          "La generación está tomando más de lo esperado. " +
          "Puedes cerrar esta página — el video aparecerá en tu Historial automáticamente."
        );
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
          setError(result.reason ?? "Fal.ai no pudo generar el video. No se descontaron créditos.");
          setPhase("error");
          return;
        }

        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error de conexión");
        setPhase("error");
      }
    }

    pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
  }, []);

  // ─── Generate ───────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!character.url) { setError("Sube la imagen del personaje"); return; }
    if (!motion.url) { setError("Sube el video de movimiento"); return; }
    if (prompt.trim().length < 5) { setError("Describe el resultado (mínimo 5 caracteres)"); return; }

    setPhase("submitted");
    setError("");
    setVideoUrl("");
    setStatusMsg("Enviando a Fal.ai…");

    try {
      const { jobId, requestId } = await submitCloneJob(
        character.url,
        motion.url,
        prompt.trim()
      );
      startPolling(jobId, requestId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar");
      setPhase("error");
    }
  }

  // ─── Reset ──────────────────────────────────────────────────────────────────

  function reset() {
    clearPollTimer();
    if (character.preview && character.preview !== "__heic__") URL.revokeObjectURL(character.preview);
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

  // ─── Derived state ───────────────────────────────────────────────────────────

  const isProcessing = phase === "submitted" || phase === "polling";
  const canGenerate =
    !!character.url &&
    !!motion.url &&
    prompt.trim().length >= 5 &&
    !character.uploading &&
    !motion.uploading &&
    !isProcessing;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl py-8 px-4">
      <PageHeader
        title="Clonar Movimiento"
        description="Aplica el movimiento de un video real a tu personaje IA"
        backHref="/create"
        backLabel="Create"
      />

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
            label="Tu Personaje"
            hint="Imagen del personaje a animar"
            icon={<Users className="h-4 w-4 text-primary-light" />}
            dropLabel={<>Sube imagen<br />del personaje<br /><span className="text-[10px] opacity-60">JPG, PNG, HEIC</span></>}
            state={character}
            accept="image/jpeg, image/png, image/webp, image/heic, image/heif, .heic, .heif"
            inputRef={charInputRef}
            disabled={isProcessing}
            renderPreview={(state) => <ImagePreview state={state} />}
            onFile={handleCharacterFile}
            onClear={() => {
              if (character.preview && character.preview !== "__heic__") URL.revokeObjectURL(character.preview);
              setCharacter(EMPTY_UPLOAD);
              if (charInputRef.current) charInputRef.current.value = "";
            }}
          />

          {/* Motion video */}
          <UploadCard
            label="Video Movimiento"
            hint="Video con el movimiento a clonar"
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

        {/* ── Prompt & actions ── */}
        <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
          <FormField
            label="Describe el resultado"
            required
            hint="Qué quieres que haga tu personaje con esos movimientos"
          >
            <Textarea
              placeholder="Mi personaje fresa bailando con energía, adoptando exactamente los movimientos del video…"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isProcessing}
            />
          </FormField>

          <div className="rounded-xl border border-success/20 bg-success/5 p-3">
            <p className="text-xs text-success font-medium">
              Los 10 créditos solo se cobran cuando el video esté listo — si Fal.ai falla no se cobra nada.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border">
            <p className="text-xs text-text-muted">
              Costo: <span className="text-warning font-medium">10 créditos</span>
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={reset} disabled={isProcessing}>
                <RefreshCw className="h-4 w-4" />
                Limpiar
              </Button>
              <Button onClick={handleGenerate} disabled={!canGenerate} isLoading={isProcessing}>
                <Users className="h-4 w-4" />
                {isProcessing ? statusMsg || "Procesando…" : "Clonar Movimiento"}
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
              Kling Motion Control suele tardar 3–6 minutos.<br />
              Si cierras esta página, el video aparecerá en tu Historial cuando esté listo.
            </p>
            <p className="text-xs text-success">
              Los créditos se descuentan solo al finalizar exitosamente.
            </p>
          </div>
        )}

        {/* ── Result ── */}
        {phase === "done" && videoUrl && (
          <div className="rounded-xl border border-border overflow-hidden">
            <video
              src={`/api/download?url=${encodeURIComponent(videoUrl)}&type=video&stream=1`}
              controls
              autoPlay
              loop
              playsInline
              className="w-full"
            />
            <div className="flex items-center justify-between px-4 py-3 bg-surface-elevated border-t border-border">
              <p className="text-xs text-success font-medium">Movimiento clonado exitosamente</p>
              <div className="flex gap-2">
                <a href={`/api/download?url=${encodeURIComponent(videoUrl)}&type=video`} download>
                  <Button variant="secondary" size="sm">
                    <Download className="h-3.5 w-3.5" />
                    Descargar
                  </Button>
                </a>
                <Button variant="secondary" size="sm" onClick={reset}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Nuevo
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


