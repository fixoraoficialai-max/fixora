/**
 * Style DNA Registry
 *
 * Each entry maps a suggestion card ID to a set of professional
 * visual directives. These are injected by the backend AFTER Claude
 * extracts clean visual intent — the user never sees them.
 *
 * Layers:
 *   base      → core composition / lighting directive
 *   material  → texture, surface, and color directives
 *   quality   → quality keywords and reference standards
 *   negatives → style-specific negative prompt additions
 */

export interface StyleDNA {
  name:      string;
  base:      string;
  material:  string;
  quality:   string;
  negatives: string;
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
    name:      "Guía de Maquillaje",
    base:      "professional beauty editorial layout, portrait orientation, clean magazine composition, even studio light",
    material:  "soft diffused lighting, natural skin tone preservation, subtle makeup zone annotations",
    quality:   "high-fashion editorial quality, 9:16 portrait format, magazine-ready",
    negatives: "no heavy retouching, no distorted proportions, no watermarks, no text overlays",
  },
  "hiperrealista": {
    name:      "Realista",
    base:      "natural ambient or window light, shallow depth of field, creamy bokeh, candid authentic moment",
    material:  "35mm analog film grain, wabi-sabi organic imperfection, believable textures, natural color rendition, soft contrast curve",
    quality:   "ultra-detailed photography, lifelike, shot on Leica M, professional photojournalism quality",
    negatives: "no CGI look, no plastic skin, no oversharpened, no artificial studio lighting, no AI artifacts",
  },
  "3d-pixar": {
    name:      "Pixar 3D",
    base:      "warm studio 3-point lighting, clean rounded organic shapes, friendly expressive character design, cinematic depth of field",
    material:  "subsurface scattering, physically-based rendering, smooth matte surfaces with subtle sheen, vibrant saturated colors",
    quality:   "Pixar/DreamWorks production quality, ultra-detailed 3D render, crisp cinematic lighting",
    negatives: "no realistic photography, no harsh shadows, no uncanny valley, no flat 2D art",
  },
  "fantasia": {
    name:      "Fantasía",
    base:      "dramatic chiaroscuro lighting, volumetric light rays, grand scale, atmospheric perspective with mist",
    material:  "rich jewel-tone color palette, intricate textured surfaces, magical particle effects",
    quality:   "epic fantasy digital painting, AAA game concept art quality, matte painting level detail",
    negatives: "no modern objects, no photographic style, no flat colors, no simple backgrounds",
  },
  "corte-transversal": {
    name:      "Corte Transversal",
    base:      "clean educational diagram, pure white background, frontal orthographic technical view",
    material:  "color-coded cross-sectional layers, precise clean line art, clear label callouts with leader lines",
    quality:   "scientific textbook illustration standard, museum exhibit quality, anatomically accurate",
    negatives: "no artistic style, no 3D shadows, no decorative elements, no dark background",
  },
  "estatua": {
    name:      "Estatua",
    base:      "dramatic museum lighting with deep chiaroscuro, grand architectural interior setting",
    material:  "marble or bronze surface texture, patina and age detail, cold stone material realism",
    quality:   "photorealistic sculpture photography, museum-grade documentation, macro-sharp surface detail",
    negatives: "no painting style, no modern elements, no bright saturated colors",
  },
  "surrealista": {
    name:      "Surrealista",
    base:      "impossible juxtapositions rendered with photographic realism, dramatic scale contrasts",
    material:  "meticulous Dalí-like surface detail, dreamlike atmospheric light, hyper-defined textures on surreal objects",
    quality:   "René Magritte or Salvador Dalí quality fine art, museum-grade surrealist painting",
    negatives: "no cartoon style, no simple flat colors, no predictable compositions",
  },
  "comic": {
    name:      "Cómic",
    base:      "dynamic action hero composition, panel-ready bold pose, strong foreground-background separation",
    material:  "bold clean ink outlines, halftone Ben-Day dot pattern, vibrant flat primary color fills, retro printing imperfections",
    quality:   "classic comic book illustration, Jack Kirby quality, high contrast graphic art",
    negatives: "no realistic photography, no watercolor, no 3D rendering, no gradients or blurs",
  },
  "avatar-3d": {
    name:      "Avatar 3D",
    base:      "clean neutral studio background, professional character sheet composition, balanced soft lighting",
    material:  "stylized 3D character materials, smooth geometry, modern character design language",
    quality:   "Blender/Cinema 4D render quality, professional character design, expressive personality",
    negatives: "no photorealism, no cluttered background, no hyper-detailed skin textures",
  },
  "interiores": {
    name:      "Diseño de interiores",
    base:      "wide-angle interior composition, warm golden-hour window light, carefully staged furniture",
    material:  "warm wood textures, natural linen fabrics, polished surfaces with subtle reflections",
    quality:   "Architectural Digest magazine standard, architectural photography quality, 8K interior detail",
    negatives: "no people, no clutter, no dark moody lighting, no fisheye distortion",
  },
  "mejora-fotos": {
    name:      "Mejora de Fotos",
    base:      "enhanced image quality, improved natural lighting balance, optimized color accuracy",
    material:  "fine microcontrast sharpening, digital noise reduction, authentic skin tone preservation",
    quality:   "professional photo retouching standard, magazine-ready quality, natural authentic look",
    negatives: "no over-processing, no artificial HDR halos, no skin smoothing artifacts, no color shifts",
  },
  "paisaje": {
    name:      "Paisaje",
    base:      "dramatic golden or blue hour lighting, wide dynamic range, atmospheric foreground-to-horizon composition",
    material:  "natural terrain textures, atmospheric haze in distance, water reflections, dramatic cloudscape",
    quality:   "National Geographic quality, 8K landscape photography, tripod-sharp foreground-to-infinity detail",
    negatives: "no people, no buildings or man-made structures, no flat midday lighting",
  },
  "chibi": {
    name:      "Stickers chibi",
    base:      "white background, centered character composition, sticker-ready isolated format",
    material:  "bold clean outlines, bright flat cel-shaded colors, cute simplified rounded anatomy",
    quality:   "professional LINE/WeChat sticker quality, oversized expressive eyes, clean vector-like finish",
    negatives: "no realistic anatomy, no complex backgrounds, no dark themes, no thin fragile lines",
  },
  "infografia": {
    name:      "Infografía animal",
    base:      "dark professional background, centered subject with clearly separated diagram elements",
    material:  "precise scientific illustration style, clean anatomical label lines, color-coded zones",
    quality:   "Nature magazine or museum exhibit quality, educational poster standard, scientifically accurate",
    negatives: "no artistic liberties, no cartoon style, no inaccurate proportions",
  },
  "vintage": {
    name:      "Póster vintage",
    base:      "period-appropriate composition, art deco or mid-century illustration style, limited flat color palette",
    material:  "aged paper texture, letterpress printing grain, muted sepia or period-flat color palette",
    quality:   "authentic 1950s-1960s commercial illustration quality, vintage travel poster standard",
    negatives: "no modern elements, no clean digital look, no bright neon colors",
  },
  "mini-yo": {
    name:      "Mini yo",
    base:      "clean neutral studio background, product photography hero shot, centered collectible figurine",
    material:  "smooth matte plastic materials, Funko Pop proportions, soft studio product lighting",
    quality:   "collectible toy catalog photography, product studio quality, sharp detail render",
    negatives: "no realistic human anatomy, no complex backgrounds, no painterly or artistic style",
  },
  "dark-fantasy": {
    name:      "Dark Fantasy",
    base:      "dramatic rim lighting, volumetric god rays, epic cinematic scale, moody atmospheric depth",
    material:  "intricate dark armor and environmental detail, deep jewel-toned color palette, mystical particle effects",
    quality:   "Blizzard Entertainment concept art quality, movie-poster level composition, AAA game art standard",
    negatives: "no bright cheerful colors, no cartoon style, no modern contemporary setting",
  },
  "acuarela": {
    name:      "Acuarela",
    base:      "loose expressive composition, soft diffused natural light, handcrafted organic feel",
    material:  "wet-on-wet color bleeding at edges, natural pigment transparency and watercolor diffusion, visible paper grain",
    quality:   "traditional fine art watercolor quality, botanical illustration precision, handmade artisan finish",
    negatives: "no digital sharp edges, no flat solid colors, no CGI or photorealism",
  },
  "producto": {
    name:      "Foto de producto",
    base:      "clean cyclorama or graduated background, commercial hero shot composition, professional product staging",
    material:  "studio 3-light setup with soft diffusers, caustic light reflections, premium material rendering",
    quality:   "luxury brand advertising photography, Leica-sharp product detail, agency-standard commercial quality",
    negatives: "no lifestyle context, no distracting background elements, no harsh shadows or lens flare",
  },
  "espacio": {
    name:      "Espacio",
    base:      "deep cosmic backdrop, dramatic nebula lighting, photorealistic celestial scale and distance",
    material:  "luminous gas clouds, reflective cosmic dust, planetary surface detail and atmospheric glow",
    quality:   "Hubble Space Telescope or James Webb quality visualization, NASA-grade rendering, cinematic wide shot",
    negatives: "no cartoon stars, no flat 2D space art, no Earth-gravity physics, no AI texture artifacts",
  },
};

// ─── Assembler ────────────────────────────────────────────────────────────────

/**
 * Combines Claude's extracted clean intent with the style's DNA layers.
 * When no style is selected, returns the clean intent as-is.
 */
export function assemblePrompt(cleanIntent: string, styleId: string | undefined): string {
  if (!styleId) return cleanIntent;

  const dna = STYLE_DNA[styleId as StyleId];
  if (!dna) return cleanIntent;

  return [
    cleanIntent,
    dna.base,
    dna.material,
    dna.quality,
    // Negatives appended naturally at end (no brackets / no symbols)
    dna.negatives,
  ].join(", ");
}
