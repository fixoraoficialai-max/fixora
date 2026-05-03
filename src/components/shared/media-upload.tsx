"use client";

import { useState } from "react";
import { Upload, X, CheckCircle, Film } from "lucide-react";
import { useTranslations } from "next-intl";

export type UploadState = { 
  url: string; 
  preview: string; 
  uploading: boolean; 
  fileName: string 
};

export const EMPTY_UPLOAD: UploadState = { url: "", preview: "", uploading: false, fileName: "" };

/**
 * Shows the image if previewable, or a "file ready" badge for HEIC files
 * whose blob URL the browser can't decode but the server can process fine.
 */
export function ImagePreview({ state }: { state: UploadState }) {
  const t = useTranslations("upload");
  if (state.preview === "__heic__") {
    return (
      <div className="w-full aspect-square bg-surface-elevated flex flex-col items-center justify-center gap-2 p-3">
        <CheckCircle className="h-8 w-8 text-success" />
        <p className="text-xs text-success font-medium text-center">{t("heicReady")}</p>
        <p className="text-[10px] text-text-muted text-center">{state.fileName}</p>
        <p className="text-[10px] text-text-muted text-center">
          {state.uploading ? t("converting") : t("converted")}
        </p>
      </div>
    );
  }
  return <img src={state.preview} alt="Character" className="w-full aspect-square object-cover" />;
}

/**
 * Tries to play the video blob URL natively.
 * If the browser can't decode the codec (e.g. HEVC/MOV in Chrome),
 * it falls back to a clean "file ready" UI instead of a black box.
 */
export function VideoPreview({ state }: { state: UploadState }) {
  const t = useTranslations("upload");
  const [canPlay, setCanPlay] = useState<boolean | null>(null); // null = loading

  return (
    <div className="relative w-full aspect-square bg-surface-elevated">
      <video
        key={state.preview}
        src={state.preview}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity ${canPlay === false ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        playsInline
        muted
        autoPlay
        loop
        controls={canPlay === true}
        onCanPlay={() => setCanPlay(true)}
        onError={() => setCanPlay(false)}
      />

      {canPlay === false && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
          <Film className="h-8 w-8 text-primary-light" />
          <p className="text-xs text-text-primary font-medium">{t("videoReady")}</p>
          <p className="text-[10px] text-text-muted">{state.fileName}</p>
          <p className="text-[10px] text-text-muted">
            {state.uploading ? t("uploading") : t("movHevcNote")}
          </p>
        </div>
      )}

      {canPlay === null && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-primary-light border-t-transparent animate-spin" />
        </div>
      )}
    </div>
  );
}

/**
 * Generic Upload Card for Images and Videos.
 */
export function UploadCard({
  label,
  hint,
  icon,
  dropLabel,
  state,
  accept,
  inputRef,
  disabled,
  renderPreview,
  onFile,
  onClear,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  dropLabel: React.ReactNode;
  state: UploadState;
  accept: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  disabled: boolean;
  renderPreview: (state: UploadState) => React.ReactNode;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const t = useTranslations("upload");
  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-text-primary">{label}</h2>
      </div>
      <p className="text-xs text-text-muted">{hint}</p>

      {state.preview ? (
        <div className="relative rounded-xl overflow-hidden flex-1 min-h-[120px]">
          {renderPreview(state)}
          {state.uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <p className="text-white text-xs">{t("uploading")}</p>
              </div>
            </div>
          )}
          {!state.uploading && !disabled && (
            <button
              onClick={onClear}
              className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          {state.url && (
            <div className="absolute bottom-2 left-2 rounded-full bg-success/80 px-2 py-0.5 text-xs text-white flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {t("ready")}
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => !disabled && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-8 transition-all flex-1 min-h-[120px] ${
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary/40"
          }`}
        >
          <Upload className="h-6 w-6 text-text-muted mb-2" />
          <p className="text-xs text-text-muted text-center">{dropLabel}</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
