"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Film, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input, Textarea, FormField } from "@/components/ui/input";
import { TopBar } from "@/components/layout/TopBar";
import {
  UploadCard,
  ImagePreview,
  EMPTY_UPLOAD,
  type UploadState,
} from "@/components/shared/media-upload";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_IMAGE_BYTES = 30 * 1024 * 1024; // 30 MB

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

async function createStudioProject(
  name:              string,
  characterImageUrl: string,
  storyDescription:  string,
): Promise<{ id: string }> {
  const res  = await fetch("/api/studio/project", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ name, characterImageUrl, storyDescription }),
  });
  const data = await res.json() as {
    success: boolean;
    data?:   { id: string };
    error?:  { message: string };
  };
  if (!data.success || !data.data?.id) {
    throw new Error(data.error?.message ?? "Failed to create series");
  }
  return data.data;
}

// ─── Validation (client-side pre-check) ──────────────────────────────────────

function validateImageFile(file: File, tImageType: string, tImageSize: string): string | null {
  const name   = file.name.toLowerCase();
  const isHeic = name.endsWith(".heic") || name.endsWith(".heif");
  if (!file.type.startsWith("image/") && !isHeic) return tImageType;
  if (file.size > MAX_IMAGE_BYTES) return tImageSize;
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudioNewPage() {
  const t = useTranslations("studio");
  const tCreate = useTranslations("create");
  const router = useRouter();

  const [character,         setCharacter]         = useState<UploadState>(EMPTY_UPLOAD);
  const [seriesName,        setSeriesName]         = useState("");
  const [storyDescription,  setStoryDescription]  = useState("");
  const [submitting,        setSubmitting]         = useState(false);
  const [error,             setError]              = useState("");

  const charInputRef = useRef<HTMLInputElement>(null);

  // ─── Character upload ────────────────────────────────────────────────────────

  async function handleCharacterFile(file: File): Promise<void> {
    const err = validateImageFile(file, tCreate("cloneErrorImageType"), tCreate("cloneErrorImageSize"));
    if (err) { setError(err); return; }

    const preview = URL.createObjectURL(file);
    setCharacter({ uploading: true, url: "", preview, fileName: file.name });
    setError("");

    try {
      const url = await uploadToServer(file);
      setCharacter({ uploading: false, url, preview, fileName: file.name });
    } catch (e) {
      setCharacter(EMPTY_UPLOAD);
      URL.revokeObjectURL(preview);
      setError(e instanceof Error ? e.message : "Error al subir la imagen");
    }
  }

  // ─── Submit ───────────────────────────────────────────────────────────────────

  async function handleCreate(): Promise<void> {
    if (!character.url) { setError("Sube la imagen de tu personaje principal");    return; }
    if (seriesName.trim().length < 2) { setError("El nombre de la serie es requerido"); return; }

    setSubmitting(true);
    setError("");

    try {
      const project = await createStudioProject(
        seriesName.trim(),
        character.url,
        storyDescription.trim(),
      );
      // Cleanup object URL before navigating
      if (character.preview) URL.revokeObjectURL(character.preview);
      router.push(`/studio/${project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear la serie");
      setSubmitting(false);
    }
  }

  const canCreate =
    !!character.url &&
    seriesName.trim().length >= 2 &&
    !character.uploading &&
    !submitting;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title={t("newTitle")} description={t("newDesc")} />

      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="mx-auto max-w-xl flex flex-col gap-5">

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          {/* Character upload */}
          <div>
            <p className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary-light" />
              {t("charMainTitle")}
            </p>
            <p className="text-xs text-text-muted mb-3">
              {t("charMainDesc")}
            </p>
            <UploadCard
              label={t("charUploadLabel")}
              hint={t("charUploadHint")}
              icon={<Users className="h-4 w-4 text-primary-light" />}
              dropLabel={<>Sube imagen<br />del personaje<br /><span className="text-[10px] opacity-60">JPG, PNG, HEIC</span></>}
              state={character}
              accept="image/jpeg, image/png, image/webp, image/heic, image/heif, .heic, .heif"
              inputRef={charInputRef}
              disabled={submitting}
              renderPreview={(state) => <ImagePreview state={state} />}
              onFile={handleCharacterFile}
              onClear={() => {
                if (character.preview) URL.revokeObjectURL(character.preview);
                setCharacter(EMPTY_UPLOAD);
                if (charInputRef.current) charInputRef.current.value = "";
              }}
            />
          </div>

          {/* Series details */}
          <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Film className="h-4 w-4 text-primary-light" />
              <span className="text-sm font-semibold text-text-primary">{t("seriesDetailsTitle")}</span>
            </div>

            <FormField label={t("seriesNameLabel")} required hint={t("seriesNameHint")}>
              <Input
                placeholder={t("seriesNamePlaceholder")}
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                disabled={submitting}
                maxLength={100}
              />
            </FormField>

            <FormField label={t("seriesDescLabel")} hint={t("seriesDescHint")}>
              <Textarea
                placeholder={t("seriesDescPlaceholder")}
                rows={3}
                value={storyDescription}
                onChange={(e) => setStoryDescription(e.target.value)}
                disabled={submitting}
              />
            </FormField>

            <div className="pt-1 border-t border-border flex justify-end">
              <Button onClick={handleCreate} disabled={!canCreate} isLoading={submitting}>
                <Film className="h-4 w-4" />
                {submitting ? t("creating") : t("createSeries")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
