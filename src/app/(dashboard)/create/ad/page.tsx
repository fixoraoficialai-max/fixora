"use client";

import { useState, useRef } from "react";
import { Megaphone, Users, Package, Download, RefreshCw, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input, FormField } from "@/components/ui/input";
import { TopBar } from "@/components/layout/TopBar";
import {
  UploadCard,
  ImagePreview,
  EMPTY_UPLOAD,
  type UploadState,
} from "@/components/shared/media-upload";
import { AD_STYLES, type AdStyle } from "@/lib/validations/ad";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_IMAGE_BYTES  = 30 * 1024 * 1024; // 30 MB
const POLL_INTERVAL_MS = 10_000;
const MAX_POLLS        = 60;

// STYLE_LABELS is built dynamically from translations in the component

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "idle" | "submitted" | "polling" | "done" | "error";

// ─── API helpers (each does ONE thing) ───────────────────────────────────────

async function uploadToServer(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res  = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json() as {
    success: boolean;
    data?:   { fileUrl: string };
    error?:  { message: string };
  };
  if (!data.success || !data.data?.fileUrl) {
    throw new Error(data.error?.message ?? "Upload failed");
  }
  return data.data.fileUrl;
}

async function submitAdJob(
  characterImageUrl: string,
  productImageUrl:   string,
  productName:       string,
  style:             AdStyle,
): Promise<{ jobId: string; requestId: string }> {
  const res  = await fetch("/api/ad/submit", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ characterImageUrl, productImageUrl, productName, style }),
  });
  const data = await res.json() as {
    success: boolean;
    data?:   { jobId: string; requestId: string };
    error?:  { message: string };
  };
  if (!data.success || !data.data?.jobId || !data.data?.requestId) {
    throw new Error(data.error?.message ?? "Submit failed");
  }
  return data.data;
}

async function checkAdStatus(
  jobId:     string,
  requestId: string,
): Promise<{ status: string; videoUrl?: string }> {
  const res  = await fetch("/api/ad/status", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ jobId, requestId }),
  });
  const data = await res.json() as {
    success: boolean;
    data?:   { status: string; videoUrl?: string };
    error?:  { message: string };
  };
  if (!data.success) throw new Error(data.error?.message ?? "Status check failed");
  return data.data ?? { status: "PENDING" };
}

// ─── Client-side pre-validation (server does the real validation) ─────────────

