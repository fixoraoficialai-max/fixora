"use client";

import { useState, useRef, useCallback } from "react";
import { Users, Upload, X, Zap, Download, RefreshCw, Film, CheckCircle, Grid, Play } from "lucide-react";
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

const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const POLL_INTERVAL_MS = 12_000; // Multi-clone takes longer, poll less frequently
const MAX_POLLS = 80;

type Phase = "idle" | "submitted" | "polling" | "done" | "error";

// ─── API helpers ─────────────────────────────────────────────────────────────

async function submitMultiClone(data: { characterImageUrls: string[], motionVideoUrl: string, prompt: string }) {
  const res = await fetch("/api/multi-clone/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Error al enviar");
  return json.data; // { multiCloneId, videoIds, requestIds }
}

async function checkMultiCloneStatus(jobId: string, requestId: string) {
  const res = await fetch("/api/multi-clone/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId, requestId }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Error al consultar");
  return json.data; // { overallStatus, progress, parts }
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function MultiClonePage() {
  const [characters, setCharacters] = useState<UploadState[]>([EMPTY_UPLOAD, EMPTY_UPLOAD, EMPTY_UPLOAD, EMPTY_UPLOAD]);
  const [motion, setMotion] = useState<UploadState>(EMPTY_UPLOAD);
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resultParts, setResultParts] = useState<any[]>([]);

  const charInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const motionInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pollCountRef = useRef(0);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleImageFile = async (index: number, file: File) => {
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`Imagen ${index + 1} demasiado grande (máx 30MB)`);
      return;
    }

    const isHeic = file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif");
    const preview = isHeic ? "__heic__" : URL.createObjectURL(file);
    
    const newChars = [...characters];
    newChars[index] = { ...EMPTY_UPLOAD, preview, uploading: true, fileName: file.name };
    setCharacters(newChars);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Error subiendo imagen");
      
      const updatedChars = [...newChars];
      updatedChars[index] = { 
        ...newChars[index], 
        url: data.data.fileUrl, 
        uploading: false 
      };
      setCharacters(updatedChars);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir imagen");
      const updatedChars = [...newChars];
      updatedChars[index] = EMPTY_UPLOAD;
      setCharacters(updatedChars);
    }
  };

  const handleMotionFile = async (file: File) => {
    if (file.size > MAX_VIDEO_BYTES) { setError("Video demasiado grande (máx 50MB)"); return; }
    const preview = URL.createObjectURL(file);
    setMotion({ ...EMPTY_UPLOAD, preview, uploading: true, fileName: file.name });
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Error subiendo video");
      setMotion(prev => ({ ...prev, url: data.data.fileUrl, uploading: false }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir video");
      setMotion(EMPTY_UPLOAD);
    }
  };

  const startPolling = useCallback((jobId: string, requestId: string) => {
    pollCountRef.current = 0;
    setPhase("polling");

    async function poll() {
      if (pollCountRef.current >= MAX_POLLS) {
        setError("La generación está tomando más de lo esperado. Revisa tu historial en unos minutos.");
        setPhase("error");
        return;
      }

      pollCountRef.current += 1;
      try {
        const data = await checkMultiCloneStatus(jobId, requestId);
        setStatusMsg(`Generando... (${data.progress})`);

        if (data.overallStatus === "COMPLETED") {
          setResultParts(data.parts);
          setPhase("done");
          return;
        }

        if (data.overallStatus === "FAILED") {
          setError("Kling no pudo procesar alguno de los personajes. No se cobraron créditos.");
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

  const handleGenerate = async () => {
    const imageUrls = characters.map(c => c.url).filter(Boolean);
    if (imageUrls.length < 4) { setError("Sube las 4 imágenes de los personajes"); return; }
    if (!motion.url) { setError("Sube el video de movimiento"); return; }
    if (!prompt.trim()) { setError("Describe el resultado deseado"); return; }

    setError(null);
    setPhase("submitted");
    setStatusMsg("Iniciando multiclón...");

    try {
      const data = await submitMultiClone({
        characterImageUrls: imageUrls,
        motionVideoUrl: motion.url,
        prompt
      });
      // Start polling with the first job of the batch
      startPolling(data.videoIds[0], data.requestIds[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar proceso");
      setPhase("error");
    }
  };

  const reset = () => {
    characters.forEach(c => c.preview && c.preview !== "__heic__" && URL.revokeObjectURL(c.preview));
    if (motion.preview) URL.revokeObjectURL(motion.preview);
    setCharacters([EMPTY_UPLOAD, EMPTY_UPLOAD, EMPTY_UPLOAD, EMPTY_UPLOAD]);
    setMotion(EMPTY_UPLOAD);
    setPrompt("");
    setPhase("idle");
    setError(null);
    setResultParts([]);
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
  };

  const canGenerate = characters.every(c => c.url) && motion.url && prompt.trim() && phase === "idle";

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex flex-col gap-8">

        {/* ── Header ── */}
        <div className="flex flex-col gap-2">
          <PageHeader
            backHref="/create"
            backLabel="Create"
            title="Multi-Avatar"
            description="Intercambia 4 personajes siguiendo el mismo movimiento (5s cada uno)"
          />
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-error/20 bg-error/5 text-error text-sm font-medium animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* ── Left: Characters Grid ── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Tus 4 Personajes (Secuencia 0-20s)</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {characters.map((char, i) => (
                <UploadCard
                  key={i}
                  label={`Personaje ${i+1}`}
                  hint={i === 0 ? "0-5s" : i === 1 ? "5-10s" : i === 2 ? "10-15s" : "15-20s"}
                  icon={<div className="text-[10px] bg-primary/20 text-primary h-5 w-5 rounded-full flex items-center justify-center font-bold">{i+1}</div>}
                  dropLabel="Cargar imagen"
                  state={char}
                  accept="image/*,.heic,.heif"
                  inputRef={charInputRefs[i] as React.RefObject<HTMLInputElement | null>}
                  disabled={phase !== "idle"}
                  renderPreview={(state) => <ImagePreview state={state} />}
                  onFile={(file) => handleImageFile(i, file)}
                  onClear={() => {
                    if (char.preview && char.preview !== "__heic__") URL.revokeObjectURL(char.preview);
                    const newChars = [...characters];
                    newChars[i] = EMPTY_UPLOAD;
                    setCharacters(newChars);
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── Right: Motion & Prompt ── */}
          <div className="flex flex-col gap-6">
            <UploadCard
              label="Video de Movimiento"
              hint="El video que todos clonarán"
              icon={<Film className="h-4 w-4 text-primary" />}
              dropLabel="Subir video de referencia"
              state={motion}
              accept="video/*"
              inputRef={motionInputRef}
              disabled={phase !== "idle"}
              renderPreview={(state) => <VideoPreview state={state} />}
              onFile={handleMotionFile}
              onClear={() => {
                if (motion.preview) URL.revokeObjectURL(motion.preview);
                setMotion(EMPTY_UPLOAD);
              }}
            />

            <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
              <FormField label="Instrucción creativa" required>
                <Textarea
                  placeholder="Personajes realizando los movimientos de forma fluida..."
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={phase !== "idle"}
                />
              </FormField>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Costo Total</span>
                  <span className="text-warning font-bold text-lg">40 créditos</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={reset} disabled={phase !== "idle"}>
                    <RefreshCw className="h-4 w-4" />
                    Reset
                  </Button>
                  <Button onClick={handleGenerate} disabled={!canGenerate} isLoading={phase !== "idle" && phase !== "done"}>
                    <Play className="h-4 w-4" />
                    Generar Multi-Avatar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Status Overlay ── */}
        {(phase === "submitted" || phase === "polling") && (
          <div className="p-8 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col items-center text-center gap-4">
            <div className="relative">
              <Zap className="h-12 w-12 text-primary animate-pulse" />
              <div className="absolute inset-0 h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-text-primary">{statusMsg}</h3>
              <p className="text-sm text-text-muted max-w-md">
                Estamos procesando los 4 personajes simultáneamente. Esto suele tomar entre 4 y 8 minutos. 
                Los créditos se cobrarán solo por las partes que finalicen con éxito.
              </p>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {phase === "done" && resultParts.length > 0 && (
          <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle className="text-success h-6 w-6" />
                ¡Multi-Avatar Listo!
              </h2>
              <Button onClick={reset} variant="secondary" size="sm">Nuevo Proyecto</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {resultParts.map((part, idx) => (
                <div key={part.id} className="rounded-xl border border-border bg-surface overflow-hidden group">
                  <div className="bg-surface-elevated px-4 py-2 border-b border-border flex justify-between items-center">
                    <span className="text-xs font-bold text-primary">PARTE {idx + 1} ({idx * 5}-{(idx + 1) * 5}s)</span>
                    <a href={`/api/download?url=${encodeURIComponent(part.url)}&type=video`} download className="text-text-muted hover:text-primary transition-colors">
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                  <video 
                    src={`/api/download?url=${encodeURIComponent(part.url)}&type=video&stream=1`}
                    className="w-full aspect-video object-cover"
                    controls
                    loop
                  />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
