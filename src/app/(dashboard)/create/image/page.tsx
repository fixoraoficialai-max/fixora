"use client";

import { useState } from "react";
import { Download, Zap, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea, FormField } from "@/components/ui/input";
import { TopBar } from "@/components/layout/TopBar";
import { cn } from "@/lib/utils";

type AspectRatio = "LANDSCAPE" | "PORTRAIT" | "SQUARE";
type Step = "type" | "describe" | "style" | "character" | "scene" | "lighting" | "generate";

const CREATION_TYPES = [
  { value: "character", label: "Personaje", emoji: "👤", desc: "Crea un personaje único" },
  { value: "scene", label: "Paisaje/Escena", emoji: "🌅", desc: "Lugares y ambientes" },
  { value: "story", label: "Historia/Drama", emoji: "🎭", desc: "Escenas narrativas" },
  { value: "product", label: "Producto", emoji: "📦", desc: "Objetos y productos" },
  { value: "abstract", label: "Arte Abstracto", emoji: "🎨", desc: "Arte y creatividad" },
];

const VISUAL_STYLES = [
  { value: "Pixar 3D cinematic style, full body, ultra detailed", label: "Pixar 3D", emoji: "🎬" },
  { value: "photorealistic cinematic, 8K, professional photography", label: "Realista", emoji: "📷" },
  { value: "anime style, detailed illustration", label: "Anime", emoji: "🇯🇵" },
  { value: "Disney classic animation style", label: "Disney", emoji: "✨" },
  { value: "dark fantasy art, dramatic lighting", label: "Dark Fantasy", emoji: "🌑" },
  { value: "luxury editorial fashion photography", label: "Lujo Editorial", emoji: "💎" },
  { value: "watercolor painting, artistic", label: "Acuarela", emoji: "🎨" },
  { value: "comic book style, bold lines", label: "Comic", emoji: "💥" },
];

const GENDERS = [
  { value: "female", label: "Femenino", emoji: "👩" },
  { value: "male", label: "Masculino", emoji: "👨" },
  { value: "neutral", label: "Neutro", emoji: "🧑" },
];

const AGES = [
  { value: "child", label: "Niño", emoji: "🧒" },
  { value: "young adult", label: "Joven", emoji: "🧑" },
  { value: "adult", label: "Adulto", emoji: "👨" },
  { value: "elderly", label: "Anciano", emoji: "👴" },
];

const EXPRESSIONS = [
  { value: "happy smiling", label: "Feliz", emoji: "😊" },
  { value: "angry furious", label: "Enojado", emoji: "😠" },
  { value: "sad melancholic", label: "Triste", emoji: "😢" },
  { value: "surprised shocked", label: "Sorprendido", emoji: "😲" },
  { value: "romantic loving", label: "Romántico", emoji: "😍" },
  { value: "confident powerful", label: "Poderoso", emoji: "💪" },
  { value: "mysterious", label: "Misterioso", emoji: "🕵️" },
  { value: "playful funny", label: "Gracioso", emoji: "😂" },
];

const OUTFITS = [
  { value: "casual everyday clothes", label: "Casual", emoji: "👕" },
  { value: "elegant formal suit", label: "Formal", emoji: "👔" },
  { value: "luxury designer outfit", label: "Lujo", emoji: "👗" },
  { value: "medieval fantasy armor", label: "Medieval", emoji: "⚔️" },
  { value: "futuristic sci-fi outfit", label: "Futurista", emoji: "🚀" },
  { value: "sports athletic wear", label: "Deportivo", emoji: "⚽" },
];

const BACKGROUNDS = [
  { value: "grand luxury palace with marble floors, golden chandeliers, grand staircase", label: "Palacio de Lujo", emoji: "🏰" },
  { value: "modern city skyline at night with neon lights", label: "Ciudad Moderna", emoji: "🌆" },
  { value: "enchanted forest with magical lighting", label: "Bosque Mágico", emoji: "🌿" },
  { value: "phone store interior with display cases", label: "Tienda/Local", emoji: "🏪" },
  { value: "outer space with stars and nebulas", label: "Espacio", emoji: "🌌" },
  { value: "tropical beach paradise at sunset", label: "Playa", emoji: "🏖️" },
  { value: "cozy home interior warm lighting", label: "Hogar", emoji: "🏠" },
  { value: "dramatic cliff edge overlooking stormy sea", label: "Acantilado", emoji: "⛰️" },
];

