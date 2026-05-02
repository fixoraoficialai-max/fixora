"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, RefreshCw, Download, Zap, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea, FormField, Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

type Step = "setup" | "scenes" | "generating" | "result";
type AspectRatio = "LANDSCAPE" | "PORTRAIT" | "SQUARE";

const CHARACTERS = ["Pixar 3D character style","Anime character style","Realistic human","Cartoon character","Fantasy creature","Robot/Cyborg"];
const MOODS = [
  { label: "Motivacional", emoji: "💪", value: "motivational" },
  { label: "Triste", emoji: "😢", value: "sad" },
  { label: "Feliz", emoji: "😊", value: "happy" },
  { label: "Épico", emoji: "⚡", value: "epic" },
  { label: "Gracioso", emoji: "😂", value: "funny" },
  { label: "Dramático", emoji: "🎭", value: "dramatic" },
];
const ASPECT_OPTIONS = [
  { value: "PORTRAIT" as AspectRatio, label: "9:16", desc: "TikTok, Reels" },
  { value: "LANDSCAPE" as AspectRatio, label: "16:9", desc: "YouTube" },
  { value: "SQUARE" as AspectRatio, label: "1:1", desc: "Instagram" },
];

interface Scene {
  id: string;
  text: string;
  imageUrl?: string;
  status: "pending" | "generating" | "done" | "error";
}

