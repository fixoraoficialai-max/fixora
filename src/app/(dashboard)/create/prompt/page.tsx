"use client";

import { useState, useRef, useCallback } from "react";
import {
  Plus,
  Send,
  Copy,
  Check,
  RefreshCw,
  X,
  ImageIcon,
  Clapperboard,
  Wand2,
  Cpu,
  Moon,
  Sun,
  Zap,
  Circle,
  Eye,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { TopBar } from "@/components/layout/TopBar";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  type AcceptedImageType,
} from "@/lib/prompt-constants";

// ─── Style chips — defined here as UI data, not sent raw to the API.
// The actual allowlist lives in PROMPT_STYLES (lib/prompt-constants).
// Only values matching that enum reach the backend.

import { PROMPT_STYLES } from "@/lib/prompt-constants";

const STYLE_ICONS: Record<string, React.ReactNode> = {
  Cinematic:      <Clapperboard className="h-3.5 w-3.5" />,
  Documentary:    <Eye className="h-3.5 w-3.5" />,
  Anime:          <Circle className="h-3.5 w-3.5" />,
  "Pixar 3D":     <Cpu className="h-3.5 w-3.5" />,
  "Dark & Moody": <Moon className="h-3.5 w-3.5" />,
  "Bright & Clean": <Sun className="h-3.5 w-3.5" />,
  Futuristic:     <Zap className="h-3.5 w-3.5" />,
  Retro:          <Wand2 className="h-3.5 w-3.5" />,
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface OptimizePayload {
  prompt:          string;
  style?:          string;
  imageBase64?:    string;
  imageMediaType?: AcceptedImageType;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuickPromptPage() {
  const t = useTranslations("create");

  const [input, setInput]                   = useState("");
  const [style, setStyle]                   = useState("");
  const [result, setResult]                 = useState("");
  const [isLoading, setIsLoading]           = useState(false);
  const [copied, setCopied]                 = useState(false);
  const [error, setError]                   = useState("");
  const [imagePreview, setImagePreview]     = useState<string | null>(null);
  const [imageBase64, setImageBase64]       = useState<string | null>(null);
  const [imageMediaType, setImageMediaType] = useState<AcceptedImageType | null>(null);
  const [isDragging, setIsDragging]         = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Image handling ──────────────────────────────────────────────────────────

  function processImageFile(file: File) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as AcceptedImageType)) {
      setError(t("promptErrorFormat"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(t("promptErrorSize"));
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processImageFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Generate ────────────────────────────────────────────────────────────────

  async function handleGenerate() {
    const trimmed = input.trim();
    if (trimmed.length < 5) { setError(t("promptErrorMin")); return; }

    setIsLoading(true);
    setError("");
    setResult("");

    const payload: OptimizePayload = {
      prompt:         trimmed,
      style:          style || undefined,
      imageBase64:    imageBase64    ?? undefined,
      imageMediaType: imageMediaType ?? undefined,
    };

    try {
      const res = await fetch("/api/generate/prompt", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      let data: { success: boolean; data?: { optimized: string }; error?: { message: string } };
      try {
        data = await res.json();
      } catch {
        throw new Error(t("promptNetworkError"));
      }

      if (!data.success) throw new Error(data.error?.message ?? t("promptNetworkError"));
      setResult(data.data?.optimized ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("promptNetworkError"));
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
    setResult("");
    setError("");
    handleImageRemove();
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-full bg-[#0a0a0a] overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <TopBar title={t("promptTitle")} description={t("promptDesc")} />

      <div className="flex-1 overflow-y-auto flex items-start justify-center px-4 py-16 md:py-24">
        <div className="w-full max-w-2xl flex flex-col items-center gap-8">

          {/* ── Hero title ───────────────────────────────────────────────── */}
          <h1 className="text-4xl md:text-5xl font-bold text-white text-center leading-tight tracking-tight">
            {t("promptHeroTitle")}
          </h1>

          {/* ── Input box ────────────────────────────────────────────────── */}
          <div className="w-full rounded-2xl bg-[#1c1c1e] px-5 pt-4 pb-3 flex flex-col gap-3">

            {/* Image preview thumbnail */}
            {imagePreview && (
              <div className="flex items-center gap-2">
                <img
                  src={imagePreview}
                  alt="ref"
                  className="h-8 w-8 rounded-lg object-cover"
                />
                <span className="text-xs text-white/40 flex-1 truncate">{t("promptImageAttached")}</span>
                <button
                  type="button"
                  onClick={handleImageRemove}
                  aria-label={t("promptRemoveAria")}
                  className="text-white/30 hover:text-white/60 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Textarea */}
            <textarea
              placeholder={t("promptIdeaPlaceholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={3}
              className="w-full resize-none bg-transparent text-white/90 placeholder:text-white/25 text-base leading-relaxed outline-none"
            />

            {/* Bottom row: + and send */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-[#2c2c2e] text-white/50 hover:text-white/80 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={input.trim().length < 5 || isLoading}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-[#2c2c2e] text-white/50 hover:text-white/80 disabled:opacity-30 transition-colors"
              >
                {isLoading
                  ? <RefreshCw className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />
                }
              </button>
            </div>
          </div>

          {/* ── Style chips ──────────────────────────────────────────────── */}
          <div className="flex flex-wrap justify-center gap-2.5">
            {PROMPT_STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(style === s ? "" : s)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                  style === s
                    ? "bg-[#3a3a3c] text-white ring-1 ring-white/20"
                    : "bg-[#1c1c1e] text-white/50 hover:bg-[#2c2c2e] hover:text-white/70"
                )}
              >
                <span className="opacity-60">{STYLE_ICONS[s]}</span>
                {s}
              </button>
            ))}
          </div>

          {/* ── Error ────────────────────────────────────────────────────── */}
          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          {/* ── Generate button ───────────────────────────────────────────── */}
          {!result && (
            <div className="relative mt-4">
              {/* Purple glow behind button */}
              <div className="absolute inset-0 rounded-full bg-[#7c3aed] blur-xl opacity-50 scale-110" />
              <button
                type="button"
                onClick={handleGenerate}
                disabled={input.trim().length < 5 || isLoading}
                className="relative flex items-center gap-2 rounded-full bg-[#7c3aed] px-8 py-4 text-base font-semibold text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#6d28d9] transition-colors"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    {t("promptOptimizing")}
                  </>
                ) : (
                  <>
                    {t("promptOptimize")} ✨
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── Result ───────────────────────────────────────────────────── */}
          {result && (
            <div className="w-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

              {/* Result card */}
              <div className="w-full rounded-2xl bg-[#1c1c1e] px-5 py-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                    {t("promptResult")}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 rounded-full bg-[#2c2c2e] px-3 py-1.5 text-xs text-white/60 hover:text-white transition-colors"
                    >
                      {copied
                        ? <Check className="h-3.5 w-3.5 text-green-400" />
                        : <Copy className="h-3.5 w-3.5" />
                      }
                      {copied ? t("promptCopied") : t("promptCopy")}
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex items-center gap-1.5 rounded-full bg-[#2c2c2e] px-3 py-1.5 text-xs text-white/60 hover:text-white transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {t("promptNew")}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                  {result}
                </p>
              </div>

              {/* Use in links */}
              <p className="text-xs text-white/30 text-center">{t("promptUseIn")}</p>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="/create/image"
                  className="flex items-center justify-center gap-2 rounded-full bg-[#1c1c1e] py-3 text-sm font-medium text-white/60 hover:text-white hover:bg-[#2c2c2e] transition-all"
                >
                  <ImageIcon className="h-4 w-4" />
                  {t("promptGoImage")}
                </a>
                <a
                  href="/create/video"
                  className="flex items-center justify-center gap-2 rounded-full bg-[#7c3aed] py-3 text-sm font-semibold text-white hover:bg-[#6d28d9] transition-all"
                >
                  <Zap className="h-4 w-4" />
                  {t("promptGoVideo")}
                </a>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 pointer-events-none">
          <div className="rounded-3xl border-2 border-dashed border-white/30 bg-[#1c1c1e]/90 px-12 py-8 flex flex-col items-center gap-3">
            <Plus className="h-10 w-10 text-white/40" />
            <p className="text-white/60 text-sm">{t("promptDropDragging")}</p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={handleFileInputChange}
      />
    </div>
  );
}
