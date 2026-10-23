import { useRef } from "react";
import type { Board as BoardT, Puzzle } from "@/game/rules";
import { cn } from "@/lib/utils";
// import { CatIcon } from "./CatIcon";
import { GameButton } from "./ui";
import type { CellTool } from "@/game/useCellTaps";
import { CatIcon3DD } from "./CatIcon";

// [base, light, dark] per region. Vivid on purpose; swap freely.
const PALETTE: any= [
  ["#FF4D6D", "#FF8FA3", "#B8213F"], // coral red
  ["#FF9F1C", "#FFC46B", "#C26A00"], // orange
  ["#FFD60A", "#FFE96B", "#C79A00"], // sun yellow
  ["#6BE04B", "#A5F28C", "#2E9C1B"], // lime
  ["#14D9C4", "#7BF0E2", "#0A8F80"], // aqua
  ["#3DA5FF", "#8FCBFF", "#1A66C7"], // sky
  ["#8E6BFF", "#B9A3FF", "#5133C2"], // violet
  ["#FF5FD2", "#FF9BE6", "#B5238F"], // pink
];

const SPARKS = [0, 60, 120, 180, 240, 300];

const CSS = `
.bd-root {
  --bd-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
.bd-grain { background-image: var(--bd-noise); background-size: 160px 160px; mix-blend-mode: multiply; }

@keyframes bd-deal {
  0%   { opacity: 0; transform: perspective(300px) rotateX(-95deg) translateY(-20%); }
  70%  { opacity: 1; transform: perspective(300px) rotateX(12deg); }
  100% { opacity: 1; transform: perspective(300px) rotateX(0) translateY(0); }
}
@keyframes bd-stamp {
  0%   { opacity: 0; transform: scale(2.1) rotate(-16deg); }
  55%  { opacity: 1; transform: scale(.86) rotate(3deg); }
  78%  { transform: scale(1.06) rotate(-1deg); }
  100% { opacity: 1; transform: scale(1) rotate(0); }
}
@keyframes bd-impact {
  0%   { opacity: .8; transform: scale(.3); border-width: 6px; }
  100% { opacity: 0;  transform: scale(1.5); border-width: 1px; }
}
@keyframes bd-spark {
  0%   { top: 42%; opacity: 1; transform: scale(1); }
  100% { top: -4%; opacity: 0; transform: scale(.3); }
}
@keyframes bd-wiggle {
  0%, 100% { transform: rotate(0); }
  20% { transform: rotate(-9deg); } 40% { transform: rotate(8deg); }
  60% { transform: rotate(-5deg); } 80% { transform: rotate(4deg); }
}
@keyframes bd-stripes { to { background-position: 34px 0; } }
@keyframes bd-foil { 0% { background-position: 160% 0; } 55%, 100% { background-position: -60% 0; } }
@keyframes bd-spin { to { transform: rotate(360deg); } }
@keyframes bd-bob  { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-6%) rotate(2deg); } }
@keyframes bd-hint { 0%, 100% { transform: scale(.92); } 50% { transform: scale(1.05); } }

.bd-deal   { animation: bd-deal 560ms cubic-bezier(.2,.8,.2,1) both; transform-origin: 50% 0; }
.bd-stamp  { animation: bd-stamp 480ms cubic-bezier(.3,1.2,.4,1) both; }
.bd-impact { animation: bd-impact 520ms ease-out forwards; }
.bd-spark  { animation: bd-spark 520ms ease-out forwards; }
.bd-wiggle { animation: bd-wiggle 480ms ease-in-out both; }
.bd-stripes{ animation: bd-stripes 900ms linear infinite; }
.bd-foil   { animation: bd-foil 3.6s ease-in-out infinite; }
.bd-spin   { animation: bd-spin 7s linear infinite; }
.bd-bob    { animation: bd-bob 2.6s ease-in-out infinite; }
.bd-hintp  { animation: bd-hint 1.2s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .bd-deal, .bd-stamp, .bd-impact, .bd-spark, .bd-wiggle, .bd-stripes, .bd-foil, .bd-spin, .bd-bob, .bd-hintp { animation: none !important; }
}
`;