export default function CreatePage() {
  const [step, setStep] = useState<Step>("setup");
  const [character, setCharacter] = useState("");
  const [characterDesc, setCharacterDesc] = useState("");
  const [mood, setMood] = useState("motivational");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("PORTRAIT");
  const [scenes, setScenes] = useState<Scene[]>([
    { id: "1", text: "", status: "pending" },
    { id: "2", text: "", status: "pending" },
    { id: "3", text: "", status: "pending" },
  ]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentGenerating, setCurrentGenerating] = useState(0);
  const [error, setError] = useState("");

  function addScene() {
    if (scenes.length >= 8) return;
    setScenes(prev => [...prev, { id: Date.now().toString(), text: "", status: "pending" }]);
  }
  function removeScene(id: string) {
    if (scenes.length <= 2) return;
    setScenes(prev => prev.filter(s => s.id !== id));
  }
  function updateScene(id: string, text: string) {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, text } : s));
  }

  async function handleGenerate() {
    const validScenes = scenes.filter(s => s.text.trim().length > 0);
    if (validScenes.length < 2) { setError("Necesitas al menos 2 escenas con texto"); return; }
    if (!characterDesc.trim()) { setError("Describe tu personaje"); return; }
    setStep("generating");
    setError("");
    setCurrentGenerating(0);
    const images: string[] = [];

    for (let i = 0; i < validScenes.length; i++) {
      const scene = validScenes[i];
      if (!scene) continue;
      setCurrentGenerating(i + 1);
      setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, status: "generating" } : s));
      try {
        const scenePrompt = `${characterDesc}, ${character}, ${scene.text}, ${mood} mood, cinematic lighting, 8K quality, photorealistic`;
        const res = await fetch("/api/generate/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: scenePrompt, style: character, tone: mood }),
        });
        const promptData = await res.json() as { success: boolean; data?: { optimized: string } };
        const optimized = promptData.data?.optimized ?? scenePrompt;
        const imgRes = await fetch("/api/generate/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: optimized, aspectRatio }),
        });
        const imgData = await imgRes.json() as { success: boolean; data?: { imageUrl: string }; error?: { message: string } };
        if (!imgData.success) throw new Error(imgData.error?.message ?? "Error generando imagen");
        const imageUrl = imgData.data?.imageUrl ?? "";
        images.push(imageUrl);
        setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, status: "done", imageUrl } : s));
      } catch {
        setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, status: "error" } : s));
      }
    }
    setGeneratedImages(images);
    setStep("result");
  }

  const validSceneCount = scenes.filter(s => s.text.trim().length > 0).length;
  const creditCost = validSceneCount * 3;

  return (
    <div className="mx-auto max-w-2xl pb-12 overflow-y-auto">
      <PageHeader
        title="Crear Video IA"
        description="Crea videos estilo Pixar con personajes consistentes"
        backHref="/dashboard"
        backLabel="Dashboard"
      />
      {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

      {step === "setup" && (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary-light" /><h2 className="font-semibold text-text-primary">Tu Personaje</h2></div>
            <FormField label="Describe tu personaje" required hint="Ej: hombre de fuego, niña de agua, robot amigable">
              <Textarea placeholder="Un niño hecho de fuego con ojos expresivos..." rows={3} value={characterDesc} onChange={(e) => setCharacterDesc(e.target.value)} />
            </FormField>
            <FormField label="Estilo visual">
              <div className="flex flex-wrap gap-2">
                {CHARACTERS.map((c) => (
                  <button key={c} type="button" onClick={() => setCharacter(character === c ? "" : c)}
                    className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-all", character === c ? "border-primary/40 bg-primary/10 text-primary-light" : "border-border text-text-muted hover:border-border-strong")}>{c}</button>
                ))}
              </div>
            </FormField>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
            <h2 className="font-semibold text-text-primary">Mood del Video</h2>
            <div className="grid grid-cols-3 gap-2">
              {MOODS.map((m) => (
                <button key={m.value} type="button" onClick={() => setMood(m.value)}
                  className={cn("flex flex-col items-center rounded-xl border p-3 text-xs font-medium transition-all", mood === m.value ? "border-primary/40 bg-primary/10 text-primary-light" : "border-border text-text-muted hover:border-border-strong")}>
                  <span className="text-2xl mb-1">{m.emoji}</span>{m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
            <h2 className="font-semibold text-text-primary">Formato</h2>
            <div className="flex gap-3">
              {ASPECT_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setAspectRatio(opt.value)}
                  className={cn("flex flex-col items-center rounded-xl border px-4 py-3 text-xs font-medium transition-all flex-1", aspectRatio === opt.value ? "border-primary/40 bg-primary/10 text-primary-light" : "border-border text-text-muted hover:border-border-strong")}>
                  <span className="text-sm font-bold">{opt.label}</span><span className="opacity-70">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <Button onClick={() => setStep("scenes")} disabled={!characterDesc.trim()}>
            Continuar → Escenas <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {step === "scenes" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div><h2 className="font-semibold text-text-primary">Escenas del Video</h2><p className="text-xs text-text-muted mt-0.5">Cada escena = 1 imagen.</p></div>
              <button type="button" onClick={() => setStep("setup")} className="text-xs text-text-muted hover:text-text-secondary underline">← Editar personaje</button>
            </div>
            <div className="flex flex-col gap-3">
              {scenes.map((scene, index) => (
                <div key={scene.id} className="flex gap-3 items-start">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary-light mt-2">{index + 1}</span>
                  <div className="flex-1"><Input placeholder={`Escena ${index + 1}: ej. "está muy cansado trabajando"`} value={scene.text} onChange={(e) => updateScene(scene.id, e.target.value)} /></div>
                  {scenes.length > 2 && (<button type="button" onClick={() => removeScene(scene.id)} className="mt-2 rounded-md p-1 text-text-muted hover:text-danger transition-colors"><Trash2 className="h-4 w-4" /></button>)}
                </div>
              ))}
            </div>
            {scenes.length < 8 && (
              <button type="button" onClick={addScene} className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-text-muted hover:border-primary/30 transition-all">
                <Plus className="h-4 w-4" />Agregar escena
              </button>
            )}
          </div>
          <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-warning" /><span className="text-sm text-text-primary"><span className="font-bold text-warning">{creditCost} créditos</span> — {validSceneCount} escenas × 3 cr</span></div>
            <Button onClick={handleGenerate} disabled={validSceneCount < 2 || isLoading}><Sparkles className="h-4 w-4" />Generar</Button>
          </div>
        </div>
      )}

      {step === "generating" && (
        <div className="rounded-xl border border-border bg-surface p-8 flex flex-col items-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20"><Sparkles className="h-8 w-8 text-primary-light animate-pulse" /></div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-text-primary">Generando tu video...</h2>
            <p className="mt-1 text-sm text-text-muted">Escena {currentGenerating} de {scenes.filter(s => s.text.trim()).length}</p>
          </div>
          <div className="w-full flex flex-col gap-2">
            {scenes.filter(s => s.text.trim()).map((scene, index) => (
              <div key={scene.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-elevated p-3">
                <span className={cn("flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  scene.status === "done" ? "bg-success/20 text-success" : scene.status === "generating" ? "bg-primary/20 text-primary-light animate-pulse" : scene.status === "error" ? "bg-danger/20 text-danger" : "bg-surface-overlay text-text-muted")}>
                  {scene.status === "done" ? "✓" : scene.status === "error" ? "✗" : index + 1}
                </span>
                <p className="text-sm text-text-secondary flex-1 truncate">{scene.text}</p>
                {scene.status === "generating" && <span className="text-xs text-primary-light animate-pulse">Generando...</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {step === "result" && (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-success/20 bg-success/5 p-4 text-center">
            <p className="text-sm font-medium text-success">✓ ¡{generatedImages.length} imágenes generadas!</p>
            <p className="text-xs text-text-muted mt-1">Descarga las imágenes y úsalas en CapCut para crear tu video con audio</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {scenes.filter(s => s.imageUrl).map((scene, index) => (
              <div key={scene.id} className="relative rounded-xl overflow-hidden border border-border group">
                <img src={scene.imageUrl} alt={`Scene ${index + 1}`} className="w-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
                  <p className="text-white text-xs text-center font-medium">{scene.text}</p>
                  <a href={`/api/download?url=${encodeURIComponent(scene.imageUrl ?? "")}&type=image`} download className="flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-xs text-white hover:bg-white/30 transition-colors">
                    <Download className="h-3 w-3" />Descargar
                  </a>
                </div>
                <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">{index + 1}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-text-primary">Próximos pasos:</h3>
            <ol className="flex flex-col gap-2 text-xs text-text-muted">
              <li className="flex items-start gap-2"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary-light font-bold">1</span>Descarga todas las imágenes</li>
              <li className="flex items-start gap-2"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary-light font-bold">2</span>Ábrelas en CapCut → crear nuevo video</li>
              <li className="flex items-start gap-2"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary-light font-bold">3</span>Agrega texto animado y música</li>
              <li className="flex items-start gap-2"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary-light font-bold">4</span>¡Publica en TikTok/Reels!</li>
            </ol>
          </div>
          <Button variant="secondary" onClick={() => { setStep("setup"); setScenes([{ id: "1", text: "", status: "pending" },{ id: "2", text: "", status: "pending" },{ id: "3", text: "", status: "pending" }]); setGeneratedImages([]); setCharacterDesc(""); }}>
            <RefreshCw className="h-4 w-4" />Crear nuevo
          </Button>
        </div>
      )}
    </div>
  );
}