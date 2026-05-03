"use client";

import { useState, useRef } from "react";
import { Download, Zap, Sparkles, RefreshCw, Image as ImageIcon, Wand2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { TopBar } from "@/components/layout/TopBar";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

type AspectRatio = "LANDSCAPE" | "PORTRAIT" | "SQUARE";

const SUGGESTIONS = [
  { 
    id: "anime", 
    label: "Anime", 
    prompt: "A beautiful anime-style girl standing in a neon-lit Tokyo street at night, purple hair, detailed eyes, cinematic lighting.",
    image: "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?q=80&w=500&auto=format&fit=crop"
  },
  { 
    id: "photorealistic", 
    label: "Hiperrealista", 
    prompt: "Close-up portrait of a majestic lion with golden mane, photorealistic, 8k, detailed fur, bokeh background.",
    image: "https://images.unsplash.com/photo-1614027164847-1b28006879b2?q=80&w=500&auto=format&fit=crop"
  },
  { 
    id: "3d", 
    label: "Pixar 3D", 
    prompt: "A cute little robot exploring a futuristic garden, Pixar 3D style, vibrant colors, soft lighting, detailed textures.",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=500&auto=format&fit=crop"
  },
  { 
    id: "fantasy", 
    label: "Fantasía", 
    prompt: "A massive castle floating in the clouds, ethereal lighting, waterfalls falling into the abyss, fantasy art style.",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=500&auto=format&fit=crop"
  },
  { 
    id: "cyberpunk", 
    label: "Cyberpunk", 
    prompt: "Cyberpunk city alleyway, neon signs in Japanese, flying cars above, rainy street with reflections, cinematic atmosphere.",
    image: "https://images.unsplash.com/photo-1605142859862-978be7eba909?q=80&w=500&auto=format&fit=crop"
  }
];

const ASPECT_OPTIONS = [
  { value: "PORTRAIT" as AspectRatio, label: "9:16", desc: "TikTok/Reels" },
  { value: "LANDSCAPE" as AspectRatio, label: "16:9", desc: "YouTube" },
  { value: "SQUARE" as AspectRatio, label: "1:1", desc: "Post" },
];

interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
}

// ─── Components ───────────────────────────────────────────────────────────────

function SuggestionCard({ label, image, onClick }: { label: string; image: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative h-48 w-36 flex-shrink-0 overflow-hidden rounded-2xl border border-border transition-all hover:border-primary/50"
    >
      <img src={image} alt={label} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <span className="absolute bottom-3 left-3 text-xs font-medium text-white">{label}</span>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuickImagePage() {
  const [description, setDescription] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("PORTRAIT");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState("");
  const [currentGen, setCurrentGen] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  async function handleGenerate(promptToUse?: string) {
    const finalPrompt = promptToUse || description;
    if (!finalPrompt.trim()) { setError("Describe tu idea primero"); return; }
    
    setIsGenerating(true);
    setError("");
    setGeneratedImages([]);
    setCurrentGen(1);

    try {
      // Step 1: Optimize prompt with AI
      const promptRes = await fetch("/api/generate/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt, aspectRatio }),
      });
      const promptData = await promptRes.json() as { success: boolean; data?: { optimized: string } };
      const optimized = promptData.data?.optimized || finalPrompt;

      // Step 2: Generate image
      const imgRes = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: optimized, aspectRatio }),
      });
      const imgData = await imgRes.json() as { success: boolean; data?: { imageUrl: string }; error?: { message: string } };
      
      if (!imgData.success) throw new Error(imgData.error?.message || "Error al generar");

      setGeneratedImages([{
        id: Date.now().toString(),
        prompt: optimized,
        imageUrl: imgData.data?.imageUrl || "",
      }]);
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

  return (
    <div className="flex flex-col h-full bg-[#070709] overflow-hidden">
      <TopBar title="Generador de Imágenes" description="IA de alta fidelidad" />
      
      <div className="flex-1 overflow-y-auto px-4 py-12 md:py-20">
        <div className="mx-auto max-w-3xl flex flex-col gap-12">
          
          {/* ── Header ── */}
          <div className="text-center flex flex-col gap-3">
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
              ¿En qué <span className="text-gradient">piensas</span> hoy?
            </h1>
            <p className="text-text-muted text-sm md:text-base">
              Describe tu imagen y deja que Fixora la haga realidad en segundos.
            </p>
          </div>

          {/* ── Input Area ── */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-[2.5rem] blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
            <div className="relative flex flex-col gap-3 rounded-[2rem] border border-white/10 bg-surface/50 p-4 backdrop-blur-xl transition-all focus-within:border-primary/30">
              <Textarea
                placeholder="Describe o edita una imagen..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px] w-full resize-none border-none bg-transparent text-lg text-white placeholder:text-white/20 focus-visible:ring-0"
              />
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Subir imagen</span>
                  </button>
                  <div className="h-4 w-px bg-white/10 mx-1" />
                  <div className="flex items-center gap-3">
                    {ASPECT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setAspectRatio(opt.value)}
                        className={cn(
                          "text-[10px] font-bold transition-all px-2 py-1 rounded-md",
                          aspectRatio === opt.value ? "bg-primary text-white" : "text-white/40 hover:text-white/60"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <Button 
                  onClick={() => handleGenerate()} 
                  disabled={!description.trim() || isGenerating}
                  className="rounded-full h-10 w-10 p-0 bg-white text-black hover:bg-white/90 disabled:bg-white/20"
                >
                  {isGenerating ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>

          {/* ── Explorar Ideas ── */}
          {!generatedImages.length && !isGenerating && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Explorar ideas</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => scroll("left")} className="p-2 rounded-full bg-white/5 text-white/60 hover:bg-white/10 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => scroll("right")} className="p-2 rounded-full bg-white/5 text-white/60 hover:bg-white/10 transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div 
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide no-scrollbar"
              >
                {SUGGESTIONS.map((s) => (
                  <SuggestionCard
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

          {/* ── Results ── */}
          {(generatedImages.length > 0 || isGenerating) && (
            <div className="flex flex-col gap-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white/60">
                  {isGenerating ? "Generando tu visión..." : "Resultado"}
                </p>
                {!isGenerating && (
                  <Button variant="ghost" size="sm" onClick={handleReset} className="text-white/40 hover:text-white">
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                    Nueva imagen
                  </Button>
                )}
              </div>

              <div className="relative aspect-[9/16] md:aspect-square w-full max-w-[500px] mx-auto rounded-3xl overflow-hidden border border-white/10 bg-white/5 shimmer-container">
                {isGenerating ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/40">
                    <Wand2 className="h-12 w-12 animate-pulse" />
                    <p className="text-sm font-medium animate-pulse">Flux AI está creando...</p>
                  </div>
                ) : generatedImages.length > 0 ? (
                  <>
                    <img 
                      src={generatedImages[0].imageUrl} 
                      alt="Generated" 
                      className="h-full w-full object-cover" 
                    />
                    <div className="absolute bottom-6 right-6 flex gap-3">
                      <a 
                        href={`/api/download?url=${encodeURIComponent(generatedImages[0].imageUrl)}`} 
                        download
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors"
                      >
                        <Download className="h-5 w-5" />
                      </a>
                      <a 
                        href={`/create/video?imageUrl=${encodeURIComponent(generatedImages[0].imageUrl)}`}
                        className="flex h-12 px-6 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-hover shadow-xl shadow-primary/20 transition-all font-semibold gap-2"
                      >
                        <Zap className="h-4 w-4" />
                        Animar
                      </a>
                    </div>
                  </>
                ) : null}
              </div>
              
              {error && (
                <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger text-center">
                  {error}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}