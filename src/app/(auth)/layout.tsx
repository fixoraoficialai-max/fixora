import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background bg-grid">
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99,102,241,0.12), transparent)",
        }}
        aria-hidden="true"
      />

      {/* Minimal nav */}
      <nav className="relative z-10 flex h-14 items-center justify-between border-b border-border px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Fixora Video" width={28} height={28} className="rounded-lg" />
          <span className="font-bold tracking-tight">
            <span className="text-text-primary">Fixora</span>{" "}
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Video</span>
          </span>
        </Link>
      </nav>

      {/* Content */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}
