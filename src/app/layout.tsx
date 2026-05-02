import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://fixoravideo.com"),
  title: {
    default: "Fixora Video — Generador de Videos con IA",
    template: "%s | Fixora Video",
  },
  description:
    "Crea videos e imágenes con inteligencia artificial en segundos. Genera videos para redes sociales, anima avatares y crea contenido profesional con IA. Prueba gratis.",
  keywords: [
    "Fixora", "Fixora Video", "fixoravideo",
    "generador de videos con IA", "crear videos con inteligencia artificial",
    "videos para redes sociales IA", "generar imágenes con IA",
    "avatar IA", "animar personajes IA", "contenido con IA",
    "AI video generator", "AI image generation", "video generation AI",
  ],
  authors:  [{ name: "Fixora Video", url: "https://fixoravideo.com" }],
  creator:  "Fixora Video",
  icons: {
    icon: [
      { url: "/favicon.ico",                   sizes: "any"     },
      { url: "/logo.png", type: "image/png",   sizes: "512x512" },
    ],
    apple:   { url: "/logo.png", sizes: "180x180", type: "image/png" },
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type:        "website",
    locale:      "es_ES",
    url:         "https://fixoravideo.com",
    title:       "Fixora Video — Generador de Videos con IA",
    description: "Crea videos e imágenes con IA en segundos. Prueba gratis.",
    siteName:    "Fixora Video",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Fixora Video" }],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "Fixora Video — Generador de Videos con IA",
    description: "Crea videos e imágenes con IA en segundos. Prueba gratis.",
    images:      ["/logo.png"],
  },
  robots: {
    index:  true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: "https://fixoravideo.com",
  },
};

export const viewport: Viewport = {
  themeColor: "#070709",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <body className="bg-background text-text-primary antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