function validateImageFile(file: File, tImageType: string, tImageSize: string): string | null {
  const name   = file.name.toLowerCase();
  const isHeic = name.endsWith(".heic") || name.endsWith(".heif");
  if (!file.type.startsWith("image/") && !isHeic) return tImageType;
  if (file.size > MAX_IMAGE_BYTES) return tImageSize;
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdCreatorPage() {
  const t = useTranslations("create");

  const styleLabels: Record<AdStyle, { label: string; description: string }> = {
    elegant:    { label: t("adStyleElegant"),    description: t("adStyleElegantDesc") },
    dynamic:    { label: t("adStyleDynamic"),    description: t("adStyleDynamicDesc") },
    minimalist: { label: t("adStyleMinimalist"), description: t("adStyleMinimalistDesc") },
  };

  const [character,    setCharacter]    = useState<UploadState>(EMPTY_UPLOAD);
  const [product,      setProduct]      = useState<UploadState>(EMPTY_UPLOAD);
  const [productName,  setProductName]  = useState("");
  const [style,        setStyle]        = useState<AdStyle>("elegant");
  const [phase,        setPhase]        = useState<Phase>("idle");
  const [videoUrl,     setVideoUrl]     = useState("");
  const [statusMsg,    setStatusMsg]    = useState("");
  const [error,        setError]        = useState("");

  const charInputRef    = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef    = useRef(0);

  // ─── Upload handlers ────────────────────────────────────────────────────────

  async function handleImageFile(
    file:    File,
    setter:  (s: UploadState) => void,
    label:   string,
  ): Promise<void> {
    const err = validateImageFile(file, t("adErrorImageType"), t("adErrorImageSize"));
    if (err) { setError(err); return; }

    const preview = URL.createObjectURL(file);
    setter({ uploading: true, url: "", preview, fileName: file.name });
    setError("");

    try {
      const url = await uploadToServer(file);
      setter({ uploading: false, url, preview, fileName: file.name });
    } catch (e) {
      setter(EMPTY_UPLOAD);
      URL.revokeObjectURL(preview);
      setError(e instanceof Error ? e.message : `Error al subir ${label}`);
    }
  }

  const handleCharacterFile  = (file: File) => handleImageFile(file, setCharacter, "personaje");
  const handleProductFile    = (file: File) => handleImageFile(file, setProduct,   "producto");

  // ─── Polling ────────────────────────────────────────────────────────────────

  function clearPollTimer(): void {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  function startPolling(jobId: string, requestId: string): void {
    setPhase("polling");
    pollCountRef.current = 0;

    pollTimerRef.current = setInterval(async () => {
      pollCountRef.current += 1;

      if (pollCountRef.current > MAX_POLLS) {
        clearPollTimer();
        setPhase("error");
        setError(t("adErrorTimeout"));
        return;
      }

      try {
        const result = await checkAdStatus(jobId, requestId);
        setStatusMsg(`Generando tu video publicitario… (${pollCountRef.current * 10}s)`);

        if (result.status === "COMPLETED" && result.videoUrl) {
          clearPollTimer();
          setVideoUrl(result.videoUrl);
          setPhase("done");
        } else if (result.status === "FAILED") {
          clearPollTimer();
          setPhase("error");
          setError(t("adErrorFailed"));
        }
      } catch {
        // Transient network error — keep polling
      }
    }, POLL_INTERVAL_MS);
  }

  // ─── Generate ────────────────────────────────────────────────────────────────

  async function handleGenerate(): Promise<void> {
    if (!character.url) { setError(t("adErrorNoChar"));    return; }
    if (!product.url)   { setError(t("adErrorNoProduct")); return; }
    if (productName.trim().length < 2) { setError(t("adErrorNoName")); return; }

    setPhase("submitted");
    setError("");
    setVideoUrl("");
    setStatusMsg("Enviando tu solicitud…");

    try {
      const { jobId, requestId } = await submitAdJob(
        character.url,
        product.url,
        productName.trim(),
        style,
      );
      startPolling(jobId, requestId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar");
      setPhase("error");
    }
  }

  // ─── Reset ───────────────────────────────────────────────────────────────────

  function reset(): void {
    clearPollTimer();
    if (character.preview) URL.revokeObjectURL(character.preview);
    if (product.preview)   URL.revokeObjectURL(product.preview);
    setCharacter(EMPTY_UPLOAD);
    setProduct(EMPTY_UPLOAD);
    setProductName("");
    setStyle("elegant");
    setVideoUrl("");
    setPhase("idle");
    setStatusMsg("");
    setError("");
    pollCountRef.current = 0;
    if (charInputRef.current)    charInputRef.current.value    = "";
    if (productInputRef.current) productInputRef.current.value = "";
  }

  // ─── Derived state ───────────────────────────────────────────────────────────

  const isProcessing = phase === "submitted" || phase === "polling";
  const canGenerate  =
    !!character.url &&
    !!product.url &&
    productName.trim().length >= 2 &&
    !character.uploading &&
    !product.uploading &&
    !isProcessing;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title={t("adTitle")} description={t("adDesc")} />

      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="mx-auto max-w-2xl">

          {/* Error banner */}
          {error && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-5">

            {/* ── Upload row ── */}
            <div className="grid grid-cols-2 gap-4">

              {/* Character image */}
              <UploadCard
                label={t("adCharLabel")}
                hint={t("adCharHint")}
                icon={<Users className="h-4 w-4 text-primary-light" />}
                dropLabel={<>Sube imagen<br />del personaje<br /><span className="text-[10px] opacity-60">JPG, PNG, HEIC</span></>}
                state={character}
                accept="image/jpeg, image/png, image/webp, image/heic, image/heif, .heic, .heif"
                inputRef={charInputRef}
                disabled={isProcessing}
                renderPreview={(state) => <ImagePreview state={state} />}
                onFile={handleCharacterFile}
                onClear={() => {
                  if (character.preview) URL.revokeObjectURL(character.preview);
                  setCharacter(EMPTY_UPLOAD);
                  if (charInputRef.current) charInputRef.current.value = "";
                }}
              />

              <UploadCard
                label={t("adProductLabel")}
                hint={t("adProductHint")}
                icon={<Package className="h-4 w-4 text-warning" />}
                dropLabel={<>Sube imagen<br />del producto<br /><span className="text-[10px] opacity-60">JPG, PNG, HEIC</span></>}
                state={product}
                accept="image/jpeg, image/png, image/webp, image/heic, image/heif, .heic, .heif"
                inputRef={productInputRef}
                disabled={isProcessing}
                renderPreview={(state) => <ImagePreview state={state} />}
                onFile={handleProductFile}
                onClear={() => {
                  if (product.preview) URL.revokeObjectURL(product.preview);
                  setProduct(EMPTY_UPLOAD);
                  if (productInputRef.current) productInputRef.current.value = "";
                }}
              />
            </div>

            {/* ── Product name + style ── */}
            <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">

              <FormField
                label={t("adProductNameLabel")}
                required
                hint={t("adProductNameHint")}
              >
                <Input
                  placeholder={t("adProductNamePlaceholder")}
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  disabled={isProcessing}
                  maxLength={100}
                />
              </FormField>

              <div>
                <p className="text-sm font-medium text-text-primary mb-2">
                  {t("adStyleLabel")}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {AD_STYLES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStyle(s)}
                      disabled={isProcessing}
                      className={[
                        "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                        style === s
                          ? "border-primary bg-primary/10 text-primary-light"
                          : "border-border bg-surface-elevated text-text-muted hover:border-primary/40",
                      ].join(" ")}
                    >
                      <p className="font-medium">{styleLabels[s].label}</p>
                      <p className="text-[11px] opacity-70 mt-0.5">{styleLabels[s].description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border">
                <p className="text-xs text-text-muted">
                  Costo: <span className="text-warning font-medium">{t("adCost")}</span>
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={reset} disabled={isProcessing}>
                    <RefreshCw className="h-4 w-4" />
                    {t("clear")}
                  </Button>
                  <Button onClick={handleGenerate} disabled={!canGenerate} isLoading={isProcessing}>
                    <Sparkles className="h-4 w-4" />
                    {isProcessing ? statusMsg || "Procesando…" : t("adGenerate")}
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Processing status ── */}
            {isProcessing && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 flex flex-col items-center gap-3">
                <Megaphone className="h-8 w-8 text-primary-light animate-pulse" />
                <p className="text-sm font-medium text-text-primary">{statusMsg}</p>
                <p className="text-xs text-text-muted text-center">
                  {t("generationWait")}
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
                  <p className="text-xs text-success font-medium">{t("adDone")}</p>
                  <div className="flex gap-2">
                    <a href={`/api/download?url=${encodeURIComponent(videoUrl)}&type=video`} download>
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
