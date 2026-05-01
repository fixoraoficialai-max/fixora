import type {
  User,
  Project,
  Scene,
  Video,
  UserCredits,
} from "@prisma/client";

import {
  ProjectStatus,
  AspectRatio,
  VideoStatus,
  UserRole,
} from "@prisma/client";

// Re-export Prisma enums for use in client code
export { ProjectStatus, AspectRatio, VideoStatus, UserRole };

// ─────────────────────────────────────────────
// Enriched types (with relations)
// ─────────────────────────────────────────────
export type ProjectWithScenes = Project & {
  scenes: Scene[];
  _count?: { videos: number };
};
export type ProjectWithDetails = Project & {
  scenes: Scene[];
  videos: Video[];
  user: Pick<User, "id" | "name" | "email" | "image">;
};
export type VideoWithProject = Video & {
  project: Pick<Project, "id" | "name">;
};
export type UserWithCredits = User & {
  credits: UserCredits | null;
};

// ─────────────────────────────────────────────
// Safe public types (no sensitive fields)
// ─────────────────────────────────────────────
export type SafeUser = Omit<User, "password">;
export type SessionUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: UserRole;
};

// ─────────────────────────────────────────────
// UI / Component types
// ─────────────────────────────────────────────
export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
};
export type WizardStep = {
  id: number;
  title: string;
  description: string;
};
export type AspectRatioOption = {
  value: AspectRatio;
  label: string;
  description: string;
  width: number;
  height: number;
};
export const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  {
    value: AspectRatio.LANDSCAPE,
    label: "Landscape",
    description: "16:9 — YouTube, LinkedIn",
    width: 16,
    height: 9,
  },
  {
    value: AspectRatio.PORTRAIT,
    label: "Portrait",
    description: "9:16 — TikTok, Reels, Shorts",
    width: 9,
    height: 16,
  },
  {
    value: AspectRatio.SQUARE,
    label: "Square",
    description: "1:1 — Instagram Feed",
    width: 1,
    height: 1,
  },
];
export const VISUAL_STYLES = [
  "Cinematic",
  "Minimal",
  "Animated",
  "Documentary",
  "Bold & Graphic",
  "Soft & Organic",
  "Dark & Moody",
  "Bright & Clean",
  "Retro",
  "Futuristic",
] as const;
export const VIDEO_TONES = [
  "Professional",
  "Inspirational",
  "Energetic",
  "Calm",
  "Playful",
  "Urgent",
  "Educational",
  "Emotional",
] as const;
export type VisualStyle = (typeof VISUAL_STYLES)[number];
export type VideoTone = (typeof VIDEO_TONES)[number];
