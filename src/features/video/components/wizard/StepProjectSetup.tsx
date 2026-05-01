"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { createProjectSchema, type CreateProjectInput } from "@/lib/validations/project";
import { Button } from "@/components/ui/button";
import { Input, Textarea, FormField } from "@/components/ui/input";
import { ASPECT_RATIO_OPTIONS } from "@/types";
import { cn } from "@/lib/utils";

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "LinkedIn", "Twitter/X", "Facebook"];

export function StepProjectSetup() {
  const { projectData, updateProjectData, nextStep } = useProjectStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: projectData.name ?? "",
      description: projectData.description ?? "",
      aspectRatio: projectData.aspectRatio ?? "LANDSCAPE",
      platform: projectData.platform ?? "",
    },
  });

  const selectedAspectRatio = watch("aspectRatio");
  const selectedPlatform = watch("platform");

  function onSubmit(data: CreateProjectInput) {
    updateProjectData(data);
    nextStep();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Project Setup</h2>
        <p className="mt-1 text-sm text-text-muted">
          Define the basics of your video project.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <FormField label="Project name" error={errors.name?.message} required>
          <Input
            placeholder="e.g. Q1 Product Launch Campaign"
            autoFocus
            {...register("name")}
            error={errors.name?.message}
          />
        </FormField>

        <FormField
          label="Description"
          error={errors.description?.message}
          hint="What is this video about? What's the core message?"
        >
          <Textarea
            placeholder="Describe the goal of this video in a few sentences..."
            rows={3}
            {...register("description")}
            error={errors.description?.message}
          />
        </FormField>

        {/* Aspect Ratio */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-secondary">
            Aspect ratio <span className="text-danger">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {ASPECT_RATIO_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setValue("aspectRatio", option.value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all",
                  selectedAspectRatio === option.value
                    ? "border-primary/50 bg-primary/10 text-primary-light"
                    : "border-border bg-surface-elevated text-text-muted hover:border-border-strong hover:text-text-secondary"
                )}
              >
                {/* Aspect ratio visual */}
                <div className="flex h-10 items-center justify-center">
                  <div
                    className={cn(
                      "rounded border-2",
                      selectedAspectRatio === option.value
                        ? "border-primary"
                        : "border-current opacity-50"
                    )}
                    style={{
                      width: option.width > option.height ? "36px" : option.width === option.height ? "24px" : "16px",
                      height: option.height > option.width ? "36px" : option.width === option.height ? "24px" : "20px",
                    }}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold">{option.label}</p>
                  <p className="text-2xs text-text-muted mt-0.5">{option.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Platform */}
        <FormField label="Target platform" hint="Optional — helps optimize the output">
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((platform) => (
              <button
                key={platform}
                type="button"
                onClick={() =>
                  setValue("platform", selectedPlatform === platform ? "" : platform)
                }
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  selectedPlatform === platform
                    ? "border-primary/40 bg-primary/10 text-primary-light"
                    : "border-border bg-surface-elevated text-text-muted hover:border-border-strong hover:text-text-secondary"
                )}
              >
                {platform}
              </button>
            ))}
          </div>
        </FormField>
      </div>

      <div className="flex justify-end pt-2 border-t border-border">
        <Button type="submit">
          Continue to scenes
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
