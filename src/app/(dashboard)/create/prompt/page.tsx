"use client";

import { useState } from "react";
import { Sparkles, Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea, FormField } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

const STYLES = ["Pixar 3D", "Anime", "Cinematic", "Documentary", "Dark & Moody", "Bright & Clean", "Futuristic", "Retro"];
const TONES = ["Professional", "Inspirational", "Energetic", "Calm", "Playful", "Urgent"];

export default function QuickPromptPage() {
  const [input, setInput] = useState("");
  const [style, setStyle] = useState("");
  const [tone, setTone] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function handleOptimize() {
    const trimmed = input.trim();
    if (trimmed.length < 5) { setError("Escribe al menos 5 caracteres"); return; }
    setIsLoading(true);
    setError("");
    setResult("");
    try {
      const res = await fetch("/api/generate/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, style, tone }),
      });
      const data = await res.json() as { success: boolean; data?: { optimized: string }; error?: { message: string } };
      if (!data.success) throw new Error(data.error?.message ?? "Error optimizando prompt");
      setResult(data.data?.optimized ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReset() {
    setInput("");
    setStyle("");
    setTone("");
    setResult("");
    setError("");
  }

  return (
    <div className="mx-auto max-w-2xl py-8 px-4">
      <PageHeader
        title="Optimizar Prompt"
        description="Describe tu idea en cualquier idioma — Claude la transforma en un prompt profesional"
        backHref="/create"
        backLabel="Create"
      />

      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
          <FormField label="Tu idea" required hint="Escribe en español o cualquier idioma">
            <Textarea
              placeholder="Un guerrero samurai meditando bajo la lluvia..."
              rows={4}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </FormField>

          <FormField label="Estilo visual (opcional)">
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button key={s} type="button"
                  onClick={() => setStyle(style === s ? "" : s)}
                  className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-all",
                    style === s ? "border-primary/40 bg-primary/10 text-primary-light" : "border-border text-text-muted hover:border-border-strong")}>
                  {s}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Tono (opcional)">
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button key={t} type="button"
                  onClick={() => setTone(tone === t ? "" : t)}
                  className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-all",
                    tone === t ? "border-primary/40 bg-primary/10 text-primary-light" : "border-border text-text-muted hover:border-border-strong")}>
                  {t}
                </button>
              ))}
            </div>
          </FormField>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex items-center justify-between pt-1 border-t border-border">
            <p className="text-xs text-text-muted">Costo: <span className="text-warning font-medium">1 crédito</span></p>
            <Button onClick={handleOptimize} disabled={input.trim().length < 5 || isLoading} isLoading={isLoading}>
              <Sparkles className="h-4 w-4" />
              {isLoading ? "Optimizando..." : "Optimizar con IA"}
            </Button>
          </div>
        </div>

        {result && (
          <div className="rounded-xl border border-success/20 bg-surface p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-success">✨ Prompt optimizado</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
                <Button variant="secondary" size="sm" onClick={handleReset}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Nuevo
                </Button>
              </div>
            </div>
            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{result}</p>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-text-muted">
                💡 Usa este prompt en{" "}
                <a href="/create/image" className="text-primary-light hover:underline">Generar Imagen</a>
                {" "}o{" "}
                <a href="/create/video" className="text-primary-light hover:underline">Generar Video</a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}