"use client";

import { useState, useRef } from "react";
import {
  Plus, Trash2, Sparkles, Download, RefreshCw,
  Clapperboard, Users, Film,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea, FormField } from "@/components/ui/input";
import { TopBar } from "@/components/layout/TopBar";
import { STUDIO_STYLES, type StudioStyle } from "@/lib/validations/studio";

// ─── Types ────────────────────────────────────────────────────────────────────

type SceneGenPhase = "idle" | "generating" | "done" | "error";

type SceneGenState = {
  phase:      SceneGenPhase;
  jobId?:     string;
  requestId?: string;
  videoUrl?:  string;
  statusMsg:  string;
  error?:     string;
};

type Scene = {
  id:        string;
  order:     number;
  prompt:    string;
  createdAt: Date;
};

type Video = {
  id:       string;
  status:   string;
  url:      string | null;
  metadata: unknown; // Prisma JsonValue — narrowed at access point
};

type Project = {
  id:          string;
  name:        string;
  description: string | null;
  scenes:      Scene[];
  videos:      Video[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 10_000;
const MAX_POLLS        = 60;

const STYLE_LABELS: Record<StudioStyle, string> = {
  elegant:    "Elegante",
  dynamic:    "Dinámico",
  minimalist: "Minimalista",
};

const EMPTY_GEN_STATE: SceneGenState = { phase: "idle", statusMsg: "" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCharacterImageUrl(description: string | null): string | null {
  if (!description) return null;
  try {
    const parsed = JSON.parse(description) as { characterImageUrl?: string };
    return parsed.characterImageUrl ?? null;
  } catch {
    return null;
  }
}

/** Returns the completed video URL for a given sceneId from the videos list. */
function findSceneVideo(videos: Video[], sceneId: string): Video | undefined {
  return videos.find((v) => {
    if (v.status !== "COMPLETED" || !v.url) return false;
    const meta = v.metadata as { sceneId?: string } | null | undefined;
    return meta?.sceneId === sceneId;
  });
}

// ─── API helpers (each does ONE thing) ───────────────────────────────────────

async function apiAddScene(
  projectId: string,
  prompt:    string,
  order:     number,
): Promise<{ id: string; order: number; prompt: string }> {
  const res  = await fetch("/api/studio/scene", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ projectId, prompt, order }),
  });
  const data = await res.json() as {
    success: boolean;
    data?:   { id: string; order: number; prompt: string };
    error?:  { message: string };
  };
  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? "Failed to add scene");
  }
  return data.data;
}

async function apiDeleteScene(sceneId: string): Promise<void> {
  const res  = await fetch("/api/studio/scene", {
    method:  "DELETE",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ sceneId }),
  });
  const data = await res.json() as { success: boolean; error?: { message: string } };
  if (!data.success) throw new Error(data.error?.message ?? "Failed to delete scene");
}

async function apiGenerateScene(
  projectId: string,
  sceneId:   string,
  style:     StudioStyle,
): Promise<{ jobId: string; requestId: string }> {
  const res  = await fetch("/api/studio/generate", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ projectId, sceneId, style }),
  });
  const data = await res.json() as {
    success: boolean;
    data?:   { jobId: string; requestId: string };
    error?:  { message: string };
  };
  if (!data.success || !data.data?.jobId) {
    throw new Error(data.error?.message ?? "Failed to start generation");
  }
  return data.data;
}

