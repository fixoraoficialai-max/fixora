"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { Button } from "@/components/ui/button";
import { VIDEO_TONES, type VideoTone } from "@/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function StepStyleAndTone() {
  const t = useTranslations("video");
  const { projectData, updateProjectData, nextStep, prevStep } = useProjectStore();

  const selectedTone = projectData.tone as VideoTone | undefined;

  const TONE_DESCRIPTIONS: Record<VideoTone, string> = {
    Professional:  t("toneProfessional"),
    Inspirational: t("toneInspirational"),
    Energetic:     t("toneEnergetic"),
    Calm:          t("toneCalm"),
    Playful:       t("tonePlayful"),
    Urgent:        t("toneUrgent"),
    Educational:   t("toneEducational"),
    Emotional:     t("toneEmotional"),
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{t("styleToneTitle")}</h2>
        <p className="mt-1 text-sm text-text-muted">{t("styleToneSubtitle")}</p>
      </div>

      {/* Tone selection */}
      <div>
        <label className="mb-3 block text-sm font-medium text-text-secondary">
          {t("styleToneLabel")}
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VIDEO_TONES.map((tone) => (
            <button
              key={tone}
              type="button"
              onClick={() => updateProjectData({ tone: selectedTone === tone ? undefined : tone })}
              className={cn(
                "flex flex-col gap-1 rounded-xl border p-3 text-left transition-all",
                selectedTone === tone
                  ? "border-primary/40 bg-primary/10"
                  : "border-border bg-surface-elevated hover:border-border-strong"
              )}
            >
              <span
                className={cn(
                  "text-sm font-semibold",
                  selectedTone === tone ? "text-primary-light" : "text-text-primary"
                )}
              >
                {tone}
              </span>
              <span className="text-2xs text-text-muted">
                {TONE_DESCRIPTIONS[tone]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-border bg-surface-elevated p-4">
        <p className="text-xs font-medium text-text-secondary mb-2">
          {t("styleToneInfoTitle")}
        </p>
        <p className="text-xs text-text-muted leading-relaxed">
          {t("styleToneInfoBody")}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button type="button" variant="secondary" onClick={prevStep}>
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Button>
        <Button type="button" onClick={nextStep}>
          {t("styleReviewGenerate")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
