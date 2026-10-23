import { CatIcon, Paw } from "@/components/game/CatIcon";
import { Decor, GameButton, Screen, Stars, TopBar } from "@/components/game/ui";
import { LEVELS } from "@/game/levels";
import { useProgress } from "@/game/storage";
import { cn } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Crown, Lock, MapPin, Star } from "lucide-react";
import { Fragment, useRef } from "react";

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

/* ───────────────────────── layout constants ───────────────────────── */

const OFFSETS = ["50%", "74%", "50%", "26%"]; // zigzag trail positions
const ROW = 176;
const ZONE_SIZE = 5; // levels per zone
const ZONE_GAP = 84; // extra vertical room for each zone banner
const TOP = 64;
const STAR = "M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z";

type DecoKind = "flower" | "bush" | "cloud" | "yarn" | "mushroom" | "fish" | "mouse" | "star" | "bubble";

interface Zone {
  name: string;
  color: string;
  light: string;
  dark: string;
  decos: DecoKind[];
}

const ZONES: Zone[] = [
  { name: "Sunny Meadow", color: "#52D940", light: "#A5F28C", dark: "#2E9C1B", decos: ["flower", "bush", "cloud", "flower"] },
  { name: "Yarn Valley", color: "#FF5FD2", light: "#FF9BE6", dark: "#B5238F", decos: ["yarn", "mushroom", "yarn", "star"] },
  { name: "Fishy Harbor", color: "#3DA5FF", light: "#8FCBFF", dark: "#1A66C7", decos: ["fish", "cloud", "bubble", "fish"] },
  { name: "Mouse Hollow", color: "#FF9F1C", light: "#FFC46B", dark: "#C26A00", decos: ["mouse", "mushroom", "bush", "mouse"] },
  { name: "Moonlit Roofs", color: "#8E6BFF", light: "#B9A3FF", dark: "#5133C2", decos: ["star", "cloud", "star", "yarn"] },
];

const zoneOf = (i: number) => Math.floor(i / ZONE_SIZE);
const zoneData = (i: number) => ZONES[zoneOf(i) % ZONES.length]!;
const yOf = (i: number) => TOP + (zoneOf(i) + 1) * ZONE_GAP + i * ROW;

const PTS = LEVELS.map((_, i) => ({ x: parseFloat(OFFSETS[i % 4] ?? "50%"), y: yOf(i) }));
const HEIGHT = (PTS[PTS.length - 1]?.y ?? 0) + 150;
const ZONE_COUNT = Math.ceil(LEVELS.length / ZONE_SIZE);

type P = { x: number; y: number };
const seg = (a: P, b: P) => {
  const m = (a.y + b.y) / 2;
  return `C ${a.x} ${m}, ${b.x} ${m}, ${b.x} ${b.y}`;
};
const buildPath = (pts: P[]) => pts.map((p, i) => (i ? seg(pts[i - 1]!, p) : `M ${p.x} ${p.y}`)).join(" ");
const bez = (a: P, b: P, t: number) => {
  const m = (a.y + b.y) / 2;
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * a.x + 3 * u * t * t * b.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * m + 3 * u * t * t * m + t * t * t * b.y,
  };
};

const FULL_PATH = buildPath(PTS);

// paw prints walking along the curves between nodes
const PAWS = PTS.slice(0, -1).flatMap((a, i) => {
  const b = PTS[i + 1]!;
  return [0.36, 0.54, 0.72].map((t, k) => {
    const p = bez(a, b, t);
    const q = bez(a, b, t + 0.02);
    const vx = (q.x - p.x) * 3.2; // ~px per % of the 320px trail
    const vy = q.y - p.y;
    return { i, k, x: p.x + (k % 2 ? 1.8 : -1.8), y: p.y, rot: (Math.atan2(vx, -vy) * 180) / Math.PI };
  });
});

/* ───────────────────────── animations ───────────────────────── */

