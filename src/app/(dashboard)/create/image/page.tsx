"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Download, Zap, Sparkles, RefreshCw, Wand2, Plus, X, Image as ImageIcon } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { cn } from "@/lib/utils";
import { DiagramOverlay, type DiagramLabel } from "@/components/DiagramOverlay";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, type AcceptedImageType } from "@/lib/prompt-constants";

type AspectRatio = "LANDSCAPE" | "PORTRAIT" | "SQUARE";

const ALL_STYLES = [
  { id: "maquillaje",        label: "Guía de Maquillaje", image: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?q=80&w=500&auto=format&fit=crop" },
  { id: "hiperrealista",     label: "Realista",           image: "https://images.unsplash.com/photo-1552058544-f2b08422138a?q=80&w=500&auto=format&fit=crop" },
  { id: "3d-pixar",          label: "Pixar 3D",           image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=500&auto=format&fit=crop" },
  { id: "fantasia",          label: "Fantasía",           image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=500&auto=format&fit=crop" },
  { id: "corte-transversal", label: "Corte Transversal",  image: "/styles/corte-transversal.jpg" },
  { id: "estatua",           label: "Estatua",            image: "https://images.unsplash.com/photo-1564399580075-5dfe19c205f3?q=80&w=500&auto=format&fit=crop" },
  { id: "surrealista",       label: "Surrealista",        image: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=500&auto=format&fit=crop" },
  { id: "comic",             label: "Cómic",              image: "https://images.unsplash.com/photo-1559535332-db9971090158?q=80&w=500&auto=format&fit=crop" },
  { id: "avatar-3d",         label: "Avatar 3D",          image: "https://images.unsplash.com/photo-1568572933382-74d440642117?q=80&w=500&auto=format&fit=crop" },
  { id: "interiores",        label: "Diseño interiores",  image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=500&auto=format&fit=crop" },
  { id: "mejora-fotos",      label: "Mejora de Fotos",    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=500&auto=format&fit=crop" },
  { id: "paisaje",           label: "Paisaje",            image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=500&auto=format&fit=crop" },
  { id: "chibi",             label: "Stickers chibi",     image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=500&auto=format&fit=crop" },
  { id: "infografia",        label: "Infografía animal",  image: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?q=80&w=500&auto=format&fit=crop" },
  { id: "vintage",           label: "Póster vintage",     image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=500&auto=format&fit=crop" },
  { id: "mini-yo",           label: "Mini yo",            image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=500&auto=format&fit=crop" },
  { id: "dark-fantasy",      label: "Dark Fantasy",       image: "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?q=80&w=500&auto=format&fit=crop" },
  { id: "acuarela",          label: "Acuarela",           image: "https://images.unsplash.com/photo-1490394802706-ba96b0e60b80?q=80&w=500&auto=format&fit=crop" },
  { id: "producto",          label: "Foto de producto",   image: "https://images.unsplash.com/photo-1541643600914-78b084683702?q=80&w=500&auto=format&fit=crop" },
  { id: "espacio",           label: "Espacio",            image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=500&auto=format&fit=crop" },
] as const;

const ASPECT_OPTIONS: { value: AspectRatio; label: string; desc: string }[] = [
  { value: "PORTRAIT",  label: "9:16", desc: "TikTok"  },
  { value: "SQUARE",    label: "1:1",  desc: "Post"    },
  { value: "LANDSCAPE", label: "16:9", desc: "YouTube" },
];

interface GeneratedImage {
  id:               string;
  prompt:           string;
  imageUrl:         string;
  needsTextOverlay: boolean;
  diagramLabels:    DiagramLabel[];
}

function canvasAspectClass(ratio: AspectRatio): string {
  if (ratio === "PORTRAIT")  return "max-w-[200px] aspect-[9/16]";
  if (ratio === "LANDSCAPE") return "w-full max-h-[260px] aspect-[16/9]";
  return "max-w-[260px] aspect-square";
}

function SmallCard({ label, image, selected, onClick }: {
  label: string; image: string; selected: boolean; onClick: () => void;
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

export default function QuickImagePage() {
  const t = useTranslations("stylePrompts");
  const [description, setDescription]         = useState("");
  const [aspectRatio, setAspectRatio]         = useState<AspectRatio>("PORTRAIT");
  const [isGenerating, setIsGenerating]       = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError]                     = useState("");
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);

  const [imageBase64, setImageBase64]         = useState<string | null>(null);
  const [imageMediaType, setImageMediaType]   = useState<AcceptedImageType | null>(null);
  const fileInputRef                          = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as AcceptedImageType)) {
      setError("Formato de imagen no soportado (usa JPG, PNG, WEBP o GIF).");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("La imagen es demasiado grande (máx 4MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImageBase64(base64);
      setImageMediaType(file.type as AcceptedImageType);
      setError("");
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  async function handleGenerate(promptToUse?: string) {
    const finalPrompt = promptToUse ?? description;
    if (!finalPrompt.trim()) { setError("Describe tu idea primero"); return; }
    setIsGenerating(true);
    setError("");
    setGeneratedImages([]);
    try {
      const promptRes = await fetch("/api/generate/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: finalPrompt, 
          aspectRatio, 
          ...(selectedStyleId && { styleId: selectedStyleId }),
          ...(imageBase64 && { imageBase64, imageMediaType })
        }),
      });
      const promptData = await promptRes.json() as {
        success: boolean;
        data?: { optimized: string; negativePrompt: string; needsTextOverlay: boolean; diagramLabels?: DiagramLabel[] };
      };
      const optimized        = promptData.data?.optimized        ?? finalPrompt;
      const negativePrompt   = promptData.data?.negativePrompt   ?? "";
      const needsTextOverlay = promptData.data?.needsTextOverlay ?? false;
      const diagramLabels    = promptData.data?.diagramLabels    ?? [];

      const imgRes = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: optimized, negativePrompt, aspectRatio, styleId: selectedStyleId ?? undefined, needsTextOverlay }),
      });
      const imgData = await imgRes.json() as { success: boolean; data?: { imageUrl: string }; error?: { message: string } };
      if (!imgData.success) throw new Error(imgData.error?.message ?? "Error al generar");
      let finalLabels = diagramLabels;

      // Si es diagrama, Claude Vision analiza la imagen y ajusta coordenadas exactas
      if (needsTextOverlay && diagramLabels.length && imgData.data?.imageUrl) {
        try {
          const analyzeRes = await fetch("/api/generate/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: imgData.data.imageUrl, labels: diagramLabels }),
          });
          const analyzeData = await analyzeRes.json() as { success: boolean; data?: { preciseLabels: typeof diagramLabels } };
          if (analyzeData.success && analyzeData.data?.preciseLabels) {
            finalLabels = analyzeData.data.preciseLabels;
          }
        } catch {
          console.warn("Analyze step failed, using estimated coords");
        }
      }

      setGeneratedImages([{ id: Date.now().toString(), prompt: optimized, imageUrl: imgData.data?.imageUrl ?? "", needsTextOverlay, diagramLabels: finalLabels }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleReset() {
    setDescription(""); setGeneratedImages([]); setError(""); setSelectedStyleId(null);
    setImageBase64(null); setImageMediaType(null);
  }

  const firstImage  = generatedImages[0];
  const showExplore = !isGenerating && !firstImage;

  return (
    <div className="flex flex-col h-full bg-[#070709] overflow-hidden">
      <TopBar title="Generador de Imágenes" description="IA de alta fidelidad" />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 pt-8 pb-4 flex flex-col gap-6">

          <div className="flex items-center justify-center">
            <div className="flex items-center rounded-xl border border-white/10 bg-[#1c1c1e] overflow-hidden">
              {ASPECT_OPTIONS.map((opt, idx) => (
                <div key={opt.value} className="flex items-center">
                  {idx > 0 && <div className="w-px h-5 bg-white/8 flex-shrink-0" />}
                  <button
                    onClick={() => setAspectRatio(opt.value)}
                    className={cn(
                      "flex flex-col items-center px-5 py-1.5 text-xs font-semibold transition-all",
                      aspectRatio === opt.value ? "bg-primary/20 text-white" : "text-white/40 hover:text-white/60"
                    )}
                  >
                    {opt.label}
                    <span className="text-[9px] font-normal opacity-50">{opt.desc}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className={cn("relative mx-auto w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1030] via-[#0f0d1e] to-[#0a0a12]", canvasAspectClass(aspectRatio))}>
            {isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Wand2 className="h-10 w-10 text-white/20 animate-pulse" />
                <p className="text-sm text-white/30 animate-pulse">Fixora está creando...</p>
              </div>
            )}
            {!isGenerating && !firstImage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Sparkles className="h-10 w-10 text-white/10" />
                <p className="text-sm text-white/20">Tu creación aparecerá aquí</p>
              </div>
            )}
            {!isGenerating && firstImage && (
              <>
                {firstImage.needsTextOverlay && firstImage.diagramLabels.length ? (
                  <DiagramOverlay imageUrl={firstImage.imageUrl} labels={firstImage.diagramLabels} className="h-full w-full" />
                ) : (
                  <img src={firstImage.imageUrl} alt="Generated" className="h-full w-full object-cover" />
                )}
              </>
            )}
          </div>

          {firstImage && !isGenerating && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <a href={`/api/download?url=${encodeURIComponent(firstImage.imageUrl)}`} download className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white">
                  <Download className="h-4 w-4" />
                </a>
                <a href={`/create/video?imageUrl=${encodeURIComponent(firstImage.imageUrl)}`} className="flex h-9 px-4 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all font-semibold gap-2 text-xs">
                  <Zap className="h-3 w-3" />
                  Animar
                </a>
              </div>
              <button onClick={handleReset} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
                <RefreshCw className="h-3.5 w-3.5" />
                Nueva imagen
              </button>
            </div>
          )}

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          {showExplore && (
            <div className="flex flex-col gap-3 pb-2">
              <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Elige un estilo</h2>
              <div className="overflow-x-auto no-scrollbar">
                <div className="grid grid-rows-2 grid-flow-col auto-cols-max gap-x-3 gap-y-2 md:flex md:flex-row md:gap-3">
                  {ALL_STYLES.map((s) => (
                    <SmallCard key={s.id} label={s.label} image={s.image} selected={selectedStyleId === s.id} onClick={() => setSelectedStyleId(s.id)} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 px-4 py-3 border-t border-white/5 bg-[#070709]">
        {selectedStyleId && (
          <div className="mx-auto max-w-2xl flex items-center gap-2 mb-2">
            <span className="text-[10px] text-white/30">Estilo:</span>
            <span className="text-[10px] font-semibold text-primary/90 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              {ALL_STYLES.find((s) => s.id === selectedStyleId)?.label}
            </span>
            <button type="button" onClick={() => setSelectedStyleId(null)} className="text-[10px] text-white/20 hover:text-white/60 transition-colors leading-none">×</button>
          </div>
        )}
        
        {imageBase64 && (
          <div className="mx-auto max-w-2xl flex items-center gap-2 mb-2">
            <div className="relative w-16 h-16 rounded-md overflow-hidden border border-white/10 group">
              <img src={imageBase64} alt="Referencia" className="w-full h-full object-cover" />
              <button
                onClick={() => { setImageBase64(null); setImageMediaType(null); }}
                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-2xl flex items-end gap-2 rounded-xl bg-[#1c1c1e] border border-white/10 px-3 py-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className="hidden"
          />
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            title="Añadir imagen de referencia"
            className="flex-shrink-0 h-8 w-8 mb-0.5 flex items-center justify-center rounded-full bg-[#2c2c2e] border border-white/10 text-white/40 hover:text-white/70 transition-colors"
          >
            {imageBase64 ? <ImageIcon className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4" />}
          </button>
          <textarea
            placeholder="Describe tu imagen o diagrama..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              e.target.style.height = "22px";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            rows={1}
            style={{ minHeight: "22px" }}
            className="flex-1 py-1 resize-none bg-transparent text-white/90 placeholder:text-white/20 text-sm outline-none leading-snug no-scrollbar"
          />
          <button type="button" onClick={() => handleGenerate()} disabled={!description.trim() || isGenerating} className="flex-shrink-0 h-9 w-9 mb-[1px] flex items-center justify-center rounded-full bg-primary text-white disabled:opacity-30 hover:bg-primary-hover transition-colors">
            {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
