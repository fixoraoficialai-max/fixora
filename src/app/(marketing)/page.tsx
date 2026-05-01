import Link from "next/link";
import {
  Zap,
  ArrowRight,
  Play,
  Layers,
  Sparkles,
  Shield,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─────────────────────────────────────────────
// Landing Page — Fixora
// Public, no auth required
// ─────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────
// Navbar
// ─────────────────────────────────────────────
function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border glass">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary shadow-glow-sm">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-text-primary tracking-tight">Fixora</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link href="#features" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Features
          </Link>
          <Link href="#pricing" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Pricing
          </Link>
          <Link href="#how-it-works" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            How it works
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">
              Get started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}

// ─────────────────────────────────────────────
// Hero Section
// ─────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-32 bg-grid">
      {/* Background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.25), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-4xl text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary-light">
            AI-powered video generation
          </span>
        </div>

        {/* Headline */}
        <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
          Create videos that{" "}
          <span className="text-gradient">move people</span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mb-10 max-w-2xl text-lg text-text-secondary leading-relaxed">
          Turn your ideas into professional social media videos with AI. Write a
          prompt, structure your scenes, choose your visual style — and let
          Fixora do the rest.
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" asChild>
            <Link href="/register">
              Start creating for free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <Link href="#how-it-works">
              <Play className="h-4 w-4" />
              See how it works
            </Link>
          </Button>
        </div>

        {/* Social proof */}
        <p className="mt-8 text-sm text-text-muted">
          Free to start · No credit card required · 10 free credits
        </p>

        {/* Dashboard mockup */}
        <div className="mx-auto mt-16 max-w-4xl">
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}