const CSS = `
@keyframes lv-sway   { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
@keyframes lv-drift  { 0%, 100% { transform: translateX(-7px); } 50% { transform: translateX(7px); } }
@keyframes lv-wobble { 0%, 100% { transform: rotate(-8deg) translateY(0); } 50% { transform: rotate(8deg) translateY(-3px); } }
@keyframes lv-float  { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes lv-twinkle{ 0%, 100% { opacity: .25; transform: scale(.5) rotate(0); } 50% { opacity: 1; transform: scale(1) rotate(45deg); } }
@keyframes lv-spin   { to { transform: rotate(360deg); } }
@keyframes lv-shake  { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-3px) rotate(-3deg); } 40% { transform: translateX(3px) rotate(3deg); } 60% { transform: translateX(-2px); } 80% { transform: translateX(2px); } }
@keyframes lv-walk   { 0%, 100% { opacity: .25; transform: translate(-50%, -50%) scale(.85); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.3); } }
@keyframes lv-draw   { from { stroke-dasharray: 1; stroke-dashoffset: 1; } to { stroke-dasharray: 1; stroke-dashoffset: 0; } }
@keyframes lv-pop    { 0% { opacity: 0; transform: translateX(-50%) scale(.7); } 70% { transform: translateX(-50%) scale(1.06); } 100% { opacity: 1; transform: translateX(-50%) scale(1); } }
@keyframes lv-bar    { to { background-position: 32px 0, 0 0; } }
@keyframes lv-grow   { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes lv-bob    { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-4px) rotate(3deg); } }
@keyframes lv-zz     { 0% { opacity: 0; transform: translate(0, 6px) scale(.6); } 25% { opacity: 1; } 100% { opacity: 0; transform: translate(10px, -26px) scale(1.2); } }

.lv-sway    { animation: lv-sway 3.6s ease-in-out infinite; transform-origin: 50% 95%; }
.lv-drift   { animation: lv-drift 6s ease-in-out infinite; }
.lv-wobble  { animation: lv-wobble 3s ease-in-out infinite; }
.lv-float   { animation: lv-float 3.2s ease-in-out infinite; }
.lv-twinkle { animation: lv-twinkle 2.4s ease-in-out infinite; }
.lv-spin    { animation: lv-spin 9s linear infinite; }
.lv-lock:hover { animation: lv-shake 380ms ease-in-out; }
.lv-walk    { animation: lv-walk 1.5s ease-in-out infinite; }
.lv-draw    { animation: lv-draw 1.6s cubic-bezier(.4,0,.2,1) 300ms both; }
.lv-pop     { animation: lv-pop 520ms cubic-bezier(.3,1.3,.5,1) both; }
.lv-bar     { animation: lv-bar 1s linear infinite, lv-grow 900ms cubic-bezier(.2,.8,.2,1) both; transform-origin: left; }
.lv-bob     { animation: lv-bob 1.6s ease-in-out infinite; }
.lv-zz      { animation: lv-zz 2.6s ease-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .lv-sway, .lv-drift, .lv-wobble, .lv-float, .lv-twinkle, .lv-spin, .lv-lock:hover, .lv-walk, .lv-draw, .lv-pop, .lv-bar, .lv-bob, .lv-zz { animation: none !important; }
  .lv-walk { opacity: 1; }
}
`;

const DECO_ANIM: Record<DecoKind, string> = {
  flower: "lv-sway", bush: "lv-sway", mushroom: "lv-sway", mouse: "lv-sway",
  cloud: "lv-drift", yarn: "lv-wobble", fish: "lv-wobble", star: "lv-twinkle", bubble: "lv-float",
};

/* ───────────────────────── scenery ───────────────────────── */

