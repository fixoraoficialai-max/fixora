"use client";

import { useState, useRef } from "react";
import { Upload, Sparkles, RefreshCw } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "idle" | "converting" | "detecting" | "done" | "error";

interface ProductComponent {
  name:        string;
  description: string;
}

interface DetectApiResponse {
  success: boolean;
  data?:   { components: ProductComponent[] };
  error?:  { message: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Encodes an ArrayBuffer to a base64 string safely for any file size.
 *
 * WHY: The naive `btoa(String.fromCharCode(...new Uint8Array(buf)))` uses a
 * spread operator that places every byte as a function argument. JS engines
 * cap the call-stack argument count, so this throws "Maximum call stack size
 * exceeded" on images larger than ~1 MB. Chunking avoids that limit entirely.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes     = new Uint8Array(buffer);
  const chunkSize = 8_192;
  let   binary    = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return btoa(binary);
}

function resolveMimeType(rawType: string): AcceptedMimeType {
  if (rawType === "image/png")  return "image/png";
  if (rawType === "image/webp") return "image/webp";
  return "image/jpeg";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExplodedPage() {
  const [phase,      setPhase]      = useState<Phase>("idle");
  const [preview,    setPreview]    = useState<string | null>(null);
  const [components, setComponents] = useState<ProductComponent[]>([]);
  const [error,      setError]      = useState("");
  const inputRef                    = useRef<HTMLInputElement>(null);

  // ── Validation ──────────────────────────────────────────────────────────────

  function validateFile(file: File): string | null {
    if (!ACCEPTED_MIME_TYPES.includes(file.type as AcceptedMimeType)) {
      return "Solo se aceptan imágenes JPG, PNG o WEBP";
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return "El archivo supera el límite de 20 MB";
    }
    return null;
  }

  // ── Entry points ────────────────────────────────────────────────────────────

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent): void {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function processFile(file: File): void {
    const validationError = validateFile(file);
    if (validationError) { setError(validationError); return; }

    setError("");
    setPreview(URL.createObjectURL(file));
    void runDetectionPipeline(file);
  }

  // ── Detection pipeline ──────────────────────────────────────────────────────

  async function runDetectionPipeline(file: File): Promise<void> {
    setPhase("converting");
    try {
      // Convert to base64 on the client — no Fal storage dependency
      const buffer    = await file.arrayBuffer();
      const base64    = arrayBufferToBase64(buffer);
      const mediaType = resolveMimeType(file.type);

      setPhase("detecting");

      const res  = await fetch("/api/exploded/detect", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ imageBase64: base64, mediaType }),
      });

      const json = await res.json() as DetectApiResponse;

      if (!json.success || !json.data?.components) {
        throw new Error(json.error?.message ?? "Error al detectar componentes");
      }

      setComponents(json.data.components);
      setPhase("done");

    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setPhase("error");
    }
  }

  // ── Reset ───────────────────────────────────────────────────────────────────

  function reset(): void {
    setPhase("idle");
    setPreview(null);
    setComponents([]);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  // ── Derived state ───────────────────────────────────────────────────────────

  const isProcessing = phase === "converting" || phase === "detecting";

  const statusLabel: Record<"converting" | "detecting", string> = {
    converting: "Procesando imagen...",
    detecting:  "Detectando componentes...",
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#070709] overflow-hidden">
      <TopBar
        title="Producto Explosionado"
        description="Descompón tu producto en capas animadas"
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 pt-8 pb-8 flex flex-col gap-6">

          {/* ── Error banner ── */}
          {error && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={reset}
                className="flex-shrink-0 flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reintentar
              </button>
            </div>
          )}

          {/* ── Upload drop zone ── */}
          {phase === "idle" && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="group relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-orange-500/30 bg-orange-500/5 p-16 cursor-pointer transition-all hover:border-orange-500/60 hover:bg-orange-500/10"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
                <Upload className="h-8 w-8 text-white" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-white">Sube la foto de tu producto</p>
                <p className="text-sm text-white/40 mt-1">JPG, PNG, WEBP — máximo 20 MB</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleInputChange}
              />
            </div>
          )}

          {/* ── Image preview with processing overlay ── */}
          {phase !== "idle" && preview && (
            <div className="relative rounded-2xl overflow-hidden border border-white/10">
              <img src={preview} alt="Producto a analizar" className="w-full object-cover max-h-80" />
              {isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
                  <Sparkles className="h-10 w-10 text-orange-400 animate-pulse" />
                  <p className="text-sm font-medium text-white">
                    {statusLabel[phase as "converting" | "detecting"]}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Detected components list ── */}
          {phase === "done" && components.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Componentes detectados ({components.length})
                </h2>
                <button
                  onClick={reset}
                  className="text-xs text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  Nueva foto
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {components.map((component, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-xs font-bold text-white">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{component.name}</p>
                      {component.description && (
                        <p className="text-xs text-white/40 mt-0.5 truncate">{component.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
