"use client";

import { useRouter } from "next/navigation";
import { useProjectStore } from "@/stores/useProjectStore";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { StepProjectSetup } from "./wizard/StepProjectSetup";
import { StepSceneBuilder } from "./wizard/StepSceneBuilder";
import { StepStyleAndTone } from "./wizard/StepStyleAndTone";
import { StepReview } from "./wizard/StepReview";
import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

const STEPS = [
  { id: 0, title: "Project Setup", description: "Name, platform, format" },
  { id: 1, title: "Scene Builder", description: "Structure your video" },
  { id: 2, title: "Style & Tone", description: "Visual identity" },
  { id: 3, title: "Review", description: "Confirm & generate" },
] as const;

export function CreateVideoWizard() {
  const { currentStep } = useProjectStore();
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Step indicator */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary">
            Step {currentStep + 1} of {STEPS.length}
          </span>
          <span className="text-sm text-text-muted">
            {STEPS[currentStep]?.title}
          </span>
        </div>
        <Progress value={progress} className="h-1" />

        {/* Step pills */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-all",
                currentStep === step.id
                  ? "bg-primary/15 text-primary-light border border-primary/30"
                  : currentStep > step.id
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-surface-elevated text-text-muted border border-border"
              )}
            >
              {currentStep > step.id && (
                <CheckCircle className="h-3 w-3" />
              )}
              {step.title}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-border bg-surface p-6">
        {currentStep === 0 && <StepProjectSetup />}
        {currentStep === 1 && <StepSceneBuilder />}
        {currentStep === 2 && <StepStyleAndTone />}
        {currentStep === 3 && <StepReview />}
      </div>
    </div>
  );
}