const LIGHTINGS = [
  { value: "golden hour sunlight, warm tones, volumetric light rays", label: "Luz Dorada", emoji: "☀️" },
  { value: "professional studio lighting, clean and bright", label: "Estudio", emoji: "💡" },
  { value: "dramatic night lighting, moonlight, shadows", label: "Noche Dramática", emoji: "🌙" },
  { value: "romantic candlelight, warm glow", label: "Velas Románticas", emoji: "🕯️" },
  { value: "stormy dramatic lightning, epic atmosphere", label: "Tormenta Épica", emoji: "⚡" },
  { value: "neon lights colorful glow, cyberpunk", label: "Neon Cyberpunk", emoji: "🌈" },
];

const ASPECT_OPTIONS = [
  { value: "PORTRAIT" as AspectRatio, label: "9:16", desc: "TikTok, Reels" },
  { value: "LANDSCAPE" as AspectRatio, label: "16:9", desc: "YouTube" },
  { value: "SQUARE" as AspectRatio, label: "1:1", desc: "Instagram" },
];

const QUANTITIES = [1, 2, 4, 6];

interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
}

export default function QuickImagePage() {
  const [step, setStep] = useState<Step>("type");
  const [creationType, setCreationType] = useState("");
  const [description, setDescription] = useState("");
  const [visualStyle, setVisualStyle] = useState(VISUAL_STYLES[0]?.value ?? "");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [expression, setExpression] = useState("");
  const [outfit, setOutfit] = useState("");
  const [background, setBackground] = useState(BACKGROUNDS[0]?.value ?? "");
  const [lighting, setLighting] = useState(LIGHTINGS[0]?.value ?? "");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("PORTRAIT");
  const [quantity, setQuantity] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState("");
  const [currentGen, setCurrentGen] = useState(0);

  function buildPromptContext(): string {
    const style = VISUAL_STYLES.find(s => s.value === visualStyle)?.label ?? "";
    const bg = BACKGROUNDS.find(b => b.value === background)?.label ?? "";
    const light = LIGHTINGS.find(l => l.value === lighting)?.label ?? "";

    let context = `Type: ${creationType}. Description: ${description}. Style: ${style}. Background: ${bg}. Lighting: ${light}.`;

    if (creationType === "character") {
      if (gender) context += ` Gender: ${gender}.`;
      if (age) context += ` Age: ${age}.`;
      if (expression) context += ` Expression: ${expression}.`;
      if (outfit) context += ` Outfit: ${outfit}.`;
    }

    return context;
  }

  async function handleGenerate() {
    if (!description.trim()) { setError("Describe tu idea primero"); return; }
    setIsGenerating(true);
    setError("");
    setGeneratedImages([]);
    setCurrentGen(0);

    const promptContext = buildPromptContext();

    for (let i = 0; i < quantity; i++) {
      setCurrentGen(i + 1);
      try {
        // Optimize with Claude
        const promptRes = await fetch("/api/generate/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: promptContext,
            style: visualStyle,
            aspectRatio,
          }),
        });
        const promptData = await promptRes.json() as { success: boolean; data?: { optimized: string } };
        const optimized = promptData.data?.optimized ?? promptContext;

        // Generate image
        const imgRes = await fetch("/api/generate/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: optimized, aspectRatio }),
        });
        const imgData = await imgRes.json() as { success: boolean; data?: { imageUrl: string }; error?: { message: string } };
        if (!imgData.success) throw new Error(imgData.error?.message ?? "Error");

        setGeneratedImages(prev => [...prev, {
          id: Date.now().toString() + i,
          prompt: optimized,
          imageUrl: imgData.data?.imageUrl ?? "",
        }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error generando imagen");
      }
    }
    setIsGenerating(false);
  }

  function handleReset() {
    setStep("type");
    setCreationType("");
    setDescription("");
    setGender("");
    setAge("");
    setExpression("");
    setOutfit("");
    setGeneratedImages([]);
    setError("");
  }

  const isCharacter = creationType === "character";
  const creditCost = quantity * 3;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title="Generar Imágenes"
        description="Responde las preguntas y Claude + FLUX crean la imagen perfecta"
      />
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="mx-auto max-w-2xl">
          {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

          <div className="flex flex-col gap-5">

        {/* STEP 1: Type */}
        <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
          <h2 className="font-semibold text-text-primary">¿Qué quieres crear?</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CREATION_TYPES.map((t) => (
              <button key={t.value} type="button" onClick={() => setCreationType(t.value)}
                className={cn("flex flex-col items-center rounded-xl border p-3 text-xs font-medium transition-all",
                  creationType === t.value ? "border-primary/40 bg-primary/10 text-primary-light" : "border-border text-text-muted hover:border-border-strong")}>
                <span className="text-2xl mb-1">{t.emoji}</span>
                <span className="font-semibold">{t.label}</span>
                <span className="opacity-60 text-center">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* STEP 2: Description */}
        {creationType && (
          <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
            <h2 className="font-semibold text-text-primary">Describe tu idea en español</h2>
            <Textarea
              placeholder={
                creationType === "character" ? "Ej: una fresa con cara de princesa elegante, cabello largo rosa..." :
                creationType === "scene" ? "Ej: un atardecer sobre el mar con colores dorados y palmeras..." :
                creationType === "story" ? "Ej: un hombre enojado en una tienda de celulares reclamando garantía..." :
                "Describe lo que quieres ver..."
              }
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        )}

        {/* STEP 3: Style */}
        {description.trim().length > 3 && (
          <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
            <h2 className="font-semibold text-text-primary">Estilo visual</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {VISUAL_STYLES.map((s) => (
                <button key={s.value} type="button" onClick={() => setVisualStyle(s.value)}
                  className={cn("flex flex-col items-center rounded-xl border p-3 text-xs font-medium transition-all",
                    visualStyle === s.value ? "border-primary/40 bg-primary/10 text-primary-light" : "border-border text-text-muted hover:border-border-strong")}>
                  <span className="text-xl mb-1">{s.emoji}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Character details */}
        {description.trim().length > 3 && isCharacter && (
          <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
            <h2 className="font-semibold text-text-primary">Detalles del personaje</h2>

            <FormField label="Género">
              <div className="flex gap-2">
                {GENDERS.map((g) => (
                  <button key={g.value} type="button" onClick={() => setGender(gender === g.value ? "" : g.value)}
                    className={cn("flex-1 flex flex-col items-center rounded-xl border p-3 text-xs font-medium transition-all",
                      gender === g.value ? "border-primary/40 bg-primary/10 text-primary-light" : "border-border text-text-muted hover:border-border-strong")}>
                    <span className="text-xl mb-1">{g.emoji}</span>{g.label}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Edad">
              <div className="flex gap-2">
                {AGES.map((a) => (
                  <button key={a.value} type="button" onClick={() => setAge(age === a.value ? "" : a.value)}
                    className={cn("flex-1 flex flex-col items-center rounded-xl border p-2 text-xs font-medium transition-all",
                      age === a.value ? "border-primary/40 bg-primary/10 text-primary-light" : "border-border text-text-muted hover:border-border-strong")}>
                    <span className="text-lg mb-0.5">{a.emoji}</span>{a.label}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Expresión">
              <div className="grid grid-cols-4 gap-2">
                {EXPRESSIONS.map((e) => (
                  <button key={e.value} type="button" onClick={() => setExpression(expression === e.value ? "" : e.value)}
                    className={cn("flex flex-col items-center rounded-xl border p-2 text-xs font-medium transition-all",
                      expression === e.value ? "border-primary/40 bg-primary/10 text-primary-light" : "border-border text-text-muted hover:border-border-strong")}>
                    <span className="text-lg mb-0.5">{e.emoji}</span>{e.label}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Ropa">
              <div className="grid grid-cols-3 gap-2">
                {OUTFITS.map((o) => (
                  <button key={o.value} type="button" onClick={() => setOutfit(outfit === o.value ? "" : o.value)}
                    className={cn("flex flex-col items-center rounded-xl border p-2 text-xs font-medium transition-all",
                      outfit === o.value ? "border-primary/40 bg-primary/10 text-primary-light" : "border-border text-text-muted hover:border-border-strong")}>
                    <span className="text-lg mb-0.5">{o.emoji}</span>{o.label}
                  </button>
                ))}
              </div>
            </FormField>
          </div>
        )}

        {/* STEP 5: Background */}
        {description.trim().length > 3 && (
          <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
            <h2 className="font-semibold text-text-primary">Fondo / Escenario</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BACKGROUNDS.map((b) => (
                <button key={b.value} type="button" onClick={() => setBackground(b.value)}
                  className={cn("flex flex-col items-center rounded-xl border p-3 text-xs font-medium transition-all",
                    background === b.value ? "border-primary/40 bg-primary/10 text-primary-light" : "border-border text-text-muted hover:border-border-strong")}>
                  <span className="text-xl mb-1">{b.emoji}</span>{b.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 6: Lighting */}
        {description.trim().length > 3 && (
          <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
            <h2 className="font-semibold text-text-primary">Iluminación</h2>
            <div className="grid grid-cols-3 gap-2">
              {LIGHTINGS.map((l) => (
                <button key={l.value} type="button" onClick={() => setLighting(l.value)}
                  className={cn("flex flex-col items-center rounded-xl border p-3 text-xs font-medium transition-all",
                    lighting === l.value ? "border-primary/40 bg-primary/10 text-primary-light" : "border-border text-text-muted hover:border-border-strong")}>
                  <span className="text-xl mb-1">{l.emoji}</span>{l.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 7: Format & Quantity */}
        {description.trim().length > 3 && (
          <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
            <FormField label="Formato">
              <div className="flex gap-3">
                {ASPECT_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setAspectRatio(opt.value)}
                    className={cn("flex flex-col items-center rounded-xl border px-4 py-3 text-xs font-medium transition-all flex-1",
                      aspectRatio === opt.value ? "border-primary/40 bg-primary/10 text-primary-light" : "border-border text-text-muted hover:border-border-strong")}>
                    <span className="text-sm font-bold">{opt.label}</span>
                    <span className="opacity-70">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="¿Cuántas imágenes?">
              <div className="flex gap-3">
                {QUANTITIES.map((q) => (
                  <button key={q} type="button" onClick={() => setQuantity(q)}
                    className={cn("flex-1 rounded-xl border py-3 text-sm font-bold transition-all",
                      quantity === q ? "border-primary/40 bg-primary/10 text-primary-light" : "border-border text-text-muted hover:border-border-strong")}>
                    {q}
                  </button>
                ))}
              </div>
            </FormField>

            <div className="flex items-center justify-between pt-1 border-t border-border">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-warning" />
                <span className="text-xs text-text-muted">
                  <span className="text-warning font-medium">{creditCost} créditos</span> — {quantity} img x 3 cr
                </span>
              </div>
              <Button onClick={handleGenerate} disabled={!description.trim() || isGenerating} isLoading={isGenerating}>
                <Sparkles className="h-4 w-4" />
                {isGenerating ? "Generando " + currentGen + " de " + quantity + "..." : "Generar"}
              </Button>
            </div>
          </div>
        )}

        {/* Results */}
        {generatedImages.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-success">✓ {generatedImages.length} imágenes generadas</p>
              <Button variant="secondary" size="sm" onClick={handleReset}>
                <RefreshCw className="h-3.5 w-3.5" />Nuevo
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {generatedImages.map((img, index) => (
                <div key={img.id} className="relative rounded-xl overflow-hidden border border-border group">
                  <img src={img.imageUrl} alt={"Generated " + (index + 1)} className="w-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
                    <p className="text-white text-xs text-center line-clamp-3">{img.prompt}</p>
                    <div className="flex gap-2">
                      <a href={"/api/download?url=" + encodeURIComponent(img.imageUrl)} download
                        className="flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-xs text-white hover:bg-white/30 transition-colors">
                        <Download className="h-3 w-3" />Descargar
                      </a>
                      <a href={"/create/video?imageUrl=" + encodeURIComponent(img.imageUrl)}
                        className="flex items-center gap-1 rounded-lg bg-primary/80 px-3 py-1.5 text-xs text-white hover:bg-primary transition-colors">
                        <Zap className="h-3 w-3" />Video
                      </a>
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">{index + 1}</div>
                </div>
              ))}
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}