"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { Button } from "@/components/ui/button";
import { VIDEO_TONES, type VideoTone } from "@/types";
import { cn } from "@/lib/utils";

const TONE_DESCRIPTIONS: Record<VideoTone, string> = {
  Professional: "Clean, authoritative, trustworthy",
  Inspirational: "Uplifting, motivating, aspirational",
  Energetic: "Fast-paced, dynamic, exciting",
  Calm: "Slow, meditative, peaceful",
  Playful: "Fun, light, engaging",
  Urgent: "Time-sensitive, action-driven",
  Educational: "Clear, informative, structured",
  Emotional: "Heartfelt, human, touching",
};

export function StepStyleAndTone() {
  const { projectData, updateProjectData, nextStep, prevStep } = useProjectStore();

  const selectedTone = projectData.tone as VideoTone | undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Style & Tone</h2>
        <p className="mt-1 text-sm text-text-muted">
          Define the emotional tone and visual direction for the entire video.
        </p>
      </div>

      {/* Tone selection */}
      <div>
        <label className="mb-3 block text-sm font-medium text-text-secondary">
          Video tone
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
          About style configuration
        </p>
        <p className="text-xs text-text-muted leading-relaxed">
          Tone affects how the AI interprets transitions, pacing, and visual choices.
          Individual scene visual styles take precedence but the overall tone shapes the
          final edit. Advanced style options (color grade, music, typography) will be
          available in a future update.
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button type="button" variant="secondary" onClick={prevStep}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button type="button" onClick={nextStep}>
          Review & generate
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
