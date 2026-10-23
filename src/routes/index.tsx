import mascot from "@/assets/mascot.png";
import { CAT_COUNT, CatIcon, Paw } from "@/components/game/CatIcon";
import { DailySummary } from "@/components/game/DailySummary";
import { Decor, GameButton, Screen } from "@/components/game/ui";
import { useDailyProgress, useLocalDay } from "@/game/daily";
import { LEVELS } from "@/game/levels";
import { useProgress } from "@/game/storage";
import { cn } from "@/lib/utils";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarHeart, Map as MapIcon, Play, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Purrzle — Cozy Cat Logic Puzzles" },
      { name: "description", content: "Place one cat in every row, column and colored region — without letting any cats touch." },
      { property: "og:title", content: "Purrzle — Cozy Cat Logic Puzzles" },
      { property: "og:description", content: "A cute, brainy cat placement puzzle game you can play anywhere." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const PAW_COLORS = ["#FF4D6D", "#FF9F1C", "#FFC400", "#6BE04B", "#14D9C4", "#3DA5FF", "#8E6BFF", "#FF5FD2"];
const MESSAGES = ["Purrr…", "Meow!", "More puzzles?", "Pet me again!", "Nya~", "Feed me logic!"];
const BURST_X = [-50, -30, -10, 12, 32, 52, 0];
const STAR = "M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z";

const CSS = `
@keyframes hm-boing {
  0%   { transform: scale(1, 1); }
  18%  { transform: scale(1.14, .84); }
  42%  { transform: scale(.9, 1.14); }
  66%  { transform: scale(1.05, .96); }
  100% { transform: scale(1, 1); }
}
@keyframes hm-rise {
  0%   { opacity: 0; transform: translate(0, 0) scale(.4) rotate(0); }
  15%  { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--x), -110px) scale(1.1) rotate(var(--r)); }
}
@keyframes hm-bubble {
  0%   { opacity: 0; transform: translateY(8px) scale(.5) rotate(-6deg); }
  14%  { opacity: 1; transform: translateY(0) scale(1.08) rotate(3deg); }
  24%  { transform: scale(1) rotate(2deg); }
  80%  { opacity: 1; }
  100% { opacity: 0; transform: translateY(-6px) scale(.9) rotate(2deg); }
}
@keyframes hm-twinkle {
  0%, 100% { opacity: .2; transform: scale(.4) rotate(0); }
  50%      { opacity: 1;  transform: scale(1) rotate(45deg); }
}
@keyframes hm-sweep {
  0%   { transform: translateX(-140%) skewX(-20deg); }
  55%, 100% { transform: translateX(260%) skewX(-20deg); }
}
@keyframes hm-nudge {
  0%, 100% { transform: translateX(0) scale(1); }
  50%      { transform: translateX(3px) scale(1.12); }
}
@keyframes hm-glow {
  0%, 100% { opacity: .35; transform: scaleX(.9); }
  50%      { opacity: .75; transform: scaleX(1.05); }
}
@keyframes hm-pawin {
  0%   { opacity: 0; transform: scale(.2) translateY(10px); }
  70%  { opacity: 1; transform: scale(1.25) translateY(-2px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes hm-hop {
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-5px) scale(1.18); }
}
@keyframes hm-ping {
  0%   { opacity: .7; transform: scale(.6); }
  100% { opacity: 0;  transform: scale(1.9); }
}
@keyframes hm-peek {
  0%   { opacity: 0; transform: translateY(22px) rotate(var(--rot)); }
  100% { opacity: 1; transform: translateY(0) rotate(var(--rot)); }
}

.hm-boing   { animation: hm-boing 520ms cubic-bezier(.3,1.2,.5,1) both; transform-origin: 50% 92%; }
.hm-burst   { animation: hm-rise 1100ms ease-out both; }
.hm-bubble  { animation: hm-bubble 1900ms ease-out both; }
.hm-twinkle { animation: hm-twinkle 2.6s ease-in-out infinite; }
.hm-sweep   { animation: hm-sweep 3.8s ease-in-out 1.2s infinite; }
.hm-nudge   { animation: hm-nudge 1.4s ease-in-out infinite; }
.hm-glow    { animation: hm-glow 2.6s ease-in-out infinite; }
.hm-pawin   { animation: hm-pawin 420ms cubic-bezier(.3,1.3,.5,1) backwards; }
.hm-hop     { animation: hm-hop 1s ease-in-out infinite; }
.hm-ping    { animation: hm-ping 1.6s ease-out infinite; }
.hm-peek    { animation: hm-peek 700ms cubic-bezier(.2,.9,.3,1.2) 500ms backwards; }

@media (prefers-reduced-motion: reduce) {
  .hm-boing, .hm-burst, .hm-bubble, .hm-twinkle, .hm-sweep, .hm-nudge, .hm-glow, .hm-pawin, .hm-hop, .hm-ping, .hm-peek { animation: none !important; }
}
`;

function Home() {
  const [progress] = useProgress();
  const [daily, , dailyLoaded] = useDailyProgress();
  const today = useLocalDay();
  const navigate = useNavigate();
  const [pet, setPet] = useState(0);
  const solved = Object.keys(progress.stars).length;
  const next = Math.min(progress.unlocked, LEVELS.length);
  const started = solved > 0;

  // the two little companions change as you solve more levels
  const catA = solved % CAT_COUNT;
  const catB = (solved + 4) % CAT_COUNT;

  return (
    <Screen className="home-screen items-center justify-between gap-6 text-center">
      <style>{CSS}</style>
      <Decor />

      <div className="relative z-10 flex w-full justify-end">
        <Link
          to="/settings"
          aria-label="Settings"
          className="btn-game group grid size-11 place-items-center bg-card/80 text-muted-foreground [--btn-depth:var(--border)]"
        >
          <SettingsIcon className="size-5 transition-transform duration-500 group-hover:rotate-90" />
        </Link>
      </div>

      <div className="animate-rise relative z-10 flex flex-col items-center">
        <div className="relative">
          <span className="absolute inset-x-6 bottom-3 h-8 rounded-[50%] bg-ink/15 blur-md" aria-hidden />

          {/* companions that change as you progress */}
          {/* <span
            aria-hidden
            className="hm-peek absolute -left-11 bottom-3 z-0 w-14"
            style={{ ["--rot" as string]: "-8deg" }}
          >
            <CatIcon variant={catA} className="size-full drop-shadow-[0_3px_0_rgba(0,0,0,0.2)]" />
          </span> */}
          {/* <span
            aria-hidden
            className="hm-peek absolute -right-11 bottom-3 z-0 w-14 [animation-delay:650ms]"
            style={{ ["--rot" as string]: "8deg" }}
          >
            <CatIcon variant={catB} className="size-full drop-shadow-[0_3px_0_rgba(0,0,0,0.2)]" />
          </span> */}

          {/* tap the kitten */}
          <button
            type="button"
            aria-label="Pet the kitten"
            onClick={() => setPet((n) => n + 1)}
            className="relative z-10 block cursor-pointer touch-manipulation select-none rounded-[2rem] outline-none focus-visible:ring-4 focus-visible:ring-ink/40"
          >
            <span key={pet} className={cn("block", pet > 0 && "hm-boing")}>
              <img src={mascot} alt="Purrzle the kitten" width={200} height={200} className="home-kitten animate-float relative w-48 sm:w-50" draggable={false} />
            </span>
          </button>

          {/* paw burst + speech bubble */}
          {pet > 0 && (
            <div key={pet} aria-hidden className="pointer-events-none absolute inset-0 z-20">
              {BURST_X.map((x, k) => (
                <span
                  key={k}
                  className="hm-burst absolute left-1/2 top-[45%] -ml-3"
                  style={{
                    ["--x" as string]: `${x}px`,
                    ["--r" as string]: `${(k % 2 ? 1 : -1) * (20 + k * 8)}deg`,
                    animationDelay: `${k * 45}ms`,
                    color: PAW_COLORS[(pet + k) % PAW_COLORS.length],
                  }}
                >
                  <Paw className="size-6 drop-shadow-sm" />
                </span>
              ))}
              <span className="hm-bubble absolute -top-1 right-0 whitespace-nowrap rounded-2xl rounded-bl-sm bg-card px-3 py-1.5 text-sm font-bold text-ink shadow-[0_3px_0_var(--border),0_8px_14px_-4px_rgba(0,0,0,0.25)]">
                {MESSAGES[(pet - 1) % MESSAGES.length]}
              </span>
            </div>
          )}
        </div>

        <div className="relative -mt-3 w-fit">
          <h1 className="wordmark text-[4.25rem] leading-none">Purrzle</h1>
          {[
            { c: "-left-4 top-1 size-4", d: "0s", col: PAW_COLORS[2] },
            { c: "-right-3 -top-1 size-5", d: "0.8s", col: PAW_COLORS[7] },
            { c: "right-6 -bottom-1 size-3", d: "1.5s", col: PAW_COLORS[5] },
          ].map((s) => (
            <svg
              key={s.c}
              viewBox="0 0 24 24"
              aria-hidden
              className={cn("hm-twinkle pointer-events-none absolute", s.c)}
              style={{ animationDelay: s.d, fill: s.col }}
            >
              <path d={STAR} />
            </svg>
          ))}
        </div>
        <p className="mt-4 max-w-[17rem] font-semibold text-muted-foreground">One cat per row, column &amp; color. No whisker touching!</p>
      </div>

      <div className="animate-rise relative z-10 w-full space-y-4 [animation-delay:120ms]">
        {/* Progress as a colourful trail of paw prints */}
        <div className="mx-auto grid max-w-xs grid-cols-10 justify-items-center gap-x-1.5 gap-y-2" aria-label={`${solved} of ${LEVELS.length} levels solved`}>
          {LEVELS.map((l, idx) => {
            const isSolved = !!progress.stars[l.id];
            const isNext = l.id === next && !isSolved;
            const unlocked = l.id <= progress.unlocked;
            const rot = l.id % 2 ? "-12deg" : "12deg";
            const style = {
              rotate: rot,
              marginTop: l.id % 2 ? 0 : 4,
              animationDelay: `${Math.min(idx * 22, 700)}ms`,
              color: isSolved ? PAW_COLORS[(l.id - 1) % PAW_COLORS.length] : undefined,
            };
            const paw = (
              <>
                {isNext && <span aria-hidden className="hm-ping absolute inset-0 rounded-full bg-secondary/50" />}
                <Paw
                  className={cn(
                    "relative size-6 drop-shadow-[0_1px_0_rgba(0,0,0,0.15)]",
                    !isSolved && (isNext ? "hm-hop text-secondary" : unlocked ? "text-secondary/50" : "text-border"),
                  )}
                />
              </>
            );
            const base = "hm-pawin relative grid size-6 place-items-center transition-transform duration-150";
            return unlocked ? (
              <Link
                key={l.id}
                to="/play/$levelId"
                params={{ levelId: String(l.id) }}
                aria-label={`Level ${l.id}${isSolved ? ", solved" : ""}`}
                title={`Level ${l.id}`}
                className={cn(base, "hover:-translate-y-1 hover:scale-125 active:scale-95")}
                style={style}
              >
                {paw}
              </Link>
            ) : (
              <span key={l.id} aria-hidden className={cn(base, "opacity-70")} style={style}>
                {paw}
              </span>
            );
          })}
        </div>

        <div className="relative">
          <span aria-hidden className="hm-glow absolute inset-x-8 -bottom-1 h-6 rounded-[50%] bg-primary/50 blur-xl" />
          <GameButton
            className="relative flex w-full flex-col items-center justify-center overflow-hidden py-4 leading-tight"
            onClick={() => navigate({ to: "/play/$levelId", params: { levelId: String(next) } })}
          >
            <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
              <span className="hm-sweep absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            </span>
            <span className="relative flex items-center gap-2 text-3xl font-bold">
              <Play className="hm-nudge size-7 fill-current" /> {started ? "Continue" : "Play"}
            </span>
            <span className="relative text-sm font-semibold opacity-85">Level {next} · {solved}/{LEVELS.length} solved</span>
          </GameButton>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <GameButton tone="secondary" className="group flex items-center justify-center gap-2 text-base" onClick={() => navigate({ to: "/daily" })}>
            <CalendarHeart className="size-5 transition-transform duration-200 group-hover:scale-125 group-hover:-rotate-6" /> Daily
          </GameButton>
          <GameButton tone="mint" className="group flex items-center justify-center gap-2 text-base" onClick={() => navigate({ to: "/levels" })}>
            <MapIcon className="size-5 transition-transform duration-200 group-hover:scale-125 group-hover:rotate-6" /> Levels
          </GameButton>
        </div>
        {today && dailyLoaded && <DailySummary today={today} progress={daily} onPlay={() => navigate({ to: "/daily-play/$date", params: { date: today } })} />}
      </div>
    </Screen>
  );
}