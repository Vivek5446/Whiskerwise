import { CatIcon, Paw } from "@/components/game/CatIcon";
import { Decor, GameButton, Screen, Stars, TopBar } from "@/components/game/ui";
import { LEVELS } from "@/game/levels";
import { useProgress } from "@/game/storage";
import { cn } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Lock, MapPin, Star } from "lucide-react";
import { useRef } from "react";

export const Route = createFileRoute("/levels")({
  head: () => ({
    meta: [
      { title: "Levels — Purrzle" },
      { name: "description", content: "Pick a cat puzzle level and track your stars." },
      { property: "og:title", content: "Levels — Purrzle" },
      { property: "og:description", content: "Pick a cat puzzle level and track your stars." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Levels,
});

const OFFSETS = ["50%", "74%", "50%", "26%"]; // zigzag trail positions
const ROW = 154;

function Levels() {
  const [progress] = useProgress();
  const currentNode = useRef<HTMLDivElement>(null);
  const totalStars = Object.values(progress.stars).reduce((a, b) => a + b, 0);
  const next = LEVELS.find((level) => level.id <= progress.unlocked && !progress.stars[level.id])?.id ?? LEVELS.length;
  const height = LEVELS.length * ROW + 30;
  const pts = LEVELS.map((_, i) => ({ x: parseFloat(OFFSETS[i % 4] ?? "50%"), y: i * ROW + 80 }));
  const path = pts.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");

  return (
    <Screen>
      <Decor />
      <TopBar
        title="Cat Trail"
        right={
          <span className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 font-display font-semibold shadow-pop">
            <Star className="size-4 fill-star text-star-deep" /> {totalStars}/{LEVELS.length * 3}
          </span>
        }
      />
      <GameButton tone="plain" className="relative z-10 mx-auto flex items-center gap-2 py-2 text-base" onClick={() => currentNode.current?.scrollIntoView({ behavior: "auto", block: "center" })}>
        <MapPin className="size-4" /> {progress.stars[next] ? "Level" : "Next up · Level"} {next}
      </GameButton>
      <div className="relative z-10 mx-auto mt-5 w-full max-w-xs" style={{ height }}>
        <svg className="absolute inset-0 size-full" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden>
          <path d={path} fill="none" className="stroke-border" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={path} fill="none" className="stroke-card" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {LEVELS.map((l, i) => {
          const locked = l.id > progress.unlocked;
          const stars = progress.stars[l.id] ?? 0;
          const done = stars > 0;
          const current = l.id === next && !locked && !done;
          const node = cn(
            "relative grid size-[4.5rem] place-items-center rounded-full border-4 border-card text-2xl",
            !locked && "btn-game",
            locked && "bg-muted text-muted-foreground shadow-pop",
            done && "bg-mint text-ink [--btn-depth:var(--mint-deep)]",
            current && "animate-ring bg-primary text-primary-foreground [--btn-depth:var(--primary-deep)]",
          );
          const body = (
            <>
              {locked ? <Lock className="size-6" strokeWidth={2.6} /> : <span className="font-bold">{l.id}</span>}
              {done && (
                <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-card text-mint-deep shadow-pop">
                  <Check className="size-4" strokeWidth={3.5} />
                </span>
              )}
              {current && <CatIcon className="absolute -top-9 size-10 animate-float" />}
            </>
          );
          return (
            <div
              key={l.id}
              ref={l.id === next ? currentNode : undefined}
              data-level={l.id}
              className="animate-bounce-in absolute flex w-32 -translate-x-1/2 flex-col items-center gap-1 text-center"
              style={{ left: `${pts[i]?.x ?? 50}%`, top: (pts[i]?.y ?? 0) - 36, animationDelay: `${Math.min(i * 40, 240)}ms` }}
            >
              {locked ? (
                <div className={node} aria-label={`Level ${l.id}, locked`}>{body}</div>
              ) : (
                <Link to="/play/$levelId" params={{ levelId: String(l.id) }} className={node} aria-current={current ? "step" : undefined} aria-label={`Level ${l.id}${done ? `, ${stars} stars` : ", play now"}`}>
                  {body}
                </Link>
              )}
              <span className="flex h-5 items-center rounded-full bg-card/90 px-1.5 shadow-pop">
                {locked ? <span className="px-1 text-xs font-bold text-muted-foreground">{l.size}×{l.size}</span> : <Stars count={stars} size="size-3.5" />}
              </span>
              <span className="w-full font-display text-sm font-semibold leading-tight">{l.title}</span>
              <span className="text-xs font-semibold leading-tight text-muted-foreground">{l.difficulty} · {l.size}×{l.size}</span>
            </div>
          );
        })}
      </div>
      <p className="relative z-10 mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
        <Paw className="size-4" /> More trails coming soon
      </p>
    </Screen>
  );
}