interface Props {
  puzzle: Puzzle;
  board: BoardT;
  conflicts: Set<number>;
  doneRegions: Set<number>;
  hintIndex: number | null;
  onCell: (i: number) => void;
  onKeyboard: (i: number, tool: CellTool) => void;
  disabled?: boolean;
}

export function Board({ puzzle, board, conflicts, doneRegions, hintIndex, onCell, onKeyboard, disabled }: Props) {
  const { size, regions } = puzzle;
  const gridRef = useRef<HTMLDivElement>(null);

  const focusCell = (n: number) => gridRef.current?.querySelector<HTMLElement>(`[data-i="${n}"]`)?.focus();

  const handleArrows = (key: string, r: number, c: number) => {
    let nr = r, nc = c;
    if (key === "ArrowUp") nr--;
    else if (key === "ArrowDown") nr++;
    else if (key === "ArrowLeft") nc--;
    else if (key === "ArrowRight") nc++;
    else return false;
    if (nr >= 0 && nc >= 0 && nr < size && nc < size) focusCell(nr * size + nc);
    return true;
  };

  return (
    <div className="bd-root relative w-full pb-1">
      <style>{CSS}</style>

      <svg width="0" height="0" className="absolute" aria-hidden>
        <filter id="bd-rough" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
        </filter>
      </svg>

      <div className="relative aspect-square w-full">
        <div
          ref={gridRef}
          role="grid"
          aria-label={`${size} by ${size} puzzle board`}
          className="absolute inset-0 grid size-full"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {board.map((v, i) => {
            const r = Math.floor(i / size);
            const c = i % size;
            const g = regions[i] ?? 0;
            const [base, light, dark] = PALETTE[g % PALETTE.length];

            const bad = conflicts.has(i);
            const done = doneRegions.has(g);
            const hinted = hintIndex === i;
            const tilt = ((i * 7) % 5) - 2;

            return (
              <GameButton
                variant="cell"
                tone="plain"
                key={i}
                role="gridcell"
                data-i={i}
                disabled={disabled}
                onClick={(event) => { if (event.detail === 0) onKeyboard(i, "cat"); else onCell(i); }}
                onKeyDown={(event) => {
                  if (handleArrows(event.key, r, c)) { event.preventDefault(); return; }
                  if (event.repeat) return;
                  if (event.key === "Enter" || event.key === " " || event.key.toLowerCase() === "x") {
                    event.preventDefault();
                    onKeyboard(i, event.key === "Enter" ? "cat" : "pencil");
                  }
                }}
                aria-keyshortcuts="Enter Space X ArrowKeys"
                title="Tap: mark · Double tap: cat · Enter: cat · Space: mark · Arrows: move"
                aria-label={`Row ${r + 1}, column ${c + 1}, ${v === 2 ? "cat" : v === 1 ? "marked" : "empty"}${bad ? ", conflict" : ""}`}
                className="group relative z-0 box-border aspect-square size-full min-h-0 min-w-0 touch-manipulation select-none overflow-visible border-0 bg-transparent p-0 outline-none hover:z-10 focus-visible:z-10"
              >
                {/* separate block: own gap on every side, extra room at the bottom for the extrusion */}
                <span
                  aria-hidden={false}
                  className="bd-deal pointer-events-none absolute inset-x-[3px] top-[3px] bottom-[7px]"
                  style={{ animationDelay: `${(r + c) * 40 + (i % 3) * 18}ms` }}
                >
                  <span
                    className={cn(
                      "absolute inset-0 rounded-[14px] transition-[transform,box-shadow,filter] duration-150 ease-out",
                      "shadow-[inset_0_2px_0_rgba(255,255,255,0.6),inset_0_-3px_0_rgba(0,0,0,0.1),0_4px_0_var(--dk),0_8px_10px_-2px_rgba(0,0,0,0.3)]",
                      "group-hover:-translate-y-[2px] group-hover:brightness-[1.08]",
                      "group-hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.7),inset_0_-3px_0_rgba(0,0,0,0.1),0_6px_0_var(--dk),0_12px_14px_-3px_rgba(0,0,0,0.35)]",
                      "group-active:translate-y-[3px] group-active:brightness-95",
                      "group-active:shadow-[inset_0_2px_0_rgba(255,255,255,0.4),inset_0_-2px_0_rgba(0,0,0,0.1),0_1px_0_var(--dk),0_2px_3px_-1px_rgba(0,0,0,0.3)]",
                      "group-focus-visible:ring-[3px] group-focus-visible:ring-ink group-focus-visible:ring-offset-2",
                    )}
                    style={{
                      ["--dk" as string]: dark,
                      backgroundImage: `radial-gradient(120% 90% at 25% 10%, ${light} 0%, ${base} 60%)`,
                    }}
                  >
                    {/* paper grain */}
                    <span className="bd-grain pointer-events-none absolute inset-0 rounded-[inherit] opacity-[0.2]" />
                    {/* glossy highlight */}
                    <span className="pointer-events-none absolute inset-x-[10%] top-[6%] h-[26%] rounded-full bg-gradient-to-b from-white/50 to-transparent" />

                    {/* completed region: gold foil sweep */}
                    {done && (
                      <span
                        aria-hidden
                        className="bd-foil pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-overlay"
                        style={{
                          backgroundImage:
                            "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.95) 48%, rgba(255,230,140,0.8) 54%, transparent 70%)",
                          backgroundSize: "250% 100%",
                          animationDelay: `${(r + c) * 110}ms`,
                        }}
                      />
                    )}

                    {/* conflict: moving hazard stripes */}
                    {bad && (
                      <span
                        aria-hidden
                        className="bd-stripes pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-inset ring-destructive"
                        style={{
                          backgroundImage:
                            "repeating-linear-gradient(135deg, rgba(200,20,40,0.45) 0 8px, rgba(200,20,40,0.08) 8px 17px)",
                          backgroundSize: "34px 34px",
                        }}
                      />
                    )}

                    {/* hint: rotating dashed ring */}
                    {hinted && (
                      <span aria-hidden className="bd-hintp pointer-events-none absolute inset-[5px]">
                        <span className="bd-spin absolute inset-0 rounded-full border-[3px] border-dashed border-ink/80" />
                      </span>
                    )}

                    {/* pencil mark */}
                    {v === 1 && (
                      <svg
                        viewBox="0 0 24 24"
                        className="pointer-events-none absolute left-[29%] top-[29%] size-[42%] text-ink/70"
                        style={{ filter: "url(#bd-rough)" }}
                        aria-hidden
                      >
                        <path d="M5 5 L19 19" pathLength={1} className="animate-draw stroke-current" strokeWidth="3" strokeLinecap="round" fill="none" />
                        <path d="M19 5 L5 19" pathLength={1} className="animate-draw stroke-current [animation-delay:80ms]" strokeWidth="3" strokeLinecap="round" fill="none" />
                      </svg>
                    )}

                    {/* cat sticker, stamped onto the block */}
                    {v === 2 && (
                      <>
                        {!bad && (
                          <>
                            <span aria-hidden className="bd-impact pointer-events-none absolute inset-[10%] rounded-full border-solid border-white/80" />
                            {SPARKS.map((a, k) => (
                              <span
                                key={a}
                                aria-hidden
                                className="pointer-events-none absolute inset-0"
                                style={{ transform: `rotate(${a + 15}deg)` }}
                              >
                                <span
                                  className={cn("bd-spark absolute left-1/2 size-[9%] -translate-x-1/2 rounded-full", k % 2 ? "bg-white" : "bg-amber-300")}
                                  style={{ animationDelay: `${k * 12}ms` }}
                                />
                              </span>
                            ))}
                          </>
                        )}
                        <span
                          key={bad ? "bad" : "ok"}
                          className="pointer-events-none absolute inset-[8%]"
                          style={{ rotate: `${tilt}deg` }}
                        >
                          <span className={cn("block size-full", bad ? "bd-wiggle" : "bd-stamp")}>
                            <span className={cn("block size-full", !bad && done && "bd-bob")}>
                              <CatIcon3DD
                                className="size-full drop-shadow-[0_3px_0_rgba(0,0,0,0.3)] drop-shadow-[0_6px_6px_rgba(0,0,0,0.25)]"
                                mood={bad ? "upset" : "auto"}
                                variant={g}
                              />
                            </span>
                          </span>
                        </span>
                      </>
                    )}
                  </span>
                </span>
              </GameButton>
            );
          })}
        </div>
      </div>
    </div>
  );
}