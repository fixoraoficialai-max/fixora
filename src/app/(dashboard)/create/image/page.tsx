"use client";

import { useState } from "react";

import { Download, Zap, Sparkles, RefreshCw, Wand2, Plus } from "lucide-react";

import { TopBar } from "@/components/layout/TopBar";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type AspectRatio = "LANDSCAPE" | "PORTRAIT" | "SQUARE";

// ─── Suggestions ──────────────────────────────────────────────────────────────

const ALL_SUGGESTIONS = [
  { id: "maquillaje",       label: "Guía de Maquillaje", displayEs: "Crea una infografía de guía de análisis de maquillaje basada en un retrato, estilo revista de belleza moderna, profesional y limpia, 9:16",                                                                                      prompt: "Create a high-quality Makeup Analysis Guide infographic based on a portrait photo. Professional and clean, like a modern beauty magazine feature. Preserve real facial features while highlighting key makeup points with minimal text and no long paragraphs. 9:16 aspect ratio.",                                                image: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?q=80&w=500&auto=format&fit=crop" },
  { id: "hiperrealista", label: "Realista",         displayEs: "Retrato hiperrealista de un león majestuoso con melena dorada, detalle de pelaje extremo, fondo bokeh dramático",         prompt: "Close-up portrait of a majestic lion with golden mane, photorealistic, 8k, detailed fur, dramatic bokeh background.",                                                             image: "https://images.unsplash.com/photo-1552058544-f2b08422138a?q=80&w=500&auto=format&fit=crop" },
  { id: "3d-pixar",      label: "Pixar 3D",            displayEs: "Pequeño robot adorable explorando un jardín futurista, estilo Pixar 3D, colores vibrantes, iluminación suave",            prompt: "A cute little robot exploring a futuristic garden, Pixar 3D style, vibrant colors, soft cinematic lighting, ultra-detailed.",                                                      image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=500&auto=format&fit=crop" },
  { id: "fantasia",      label: "Fantasía",            displayEs: "Castillo gigante flotando entre nubes, iluminación etérea, cascadas que caen al vacío, arte épico de fantasía",           prompt: "A massive castle floating in the clouds, ethereal lighting, waterfalls falling into the abyss, epic fantasy art style.",                                                            image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=500&auto=format&fit=crop" },
  { id: "corte-transversal", label: "Corte Transversal",  displayEs: "Transforma el motivo principal de la imagen en un diagrama educativo de corte transversal limpio sobre fondo blanco, con etiquetas claras, estilo gráfico científico de libro de texto",                                              prompt: "Transform the main subject of the uploaded image into a clean educational cross-sectional diagram on a white background. Preserve distinctive features, show a believable layered interior, add clear label callouts. Make it look like a scientific textbook or museum graphic, prioritizing clarity and precision over dramatic or artistic style.", image: "https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=500&auto=format&fit=crop" },
  { id: "estatua",       label: "Estatua",             displayEs: "Estatua de mármol hiperrealista de una diosa griega en un museo imponente, iluminación dramática de claroscuro",          prompt: "A hyper-realistic marble statue of a Greek goddess in a grand museum hall, dramatic chiaroscuro lighting, photorealistic.",                                                          image: "https://images.unsplash.com/photo-1564399580075-5dfe19c205f3?q=80&w=500&auto=format&fit=crop" },
  { id: "surrealista",   label: "Surrealista",         displayEs: "Árbol de brócoli gigante flotando sobre el desierto, relojes derritiéndose colgando de sus ramas, estilo surrealista",   prompt: "A giant broccoli tree floating above a desert landscape, melting clocks draping from its branches, surrealist painting style.",                                                    image: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=500&auto=format&fit=crop" },
  { id: "comic",         label: "Cómic",               displayEs: "Superhéroe en portada de cómic, trazos de tinta gruesa, puntos halftone, pose dinámica, colores planos retro",             prompt: "A superhero in a comic book splash page, bold ink outlines, halftone dots, dynamic pose, vibrant flat colors, retro style.",                                                       image: "https://images.unsplash.com/photo-1559535332-db9971090158?q=80&w=500&auto=format&fit=crop" },
  { id: "avatar-3d",     label: "Avatar 3D",           displayEs: "Avatar 3D estilizado de una joven con cabello azul y gafas futuristas, render de Blender, fondo limpio",                 prompt: "A stylized 3D avatar of a young woman with blue hair and futuristic sunglasses, Blender render, clean background.",                                                                image: "https://images.unsplash.com/photo-1568572933382-74d440642117?q=80&w=500&auto=format&fit=crop" },
  { id: "interiores",    label: "Diseño de interiores",displayEs: "Sala de estar escandinava minimalista con luz natural cálida, suelo de madera, sofá de lino, fotografía arquitectónica 8K", prompt: "A minimalist Scandinavian living room with warm natural light, wooden floors, linen sofa, architectural photography, 8k.",                                                          image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=500&auto=format&fit=crop" },
  { id: "mejora-fotos",    label: "Mejora de Fotos",    displayEs: "Mejora la calidad de mi foto: más nítida, mejor iluminación, colores más vivos y naturales, sin ruido",                                                                                                                          prompt: "Enhance the quality of my photo: make it sharper, improve the lighting, boost clarity and vibrancy while keeping it natural and realistic. Remove noise and correct any color issues.",                                                                                                                                            image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=500&auto=format&fit=crop" },
  { id: "paisaje",       label: "Paisaje",             displayEs: "Vista aérea impresionante de un fiordo noruego en hora dorada, montañas con niebla, agua cristalina, 8K",               prompt: "A breathtaking aerial view of a dramatic Norwegian fjord at golden hour, misty mountains, crystal clear water, 8K photography.",                                                   image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=500&auto=format&fit=crop" },
  { id: "chibi",         label: "Stickers chibi",      displayEs: "Set de stickers chibi de un cachorro golden retriever, ojos expresivos grandes, fondo blanco, diseño plano",              prompt: "A set of cute chibi-style character stickers with a golden retriever puppy, expressive big eyes, white background, flat design.",                                                  image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=500&auto=format&fit=crop" },
  { id: "infografia",    label: "Infografía animal",   displayEs: "Infografía científica detallada de la anatomía de una ballena azul, fondo verde azulado, líneas de etiqueta limpias",    prompt: "A detailed scientific infographic poster of a blue whale anatomy, dark teal background, clean label lines, educational illustration.",                                             image: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?q=80&w=500&auto=format&fit=crop" },
  { id: "vintage",       label: "Póster vintage",      displayEs: "Póster de viaje vintage de París en los años 50, estilo retro, paleta de colores suave, tipografía art deco",             prompt: "A vintage travel poster of Paris in the 1950s, retro illustration style, muted color palette, art deco typography.",                                                               image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=500&auto=format&fit=crop" },
  { id: "mini-yo",       label: "Mini yo",             displayEs: "Figura miniatura 3D estilizada de un joven sosteniendo un café, estilo Funko Pop, fondo de estudio limpio",              prompt: "A stylized 3D miniature figurine version of a young man holding a coffee cup, Funko Pop art style, clean studio background.",                                                      image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=500&auto=format&fit=crop" },
  { id: "dark-fantasy",  label: "Dark Fantasy",        displayEs: "Poderoso mago oscuro lanzando un hechizo de rayos en una catedral gótica, iluminación dramática, pintura épica",        prompt: "A powerful dark wizard casting a lightning spell in a gothic cathedral, dramatic rim lighting, concept art, epic fantasy painting.",                                                image: "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?q=80&w=500&auto=format&fit=crop" },
  { id: "acuarela",      label: "Acuarela",            displayEs: "Pintura de acuarela delicada de un colibrí alimentándose de una flor tropical, lavados suaves de color, textura de papel",prompt: "A delicate watercolor painting of a hummingbird feeding from a tropical flower, soft washes of color, white paper texture.",                                                       image: "https://images.unsplash.com/photo-1490394802706-ba96b0e60b80?q=80&w=500&auto=format&fit=crop" },
  { id: "producto",      label: "Foto de producto",    displayEs: "Botella de perfume de lujo sobre mármol negro, iluminación de estudio dramática, reflejos cáusticos, fotografía comercial",prompt: "A luxury perfume bottle on a black marble surface, dramatic studio lighting, caustic light reflections, commercial photography.",                                                   image: "https://images.unsplash.com/photo-1541643600914-78b084683702?q=80&w=500&auto=format&fit=crop" },
  { id: "espacio",       label: "Espacio",             displayEs: "Astronauta flotando en el espacio profundo sobre una nebulosa vibrante, plano abierto cinematográfico, fotorrealista",    prompt: "An astronaut floating in deep space above a vibrant nebula, cinematic wide shot, photorealistic, epic cosmic atmosphere.",                                                         image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=500&auto=format&fit=crop" },
] as const;




const ASPECT_OPTIONS: { value: AspectRatio; label: string; desc: string }[] = [
  { value: "PORTRAIT",  label: "9:16", desc: "TikTok" },
  { value: "SQUARE",    label: "1:1",  desc: "Post"   },
  { value: "LANDSCAPE", label: "16:9", desc: "YouTube" },
];

interface GeneratedImage { id: string; prompt: string; imageUrl: string }

// ─── Canvas class by ratio ─────────────────────────────────────────────────────

function canvasAspectClass(ratio: AspectRatio): string {
  if (ratio === "PORTRAIT")  return "max-w-[200px] aspect-[9/16]";
  if (ratio === "LANDSCAPE") return "w-full max-h-[260px] aspect-[16/9]";
  return "max-w-[260px] aspect-square";
}

// ─── Small suggestion card ────────────────────────────────────────────────────

function SmallCard({ label, image, selected, onClick }: {
  label:    string;
  image:    string;
  selected: boolean;
  onClick:  () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative h-24 w-[4.5rem] flex-shrink-0 overflow-hidden rounded-xl border transition-all",
        selected
          ? "border-primary shadow-[0_0_14px_rgba(124,58,237,0.5)] scale-[1.04]"
          : "border-white/10 hover:border-primary/50"
      )}
    >
      <img src={image} alt={label} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      {selected && <div className="absolute inset-0 bg-primary/10" />}
      <span className="absolute bottom-1.5 left-0 right-0 px-1 text-center text-[9px] font-medium text-white leading-tight">{label}</span>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QuickImagePage() {
  const [description, setDescription]         = useState("");
  const [aspectRatio, setAspectRatio]         = useState<AspectRatio>("PORTRAIT");
  const [isGenerating, setIsGenerating]       = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError]                     = useState("");
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);

  async function handleGenerate(promptToUse?: string) {
    const finalPrompt = promptToUse ?? description;
    if (!finalPrompt.trim()) { setError("Describe tu idea primero"); return; }

    setIsGenerating(true);
    setError("");
    setGeneratedImages([]);

    try {
      const promptRes  = await fetch("/api/generate/prompt", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          aspectRatio,
          ...(selectedStyleId && { styleId: selectedStyleId }),
        }),
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
    setSelectedStyleId(null);
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

          {/* ── Ratio tabs — single pill with dividers ── */}
          <div className="flex items-center justify-center">
            <div className="flex items-center rounded-xl border border-white/10 bg-[#1c1c1e] overflow-hidden">
              {ASPECT_OPTIONS.map((opt, idx) => (
                <div key={opt.value} className="flex items-center">
                  {idx > 0 && <div className="w-px h-5 bg-white/8 flex-shrink-0" />}
                  <button
                    onClick={() => setAspectRatio(opt.value)}
                    className={cn(
                      "flex flex-col items-center px-5 py-1.5 text-xs font-semibold transition-all",
                      aspectRatio === opt.value
                        ? "bg-primary/20 text-white"
                        : "text-white/40 hover:text-white/60"
                    )}
                  >
                    {opt.label}
                    <span className="text-[9px] font-normal opacity-50">{opt.desc}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Canvas — Style 2: image center stage ── */}
          <div className={cn(
            "relative mx-auto w-full overflow-hidden rounded-2xl border border-white/10",
            "bg-gradient-to-br from-[#1a1030] via-[#0f0d1e] to-[#0a0a12]",
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

          {/* ── Explorar ideas — scroll nativo, 2 filas en móvil / 1 fila en desktop ── */}
          {showExplore && (
            <div className="flex flex-col gap-3 pb-2">
              <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Explorar ideas</h2>

              {/* Mobile: 2 rows | Desktop: 1 row */}
              <div className="overflow-x-auto no-scrollbar">
                <div className="grid grid-rows-2 grid-flow-col auto-cols-max gap-x-3 gap-y-2 md:flex md:flex-row md:gap-3">
                  {ALL_SUGGESTIONS.map((s) => (
                    <SmallCard
                      key={s.id}
                      label={s.label}
                      image={s.image}
                      selected={selectedStyleId === s.id}
                      onClick={() => {
                        setDescription(s.displayEs);
                        setSelectedStyleId(s.id);
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Sticky bottom input bar ── */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-white/5 bg-[#070709]">
        {/* Style chip indicator */}
        {selectedStyleId && (
          <div className="mx-auto max-w-2xl flex items-center gap-2 mb-1.5">
            <span className="text-[10px] text-white/30">Estilo:</span>
            <span className="text-[10px] font-semibold text-primary/90 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              {ALL_SUGGESTIONS.find((s) => s.id === selectedStyleId)?.label}
            </span>
            <button
              type="button"
              onClick={() => setSelectedStyleId(null)}
              className="text-[10px] text-white/20 hover:text-white/60 transition-colors leading-none"
            >
              ×
            </button>
          </div>
        )}
        <div className="mx-auto max-w-2xl flex items-center gap-2 rounded-xl bg-[#1c1c1e] border border-white/10 px-3 py-2">
          <button
            type="button"
            className="flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-full bg-[#2c2c2e] border border-white/10 text-white/40 hover:text-white/70 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <textarea
            placeholder="Describe tu imagen..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={1}
            style={{ minHeight: '22px' }}
            className="flex-1 resize-none bg-transparent text-white/90 placeholder:text-white/20 text-sm outline-none leading-snug"
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