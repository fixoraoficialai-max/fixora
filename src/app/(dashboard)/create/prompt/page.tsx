"use client";

import { useState, useRef, useCallback } from "react";
import { Sparkles, Copy, Check, RefreshCw, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea, FormField } from "@/components/ui/input";
import { TopBar } from "@/components/layout/TopBar";
import { cn } from "@/lib/utils";
import { PROMPT_STYLES, PROMPT_TONES, ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, type AcceptedImageType } from "@/lib/prompt-constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OptimizePayload {
  prompt:         string;
  style?:         string;
  tone?:          string;
  imageBase64?:   string;
  imageMediaType?: AcceptedImageType;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuickPromptPage() {
  const [input, setInput]             = useState("");
  const [style, setStyle]             = useState("");
  const [tone, setTone]               = useState("");
  const [result, setResult]           = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [copied, setCopied]           = useState(false);
  const [error, setError]             = useState("");
  const [imagePreview, setImagePreview]       = useState<string | null>(null);
  const [imageBase64, setImageBase64]         = useState<string | null>(null);
  const [imageMediaType, setImageMediaType]   = useState<AcceptedImageType | null>(null);
  const [isDragging, setIsDragging]           = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Image handling ──────────────────────────────────────────────────────────

  function processImageFile(file: File) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as AcceptedImageType)) {
      setError("Formato no soportado. Usa PNG, JPG, WEBP o GIF.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("La imagen no puede superar 4MB.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImageBase64(dataUrl);
      setImagePreview(dataUrl);
      setImageMediaType(file.type as AcceptedImageType);
    };
    reader.readAsDataURL(file);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  }

  function handleImageRemove() {
    setImageBase64(null);
    setImagePreview(null);
    setImageMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processImageFile(file);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Optimize ────────────────────────────────────────────────────────────────

  async function handleOptimize() {
    const trimmed = input.trim();
    if (trimmed.length < 5) { setError("Escribe al menos 5 caracteres"); return; }

    setIsLoading(true);
    setError("");
    setResult("");

    const payload: OptimizePayload = {
      prompt:          trimmed,
      style:           style  || undefined,
      tone:            tone   || undefined,
      imageBase64:     imageBase64    ?? undefined,
      imageMediaType:  imageMediaType ?? undefined,
    };

    try {
      const res  = await fetch("/api/generate/prompt", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json() as { success: boolean; data?: { optimized: string }; error?: { message: string } };
      if (!data.success) throw new Error(data.error?.message ?? "Error optimizando prompt");
      setResult(data.data?.optimized ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Copy & Reset ────────────────────────────────────────────────────────────

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReset() {
    setInput("");
    setStyle("");
    setTone("");
    setResult("");
    setError("");
    handleImageRemove();
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title="Optimizar Prompt"
        description="Describe tu idea — Fixora lo transforma en un prompt profesional"
      />

      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="mx-auto max-w-2xl flex flex-col gap-5">
          <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">

            {/* ── Idea text ───────────────────────────────────────────────── */}
            <FormField label="Tu idea" required hint="Escribe en español o cualquier idioma">
              <Textarea
                placeholder="Un guerrero samurai meditando bajo la lluvia..."
                rows={4}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </FormField>

            {/* ── Image upload ─────────────────────────────────────────────── */}
            <FormField
              label="Imagen de referencia"
              hint="Opcional — Claude analizará la imagen junto con tu idea"
            >
              {imagePreview ? (
                /* Preview */
                <div className="relative w-full rounded-lg overflow-hidden border border-border bg-surface-overlay">
                  <img
                    src={imagePreview}
                    alt="Referencia"
                    className="w-full max-h-56 object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleImageRemove}
                    aria-label="Eliminar imagen"
                    className="absolute top-2 right-2 flex items-center justify-center h-7 w-7 rounded-full bg-surface-elevated border border-border text-text-muted hover:text-danger hover:border-danger/40 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <p className="px-3 py-1.5 text-xs text-text-muted border-t border-border">
                    ✓ Claude analizará esta imagen al optimizar tu prompt
                  </p>
                </div>
              ) : (
                /* Drop zone */
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "w-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 transition-all cursor-pointer",
                    isDragging
                      ? "border-primary/60 bg-primary/5 text-primary-light"
                      : "border-border text-text-muted hover:border-border-strong hover:bg-surface-elevated"
                  )}
                >
                  <ImagePlus className="h-6 w-6 opacity-60" />
                  <span className="text-sm font-medium">
                    {isDragging ? "Suelta aquí" : "Arrastra o haz clic para subir"}
                  </span>
                  <span className="text-xs opacity-60">PNG, JPG, WEBP, GIF — máx. 4MB</span>
                </button>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                className="hidden"
                onChange={handleFileInputChange}
              />
            </FormField>

            {/* ── Visual style ─────────────────────────────────────────────── */}
            <FormField label="Estilo visual (opcional)">
              <div className="flex flex-wrap gap-2">
                {PROMPT_STYLES.map((s) => (
                  <button key={s} type="button"
                    onClick={() => setStyle(style === s ? "" : s)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                      style === s
                        ? "border-primary/40 bg-primary/10 text-primary-light"
                        : "border-border text-text-muted hover:border-border-strong"
                    )}>
                    {s}
                  </button>
                ))}
              </div>
            </FormField>

            {/* ── Tone ─────────────────────────────────────────────────────── */}
            <FormField label="Tono (opcional)">
              <div className="flex flex-wrap gap-2">
                {PROMPT_TONES.map((t) => (
                  <button key={t} type="button"
                    onClick={() => setTone(tone === t ? "" : t)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                      tone === t
                        ? "border-primary/40 bg-primary/10 text-primary-light"
                        : "border-border text-text-muted hover:border-border-strong"
                    )}>
                    {t}
                  </button>
                ))}
              </div>
            </FormField>

            {error && <p className="text-sm text-danger">{error}</p>}

            {/* ── Action bar ───────────────────────────────────────────────── */}
            <div className="flex items-center justify-between pt-1 border-t border-border">
              <div className="flex flex-col gap-0.5">
                <p className="text-xs text-text-muted">
                  Costo: <span className="text-warning font-medium">1 crédito</span>
                </p>
                {imageBase64 && (
                  <p className="text-xs text-primary-light">📷 Con análisis de imagen</p>
                )}
              </div>
              <Button
                onClick={handleOptimize}
                disabled={input.trim().length < 5 || isLoading}
                isLoading={isLoading}
              >
                <Sparkles className="h-4 w-4" />
                {isLoading ? "Optimizando..." : "Optimizar con IA"}
              </Button>
            </div>
          </div>

          {/* ── Result ───────────────────────────────────────────────────────── */}
          {result && (
            <div className="rounded-xl border border-success/20 bg-surface p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-success">✨ Prompt optimizado</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleReset}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Nuevo
                  </Button>
                </div>
              </div>
              <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{result}</p>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-text-muted">
                  💡 Usa este prompt en{" "}
                  <a href="/create/image" className="text-primary-light hover:underline">Generar Imagen</a>
                  {" "}o{" "}
                  <a href="/create/video" className="text-primary-light hover:underline">Generar Video</a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}