function Deco({ kind, color, dark }: { kind: DecoKind; color: string; dark: string }) {
  const cls = "size-full overflow-visible drop-shadow-[0_2px_0_rgba(0,0,0,0.12)]";
  switch (kind) {
    case "flower":
      return (
        <svg viewBox="0 0 40 48" className={cls} aria-hidden>
          <path d="M20 22 V46" stroke="#2E9C1B" strokeWidth="3" strokeLinecap="round" />
          <path d="M20 38 Q30 34 32 26 Q22 28 20 38Z" fill="#52D940" />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={20 + 8 * Math.cos((a * Math.PI) / 180)} cy={16 + 8 * Math.sin((a * Math.PI) / 180)} r="6" fill={color} />
          ))}
          <circle cx="20" cy="16" r="5" fill="#FFD60A" />
          <circle cx="18.5" cy="14.5" r="1.5" fill="#fff" opacity=".7" />
        </svg>
      );
    case "bush":
      return (
        <svg viewBox="0 0 48 40" className={cls} aria-hidden>
          <circle cx="14" cy="26" r="11" fill={dark} />
          <circle cx="34" cy="26" r="11" fill={dark} />
          <circle cx="24" cy="20" r="14" fill={color} />
          <circle cx="19" cy="15" r="4" fill="#fff" opacity=".3" />
          <circle cx="30" cy="22" r="1.8" fill="#FFD60A" />
          <circle cx="16" cy="26" r="1.8" fill="#FFD60A" />
        </svg>
      );
    case "cloud":
      return (
        <svg viewBox="0 0 60 34" className={cls} aria-hidden>
          <circle cx="18" cy="22" r="10" fill="#fff" />
          <circle cx="31" cy="16" r="13" fill="#fff" />
          <circle cx="44" cy="22" r="10" fill="#fff" />
          <rect x="14" y="22" width="36" height="10" rx="5" fill="#fff" />
          <path d="M18 29 Q31 33 46 29" stroke="#CFE3FF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "yarn":
      return (
        <svg viewBox="0 0 44 44" className={cls} aria-hidden>
          <circle cx="20" cy="20" r="15" fill={color} />
          <g stroke={dark} strokeWidth="2" strokeLinecap="round" fill="none">
            <path d="M7 16 Q20 26 33 14" />
            <path d="M6 24 Q20 34 34 22" />
            <path d="M12 8 Q19 21 11 32" />
          </g>
          <path d="M31 31 Q42 34 36 42" stroke={color} strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <circle cx="14" cy="13" r="4" fill="#fff" opacity=".35" />
        </svg>
      );
    case "mushroom":
      return (
        <svg viewBox="0 0 40 40" className={cls} aria-hidden>
          <rect x="15" y="22" width="10" height="15" rx="4" fill="#FFF4E0" />
          <path d="M3 25 Q3 4 20 4 Q37 4 37 25 Q20 30 3 25Z" fill={color} />
          <circle cx="13" cy="14" r="3" fill="#fff" opacity=".9" />
          <circle cx="26" cy="11" r="2.4" fill="#fff" opacity=".9" />
          <circle cx="29" cy="20" r="2.8" fill="#fff" opacity=".9" />
        </svg>
      );
    case "fish":
      return (
        <svg viewBox="0 0 48 32" className={cls} aria-hidden>
          <path d="M34 16 L46 6 L46 26Z" fill={dark} />
          <ellipse cx="20" cy="16" rx="17" ry="11" fill={color} />
          <path d="M16 6 Q22 0 28 7Z" fill={dark} />
          <path d="M10 22 Q20 29 30 21" stroke="#fff" strokeWidth="2" opacity=".4" fill="none" strokeLinecap="round" />
          <circle cx="11" cy="13" r="3.6" fill="#fff" />
          <circle cx="10.2" cy="13" r="1.7" fill="#1f1b2e" />
        </svg>
      );
    case "mouse":
      return (
        <svg viewBox="0 0 44 36" className={cls} aria-hidden>
          <path d="M34 28 Q46 27 42 16" stroke={dark} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <ellipse cx="24" cy="25" rx="14" ry="9" fill="#C9CFDD" />
          <circle cx="12" cy="22" r="9" fill="#C9CFDD" />
          <circle cx="8" cy="12" r="5.2" fill="#C9CFDD" />
          <circle cx="17" cy="11" r="5.2" fill="#C9CFDD" />
          <circle cx="8" cy="12" r="3" fill="#FFB4C8" />
          <circle cx="17" cy="11" r="3" fill="#FFB4C8" />
          <circle cx="9" cy="21" r="1.7" fill="#1f1b2e" />
          <circle cx="3.8" cy="24" r="2" fill="#FF8FB0" />
        </svg>
      );
    case "star":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden>
          <path d={STAR} fill="#FFE14D" />
        </svg>
      );
    case "bubble":
      return (
        <svg viewBox="0 0 40 40" className={cls} aria-hidden>
          <circle cx="20" cy="20" r="14" fill="#fff" fillOpacity=".18" stroke="#fff" strokeWidth="2.5" />
          <path d="M12 16 Q14 11 19 10" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      );
  }
}

/* ───────────────────────── page ───────────────────────── */

