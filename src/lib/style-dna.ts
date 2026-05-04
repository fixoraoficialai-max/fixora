/**
 * Style DNA Registry — Fixora v2
 *
 * CAMBIOS CLAVE vs v1:
 *  1. assemblePrompt() ahora retorna { prompt, negativePrompt } separados.
 *     Pasar negativos mezclados en el prompt positivo degrada la calidad en Flux.
 *  2. Se añade `triggerWords` por estilo para activar LoRAs o tokens especiales.
 *  3. corte-transversal e infografia ahora retornan `needsTextOverlay: true`
 *     para que tu pipeline los trate diferente (no pidas texto a Flux).
 *
 * Uso en tu backend:
 *   const { prompt, negativePrompt, needsTextOverlay } = assemblePrompt(cleanIntent, styleId);
 *   const result = await fal.run("fal-ai/flux-pro/v1.1", {
 *     input: { prompt, negative_prompt: negativePrompt, ... }
 *   });
 */

export interface StyleDNA {
  name: string;
  base: string;
  material: string;
  quality: string;
  negatives: string;
  triggerWords?: string;
  needsTextOverlay?: boolean; // Si true → Flux NO debe generar texto
}

export const STYLE_IDS = [
  "maquillaje",
  "hiperrealista",
  "3d-pixar",
  "fantasia",
  "corte-transversal",
  "estatua",
  "surrealista",
  "comic",
  "avatar-3d",
  "interiores",
  "mejora-fotos",
  "paisaje",
  "chibi",
  "infografia",
  "vintage",
  "mini-yo",
  "dark-fantasy",
  "acuarela",
  "producto",
  "espacio",
] as const;

export type StyleId = (typeof STYLE_IDS)[number];

