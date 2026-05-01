"use client";

import { ArrowLeft, ArrowRight, Plus, Trash2, GripVertical } from "lucide-react";
import { useProjectStore, type DraftScene } from "@/stores/useProjectStore";
import { Button } from "@/components/ui/button";
import { Textarea, FormField, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function StepSceneBuilder() {
  const { scenes, addScene, updateScene, removeScene, nextStep, prevStep } =
    useProjectStore();

  const canProceed = scenes.every(
    (scene) => scene.prompt.trim().length >= 10
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Scene Builder</h2>
          <p className="mt-1 text-sm text-text-muted">
            Divide your video into scenes. Each scene has its own prompt, style, and duration.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => addScene()}
          disabled={scenes.length >= 10}
        >
          <Plus className="h-4 w-4" />
          Add Scene
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {scenes.map((scene, index) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            index={index}
            isOnly={scenes.length === 1}
            onUpdate={(updates) => updateScene(scene.id, updates)}
            onRemove={() => removeScene(scene.id)}
          />
        ))}
      </div>

      {scenes.length < 10 && (
        <button
          type="button"
          onClick={() => addScene()}
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-4 text-sm text-text-muted hover:border-primary/30 hover:text-text-secondary hover:bg-surface-elevated transition-all"
        >
          <Plus className="h-4 w-4" />
          Add another scene
        </button>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button type="button" variant="secondary" onClick={prevStep}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          type="button"
          onClick={nextStep}
          disabled={!canProceed}
          title={!canProceed ? "Each scene needs at least 10 characters in the prompt" : undefined}
        >
          Continue to style
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Scene Card
// ─────────────────────────────────────────────
interface SceneCardProps {
  scene: DraftScene;
  index: number;
  isOnly: boolean;
  onUpdate: (updates: Partial<DraftScene>) => void;
  onRemove: () => void;
}

const VISUAL_STYLES = [
  "Cinematic", "Minimal", "Animated", "Documentary",
  "Bold & Graphic", "Dark & Moody", "Bright & Clean", "Futuristic",
];

function SceneCard({ scene, index, isOnly, onUpdate, onRemove }: SceneCardProps) {
  const hasError = scene.prompt.trim().length > 0 && scene.prompt.trim().length < 10;

  return (
    <div className="rounded-xl border border-border bg-surface-elevated overflow-hidden">
      {/* Scene header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 bg-surface">
        <GripVertical className="h-4 w-4 text-text-muted cursor-grab" aria-hidden="true" />
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-2xs font-semibold text-primary-light">
          {index + 1}
        </span>
        <span className="text-sm font-medium text-text-primary flex-1">
          Scene {index + 1}
        </span>
        {!isOnly && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md p-1 text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
            aria-label={`Remove scene ${index + 1}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Scene body */}
      <div className="flex flex-col gap-4 p-4">
        <FormField
          label="Scene prompt"
          error={hasError ? "Prompt must be at least 10 characters" : undefined}
          hint="Describe what happens in this scene visually."
          required
        >
          <Textarea
            placeholder="Describe the visual content of this scene in detail. What do we see? What happens?"
            rows={3}
            value={scene.prompt}
            onChange={(e) => onUpdate({ prompt: e.target.value })}
            error={hasError ? "Too short" : undefined}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          {/* Visual style */}
          <FormField label="Visual style">
            <div className="flex flex-wrap gap-1.5">
              {VISUAL_STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() =>
                    onUpdate({ visualStyle: scene.visualStyle === style ? null : style })
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-2xs font-medium transition-all",
                    scene.visualStyle === style
                      ? "border-primary/40 bg-primary/10 text-primary-light"
                      : "border-border text-text-muted hover:border-border-strong hover:text-text-secondary"
                  )}
                >
                  {style}
                </button>
              ))}
            </div>
          </FormField>

          {/* Duration */}
          <FormField label="Duration (seconds)">
            <Input
              type="number"
              min={1}
              max={60}
              value={scene.duration}
              onChange={(e) => onUpdate({ duration: parseInt(e.target.value, 10) || 5 })}
              className="w-24"
            />
          </FormField>
        </div>

        {/* Optional narration */}
        <FormField label="Narration / voiceover" hint="Optional — text to be spoken in this scene">
          <Textarea
            placeholder="Optional: add narration or voiceover text for this scene..."
            rows={2}
            value={scene.narration ?? ""}
            onChange={(e) => onUpdate({ narration: e.target.value || null })}
          />
        </FormField>
      </div>
    </div>
  );
}
