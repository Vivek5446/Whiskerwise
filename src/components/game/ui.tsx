import { Link } from "@tanstack/react-router";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowLeft, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Paw } from "./CatIcon";

const tones = {
  primary: "bg-primary text-primary-foreground [--btn-depth:var(--primary-deep)]",
  secondary: "bg-secondary text-secondary-foreground [--btn-depth:var(--secondary-deep)]",
  mint: "bg-mint text-ink [--btn-depth:var(--mint-deep)]",
  plain: "bg-card text-foreground [--btn-depth:var(--border)]",
};

export function GameButton({
  tone = "primary",
  variant = "raised",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: keyof typeof tones; variant?: "raised" | "cell" }) {
  return <button {...props} className={cn(variant === "raised" && "btn-game px-6 py-3.5 text-lg disabled:opacity-50", tones[tone], className)} />;
}

export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className={cn("animate-page relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]", className)}>
      {children}
    </main>
  );
}

export function TopBar({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className="relative z-10 mb-5 flex items-center gap-3">
      <Link to="/" aria-label="Back to home" className="btn-game grid size-11 place-items-center bg-card text-foreground [--btn-depth:var(--border)]">
        <ArrowLeft className="size-5" strokeWidth={2.6} />
      </Link>
      <h1 className="flex-1 text-3xl font-bold">{title}</h1>
      {right}
    </header>
  );
}

export function Stars({ count, size = "size-4", animate = false }: { count: number; size?: string; animate?: boolean }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          strokeWidth={2.4}
          className={cn(size, i < count ? "fill-star text-star-deep" : "fill-muted text-border", animate && "animate-star", animate && i === 1 && "-translate-y-2")}
          style={animate ? { animationDelay: `${250 + i * 220}ms` } : undefined}
        />
      ))}
    </div>
  );
}

/** Soft floating puzzle tiles and paws behind screens. Purely decorative. */
const DECOR = [
  { x: "6%", y: "12%", s: 34, c: "bg-region-0", r: "-12deg", d: "0s" },
  { x: "84%", y: "8%", s: 26, c: "bg-region-1", r: "18deg", d: "1.2s" },
  { x: "88%", y: "46%", s: 38, c: "bg-region-3", r: "8deg", d: "2s" },
  { x: "4%", y: "58%", s: 28, c: "bg-region-4", r: "-20deg", d: "0.6s" },
  { x: "70%", y: "86%", s: 24, c: "bg-region-2", r: "14deg", d: "2.6s" },
];
export function Decor() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden" aria-hidden>
      {DECOR.map((d, i) => (
        <span
          key={i}
          className={cn("animate-drift absolute rounded-xl opacity-70 shadow-pop", d.c)}
          style={{ left: d.x, top: d.y, width: d.s, height: d.s, animationDelay: d.d, "--r": d.r } as React.CSSProperties}
        />
      ))}
      <Paw className="absolute left-[18%] top-[30%] size-6 rotate-[-20deg] text-accent/60" />
      <Paw className="absolute right-[14%] top-[66%] size-7 rotate-[25deg] text-secondary/40" />
    </div>
  );
}
