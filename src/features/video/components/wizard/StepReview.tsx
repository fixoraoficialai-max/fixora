"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Zap, CheckCircle, AlertCircle, Film, Layers, Clock } from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ASPECT_RATIO_OPTIONS, type AspectRatio } from "@/types";
import { formatDuration, cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { FormAlert } from "@/components/ui/form-alert";

export function StepReview() {
  const t = useTranslations("video");
  const router = useRouter();
  const { projectData, scenes, prevStep, reset } = useProjectStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  const aspectRatioOption = ASPECT_RATIO_OPTIONS.find(
    (opt) => opt.value === (projectData.aspectRatio as AspectRatio)
  );

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);

    try {
      // 1. Create project
      const projectRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectData.name,
          description: projectData.description,
          aspectRatio: projectData.aspectRatio,
          platform: projectData.platform,
        }),
      });

      const projectResult = await projectRes.json() as {
        success: boolean;
        data?: { id: string };
        error?: { message: string };
      };

      if (!projectResult.success || !projectResult.data) {
        throw new Error(projectResult.error?.message ?? "Failed to create project");
      }

      const projectId = projectResult.data.id;

      // 2. Create scenes
      const scenesRes = await fetch(`/api/scenes/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes: scenes.map((scene) => ({
            order: scene.order,
            prompt: scene.prompt,
            visualStyle: scene.visualStyle,
            tone: scene.tone ?? projectData.tone,
            duration: scene.duration,
            narration: scene.narration,
          })),
        }),
      });

      if (!scenesRes.ok) {
        throw new Error("Failed to save scenes");
      }

      // 3. Trigger video generation
      const generateRes = await fetch("/api/videos/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const generateResult = await generateRes.json() as {
        success: boolean;
        data?: { videoId: string };
        error?: { message: string };
      };

      if (!generateResult.success) {
        throw new Error(generateResult.error?.message ?? "Failed to start generation");
      }

      reset();
      router.push(`/projects/${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("reviewGenericError"));
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{t("reviewTitle")}</h2>
        <p className="mt-1 text-sm text-text-muted">{t("reviewSubtitle")}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryItem
          icon={Film}
          label={t("reviewProject")}
          value={projectData.name ?? t("untitled")}
          sub={aspectRatioOption?.label ?? "Landscape"}
        />
        <SummaryItem
          icon={Layers}
          label={t("reviewScenes")}
          value={t("scenes", { n: scenes.length })}
          sub={projectData.tone ?? t("noToneSet")}
        />
        <SummaryItem
          icon={Clock}
          label={t("reviewDuration")}
          value={formatDuration(totalDuration)}
          sub={t("segments", { n: scenes.length })}
        />
      </div>

      {/* Scene list */}
      <div>
        <p className="mb-3 text-sm font-medium text-text-secondary">{t("reviewScenesOverview")}</p>
        <div className="flex flex-col gap-2">
          {scenes.map((scene, index) => (
            <div
              key={scene.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface-elevated p-3"
            >
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-2xs font-semibold text-primary-light">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text-primary line-clamp-2">{scene.prompt}</p>
                <div className="mt-1 flex items-center gap-2 text-2xs text-text-muted">
                  {scene.visualStyle && <span>{scene.visualStyle}</span>}
                  {scene.visualStyle && <span>·</span>}
                  <span>{scene.duration}s</span>
                </div>
              </div>
              <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Credit cost */}
      <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-warning" />
          <p className="text-sm font-medium text-text-primary">
            {t("reviewCreditCost", { credits: 1 })}
          </p>
        </div>
        <p className="mt-1 text-xs text-text-muted">{t("creditsNote")}</p>
      </div>

      {/* Error */}
      {error && (
        <FormAlert variant="error" size="md" className="flex items-start gap-2 p-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {error}
        </FormAlert>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button type="button" variant="secondary" onClick={prevStep} disabled={isGenerating}>
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Button>
        <Button type="button" onClick={handleGenerate} isLoading={isGenerating}>
          <Zap className="h-4 w-4" />
          {isGenerating ? t("creatingProject") : t("generateVideo")}
        </Button>
      </div>
    </div>
  );
}

function SummaryItem({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="flex flex-col gap-2">
      <Icon className="h-4 w-4 text-text-muted" />
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="font-semibold text-text-primary text-sm">{value}</p>
        <p className="text-xs text-text-muted mt-0.5">{sub}</p>
      </div>
    </Card>
  );
}