export const STYLE_DNA: Record<StyleId, StyleDNA> = {
  "maquillaje": {
    name: "Guía de Maquillaje",
    base: "professional beauty editorial portrait, clean magazine composition, even soft studio light, 9:16 vertical format",
    material: "soft diffused lighting, natural skin tone preservation, flawless complexion, subtle highlight and shadow zones",
    quality: "high-fashion Vogue editorial quality, ultra-sharp focus on eyes and lips, magazine-ready finish",
    negatives: "ugly, deformed, disfigured, heavy retouching, plastic skin, distorted proportions, watermarks, text overlays, blurry, low quality, nsfw",
    needsTextOverlay: true, // Las zonas de maquillaje se anotan en post-proceso
  },

  "hiperrealista": {
    name: "Realista",
    base: "natural ambient light, shallow depth of field with creamy bokeh, authentic candid moment, photojournalism composition",
    material: "35mm analog film grain, wabi-sabi organic imperfection, believable skin pores and textures, natural color rendition",
    quality: "ultra-detailed photography, shot on Leica M, lifelike, professional photojournalism quality, award-winning",
    negatives: "cartoon, anime, illustration, painting, CGI look, plastic skin, over-sharpened, artificial studio lighting, AI artifacts, ugly, deformed, blurry, watermark, low quality, nsfw",
    triggerWords: "RAW photo, photorealistic, hyperrealistic",
  },

  "3d-pixar": {
    name: "Pixar 3D",
    base: "warm studio 3-point lighting, clean rounded organic shapes, friendly expressive character design, cinematic depth of field",
    material: "subsurface scattering skin, physically-based rendering, smooth matte surfaces with subtle sheen, vibrant saturated colors, global illumination",
    quality: "Pixar production quality 2024, ultra-detailed 3D render, crisp cinematic lighting, rendered in RenderMan",
    negatives: "realistic photography, harsh shadows, uncanny valley, flat 2D art, low poly, ugly, deformed, blurry, watermark, nsfw",
    triggerWords: "3D render, Pixar style, CGI, animated movie still",
  },

  "fantasia": {
    name: "Fantasía",
    base: "dramatic chiaroscuro lighting, volumetric light rays, grand epic scale, atmospheric perspective with mist and fog",
    material: "rich jewel-tone color palette, intricate textured surfaces, magical particle effects, glowing runes or elements",
    quality: "epic fantasy digital painting, AAA game concept art quality, Greg Rutkowski style, matte painting level detail",
    negatives: "modern objects, photographic style, flat colors, simple backgrounds, ugly, deformed, blurry, watermark, nsfw",
    triggerWords: "fantasy art, epic digital painting, concept art",
  },

  "corte-transversal": {
    name: "Corte Transversal",
    // ⚠️ IMPORTANTE: NO pedir texto ni etiquetas a Flux. Se añaden en post-proceso.
    base: "photorealistic cross-section cutaway, pure white background, studio product photography, sharp detail, real materials and textures, wide empty white margins on left and right for labels, small centered subject",
    material: "razor-sharp food photography lighting, natural realistic textures, each layer clearly separated and visible",
    quality: "National Geographic editorial quality, hyper-realistic macro photography, Hasselblad camera sharpness",
    negatives: "text, labels, letters, words, captions, annotations, watermarks, artistic style, 3D shadows, dark background, blurry, ugly",
    triggerWords: "technical cross-section diagram, cutaway illustration, educational diagram",
    needsTextOverlay: true, // 🔴 Las etiquetas se añaden con Canvas/SVG después
  },

  "estatua": {
    name: "Estatua",
    base: "dramatic museum lighting with deep chiaroscuro, grand architectural interior or outdoor pedestal setting",
    material: "Carrara marble or aged bronze surface texture, visible patina and age detail, cold stone material realism, chisel marks",
    quality: "photorealistic sculpture photography, museum-grade documentation, macro-sharp surface detail, professional art photography",
    negatives: "painting style, modern elements, bright saturated colors, people, ugly, blurry, watermark, low quality",
    triggerWords: "sculpture photograph, museum photography, stone statue",
  },

  "surrealista": {
    name: "Surrealista",
    base: "impossible juxtapositions rendered with photographic realism, dramatic scale contrasts, dreamlike scene",
    material: "meticulous Dalí-like surface detail, dreamlike atmospheric light, hyper-defined textures on surreal objects",
    quality: "René Magritte or Salvador Dalí quality fine art, museum-grade surrealist oil painting, masterpiece",
    negatives: "cartoon style, simple flat colors, predictable compositions, ugly, blurry, watermark, low quality, nsfw",
    triggerWords: "surrealist painting, dreamlike, impossible scene",
  },

  "comic": {
    name: "Cómic",
    base: "dynamic action hero composition, panel-ready bold pose, strong foreground-background separation, dramatic angle",
    material: "bold clean ink outlines, halftone Ben-Day dot pattern, vibrant flat primary color fills, retro printing imperfections",
    quality: "classic American comic book illustration, Jack Kirby quality, high contrast bold graphic art, Marvel Comics style",
    negatives: "realistic photography, watercolor, 3D rendering, gradients, blurs, ugly, deformed, watermark, nsfw",
    triggerWords: "comic book art, ink illustration, halftone",
  },

  "avatar-3d": {
    name: "Avatar 3D",
    base: "clean neutral gradient studio background, professional character turnaround composition, balanced soft rim lighting",
    material: "stylized 3D character materials, smooth geometry with micro surface detail, modern game character design language",
    quality: "Blender Cycles render quality, professional character design, expressive personality, game-ready art style",
    negatives: "photorealism, cluttered background, hyper-detailed skin textures, ugly, deformed, blurry, watermark, nsfw",
    triggerWords: "3D character design, stylized avatar, game character",
  },

  "interiores": {
    name: "Diseño de interiores",
    base: "wide-angle architectural interior composition, warm golden-hour window light streaming in, carefully staged furniture",
    material: "warm oak wood textures, natural linen fabrics, polished marble surfaces with subtle reflections, plants and greenery",
    quality: "Architectural Digest magazine standard, architectural photography, 8K interior detail, award-winning interior design",
    negatives: "people, clutter, dark moody lighting, fisheye distortion, ugly, blurry, watermark, low quality",
    triggerWords: "interior design photography, architectural visualization",
  },

  "mejora-fotos": {
    name: "Mejora de Fotos",
    base: "enhanced image quality with improved natural lighting balance, optimized color accuracy, professional retouching",
    material: "fine microcontrast sharpening, digital noise reduction preserving detail, authentic skin tone preservation",
    quality: "professional photo retouching standard, magazine-ready quality, natural authentic look, color-graded",
    negatives: "over-processing, artificial HDR halos, skin smoothing artifacts, color shifts, ugly, blurry, watermark",
  },

  "paisaje": {
    name: "Paisaje",
    base: "dramatic golden hour or blue hour lighting, wide dynamic range, rule-of-thirds composition from horizon to foreground",
    material: "natural terrain textures, atmospheric haze in distance, pristine water reflections, dramatic cloudscape with crepuscular rays",
    quality: "National Geographic quality, 8K landscape photography, tripod-sharp foreground-to-infinity detail, award-winning",
    negatives: "people, buildings, man-made structures, flat midday lighting, ugly, blurry, watermark, low quality",
    triggerWords: "landscape photography, nature photography, golden hour",
  },

  "chibi": {
    name: "Stickers chibi",
    base: "isolated on pure white background, centered character, sticker-ready format, cheerful expression",
    material: "bold clean outlines, bright flat cel-shaded colors, cute simplified rounded anatomy, oversized head proportion",
    quality: "professional LINE sticker quality, oversized expressive eyes, clean vector-like finish, kawaii style",
    negatives: "realistic anatomy, complex backgrounds, dark themes, thin fragile lines, ugly, blurry, watermark, nsfw",
    triggerWords: "chibi character, kawaii sticker, cute cartoon",
  },

  "infografia": {
    name: "Infografía",
    // ⚠️ Solo la ilustración central — las etiquetas se añaden en post-proceso
    base: "dark professional navy background, centered scientific subject, clearly visible clean silhouette",
    material: "precise scientific illustration style, color-coded anatomical or structural zones, clean edges between sections",
    quality: "Nature magazine or Smithsonian museum exhibit quality, educational poster standard, scientifically accurate",
    negatives: "text, labels, letters, words, watermarks, cartoon style, inaccurate proportions, blurry, ugly",
    triggerWords: "scientific illustration, anatomical diagram, educational illustration",
    needsTextOverlay: true, // 🔴 Las etiquetas se añaden con Canvas/SVG después
  },

  "vintage": {
    name: "Póster vintage",
    base: "period-appropriate art deco or mid-century illustration composition, limited flat color palette, centered bold layout",
    material: "aged paper texture with subtle foxing, letterpress printing grain, muted sepia or period-flat color palette, slight color bleed",
    quality: "authentic 1950s-1960s commercial illustration quality, vintage travel poster or WPA poster standard, collectible art print",
    negatives: "modern elements, clean digital look, bright neon colors, photorealism, ugly, blurry, watermark",
    triggerWords: "vintage poster art, retro illustration, art deco",
  },

  "mini-yo": {
    name: "Mini yo",
    base: "clean neutral gradient studio background, product photography hero shot, centered collectible figurine on small pedestal",
    material: "smooth glossy plastic materials, Funko Pop proportions, soft studio product lighting with gentle rim light",
    quality: "collectible toy catalog photography, product studio quality, sharp detail render, commercial product shot",
    negatives: "realistic human anatomy, complex backgrounds, painterly or artistic style, ugly, blurry, watermark",
    triggerWords: "Funko Pop style, collectible figurine, vinyl toy",
  },

  "dark-fantasy": {
    name: "Dark Fantasy",
    base: "dramatic rim lighting with volumetric god rays, epic cinematic scale and framing, moody atmospheric depth and fog",
    material: "intricate dark armor with engravings, deep jewel-toned color palette, mystical particle and ember effects",
    quality: "Blizzard Entertainment concept art quality, movie-poster level composition, AAA game art standard, trending on ArtStation",
    negatives: "bright cheerful colors, cartoon style, modern contemporary setting, ugly, deformed, blurry, watermark, nsfw",
    triggerWords: "dark fantasy concept art, epic digital painting, ArtStation trending",
  },

  "acuarela": {
    name: "Acuarela",
    base: "loose expressive composition, soft diffused natural light, handcrafted organic feel, paper showing through",
    material: "wet-on-wet color bleeding at edges, natural pigment transparency and watercolor diffusion, visible cold-press paper grain",
    quality: "traditional fine art watercolor, botanical illustration precision, handmade artisan finish, gallery quality",
    negatives: "digital sharp edges, flat solid colors, CGI, photorealism, ugly, blurry, watermark",
    triggerWords: "traditional watercolor painting, fine art, hand-painted",
  },

  "producto": {
    name: "Foto de producto",
    base: "clean pure white cyclorama or dark gradient background, commercial hero shot, professional product staging centered",
    material: "studio 3-light setup with large softboxes, clean caustic light reflections on surface, premium material rendering",
    quality: "luxury brand advertising photography, macro-sharp product detail, agency-standard commercial quality, Amazon premium listing",
    negatives: "lifestyle context, distracting background, harsh shadows, lens flare, people, ugly, blurry, watermark",
    triggerWords: "product photography, commercial photo, studio shot",
  },

  "espacio": {
    name: "Espacio",
    base: "deep cosmic backdrop, dramatic nebula lighting, photorealistic celestial scale and vast distance, Milky Way visible",
    material: "luminous gas clouds with volumetric light, reflective cosmic dust lanes, planetary surface detail and atmospheric glow",
    quality: "Hubble Space Telescope or James Webb quality visualization, NASA-grade rendering, cinematic wide shot",
    negatives: "cartoon stars, flat 2D space art, Earth-gravity physics, AI texture artifacts, ugly, blurry, watermark",
    triggerWords: "astrophotography, space photography, NASA quality",
  },
};

