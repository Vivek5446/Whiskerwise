import { useId, type CSSProperties } from "react";

type Pattern = "none" | "tabby" | "tux" | "points" | "calico" | "spots";
type EarShape = "point" | "round" | "fold";

interface CatSpec {
  name: string;
  fur: string;
  earL?: string; // override ear colour (defaults to fur)
  earR?: string;
  accent: string; // stripes / spots / mask
  muzzle: string;
  inner: string; // inner ear
  eye: string;
  cheek: string;
  pattern: Pattern;
  ears: EarShape;
}

const CATS: CatSpec[] = [
  { name: "Marmalade", fur: "#FF9F55", accent: "#D9662A", muzzle: "#FFF1E0", inner: "#FFB4B0", eye: "#7BD65A", cheek: "#FF7F7F", pattern: "tabby", ears: "point" },
  { name: "Tuxedo", fur: "#3A3552", accent: "#FFFFFF", muzzle: "#FFFFFF", inner: "#FF9BB3", eye: "#FFD43B", cheek: "#FF8FA8", pattern: "tux", ears: "point" },
  { name: "Siamese", fur: "#F7E8D0", earL: "#7C5A47", earR: "#7C5A47", accent: "#7C5A47", muzzle: "#FFF8EC", inner: "#C9A08A", eye: "#4CB5FF", cheek: "#E9A08F", pattern: "points", ears: "point" },
  { name: "Calico", fur: "#FFF9F1", earL: "#FF9F55", earR: "#3A3552", accent: "#FF9F55", muzzle: "#FFFFFF", inner: "#FFB4B0", eye: "#59C96B", cheek: "#FF9FA8", pattern: "calico", ears: "round" },
  { name: "Fold", fur: "#9CA8BF", accent: "#6F7C96", muzzle: "#E9EEF8", inner: "#C7D0E2", eye: "#FFB02E", cheek: "#F59CB0", pattern: "none", ears: "fold" },
  { name: "Snowy", fur: "#FFFFFF", accent: "#E4E8F2", muzzle: "#FFE6EE", inner: "#FFB6C8", eye: "#5BC0FF", cheek: "#FF9FB8", pattern: "none", ears: "round" },
  { name: "Spotty", fur: "#F4C24D", accent: "#8A5A12", muzzle: "#FFF3CF", inner: "#FFB4A0", eye: "#3FD0B5", cheek: "#FF8A7A", pattern: "spots", ears: "round" },
  { name: "Lilac", fur: "#C9A7FF", accent: "#9B74E8", muzzle: "#F3E9FF", inner: "#FFB0D8", eye: "#FFE14D", cheek: "#FF8FC0", pattern: "tabby", ears: "point" },
];

export const CAT_COUNT = CATS.length;

const EARS: any = {
  point: {
    l: "M12 28 L13 7 L29 19 Z",
    r: "M52 28 L51 7 L35 19 Z",
    il: "M17 21 L17.5 13 L24 18 Z",
    ir: "M47 21 L46.5 13 L40 18 Z",
  },
  round: {
    l: "M11 28 Q7 9 20 10 Q29 12 30 20 Z",
    r: "M53 28 Q57 9 44 10 Q35 12 34 20 Z",
    il: "M15.5 22 Q14 15 20 15.5 Q24 17 25 20 Z",
    ir: "M48.5 22 Q50 15 44 15.5 Q40 17 39 20 Z",
  },
  fold: {
    l: "M12 29 L7 20 Q18 9 30 20 Z",
    r: "M52 29 L57 20 Q46 9 34 20 Z",
    il: "M13 26 L10.5 21 Q18 14 24 20 Z",
    ir: "M51 26 L53.5 21 Q46 14 40 20 Z",
  },
};

