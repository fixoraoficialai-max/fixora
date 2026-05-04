"use client";

import { useState, useRef, useCallback } from "react";
import { Sparkles, Copy, Check, RefreshCw, Paperclip, X, ArrowRight, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { TopBar } from "@/components/layout/TopBar";
import { cn } from "@/lib/utils";
import {
  PROMPT_STYLES,
  PROMPT_TONES,
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  type AcceptedImageType,
} from "@/lib/prompt-constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OptimizePayload {
  prompt:          string;
  style?:          string;
  tone?:           string;
  imageBase64?:    string;
  imageMediaType?: AcceptedImageType;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuickPromptPage() {
  const t = useTranslations("create");

  const [input, setInput]                   = useState("");
  const [style, setStyle]                   = useState("");
  const [tone, setTone]                     = useState("");
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processImageFile(file);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Optimize ────────────────────────────────────────────────────────────────

  async function handleOptimize() {
    const trimmed = input.trim();
    if (trimmed.length < 5) { setError(t("promptErrorMin")); return; }

    setIsLoading(true);
    setError("");
    setResult("");

    const payload: OptimizePayload = {
      prompt:         trimmed,
      style:          style  || undefined,
      tone:           tone   || undefined,
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
    setTone("");
    setResult("");
    setError("");
    handleImageRemove();
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-full bg-[#070709] overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <TopBar title={t("promptTitle")} description={t("promptDesc")} />

      <div className="flex-1 overflow-y-auto px-4 py-12 md:py-20">
        <div className="mx-auto max-w-2xl flex flex-col gap-10">

          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <div className="text-center flex flex-col gap-3">
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
              {t("promptHeroTitle")}
            </h1>
            <p className="text-text-muted text-sm md:text-base">
              {t("promptHeroSub")}
            </p>
          </div>

          {/* ── Input card ───────────────────────────────────────────────── */}
          <div className="relative group">
            {/* Glow halo */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-[2.5rem] blur opacity-25 group-focus-within:opacity-50 transition duration-1000" />

            <div className="relative flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-surface/50 p-5 backdrop-blur-xl transition-all focus-within:border-primary/30">

              {/* Image preview strip — shown when image is attached */}
              {imagePreview && (
                <div className="relative flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <img
                    src={imagePreview}
                    alt="reference"
                    className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                  />
                  <span className="text-xs text-white/60 flex-1 truncate">{t("promptImageAttached")}</span>
                  <button
                    type="button"
                    onClick={handleImageRemove}
                    aria-label={t("promptRemoveAria")}
                    className="p-1 rounded-full text-white/30 hover:text-white/70 transition-colors flex-shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Main textarea */}
              <Textarea
                placeholder={t("promptIdeaPlaceholder")}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="min-h-[120px] w-full resize-none border-none bg-transparent text-lg text-white placeholder:text-white/20 focus-visible:ring-0"
              />

              {/* Action bar */}
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <div className="flex items-center gap-2 flex-wrap">

                  {/* Attach image button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      imageBase64
                        ? "bg-primary/20 text-primary-light"
                        : "bg-white/5 text-white hover:bg-white/10"
                    )}
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>{imageBase64 ? t("promptWithImage") : t("promptAttachImage")}</span>
                  </button>

                  {/* Separator */}
                  <div className="h-4 w-px bg-white/10 mx-1" />

                  {/* Style chips */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {PROMPT_STYLES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStyle(style === s ? "" : s)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                          style === s
                            ? "border-primary/40 bg-primary/10 text-primary-light"
                            : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate button */}
                <button
                  type="button"
                  onClick={handleOptimize}
                  disabled={input.trim().length < 5 || isLoading}
                  aria-label={t("promptOptimize")}
                  className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition-all hover:bg-white/90 disabled:bg-white/20 disabled:cursor-not-allowed"
                >
                  {isLoading
                    ? <RefreshCw className="h-5 w-5 animate-spin" />
                    : <Sparkles className="h-5 w-5" />
                  }
                </button>
              </div>
            </div>
          </div>

          {/* Tone chips — below the card, subtle */}
          {PROMPT_TONES.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className="text-xs text-white/30 mr-1">{t("promptToneLabel")}:</span>
              {PROMPT_TONES.map((t_item) => (
                <button
                  key={t_item}
                  type="button"
                  onClick={() => setTone(tone === t_item ? "" : t_item)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                    tone === t_item
                      ? "border-accent/40 bg-accent/10 text-accent-light"
                      : "border-white/10 text-white/30 hover:border-white/20 hover:text-white/50"
                  )}
                >
                  {t_item}
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger text-center">
              {error}
            </div>
          )}

          {/* ── Drag overlay ─────────────────────────────────────────────── */}
          {isDragging && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
              <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-primary/60 bg-surface/80 px-12 py-8">
                <Paperclip className="h-10 w-10 text-primary-light animate-bounce" />
                <p className="text-white font-semibold">{t("promptDropDragging")}</p>
                <p className="text-white/50 text-xs">{t("promptDropFormat")}</p>
              </div>
            </div>
          )}

          {/* ── Result ───────────────────────────────────────────────────── */}
          {result && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Result header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <p className="text-sm font-semibold text-white">{t("promptResult")}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? t("promptCopied") : t("promptCopy")}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleReset}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t("promptNew")}
                  </Button>
                </div>
              </div>

              {/* Result body — terminal style */}
              <div className="rounded-2xl border border-white/10 bg-[#0d0d10] px-5 py-4">
                <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap font-mono">
                  {result}
                </p>
              </div>

              {/* Language note */}
              <p className="text-xs text-white/30 text-center">{t("promptResultNote")}</p>

              {/* CTA buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <a
                  href="/create/image"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-all"
                >
                  <Sparkles className="h-4 w-4 text-primary-light" />
                  {t("promptGoImage")}
                  <ArrowRight className="h-3.5 w-3.5 opacity-40 ml-auto" />
                </a>
                <a
                  href="/create/video"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3.5 text-sm font-semibold text-primary-light hover:bg-primary/20 transition-all"
                >
                  <Zap className="h-4 w-4" />
                  {t("promptGoVideo")}
                  <ArrowRight className="h-3.5 w-3.5 opacity-40 ml-auto" />
                </a>
              </div>
            </div>
          )}

        </div>
      </div>

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