function DashboardMockup() {
  return (
    <div className="relative rounded-2xl border border-border bg-surface shadow-glow overflow-hidden">
      {/* Window chrome */}
      <div className="flex h-10 items-center gap-2 border-b border-border bg-surface-elevated px-4">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-danger/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-warning/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
        </div>
        <div className="flex-1 rounded-md bg-surface-overlay px-3 py-1 text-center text-xs text-text-muted">
          app.fixora.ai/dashboard
        </div>
      </div>
      {/* Mockup body */}
      <div className="flex h-72 gap-0">
        {/* Fake sidebar */}
        <div className="flex w-44 flex-col gap-1 border-r border-border bg-surface p-3">
          {["Dashboard", "Projects", "History", "Settings"].map((item, i) => (
            <div
              key={item}
              className={`flex h-8 items-center gap-2 rounded-md px-3 text-xs ${
                i === 0
                  ? "bg-primary/10 text-primary-light"
                  : "text-text-muted"
              }`}
            >
              <div className="h-3 w-3 rounded bg-current opacity-50" />
              {item}
            </div>
          ))}
        </div>
        {/* Fake main content */}
        <div className="flex-1 p-5">
          <div className="mb-4 grid grid-cols-3 gap-3">
            {["12 Projects", "47 Videos", "8 Credits"].map((stat) => (
              <div
                key={stat}
                className="rounded-lg border border-border bg-surface-elevated p-3"
              >
                <div className="mb-1 h-2 w-12 rounded bg-surface-overlay" />
                <div className="text-xs font-semibold text-text-primary">{stat}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 rounded-lg border border-border bg-surface-elevated p-3"
              >
                <div className="mb-2 h-2 w-20 rounded bg-surface-overlay" />
                <div className="h-1.5 w-28 rounded bg-surface-overlay opacity-60" />
                <div className="mt-3 h-1 w-16 rounded bg-primary/20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Features Section
// ─────────────────────────────────────────────
const FEATURES = [
  {
    icon: Sparkles,
    title: "Prompt to Video",
    description:
      "Write your idea in plain language. Fixora structures it into a production-ready video prompt automatically.",
  },
  {
    icon: Layers,
    title: "Scene Editor",
    description:
      "Break your video into scenes. Control each scene's prompt, visual style, duration, and narration independently.",
  },
  {
    icon: BarChart3,
    title: "Style Control",
    description:
      "Choose from cinematic, minimal, animated, and more. Define tone, pace, and aesthetic with precision.",
  },
  {
    icon: Shield,
    title: "Project Management",
    description:
      "Save, edit, duplicate, and organize all your video projects. Full history of every generation.",
  },
  {
    icon: Zap,
    title: "Fast Generation",
    description:
      "Queue-based architecture processes your video in the background. Get notified when it's ready.",
  },
  {
    icon: Play,
    title: "Multi-Platform",
    description:
      "Generate in landscape (16:9), portrait (9:16), or square (1:1) — optimized for every platform.",
  },
] as const;

function FeaturesSection() {
  return (
    <section id="features" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-medium text-primary">Features</p>
          <h2 className="mb-4 text-4xl font-bold tracking-tight">
            Everything you need to create
          </h2>
          <p className="mx-auto max-w-xl text-text-secondary">
            From idea to published video — Fixora handles the complexity so you
            can focus on your message.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-xl border border-border bg-surface p-5 transition-all hover:border-border-strong hover:bg-surface-elevated"
            >
              <div className="mb-4 inline-flex rounded-lg border border-primary/20 bg-primary/10 p-2.5">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-text-primary">{title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// How It Works Section
// ─────────────────────────────────────────────
const STEPS = [
  {
    number: "01",
    title: "Write your idea",
    description:
      "Describe what you want to communicate. Fixora helps you structure it into a professional video concept.",
  },
  {
    number: "02",
    title: "Build your scenes",
    description:
      "Divide your concept into scenes. Set the prompt, visual style, duration, and tone for each one.",
  },
  {
    number: "03",
    title: "Generate & export",
    description:
      "Click generate. Track progress in real time. Download or share your finished video.",
  },
] as const;

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="border-t border-border px-6 py-24 bg-grid"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-medium text-primary">Process</p>
          <h2 className="mb-4 text-4xl font-bold tracking-tight">
            From idea to video in 3 steps
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {STEPS.map(({ number, title, description }, index) => (
            <div key={number} className="relative flex flex-col gap-4">
              {index < STEPS.length - 1 && (
                <div className="absolute left-[calc(50%+3.5rem)] top-5 hidden h-px w-[calc(100%-3.5rem)] bg-gradient-to-r from-border to-transparent md:block" />
              )}
              <div className="text-5xl font-bold text-gradient opacity-40 tabular-nums">
                {number}
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-text-primary">{title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Pricing Section
// ─────────────────────────────────────────────
const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect to get started and explore the platform.",
    credits: "10 credits/month",
    features: [
      "10 video credits/month",
      "Up to 5 projects",
      "720p output",
      "Basic visual styles",
      "Community support",
    ],
    cta: "Start for free",
    href: "/register",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For creators who produce content consistently.",
    credits: "100 credits/month",
    features: [
      "100 video credits/month",
      "Unlimited projects",
      "1080p output",
      "All visual styles",
      "Priority generation queue",
      "Export configurations",
      "Priority support",
    ],
    cta: "Start Pro",
    href: "/register?plan=pro",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$99",
    period: "/month",
    description: "For agencies and teams building content at scale.",
    credits: "500 credits/month",
    features: [
      "500 video credits/month",
      "Unlimited projects",
      "4K output",
      "All visual styles",
      "Team collaboration",
      "API access",
      "Dedicated support",
      "Custom integrations",
    ],
    cta: "Contact sales",
    href: "/register?plan=team",
    highlighted: false,
  },
] as const;

function PricingSection() {
  return (
    <section id="pricing" className="border-t border-border px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-medium text-primary">Pricing</p>
          <h2 className="mb-4 text-4xl font-bold tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto max-w-xl text-text-secondary">
            Start free. Scale when you need to. No hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-6 ${
                plan.highlighted
                  ? "border-primary/40 bg-primary/5 shadow-glow"
                  : "border-border bg-surface"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-white">
                    Most popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <p className="mb-1 text-sm font-medium text-text-secondary">
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-text-primary">
                    {plan.price}
                  </span>
                  <span className="text-sm text-text-muted">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-text-muted">{plan.description}</p>
              </div>

              <Button
                variant={plan.highlighted ? "primary" : "secondary"}
                className="mb-6 w-full"
                asChild
              >
                <Link href={plan.href}>
                  {plan.cta}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>

              <ul className="flex flex-col gap-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// CTA Section
// ─────────────────────────────────────────────
function CtaSection() {
  return (
    <section className="border-t border-border px-6 py-24">
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-12 text-center shadow-glow">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(99,102,241,0.15), transparent)",
          }}
          aria-hidden="true"
        />
        <div className="relative">
          <Zap className="mx-auto mb-6 h-10 w-10 text-primary" />
          <h2 className="mb-4 text-4xl font-bold tracking-tight">
            Ready to create your first video?
          </h2>
          <p className="mb-8 text-text-secondary">
            Join creators who are already using Fixora to produce professional
            content with AI.
          </p>
          <Button size="lg" asChild>
            <Link href="/register">
              Start for free today
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-primary">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-text-primary">Fixora</span>
          </div>
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} Fixora. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