const CSS = `
.cat-sway   { animation: cat-sway 4.2s ease-in-out infinite; animation-delay: var(--cd, 0s); transform-origin: 32px 58px; }
.cat-shiver { animation: cat-shiver .18s linear infinite; }
.cat-ear    { transform-box: fill-box; transform-origin: 50% 100%; }
.cat-ear-l  { animation: cat-twitch-l 6s ease-in-out infinite; animation-delay: var(--cd, 0s); }
.cat-ear-r  { animation: cat-twitch-r 7.3s ease-in-out infinite; animation-delay: calc(var(--cd, 0s) - 2.1s); }
.cat-eye    { transform-box: fill-box; transform-origin: 50% 50%; animation: cat-blink 4.6s ease-in-out infinite; animation-delay: var(--cd, 0s); }
.cat-squint-eyes { animation: cat-squint-eyes 8s ease-in-out infinite; animation-delay: calc(var(--cd, 0s) - 1s); }
.cat-squint-arcs { opacity: 0; animation: cat-squint-arcs 8s ease-in-out infinite; animation-delay: calc(var(--cd, 0s) - 1s); }
.cat-whisk-l { transform-box: fill-box; transform-origin: 100% 50%; animation: cat-whisk-l 3s ease-in-out infinite; animation-delay: var(--cd, 0s); }
.cat-whisk-r { transform-box: fill-box; transform-origin: 0% 50%;   animation: cat-whisk-r 3s ease-in-out infinite; animation-delay: var(--cd, 0s); }
.cat-nose   { transform-box: fill-box; transform-origin: 50% 50%; animation: cat-nose 2.4s ease-in-out infinite; animation-delay: var(--cd, 0s); }
.cat-blush  { animation: cat-blush 2.8s ease-in-out infinite; animation-delay: var(--cd, 0s); }
.cat-dart   { animation: cat-dart 1.1s ease-in-out infinite; }
.cat-drop   { animation: cat-drop 1.6s ease-in infinite; }

@keyframes cat-sway { 0%, 100% { transform: rotate(-2.2deg); } 50% { transform: rotate(2.2deg); } }
@keyframes cat-shiver { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-.7px); } 75% { transform: translateX(.7px); } }
@keyframes cat-blink { 0%, 90%, 100% { transform: scaleY(1); } 94% { transform: scaleY(.08); } }
@keyframes cat-squint-eyes { 0%, 58%, 76%, 100% { opacity: 1; } 63%, 71% { opacity: 0; } }
@keyframes cat-squint-arcs { 0%, 58%, 76%, 100% { opacity: 0; } 63%, 71% { opacity: 1; } }
@keyframes cat-twitch-l { 0%, 86%, 100% { transform: rotate(0); } 89% { transform: rotate(-10deg); } 92% { transform: rotate(3deg); } 95% { transform: rotate(-5deg); } }
@keyframes cat-twitch-r { 0%, 86%, 100% { transform: rotate(0); } 89% { transform: rotate(10deg); } 92% { transform: rotate(-3deg); } 95% { transform: rotate(5deg); } }
@keyframes cat-whisk-l { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-6deg); } }
@keyframes cat-whisk-r { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(6deg); } }
@keyframes cat-nose { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
@keyframes cat-blush { 0%, 100% { opacity: .7; } 50% { opacity: 1; } }
@keyframes cat-dart { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(-1px, .5px); } 75% { transform: translate(1px, -.5px); } }
@keyframes cat-drop { 0% { transform: translateY(-2px); opacity: 0; } 20% { opacity: 1; } 100% { transform: translateY(12px); opacity: 0; } }

.cat-still *, .cat-still { animation: none !important; }
@media (prefers-reduced-motion: reduce) { .cat-sway, .cat-shiver, .cat-ear, .cat-eye, .cat-squint-eyes, .cat-squint-arcs, .cat-whisk-l, .cat-whisk-r, .cat-nose, .cat-blush, .cat-dart, .cat-drop { animation: none !important; } .cat-squint-arcs { opacity: 0 !important; } }
`;

interface CatProps {
  className?: string;
  mood?: "happy" | "upset";
  /** Which cat to draw (0-7, wraps). Pass the region index to give every region its own cat. */
  variant?: number;
  /** Turn off idle animation (e.g. for tiny decorative uses). */
  animated?: boolean;
}

