import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CircleHelp, Home, Lightbulb, Pause, Play, RotateCcw, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import mascot from "@/assets/mascot.png";
import { Kitten, type KittenMood } from "@/components/game/Kitten";
import { Tutorial } from "@/components/game/Tutorial";
import { useTutorial } from "@/game/useTutorial";
import { Board } from "@/components/game/Board";
import { GameButton, Stars } from "@/components/game/ui";
import { LEVELS } from "@/game/levels";
import { blip } from "@/game/sound";
import { computeStars, useSettings } from "@/game/storage";
import { useGame, type GameState } from "@/game/useGame";
import { useCellTaps, type CellTool } from "@/game/useCellTaps";
import type { Puzzle } from "@/game/rules";
import { cn } from "@/lib/utils";

import { formatDay } from "@/game/daily";

interface DailyGameOptions {
  date: string;
  currentStreak: number;
  bestStreak: number;
  initial?: GameState | undefined;
  onSave: (state: GameState) => void;
  onComplete: (state: GameState) => void;
}

export function Game({ puzzle, onReplay, daily, locked = false, onMainComplete, main }: { puzzle: Puzzle; onReplay: () => void; daily?: DailyGameOptions; locked?: boolean; onMainComplete?: (stars: number) => void; main?: { initial?: GameState | undefined; onSave: (state: GameState) => void } }) {
  const navigate = useNavigate();
  const [settings] = useSettings();
  const g = useGame(puzzle, daily ? daily.initial : main?.initial);
  const [paused, setPaused] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [won, setWon] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [nudge, setNudge] = useState<string | null>(null);
  const prevDone = useRef(0);
  const tutorial = useTutorial();
  const [mood, setMood] = useState<KittenMood>("thinking");
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);
  const react = (next: KittenMood) => {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    setMood(next);
    reactionTimer.current = setTimeout(() => setMood("thinking"), 1200);
  };

  const sfx = (k: Parameters<typeof blip>[0]) => settings.sound && blip(k);
  const flash = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 1600);
  };
  const deny = (key: string) => {
    setNudge(null);
    requestAnimationFrame(() => setNudge(key));
  };

  const onPlace = (i: number, tool: CellTool) => {
    const { state, clash } = g.place(i, tool);
    sfx(clash ? "error" : state === 2 ? "place" : "mark");
    react(clash ? "incorrect" : "idle");
    if (clash) flash("Not quite! Try another spot.");
    if (navigator.vibrate && clash) navigator.vibrate(30);
  };
  const taps = useCellTaps(onPlace, tutorial.open || paused || confirmRestart || won !== null || g.solved || locked);

  useEffect(() => {
    // Placement already provides its own sound; region glow stays subtle and silent.
    prevDone.current = g.doneRegions.size;
    if (g.solved && won === null) {
      const stars = computeStars(g.hintsUsed, g.mistakes);
      setWon(stars);
      sfx("win");
      if (daily) daily.onComplete(g.state);
      else onMainComplete?.(stars);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.solved, g.doneRegions.size]);

  useEffect(() => {
    if (daily && !g.solved) daily.onSave(g.state);
    if (!daily && main && !locked) main.onSave(g.state);
    // Game state is the trigger; callback identity must not create a save loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.state]);

  if (locked) {
    return (
      <main className="animate-page mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <img src={mascot} alt="" width={816} height={816} className="w-36 opacity-80 grayscale-[40%]" />
        <h1 className="text-3xl font-bold">Level {puzzle.id} is locked</h1>
        <p className="text-muted-foreground">Solve the earlier levels to open this path.</p>
        <Link to="/levels" className="btn-game bg-primary px-6 py-3 text-lg text-primary-foreground">See the trail</Link>
      </main>
    );
  }

  const hasNext = !daily && puzzle.id < LEVELS.length;
  const iconBtn = "btn-game grid size-11 place-items-center bg-card text-foreground [--btn-depth:var(--border)]";

  return (
    <main className="animate-page mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-2">
        <Link to={daily ? "/daily" : "/levels"} aria-label={daily ? "Back to daily calendar" : "Back to levels"} className={iconBtn}>
          <ArrowLeft className="size-5" strokeWidth={2.6} />
        </Link>
        <div className="flex-1 text-center">
          <h1 className="text-xl font-bold leading-tight">{daily ? "Daily Purrzle" : `Level ${puzzle.id}`}
            {daily && <span className="mt-0.5 block text-xs font-semibold text-muted-foreground">{formatDay(daily.date)}</span>}</h1>
          <div className="mt-1 flex items-center justify-center gap-1" aria-label={`${g.catCount} of ${puzzle.size} cats placed`}>
            {Array.from({ length: puzzle.size }, (_, i) => (
              <span key={i} className={cn("size-2.5 rounded-full transition-all duration-200", i < g.catCount ? "scale-110 bg-primary" : "bg-border")} />
            ))}
          </div>
        </div>
        <GameButton tone="plain" aria-label="Help" title="How to play" className={cn(iconBtn, "p-0")} onClick={() => { taps.cancel(); tutorial.replay(); }}><CircleHelp className="size-5" /></GameButton>
        <GameButton tone="plain" onClick={() => { taps.cancel(); setPaused(true); }} aria-label="Pause" className={cn(iconBtn, "p-0")}>
          <Pause className="size-5 fill-current" />
        </GameButton>
      </header>

      <div className="relative mt-3 flex flex-1 flex-col justify-center gap-2">
        <Board
          puzzle={puzzle}
          board={g.board}
          conflicts={new Set([...g.wrongCats, ...(settings.showConflicts ? g.conflicts : [])])}
          doneRegions={g.doneRegions}
          hintIndex={g.hintIndex}
          onCell={taps.tap}
          onKeyboard={taps.keyboard}
          disabled={tutorial.open || paused || confirmRestart || won !== null}
        />
        <div className="flex h-14 w-full items-center justify-center gap-2" aria-live="polite">
          <Kitten mood={mood} className="size-14" react />
          <div role="status" className={cn("max-w-64 text-sm font-semibold", mood === "incorrect" ? "text-destructive" : "text-muted-foreground")}>{toast ?? `${g.catCount} / ${puzzle.size} cats home`}</div>
        </div>
      </div>

      <nav className="mt-3 grid grid-cols-3 gap-2.5">
        <ToolButton label="Undo" nudge={nudge === "undo"} onClick={() => { taps.cancel(); g.canUndo ? (g.undo(), sfx("tap")) : (deny("undo"), flash("Nothing to undo")); }} dim={!g.canUndo}>
          <Undo2 className="size-6" strokeWidth={2.4} />
        </ToolButton>
        <ToolButton label={`Hint${g.hintsUsed ? ` · ${g.hintsUsed}` : ""}`} onClick={() => { taps.cancel(); g.hint(); react("hint"); sfx("tap"); flash("Look at the glowing tile"); }}>
          <Lightbulb className="size-6 text-star-deep" strokeWidth={2.4} />
        </ToolButton>
        <ToolButton label="Restart" nudge={nudge === "restart"} onClick={() => { taps.cancel(); g.canUndo ? setConfirmRestart(true) : (deny("restart"), flash("Already fresh")); }} dim={!g.canUndo}>
          <RotateCcw className="size-6" strokeWidth={2.4} />
        </ToolButton>
      </nav>
      <p className="mt-3 text-center text-xs font-semibold text-muted-foreground">Tap: ✕ <span className="mx-2 text-border">|</span> Double tap: cat</p>

      {tutorial.open && !locked && <Tutorial onComplete={tutorial.complete} />}

      {paused && (
        <Overlay>
          <Kitten mood="idle" className="-mt-14 size-28" />
          <h2 className="text-3xl font-bold">Paused</h2>
          <p className="-mt-2 text-muted-foreground">The cats are napping.</p>
          <GameButton className="flex w-full items-center justify-center gap-2" onClick={() => setPaused(false)}>
            <Play className="size-5 fill-current" /> Resume
          </GameButton>
          <GameButton tone="plain" className="w-full" onClick={() => { setPaused(false); setConfirmRestart(true); }}>Restart level</GameButton>
          <GameButton tone="plain" className="flex w-full items-center justify-center gap-2" onClick={() => navigate({ to: "/" })}>
            <Home className="size-5" /> Home
          </GameButton>
        </Overlay>
      )}

      {confirmRestart && (
        <Overlay>
          <h2 className="text-2xl font-bold">Start over?</h2>
          <p className="-mt-2 text-sm text-muted-foreground">Your cats and marks will be cleared. You can still undo.</p>
          <div className="grid w-full grid-cols-2 gap-3">
            <GameButton tone="plain" className="text-base" onClick={() => setConfirmRestart(false)}>Cancel</GameButton>
            <GameButton className="text-base" onClick={() => { g.restart(); setConfirmRestart(false); }}>Restart</GameButton>
          </div>
        </Overlay>
      )}

      {won !== null && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-background/95 px-6 py-6 animate-overlay" role="dialog" aria-modal aria-label={daily ? "Daily complete" : "Level complete"}>
          <div className="relative flex w-full max-w-xs flex-col items-center gap-4 text-center">
            <Sparkles count={won === 3 ? 12 : 6} />
            <Kitten mood="victory" className="size-40 animate-bounce-in" />
            <h2 className="wordmark text-5xl">Purrfect!</h2>
            <div className="py-2"><Stars count={won} size="size-12" animate /></div>
            <p className="text-sm font-semibold text-muted-foreground">
              {g.hintsUsed} hint{g.hintsUsed === 1 ? "" : "s"} · {g.mistakes} clash{g.mistakes === 1 ? "" : "es"}
              {hasNext && !daily && ` · Level ${puzzle.id + 1} unlocked!`}
            </p>
            {daily && <p className="font-display text-lg font-semibold">{daily.currentStreak} day{daily.currentStreak === 1 ? "" : "s"} streak · Best {daily.bestStreak}</p>}
            <div className="mt-2 w-full space-y-3">
              {daily ? (
                <GameButton className="flex w-full items-center justify-center gap-2" onClick={() => navigate({ to: "/" })}><Home className="size-5" /> Home</GameButton>
              ) : hasNext ? (
                <GameButton className="w-full py-4 text-2xl" onClick={() => navigate({ to: "/play/$levelId", params: { levelId: String(puzzle.id + 1) } })}>
                  Next level
                </GameButton>
              ) : (
                <p className="font-display text-lg">You solved every level! More coming soon.</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <GameButton tone="plain" className="flex items-center justify-center gap-1.5 text-base" onClick={onReplay}>
                  <RotateCcw className="size-4 shrink-0" /> {!daily && won < 3 ? "Try for 3★" : "Replay"}
                </GameButton>
                <GameButton tone="plain" className="text-base" onClick={() => navigate({ to: daily ? "/daily" : "/levels" })}>{daily ? "Calendar" : "Trail"}</GameButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ToolButton({ label, children, dim, nudge, onClick }: { label: string; children: React.ReactNode; onClick: () => void; dim?: boolean; nudge?: boolean }) {
  return (
    <GameButton tone="plain"
      onClick={onClick}
      aria-disabled={dim}
      className={cn(
        "btn-game flex flex-col items-center gap-0.5 bg-card px-0 py-2.5 text-foreground [--btn-depth:var(--border)]",
        dim && "text-muted-foreground opacity-60",
        nudge && "animate-nudge",
      )}
    >
      {children}
      <span className="text-sm">{label}</span>
    </GameButton>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/45 p-6 animate-overlay" role="dialog" aria-modal>
      <div className="animate-bounce-in relative flex w-full max-w-xs flex-col items-center gap-4 rounded-[2rem] border-4 border-card bg-background p-6 text-center shadow-soft">
        {children}
      </div>
    </div>
  );
}

const SPARKS = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2;
  const d = 120 + (i % 3) * 30;
  return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, delay: (i % 4) * 50, tone: i % 4 };
});

function Sparkles({ count }: { count: number }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-24" aria-hidden>
      {SPARKS.slice(0, count).map((s, i) => (
        <span
          key={i}
          className={cn("animate-sparkle absolute size-3", i % 2 ? "rounded-full" : "rotate-45 rounded-sm", ["bg-star", "bg-primary", "bg-secondary", "bg-mint"][s.tone])}
          style={{ "--dx": `${s.dx}px`, "--dy": `${s.dy}px`, animationDelay: `${s.delay}ms` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