async function apiCheckStatus(
  jobId:     string,
  requestId: string,
): Promise<{ status: string; videoUrl?: string }> {
  const res  = await fetch("/api/studio/status", {
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

// ─── SceneCard component ──────────────────────────────────────────────────────

function SceneCard({
  scene,
  index,
  projectId,
  genState,
  existingVideoUrl,
  onDelete,
  onGenStateChange,
}: {
  scene:             Scene;
  index:             number;
  projectId:         string;
  genState:          SceneGenState;
  existingVideoUrl?: string;
  onDelete:          (sceneId: string) => void;
  onGenStateChange:  (sceneId: string, state: SceneGenState) => void;
}) {
  const [style,    setStyle]    = useState<StudioStyle>("dynamic");
  const pollTimer                = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount                = useRef(0);

  const videoUrl = genState.videoUrl ?? existingVideoUrl;
  const isDone   = genState.phase === "done" || !!existingVideoUrl;

  function clearPoll(): void {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  function startPolling(jobId: string, requestId: string): void {
    pollCount.current = 0;
    pollTimer.current = setInterval(async () => {
      pollCount.current += 1;
      if (pollCount.current > MAX_POLLS) {
        clearPoll();
        onGenStateChange(scene.id, {
          phase:     "error",
          statusMsg: "",
          error:     "La generación tardó demasiado. Revisa tu Historial.",
        });
        return;
      }
      try {
        const result = await apiCheckStatus(jobId, requestId);
        onGenStateChange(scene.id, {
          phase:     genState.phase === "done" ? "done" : "generating",
          jobId,
          requestId,
          statusMsg: `Generando escena… (${pollCount.current * 10}s)`,
        });
        if (result.status === "COMPLETED" && result.videoUrl) {
          clearPoll();
          onGenStateChange(scene.id, { phase: "done", videoUrl: result.videoUrl, statusMsg: "" });
        } else if (result.status === "FAILED") {
          clearPoll();
          onGenStateChange(scene.id, { phase: "error", statusMsg: "", error: "La generación falló." });
        }
      } catch { /* transient — keep polling */ }
    }, POLL_INTERVAL_MS);
  }

  async function handleGenerate(): Promise<void> {
    onGenStateChange(scene.id, { phase: "generating", statusMsg: "Enviando solicitud…" });
    try {
      const { jobId, requestId } = await apiGenerateScene(projectId, scene.id, style);
      onGenStateChange(scene.id, { phase: "generating", jobId, requestId, statusMsg: "Procesando…" });
      startPolling(jobId, requestId);
    } catch (e) {
      onGenStateChange(scene.id, {
        phase: "error",
        statusMsg: "",
        error: e instanceof Error ? e.message : "Error al generar",
      });
    }
  }

  async function handleDelete(): Promise<void> {
    try {
      await apiDeleteScene(scene.id);
      onDelete(scene.id);
    } catch { /* ignore — show visual feedback */ }
  }

  const isGenerating = genState.phase === "generating";

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Scene header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-elevated">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-primary-light bg-primary/10 rounded-full px-2 py-0.5">
            Escena {index + 1}
          </span>
        </div>
        {!isDone && !isGenerating && (
          <button
            onClick={handleDelete}
            className="text-text-muted hover:text-danger transition-colors"
            aria-label="Eliminar escena"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Prompt */}
        <p className="text-sm text-text-primary leading-relaxed">{scene.prompt}</p>

        {/* Error */}
        {genState.phase === "error" && genState.error && (
          <p className="text-xs text-danger">{genState.error}</p>
        )}

        {/* Video result */}
        {isDone && videoUrl && (
          <div className="rounded-lg overflow-hidden border border-border">
            <video
              src={`/api/download?url=${encodeURIComponent(videoUrl)}&type=video&stream=1`}
              controls
              loop
              playsInline
              className="w-full"
            />
            <div className="flex justify-end gap-2 p-2 bg-surface-elevated border-t border-border">
              <a href={`/api/download?url=${encodeURIComponent(videoUrl)}&type=video`} download>
                <Button variant="secondary" size="sm">
                  <Download className="h-3 w-3" />
                  Descargar
                </Button>
              </a>
            </div>
          </div>
        )}

        {/* Generating status */}
        {isGenerating && (
          <div className="text-center py-3">
            <Film className="h-6 w-6 text-primary-light animate-pulse mx-auto mb-1" />
            <p className="text-xs text-text-muted">{genState.statusMsg || "Procesando…"}</p>
          </div>
        )}

        {/* Generate controls — only show if not done and not generating */}
        {!isDone && !isGenerating && (
          <div className="flex flex-col gap-2 pt-1 border-t border-border">
            <div className="flex gap-1.5">
              {STUDIO_STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={[
                    "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                    style === s
                      ? "border-primary bg-primary/10 text-primary-light"
                      : "border-border text-text-muted hover:border-primary/40",
                  ].join(" ")}
                >
                  {STYLE_LABELS[s]}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={handleGenerate} className="w-full">
              <Sparkles className="h-3.5 w-3.5" />
              Generar Escena · 15 cr
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function StudioEditor({ project }: { project: Project }) {
  const characterImageUrl = parseCharacterImageUrl(project.description);

  const [scenes,      setScenes]      = useState<Scene[]>(project.scenes);
  const [genStates,   setGenStates]   = useState<Map<string, SceneGenState>>(new Map());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPrompt,   setNewPrompt]   = useState("");
  const [addingScene, setAddingScene] = useState(false);
  const [addError,    setAddError]    = useState("");

  // ─── Gen state management ─────────────────────────────────────────────────

  function updateGenState(sceneId: string, state: SceneGenState): void {
    setGenStates((prev) => new Map(prev).set(sceneId, state));
  }

  function getGenState(sceneId: string): SceneGenState {
    return genStates.get(sceneId) ?? EMPTY_GEN_STATE;
  }

  // ─── Add scene ────────────────────────────────────────────────────────────

  async function handleAddScene(): Promise<void> {
    if (newPrompt.trim().length < 5) {
      setAddError("Describe la escena (mínimo 5 caracteres)");
      return;
    }

    setAddingScene(true);
    setAddError("");

    try {
      const newScene = await apiAddScene(project.id, newPrompt.trim(), scenes.length);
      setScenes((prev) => [
        ...prev,
        { ...newScene, createdAt: new Date() },
      ]);
      setNewPrompt("");
      setShowAddForm(false);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Error al agregar escena");
    } finally {
      setAddingScene(false);
    }
  }

  function handleDeleteScene(sceneId: string): void {
    setScenes((prev) => prev.filter((s) => s.id !== sceneId));
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title={project.name}
        description="Studio — Mini película"
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-3xl flex flex-col gap-6">

          {/* Character panel */}
          <div className="flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
            {characterImageUrl ? (
              <img
                src={characterImageUrl}
                alt="Personaje"
                className="h-16 w-16 rounded-xl object-cover border border-border flex-shrink-0"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-surface-elevated border border-border flex items-center justify-center flex-shrink-0">
                <Users className="h-7 w-7 text-text-muted" />
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-primary-light uppercase tracking-wide mb-0.5">
                Personaje de la serie
              </p>
              <p className="text-sm text-text-primary font-medium">{project.name}</p>
              <p className="text-xs text-text-muted">
                Esta imagen se mantiene en todas las escenas
              </p>
            </div>
          </div>

          {/* Scenes header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clapperboard className="h-4 w-4 text-text-muted" />
              <span className="text-sm font-semibold text-text-primary">
                Escenas ({scenes.length})
              </span>
            </div>
            {!showAddForm && (
              <Button size="sm" variant="secondary" onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4" />
                Agregar Escena
              </Button>
            )}
          </div>

          {/* Scenes list */}
          {scenes.length === 0 && !showAddForm && (
            <div className="text-center py-10 rounded-xl border border-dashed border-border">
              <Film className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-muted">Sin escenas aún.</p>
              <p className="text-xs text-text-muted mt-1">
                Agrega la primera escena de tu historia.
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowAddForm(true)}
                className="mt-4"
              >
                <Plus className="h-4 w-4" />
                Agregar primera escena
              </Button>
            </div>
          )}

          {scenes.map((scene, index) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              index={index}
              projectId={project.id}
              genState={getGenState(scene.id)}
              existingVideoUrl={findSceneVideo(project.videos, scene.id)?.url ?? undefined}
              onDelete={handleDeleteScene}
              onGenStateChange={updateGenState}
            />
          ))}

          {/* Add scene form */}
          {showAddForm && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-3">
              <p className="text-sm font-semibold text-primary-light flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nueva Escena {scenes.length + 1}
              </p>

              {addError && (
                <p className="text-xs text-danger">{addError}</p>
              )}

              <FormField
                label="Describe esta escena"
                required
                hint="¿Qué hace el personaje en esta escena?"
              >
                <Textarea
                  placeholder="El personaje camina por la playa al atardecer, mirando hacia el horizonte…"
                  rows={3}
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  disabled={addingScene}
                />
              </FormField>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewPrompt("");
                    setAddError("");
                  }}
                  disabled={addingScene}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleAddScene} isLoading={addingScene}>
                  <Plus className="h-3.5 w-3.5" />
                  {addingScene ? "Guardando…" : "Guardar Escena"}
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
