"use client";

import { useState, useRef } from "react";
import { Download, Zap, Sparkles, RefreshCw, Wand2, ChevronRight, Plus } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type AspectRatio = "LANDSCAPE" | "PORTRAIT" | "SQUARE";

// ─── Suggestions ──────────────────────────────────────────────────────────────

const ALL_SUGGESTIONS = [
  { id: "anime",            label: "Anime",                  prompt: "A beautiful anime-style girl standing in a neon-lit Tokyo street at night, purple hair, detailed eyes, cinematic lighting.", image: "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?q=80&w=500&auto=format&fit=crop" },
  { id: "hiperrealista",    label: "Hiperrealista",          prompt: "Close-up portrait of a majestic lion with golden mane, photorealistic, 8k, detailed fur, dramatic bokeh background.", image: "https://images.unsplash.com/photo-1614027164847-1b28006879b2?q=80&w=500&auto=format&fit=crop" },
  { id: "3d-pixar",         label: "Pixar 3D",               prompt: "A cute little robot exploring a futuristic garden, Pixar 3D style, vibrant colors, soft cinematic lighting, ultra-detailed.", image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=500&auto=format&fit=crop" },
  { id: "fantasia",         label: "Fantasía",               prompt: "A massive castle floating in the clouds, ethereal lighting, waterfalls falling into the abyss, epic fantasy art style.", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=500&auto=format&fit=crop" },
  { id: "cyberpunk",        label: "Cyberpunk",              prompt: "Cyberpunk city alleyway, neon signs in Japanese, flying cars above, rainy street with reflections, cinematic atmosphere.", image: "https://images.unsplash.com/photo-1605142859862-978be7eba909?q=80&w=500&auto=format&fit=crop" },
  { id: "estatua",          label: "Estatua",                prompt: "A hyper-realistic marble statue of a Greek goddess in a grand museum hall, dramatic chiaroscuro lighting, photorealistic.", image: "https://images.unsplash.com/photo-1564399580075-5dfe19c205f3?q=80&w=500&auto=format&fit=crop" },
  { id: "surrealista",      label: "Surrealista",            prompt: "A giant broccoli tree floating above a desert landscape, melting clocks draping from its branches, surrealist painting style.", image: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=500&auto=format&fit=crop" },
  { id: "comic",            label: "Cómic",                  prompt: "A superhero in a comic book splash page, bold ink outlines, halftone dots, dynamic pose, vibrant flat colors, retro style.", image: "https://images.unsplash.com/photo-1559535332-db9971090158?q=80&w=500&auto=format&fit=crop" },
  { id: "avatar-3d",        label: "Avatar 3D",              prompt: "A stylized 3D avatar of a young woman with blue hair and futuristic sunglasses, Blender render, clean background.", image: "https://images.unsplash.com/photo-1568572933382-74d440642117?q=80&w=500&auto=format&fit=crop" },
  { id: "interiores",       label: "Diseño de interiores",   prompt: "A minimalist Scandinavian living room with warm natural light, wooden floors, linen sofa, architectural photography, 8k.", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=500&auto=format&fit=crop" },
  { id: "tarot",            label: "Carta de tarot",         prompt: "A mystical tarot card illustration of The Moon, Art Nouveau style, intricate borders, rich jewel tones, vintage print.", image: "https://images.unsplash.com/photo-1600429867610-4c5de9b97f70?q=80&w=500&auto=format&fit=crop" },
  { id: "paisaje",          label: "Paisaje",                prompt: "A breathtaking aerial view of a dramatic Norwegian fjord at golden hour, misty mountains, crystal clear water, 8K photography.", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=500&auto=format&fit=crop" },
  { id: "chibi",            label: "Stickers chibi",         prompt: "A set of cute chibi-style character stickers with a golden retriever puppy, expressive big eyes, white background, flat design.", image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=500&auto=format&fit=crop" },
  { id: "infografia",       label: "Infografía animal",      prompt: "A detailed scientific infographic poster of a blue whale anatomy, dark teal background, clean label lines, educational illustration.", image: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?q=80&w=500&auto=format&fit=crop" },
  { id: "vintage",          label: "Póster vintage",         prompt: "A vintage travel poster of Paris in the 1950s, retro illustration style, muted color palette, art deco typography.", image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=500&auto=format&fit=crop" },
  { id: "mini-yo",          label: "Mini yo",                prompt: "A stylized 3D miniature figurine version of a young man holding a coffee cup, Funko Pop art style, clean studio background.", image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=500&auto=format&fit=crop" },
  { id: "dark-fantasy",     label: "Dark Fantasy",           prompt: "A powerful dark wizard casting a lightning spell in a gothic cathedral, dramatic rim lighting, concept art, epic fantasy painting.", image: "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?q=80&w=500&auto=format&fit=crop" },
  { id: "acuarela",         label: "Acuarela",               prompt: "A delicate watercolor painting of a hummingbird feeding from a tropical flower, soft washes of color, white paper texture.", image: "https://images.unsplash.com/photo-1490394802706-ba96b0e60b80?q=80&w=500&auto=format&fit=crop" },
  { id: "producto",         label: "Foto de producto",       prompt: "A luxury perfume bottle on a black marble surface, dramatic studio lighting, caustic light reflections, commercial photography.", image: "https://images.unsplash.com/photo-1541643600914-78b084683702?q=80&w=500&auto=format&fit=crop" },
  { id: "espacio",          label: "Espacio",                prompt: "An astronaut floating in deep space above a vibrant nebula, cinematic wide shot, photorealistic, epic cosmic atmosphere.", image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=500&auto=format&fit=crop" },
] as const;

const SUGGESTIONS_PAGE_SIZE = 5;

const ASPECT_OPTIONS: { value: AspectRatio; label: string; desc: string }[] = [
  { value: "PORTRAIT",  label: "9:16", desc: "TikTok" },
  { value: "SQUARE",    label: "1:1",  desc: "Post"   },
  { value: "LANDSCAPE", label: "16:9", desc: "YouTube" },
];

interface GeneratedImage { id: string; prompt: string; imageUrl: string }

// ─── Canvas class by ratio ─────────────────────────────────────────────────────

function canvasAspectClass(ratio: AspectRatio): string {
  if (ratio === "PORTRAIT")  return "max-w-[280px] aspect-[9/16]";
  if (ratio === "LANDSCAPE") return "w-full aspect-[16/9]";
  return "max-w-[420px] aspect-square";
}

// ─── Small suggestion card ────────────────────────────────────────────────────

function SmallCard({ label, image, onClick }: { label: string; image: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative h-24 w-[4.5rem] flex-shrink-0 overflow-hidden rounded-xl border border-white/10 transition-all hover:border-primary/50"
    >
      <img src={image} alt={label} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      <span className="absolute bottom-1.5 left-0 right-0 px-1 text-center text-[9px] font-medium text-white leading-tight">{label}</span>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QuickImagePage() {
  const [description, setDescription]       = useState("");
  const [aspectRatio, setAspectRatio]       = useState<AspectRatio>("PORTRAIT");
  const [isGenerating, setIsGenerating]     = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError]                   = useState("");
  const [suggestionPage, setSuggestionPage] = useState(0);

  const scrollRef   = useRef<HTMLDivElement>(null);
  const totalPages  = Math.ceil(ALL_SUGGESTIONS.length / SUGGESTIONS_PAGE_SIZE);
  const visibleSuggestions = ALL_SUGGESTIONS.slice(
    suggestionPage * SUGGESTIONS_PAGE_SIZE,
    suggestionPage * SUGGESTIONS_PAGE_SIZE + SUGGESTIONS_PAGE_SIZE,
  );

  function advanceSuggestions() {
    setSuggestionPage((p) => (p + 1) % totalPages);
  }

  async function handleGenerate(promptToUse?: string) {
    const finalPrompt = promptToUse ?? description;
    if (!finalPrompt.trim()) { setError("Describe tu idea primero"); return; }

    setIsGenerating(true);
    setError("");
    setGeneratedImages([]);

    try {
      const promptRes  = await fetch("/api/generate/prompt", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt, aspectRatio }),
      });
      const promptData = await promptRes.json() as { success: boolean; data?: { optimized: string } };
      const optimized  = promptData.data?.optimized ?? finalPrompt;

      const imgRes  = await fetch("/api/generate/image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: optimized, aspectRatio }),
      });
      const imgData = await imgRes.json() as { success: boolean; data?: { imageUrl: string }; error?: { message: string } };

      if (!imgData.success) throw new Error(imgData.error?.message ?? "Error al generar");
      setGeneratedImages([{ id: Date.now().toString(), prompt: optimized, imageUrl: imgData.data?.imageUrl ?? "" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleReset() {
    setDescription("");
    setGeneratedImages([]);
    setError("");
  }

  const firstImage  = generatedImages[0];
  const showExplore = !isGenerating && !firstImage;

  return (
    <div className="flex flex-col h-full bg-[#070709] overflow-hidden">
      {/* TopBar — no tocar */}
      <TopBar title="Generador de Imágenes" description="IA de alta fidelidad" />

      {/* ── Scrollable area ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 pt-8 pb-4 flex flex-col gap-6">

          {/* ── Ratio tabs ── */}
          <div className="flex items-center justify-center gap-2">
            {ASPECT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAspectRatio(opt.value)}
                className={cn(
                  "flex flex-col items-center rounded-xl px-6 py-2.5 text-sm font-semibold transition-all border",
                  aspectRatio === opt.value
                    ? "bg-primary/20 border-primary/40 text-white"
                    : "bg-[#1c1c1e] border-white/10 text-white/40 hover:text-white/60 hover:border-white/20"
                )}
              >
                {opt.label}
                <span className="text-[10px] font-normal opacity-50">{opt.desc}</span>
              </button>
            ))}
          </div>

          {/* ── Canvas — Style 2: image center stage ── */}
          <div className={cn(
            "relative mx-auto w-full overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1e]",
            canvasAspectClass(aspectRatio)
          )}>
            {/* Loading */}
            {isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Wand2 className="h-10 w-10 text-white/20 animate-pulse" />
                <p className="text-sm text-white/30 animate-pulse">Fixora está creando...</p>
              </div>
            )}

            {/* Empty placeholder */}
            {!isGenerating && !firstImage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Sparkles className="h-10 w-10 text-white/10" />
                <p className="text-sm text-white/20">Tu creación aparecerá aquí</p>
              </div>
            )}

            {/* Generated image */}
            {!isGenerating && firstImage && (
              <>
                <img src={firstImage.imageUrl} alt="Generated" className="h-full w-full object-cover" />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <a
                    href={`/api/download?url=${encodeURIComponent(firstImage.imageUrl)}`}
                    download
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <a
                    href={`/create/video?imageUrl=${encodeURIComponent(firstImage.imageUrl)}`}
                    className="flex h-10 px-5 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all font-semibold gap-2 text-sm"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Animar
                  </a>
                </div>
              </>
            )}
          </div>

          {/* ── Reset bar (after generation) ── */}
          {firstImage && !isGenerating && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/30">Resultado generado</p>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Nueva imagen
              </button>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          {/* ── Explorar ideas — smaller cards with Novedades ── */}
          {showExplore && (
            <div className="flex flex-col gap-3 pb-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Explorar ideas</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/20">{suggestionPage + 1}/{totalPages}</span>
                  <button
                    onClick={advanceSuggestions}
                    className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors px-2 py-1 rounded-full hover:bg-white/5"
                  >
                    Novedades
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {visibleSuggestions.map((s) => (
                  <SmallCard
                    key={s.id}
                    label={s.label}
                    image={s.image}
                    onClick={() => {
                      setDescription(s.prompt);
                      handleGenerate(s.prompt);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Sticky bottom input bar ── */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-white/5 bg-[#070709]">
        <div className="mx-auto max-w-2xl flex items-end gap-3 rounded-2xl bg-[#1c1c1e] border border-white/10 px-4 pt-3 pb-3">
          <button
            type="button"
            className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-[#2c2c2e] border border-white/10 text-white/40 hover:text-white/70 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
          <textarea
            placeholder="Describe tu imagen..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={1}
            className="flex-1 resize-none bg-transparent text-white/90 placeholder:text-white/20 text-sm leading-relaxed outline-none py-1"
          />
          <button
            type="button"
            onClick={() => handleGenerate()}
            disabled={!description.trim() || isGenerating}
            className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-primary text-white disabled:opacity-30 hover:bg-primary-hover transition-colors"
          >
            {isGenerating
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <Sparkles className="h-4 w-4" />
            }
          </button>
        </div>
      </div>
    </div>
  );
}