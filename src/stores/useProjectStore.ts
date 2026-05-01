import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Scene } from "@prisma/client";
import type { CreateProjectInput } from "@/lib/validations/project";
import type { AspectRatio } from "@/types";

// ─────────────────────────────────────────────
// Shape of a scene being built in the wizard
// (before it has a real DB id)
// ─────────────────────────────────────────────
export type DraftScene = Omit<Scene, "id" | "projectId" | "createdAt" | "updatedAt"> & {
  id: string; // temporary client-side id
};

type WizardProjectData = CreateProjectInput & {
  tone?: string;
};

type ProjectStoreState = {
  // Wizard step (0-indexed)
  currentStep: number;

  // Data collected across wizard steps
  projectData: Partial<WizardProjectData>;
  scenes: DraftScene[];

  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  updateProjectData: (data: Partial<WizardProjectData>) => void;

  addScene: (scene?: Partial<DraftScene>) => void;
  updateScene: (id: string, updates: Partial<DraftScene>) => void;
  removeScene: (id: string) => void;
  reorderScenes: (scenes: DraftScene[]) => void;

  reset: () => void;
};

const DEFAULT_SCENE: Omit<DraftScene, "id"> = {
  order: 0,
  prompt: "",
  visualStyle: null,
  tone: null,
  duration: 5,
  narration: null,
  notes: null,
};

function generateId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useProjectStore = create<ProjectStoreState>()(
  devtools(
    (set, get) => ({
      currentStep: 0,
      projectData: {
        aspectRatio: "LANDSCAPE" as AspectRatio,
      },
      scenes: [
        { ...DEFAULT_SCENE, id: generateId(), order: 0 },
      ],

      setStep: (step) => set({ currentStep: step }, false, "setStep"),

      nextStep: () =>
        set(
          (state) => ({ currentStep: state.currentStep + 1 }),
          false,
          "nextStep"
        ),

      prevStep: () =>
        set(
          (state) => ({ currentStep: Math.max(0, state.currentStep - 1) }),
          false,
          "prevStep"
        ),

      updateProjectData: (data) =>
        set(
          (state) => ({
            projectData: { ...state.projectData, ...data },
          }),
          false,
          "updateProjectData"
        ),

      addScene: (partial = {}) =>
        set(
          (state) => ({
            scenes: [
              ...state.scenes,
              {
                ...DEFAULT_SCENE,
                ...partial,
                id: generateId(),
                order: state.scenes.length,
              },
            ],
          }),
          false,
          "addScene"
        ),

      updateScene: (id, updates) =>
        set(
          (state) => ({
            scenes: state.scenes.map((scene) =>
              scene.id === id ? { ...scene, ...updates } : scene
            ),
          }),
          false,
          "updateScene"
        ),

      removeScene: (id) =>
        set(
          (state) => ({
            scenes: state.scenes
              .filter((scene) => scene.id !== id)
              .map((scene, index) => ({ ...scene, order: index })),
          }),
          false,
          "removeScene"
        ),

      reorderScenes: (scenes) =>
        set(
          {
            scenes: scenes.map((scene, index) => ({
              ...scene,
              order: index,
            })),
          },
          false,
          "reorderScenes"
        ),

      reset: () =>
        set(
          {
            currentStep: 0,
            projectData: { aspectRatio: "LANDSCAPE" as AspectRatio },
            scenes: [{ ...DEFAULT_SCENE, id: generateId(), order: 0 }],
          },
          false,
          "reset"
        ),
    }),
    { name: "ProjectStore" }
  )
);
