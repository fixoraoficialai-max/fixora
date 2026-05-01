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
  title: {
    default: "Fixora — AI Video Generation",
    template: "%s | Fixora",
  },
  description:
    "Create stunning AI-powered videos for social media from prompts, scenes, and visual styles. Professional, fast, and scalable.",
  keywords: ["AI video", "video generation", "social media", "content creation", "AI tools"],
  authors: [{ name: "Fixora" }],
  creator: "Fixora",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: "Fixora — AI Video Generation",
    description: "Create stunning AI-powered videos for social media.",
    siteName: "Fixora",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fixora — AI Video Generation",
    description: "Create stunning AI-powered videos for social media.",
  },
  robots: {
    index: true,
    follow: true,
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-background text-text-primary antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