function Levels() {
  const [progress] = useProgress();
  const currentNode = useRef<HTMLDivElement>(null);
  const totalStars = Object.values(progress.stars).reduce((a, b) => a + b, 0);
  const next = LEVELS.find((level) => level.id <= progress.unlocked && !progress.stars[level.id])?.id ?? LEVELS.length;
  const nextIdx = Math.max(0, LEVELS.findIndex((l) => l.id === next));
  const walkedPath = nextIdx > 0 ? buildPath(PTS.slice(0, nextIdx + 1)) : "";

  const solvedCount = LEVELS.filter((l) => progress.stars[l.id]).length;
  const perfect = LEVELS.filter((l) => progress.stars[l.id] === 3).length;
  const pct = Math.round((solvedCount / LEVELS.length) * 100);

  return (
    <Screen>
      <style>{CSS}</style>
      <Decor />
      <TopBar
        title="Cat Trail"
        right={
          <span className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 font-display font-semibold shadow-pop">
            <Star className="size-4 fill-star text-star-deep" /> {totalStars}/{LEVELS.length * 3}
          </span>
        }
      />

      {/* progress hero */}
      <div className="relative z-10 mx-auto mt-6 w-full max-w-xs rounded-3xl bg-card/90 p-4 text-left shadow-pop">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Trail progress</p>
            <p className="font-display text-3xl font-bold leading-none">
              {solvedCount}
              <span className="text-lg text-muted-foreground">/{LEVELS.length}</span>
            </p>
          </div>
          <div className="-mt-9 size-16 shrink-0">
            <CatIcon variant={solvedCount} className="size-full drop-shadow-[0_3px_0_rgba(0,0,0,0.2)]" />
          </div>
        </div>

        <div
          className="mt-3 h-3.5 overflow-hidden rounded-full bg-border/60 shadow-inner"
          role="progressbar"
          aria-label="Levels solved"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div
            className="lv-bar h-full rounded-full"
            style={{
              width: `${Math.max(pct, 4)}%`,
              backgroundImage:
                "repeating-linear-gradient(135deg, rgba(255,255,255,.3) 0 8px, transparent 8px 16px), linear-gradient(90deg,#FF4D6D,#FF9F1C,#FFD60A,#6BE04B,#14D9C4,#3DA5FF,#8E6BFF)",
              backgroundSize: "32px 32px, 100% 100%",
            }}
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold">
          <span className="flex items-center justify-center gap-1 rounded-xl bg-muted/70 py-1.5">
            <Check className="size-3.5 text-mint-deep" strokeWidth={3.5} /> {solvedCount} solved
          </span>
          <span className="flex items-center justify-center gap-1 rounded-xl bg-muted/70 py-1.5">
            <Crown className="size-3.5 text-star-deep" /> {perfect} perfect
          </span>
          <span className="flex items-center justify-center gap-1 rounded-xl bg-muted/70 py-1.5">
            <MapPin className="size-3.5 text-primary" /> Zone {zoneOf(nextIdx) + 1}
          </span>
        </div>

        <GameButton
          className="mt-3 flex w-full items-center justify-center gap-2 py-2.5 text-base"
          onClick={() => currentNode.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
        >
          <MapPin className="size-4" /> {progress.stars[next] ? "Level" : "Next up · Level"} {next}
        </GameButton>
      </div>

      {/* trail */}
      <div className="relative z-10 mx-auto mt-6 w-full max-w-xs" style={{ height: HEIGHT }}>
        {/* soft zone tints */}
        {Array.from({ length: ZONE_COUNT }, (_, z) => {
          const zone = ZONES[z % ZONES.length]!;
          const first = z * ZONE_SIZE;
          const count = Math.min(ZONE_SIZE, LEVELS.length - first);
          return (
            <div
              key={z}
              aria-hidden
              className="pointer-events-none absolute -inset-x-[20%]"
              style={{
                top: yOf(first) - ZONE_GAP - 30,
                height: count * ROW + ZONE_GAP + 80,
                background: `radial-gradient(60% 50% at ${z % 2 ? "25%" : "75%"} 50%, ${zone.color}26, transparent 70%)`,
              }}
            />
          );
        })}

        {/* scenery on both sides of the trail */}
        {LEVELS.map((l, i) => {
          const zone = zoneData(i);
          const x = PTS[i]!.x;
          const left = x > 60 ? true : x < 40 ? false : i % 2 === 0;
          const kindA = zone.decos[i % 4]!;
          const kindB = zone.decos[(i + 2) % 4]!;
          const sizeA = 46 + (i % 3) * 8;
          const sizeB = 30 + (i % 2) * 8;
          const y = PTS[i]!.y;
          return (
            <Fragment key={l.id}>
              <div
                aria-hidden
                className={cn("pointer-events-none absolute z-0", DECO_ANIM[kindA])}
                style={{
                  [left ? "left" : "right"]: `${1 + (i % 3) * 3}%`,
                  top: y + ((i * 29) % 36) - 20,
                  width: sizeA,
                  height: sizeA,
                  animationDelay: `-${(i * 370) % 2400}ms`,
                }}
              >
                <Deco kind={kindA} color={zone.color} dark={zone.dark} />
              </div>
              <div
                aria-hidden
                className={cn("pointer-events-none absolute z-0", DECO_ANIM[kindB])}
                style={{
                  [left ? "right" : "left"]: "-3%",
                  top: y + ROW * 0.62,
                  width: sizeB,
                  height: sizeB,
                  animationDelay: `-${(i * 530) % 2400}ms`,
                }}
              >
                <Deco kind={kindB} color={zone.color} dark={zone.dark} />
              </div>
            </Fragment>
          );
        })}

        {/* trail path */}
        <svg className="absolute inset-0 z-[1] size-full" viewBox={`0 0 100 ${HEIGHT}`} preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="lv-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={HEIGHT}>
              {PTS.map((p, i) => (
                <stop key={i} offset={Math.min(1, p.y / HEIGHT)} stopColor={zoneData(i).color} />
              ))}
            </linearGradient>
          </defs>
          <path d={FULL_PATH} fill="none" className="stroke-border" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {walkedPath && (
            <path d={walkedPath} fill="none" stroke="url(#lv-grad)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" pathLength={1} className="lv-draw" />
          )}
          <path d={FULL_PATH} fill="none" className="stroke-card" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.9" />
        </svg>

        {/* paw prints walking the trail */}
        {PAWS.map((p) => {
          const walked = p.i < nextIdx;
          const leading = p.i === nextIdx;
          return (
            <span
              key={`${p.i}-${p.k}`}
              aria-hidden
              className={cn("pointer-events-none absolute z-[1] -translate-x-1/2 -translate-y-1/2", !walked && "text-card", leading && "lv-walk")}
              style={{
                left: `${p.x}%`,
                top: p.y,
                rotate: `${p.rot}deg`,
                color: walked ? zoneData(p.i).dark : undefined,
                animationDelay: `${p.k * 220}ms`,
                opacity: walked ? 0.9 : leading ? undefined : 0.8,
              }}
            >
              <Paw className="size-3.5" />
            </span>
          );
        })}

        {/* zone banners */}
        {Array.from({ length: ZONE_COUNT }, (_, z) => {
          const zone = ZONES[z % ZONES.length]!;
          const first = z * ZONE_SIZE;
          const slice = LEVELS.slice(first, first + ZONE_SIZE);
          const done = slice.filter((l) => progress.stars[l.id]).length;
          const zoneLocked = (slice[0]?.id ?? 0) > progress.unlocked;
          return (
            <div
              key={z}
              className={cn("lv-pop absolute left-1/2 z-[2] flex w-[86%] items-center justify-between rounded-2xl px-3 py-2 text-white", zoneLocked && "opacity-60 saturate-50")}
              style={{
                top: yOf(first) - 36 - ZONE_GAP + 14,
                background: `linear-gradient(135deg, ${zone.light}, ${zone.color} 60%)`,
                boxShadow: `0 4px 0 ${zone.dark}, 0 12px 16px -8px rgba(0,0,0,0.35), inset 0 2px 0 rgba(255,255,255,0.5)`,
                animationDelay: `${Math.min(z * 120, 400)}ms`,
              }}
            >
              <span className="flex items-center gap-2 text-left">
                <span className="grid size-8 place-items-center rounded-full bg-white/25">
                  {zoneLocked ? <Lock className="size-4" strokeWidth={2.8} /> : <Paw className="size-4" />}
                </span>
                <span className="flex flex-col leading-tight [text-shadow:0_1px_0_rgba(0,0,0,0.25)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">Zone {z + 1}</span>
                  <span className="font-display text-base font-bold">{zone.name}</span>
                </span>
              </span>
              <span className="flex items-center gap-1 rounded-full bg-black/15 px-2 py-1 text-xs font-bold">
                <Star className="size-3.5 fill-current" /> {done}/{slice.length}
              </span>
            </div>
          );
        })}

        {/* level nodes */}
        {LEVELS.map((l, i) => {
          const zone = zoneData(i);
          const locked = l.id > progress.unlocked;
          const stars = progress.stars[l.id] ?? 0;
          const done = stars > 0;
          const current = l.id === next && !locked && !done;
          const x = PTS[i]?.x ?? 50;
          const node = cn(
            "relative grid size-[4.5rem] place-items-center rounded-full border-4 border-card text-2xl",
            !locked && "btn-game",
            locked && "lv-lock bg-muted text-muted-foreground shadow-pop",
            done && "text-white [text-shadow:0_2px_0_rgba(0,0,0,0.25)]",
            current && "animate-ring bg-primary text-primary-foreground [--btn-depth:var(--primary-deep)]",
          );
          const nodeStyle = done
            ? ({
                backgroundImage: `radial-gradient(circle at 30% 25%, ${zone.light}, ${zone.color} 65%)`,
                ["--btn-depth" as string]: zone.dark,
              } as React.CSSProperties)
            : undefined;
          const body = (
            <>
              {locked ? <Lock className="size-6" strokeWidth={2.6} /> : <span className="font-bold">{l.id}</span>}
              {done && (
                <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-card text-mint-deep shadow-pop">
                  <Check className="size-4" strokeWidth={3.5} />
                </span>
              )}
              {stars === 3 && (
                <>
                  <span className="absolute -left-1.5 -top-2 grid size-6 -rotate-12 place-items-center rounded-full bg-card text-star-deep shadow-pop">
                    <Crown className="size-3.5 fill-current" />
                  </span>
                  <span aria-hidden className="lv-spin pointer-events-none absolute -inset-2 rounded-full border-2 border-dashed border-amber-300" />
                  {[
                    "-right-3 top-6 size-3",
                    "-left-3 bottom-3 size-2.5",
                    "right-2 -bottom-3 size-2",
                  ].map((c, k) => (
                    <svg key={c} viewBox="0 0 24 24" aria-hidden className={cn("lv-twinkle pointer-events-none absolute fill-amber-300", c)} style={{ animationDelay: `${k * 600}ms` }}>
                      <path d={STAR} />
                    </svg>
                  ))}
                </>
              )}
              {current && <CatIcon variant={i} className="absolute -top-9 size-10 animate-float" />}
              {current && (
                <span
                  aria-hidden
                  className={cn(
                    "lv-bob absolute -top-7 whitespace-nowrap rounded-xl bg-card px-2 py-0.5 text-xs font-bold text-primary shadow-pop",
                    x <= 50 ? "left-[calc(100%+0.1rem)]" : "right-[calc(100%+0.1rem)]",
                  )}
                >
                  Play!
                </span>
              )}
            </>
          );
          return (
            <div
              key={l.id}
              ref={l.id === next ? currentNode : undefined}
              data-level={l.id}
              className="animate-bounce-in absolute z-[3] flex w-32 -translate-x-1/2 flex-col items-center gap-1 text-center"
              style={{ left: `${x}%`, top: (PTS[i]?.y ?? 0) - 36, animationDelay: `${Math.min(i * 40, 240)}ms` }}
            >
              <div className="relative transition-transform duration-200 hover:z-10 hover:-rotate-3 hover:scale-110">
                {locked ? (
                  <div className={node} aria-label={`Level ${l.id}, locked`}>{body}</div>
                ) : (
                  <Link
                    to="/play/$levelId"
                    params={{ levelId: String(l.id) }}
                    className={node}
                    style={nodeStyle}
                    aria-current={current ? "step" : undefined}
                    aria-label={`Level ${l.id}${done ? `, ${stars} stars` : ", play now"}`}
                  >
                    {body}
                  </Link>
                )}
              </div>
              <span className="flex h-5 items-center rounded-full bg-card/90 px-1.5 shadow-pop">
                {locked ? <span className="px-1 text-xs font-bold text-muted-foreground">{l.size}×{l.size}</span> : <Stars count={stars} size="size-3.5" />}
              </span>
              <span className={cn("flex w-full flex-col rounded-xl bg-card/80 px-2 py-1 shadow-pop backdrop-blur-sm", locked && "opacity-80")}>
                <span className="font-display text-sm font-semibold leading-tight">{l.title}</span>
                <span className="text-xs font-semibold leading-tight text-muted-foreground">{l.difficulty} · {l.size}×{l.size}</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* end of the trail */}
      <div className="relative z-10 mt-2 flex flex-col items-center">
        <div className="relative">
          <CatIcon variant={5} animated={false} className="size-16 -rotate-6 opacity-90 drop-shadow-[0_3px_0_rgba(0,0,0,0.2)]" />
          {["right-[-0.6rem] top-0 text-lg", "right-[-1.4rem] -top-3 text-xl", "right-[-2.2rem] -top-7 text-2xl"].map((c, k) => (
            <span key={c} aria-hidden className={cn("lv-zz absolute font-display font-bold text-primary", c)} style={{ animationDelay: `${k * 700}ms` }}>
              z
            </span>
          ))}
        </div>
        <p className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
          <Paw className="size-4" /> More trails coming soon
        </p>
      </div>
    </Screen>
  );
}