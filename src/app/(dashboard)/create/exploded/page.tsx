"use client";

import { useState, useRef } from "react";
import { Upload, Sparkles, RefreshCw, Zap, ChevronRight } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { cn } from "@/lib/utils";

type Phase = "idle" | "uploading" | "detecting" | "done" | "error";

interface Component {
  name: string;
  description: string;
}

export default function ExplodedPage() {
  const [phase, setPhase]             = useState<Phase>("idle");
  const [preview, setPreview]         = useState<string | null>(null);
  const [imageUrl, setImageUrl]       = useState<string | null>(null);
  const [components, setComponents]   = useState<Component[]>([]);
  const [error, setError]             = useState("");
  const inputRef                      = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setError("Solo se aceptan imágenes"); return; }
    if (file.size > 20 * 1024 * 1024)   { setError("Máximo 20MB"); return; }
    setError("");
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    uploadAndDetect(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function uploadAndDetect(file: File) {
    setPhase("uploading");
    try {
      // 1. Upload
      const form = new FormData();
      form.append("file", file);
      const uploadRes  = await fetch("/api/upload", { method: "POST", body: form });
      const uploadData = await uploadRes.json() as { success: boolean; data?: { fileUrl: string } };
      if (!uploadData.success || !uploadData.data?.fileUrl) throw new Error("Error al subir imagen");
      const url = uploadData.data.fileUrl;
      setImageUrl(url);

      // 2. Detect components
      setPhase("detecting");
      const detectRes  = await fetch("/api/exploded/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });
      const detectData = await detectRes.json() as { success: boolean; data?: { components: Component[] } };
      if (!detectData.success || !detectData.data?.components) throw new Error("Error al detectar componentes");
      setComponents(detectData.data.components);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setPhase("error");
    }
  }

  function reset() {
    setPhase("idle");
    setPreview(null);
    setImageUrl(null);
    setComponents([]);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  const isProcessing = phase === "uploading" || phase === "detecting";

  return (
    <div className="flex flex-col h-full bg-[#070709] overflow-hidden">
      <TopBar title="Producto Explosionado" description="Descompón tu producto en capas animadas" />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 pt-8 pb-8 flex flex-col gap-6">

          {/* Error */}
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

          {/* Upload zone */}
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
                <p className="text-sm text-white/40 mt-1">JPG, PNG, WEBP — máximo 20MB</p>
              </div>
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          )}

          {/* Preview + status */}
          {phase !== "idle" && preview && (
            <div className="relative rounded-2xl overflow-hidden border border-white/10">
              <img src={preview} alt="Producto" className="w-full object-cover max-h-80" />
              {isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
                  <Sparkles className="h-10 w-10 text-orange-400 animate-pulse" />
                  <p className="text-sm font-medium text-white">
                    {phase === "uploading" ? "Subiendo imagen..." : "Detectando componentes..."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Components detected */}
          {phase === "done" && components.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Componentes detectados ({components.length})
                </h2>
                <button onClick={reset} className="text-xs text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors">
                  <RefreshCw className="h-3 w-3" />
                  Nueva foto
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {components.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-xs font-bold text-white">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{c.name}</p>
                      {c.description && <p className="text-xs text-white/40 mt-0.5 truncate">{c.description}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA — next step */}
              <button
                onClick={() => {/* next step: generate */}}
                className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-orange-500/30 hover:opacity-90 transition-opacity"
              >
                <Zap className="h-4 w-4" />
                Generar vista explosionada
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