// ─── Assembler v2 ─────────────────────────────────────────────────────────────

export interface AssembledPrompt {
  /** Prompt positivo → va en `input.prompt` de fal.ai */
  prompt: string;
  /** Prompt negativo → va en `input.negative_prompt` de fal.ai */
  negativePrompt: string;
  /** Si true, tu pipeline debe añadir texto/etiquetas con Canvas o SVG en post-proceso */
  needsTextOverlay: boolean;
  /** Nombre legible del estilo para logs o UI */
  styleName: string;
}

/**
 * Combina la intención limpia de Claude con el Style DNA del estilo elegido.
 * 
 * IMPORTANTE: Ya no mezcla negativos en el prompt positivo.
 * Úsalo así en tu backend:
 * 
 *   const { prompt, negativePrompt, needsTextOverlay } = assemblePrompt(cleanIntent, styleId);
 * 
 *   const result = await fal.run("fal-ai/flux-pro/v1.1", {
 *     input: {
 *       prompt,
 *       negative_prompt: negativePrompt,
 *       num_inference_steps: 28,
 *       guidance_scale: 3.5,   // Flux 1.1 Pro funciona bien con 3-4
 *       image_size: "portrait_4_3",
 *     }
 *   });
 */
export function assemblePrompt(cleanIntent: string, styleId: string | undefined): AssembledPrompt {
  const GLOBAL_NEGATIVE = "ugly, deformed, blurry, low quality, watermark, signature, jpeg artifacts, duplicate, mutation, extra limbs";

  if (!styleId) {
    return {
      prompt: cleanIntent,
      negativePrompt: GLOBAL_NEGATIVE,
      needsTextOverlay: false,
      styleName: "Sin estilo",
    };
  }

  const dna = STYLE_DNA[styleId as StyleId];
  if (!dna) {
    return {
      prompt: cleanIntent,
      negativePrompt: GLOBAL_NEGATIVE,
      needsTextOverlay: false,
      styleName: "Desconocido",
    };
  }

  // Prompt positivo: triggerWords primero si existen (activan LoRA o tokens especiales)
  const positiveparts = [
    dna.triggerWords,
    cleanIntent,
    dna.base,
    dna.material,
    dna.quality,
  ].filter(Boolean);

  return {
    prompt: positiveparts.join(", "),
    negativePrompt: `${dna.negatives}, ${GLOBAL_NEGATIVE}`,
    needsTextOverlay: dna.needsTextOverlay ?? false,
    styleName: dna.name,
  };
}