/** Eight original cats with idle animation: sway, blinks, happy squints, ear twitches, whisker wiggles. */
export function CatIcon({ className = "", mood = "happy", variant = 0, animated = true }: CatProps) {
  const upset = mood === "upset";
  const idx = ((Math.floor(variant) % CAT_COUNT) + CAT_COUNT) % CAT_COUNT;
  const cat :any= CATS[idx];
  const ears = EARS[cat.ears];
  const uid = useId().replace(/:/g, "");
  const headId = `${uid}-h`;
  const silId = `${uid}-s`;
  const delay = (idx * 1.37) % 4;

  return (
    <svg
      viewBox="0 0 64 64"
      className={`${className} ${animated ? "" : "cat-still"}`}
      style={{ "--cd": `-${delay}s`, overflow: "visible" } as CSSProperties}
      aria-hidden
    >
      <style>{CSS}</style>
      <defs>
        <clipPath id={headId}>
          <ellipse cx="32" cy="37" rx="24" ry="20" />
        </clipPath>
        <clipPath id={silId}>
          <path d={ears.l} />
          <path d={ears.r} />
          <ellipse cx="32" cy="37" rx="24" ry="20" />
        </clipPath>
      </defs>

      <g className={upset ? "cat-shiver" : "cat-sway"}>
        {/* ears + head */}
        <g className="stroke-ink" strokeWidth="3" strokeLinejoin="round">
          <g className="cat-ear cat-ear-l">
            <path d={ears.l} fill={cat.earL ?? cat.fur} />
            <path d={ears.il} fill={cat.inner} stroke="none" />
          </g>
          <g className="cat-ear cat-ear-r">
            <path d={ears.r} fill={cat.earR ?? cat.fur} />
            <path d={ears.ir} fill={cat.inner} stroke="none" />
          </g>
          <ellipse cx="32" cy="37" rx="24" ry="20" fill={cat.fur} />
        </g>

        {/* coat pattern */}
        <g clipPath={`url(#${headId})`}>
          {cat.pattern === "tabby" && (
            <g stroke={cat.accent} strokeWidth="2.6" strokeLinecap="round" fill="none">
              <path d="M32 17 v7" />
              <path d="M25.5 18.5 l1.6 5.5" />
              <path d="M38.5 18.5 l-1.6 5.5" />
              <path d="M8 35 h7" />
              <path d="M9 41 h6" />
              <path d="M56 35 h-7" />
              <path d="M55 41 h-6" />
            </g>
          )}
          {cat.pattern === "tux" && <path d="M32 16 Q37 26 37.5 37 L26.5 37 Q27 26 32 16 Z" fill={cat.accent} />}
          {cat.pattern === "points" && <ellipse cx="32" cy="40" rx="15" ry="13" fill={cat.accent} opacity="0.5" />}
          {cat.pattern === "calico" && (
            <>
              <path d="M4 14 Q24 8 30 22 Q26 34 4 36 Z" fill="#FF9F55" />
              <path d="M38 12 Q62 10 62 36 Q48 38 41 26 Z" fill="#3A3552" />
            </>
          )}
          {cat.pattern === "spots" && (
            <g fill={cat.accent}>
              <circle cx="14" cy="32" r="2.2" />
              <circle cx="20" cy="23" r="1.8" />
              <circle cx="32" cy="21" r="1.9" />
              <circle cx="45" cy="23" r="1.8" />
              <circle cx="51" cy="32" r="2.2" />
              <circle cx="11" cy="40" r="1.5" />
              <circle cx="54" cy="41" r="1.5" />
            </g>
          )}
        </g>

        {/* upset: red tint over the whole silhouette */}
        {upset && <rect x="0" y="0" width="64" height="64" clipPath={`url(#${silId})`} className="fill-destructive" opacity="0.42" />}

        {/* muzzle */}
        <ellipse cx="32" cy="44" rx="12" ry="8.5" fill={cat.muzzle} />

        {upset ? (
          <>
            <path d="M18 29 l8 3" className="stroke-ink" strokeWidth="3" strokeLinecap="round" />
            <path d="M46 29 l-8 3" className="stroke-ink" strokeWidth="3" strokeLinecap="round" />
            {[23, 41].map((x) => (
              <g key={x} className="cat-dart">
                <circle cx={x} cy="36" r="4.2" fill={cat.eye} className="stroke-ink" strokeWidth="1.4" />
                <circle cx={x} cy="36" r="1.7" className="fill-ink" />
                <circle cx={x + 1.2} cy="34.6" r="0.9" fill="#fff" />
              </g>
            ))}
            <path d="M27 49 q5 -4 10 0" className="stroke-ink" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <path className="cat-drop" d="M51 17 q3.2 4.6 0 7.2 q-3.2 -2.6 0 -7.2 z" fill="#7DD3FC" stroke="#1E3A8A" strokeWidth="1" />
          </>
        ) : (
          <>
            {/* open eyes: blink + occasional happy squint */}
            <g className="cat-squint-eyes">
              {[23, 41].map((x) => (
                <g key={x} className="cat-eye">
                  <circle cx={x} cy="35" r="4.6" fill={cat.eye} className="stroke-ink" strokeWidth="1.5" />
                  <circle cx={x} cy="35" r="2.4" className="fill-ink" />
                  <circle cx={x + 1.5} cy="33.4" r="1.3" fill="#fff" />
                  <circle cx={x - 1.3} cy="36.8" r="0.6" fill="#fff" />
                </g>
              ))}
            </g>
            <g className="cat-squint-arcs">
              <path d="M19 35 q4 -5 8 0" className="stroke-ink" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M37 35 q4 -5 8 0" className="stroke-ink" strokeWidth="3" fill="none" strokeLinecap="round" />
            </g>
            <path d="M27 45 q2.5 3 5 0 q2.5 3 5 0" className="stroke-ink" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            <ellipse className="cat-blush" cx="15" cy="43" rx="3.5" ry="2" fill={cat.cheek} />
            <ellipse className="cat-blush" cx="49" cy="43" rx="3.5" ry="2" fill={cat.cheek} />
          </>
        )}

        <path className="cat-nose fill-ink" d="M30 40.5 h4 l-2 2.5 z" />

        {/* whiskers */}
        <g className="stroke-ink" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" fill="none">
          <g className="cat-whisk-l">
            <path d="M12 44 L1.5 41.5" />
            <path d="M12 47 L1.5 49" />
          </g>
          <g className="cat-whisk-r">
            <path d="M52 44 L62.5 41.5" />
            <path d="M52 47 L62.5 49" />
          </g>
        </g>
      </g>
    </svg>
  );
}

/** Small paw print used as decoration and progress markers. */
export function Paw({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <ellipse cx="12" cy="16" rx="5.5" ry="4.5" />
      <circle cx="5.5" cy="10" r="2.3" />
      <circle cx="9.5" cy="5.8" r="2.3" />
      <circle cx="14.5" cy="5.8" r="2.3" />
      <circle cx="18.5" cy="10" r="2.3" />
    </svg>
  );
}