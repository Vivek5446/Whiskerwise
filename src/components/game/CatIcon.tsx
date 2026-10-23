import { Canvas, useFrame } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BackSide, Color, Euler, type Group } from "three";

type Pattern = "none" | "tabby" | "tux" | "points" | "calico" | "spots";
type EarShape = "point" | "round" | "fold";
type V3 = [number, number, number];

interface CatSpec {
  name: string;
  fur: string;
  earL?: string;
  earR?: string;
  accent: string;
  muzzle: string;
  inner: string;
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

/* ───────────── tuning ───────────── */
const AMBIENT = 1.6; // raise if cats look dark, lower if washed out
const KEY = 1.8;
const RIM = 0.5;
const INK = "#2A1B3D";
const RED = "#FF3B4A";
const NOSE = "#E85D86";

// head ellipsoid radii
const A = 1.05;
const B = 0.9;
const C = 0.95;

/* ───────────── helpers ───────────── */
const mix = (hex: string, to: string, a: number) => "#" + new Color(hex).lerp(new Color(to), a).getHexString();

/** Point + orientation on the head ellipsoid surface, optionally lifted along the normal. */
function surface(x: number, y: number, lift = 0) {
  const k = 1 - (x / A) ** 2 - (y / B) ** 2;
  const z = C * Math.sqrt(Math.max(k, 0.02));
  const nx = x / (A * A);
  const ny = y / (B * B);
  const nz = z / (C * C);
  const len = Math.hypot(nx, ny, nz);
  const n = [nx / len, ny / len, nz / len];
  return {
    position: [x + n[0]! * lift, y + n[1]! * lift, z + n[2]! * lift] as V3,
    rotation: new Euler(-Math.asin(n[1]!), Math.atan2(n[0]!, n[2]!), 0, "YXZ"),
  };
}

/** A flattened ellipsoid stuck to the face: patches, stripes, muzzle, blush... */
function Decal({
  x, y, w, h, t = 0.05, lift = 0, rot = 0, color, opacity = 1,
}: {
  x: number; y: number; w: number; h: number; t?: number; lift?: number; rot?: number; color: string; opacity?: number;
}) {
  const s = useMemo(() => surface(x, y, lift), [x, y, lift]);
  return (
    <group position={s.position} rotation={s.rotation}>
      <mesh rotation={[0, 0, rot]} scale={[w, h, t]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color={color} roughness={0.7} transparent={opacity < 1} opacity={opacity} />
      </mesh>
    </group>
  );
}

/* ───────────── parts ───────────── */

function Rig({ children, phase, upset, live }: { children: ReactNode; phase: number; upset: boolean; live: boolean }) {
  const g = useRef<Group>(null);

  useFrame((st, dt) => {
    const grp = g.current;
    if (!grp) return;
    const t = st.clock.elapsedTime + phase;

    // Each cat idles independently using its own phase; never track the mouse.
    grp.rotation.y = Math.sin(t * 0.9) * 0.08;
    grp.rotation.x = Math.sin(t * 1.3) * 0.03;
    grp.rotation.z = Math.sin(t * 1.5) * 0.05;
    grp.position.y = Math.sin(t * 2) * 0.03;
    grp.position.x = upset ? Math.sin(t * 55) * 0.014 : 0;
    grp.scale.setScalar(0.85 * (1 + Math.sin(t * 2.2) * 0.012));
  });

  return <group ref={g}>{children}</group>;
}

function Ear({ side, shape, color, inner, phase, upset }: { side: -1 | 1; shape: EarShape; color: string; inner: string; phase: number; upset: boolean }) {
  const g = useRef<Group>(null);
  const base = shape === "fold" ? 1.0 : shape === "round" ? 0.32 : 0.42;
  const h = shape === "fold" ? 0.62 : 0.9;

  useFrame((st) => {
    if (!g.current) return;
    const t = st.clock.elapsedTime + phase + (side > 0 ? 2.1 : 0);
    const p = t % 6.5;
    const tw = p < 0.5 ? Math.sin((p / 0.5) * Math.PI * 3) * (1 - p / 0.5) * 0.25 : 0;
    g.current.rotation.z = -side * (base + tw + (upset ? 0.35 : 0));
  });

  return (
    <group ref={g} position={[side * 0.62, 0.55, -0.05]} rotation={[shape === "fold" ? 0.5 : 0, 0, -side * base]}>
      <group scale={[1, 1, 0.6]}>
        {shape === "round" ? (
          <>
            <mesh position={[0, 0.28, 0]} scale={[1, 1.08, 1]}>
              <sphereGeometry args={[0.4, 24, 18]} />
              <meshStandardMaterial color={color} roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.28, 0]} scale={[1.14, 1.2, 1.14]}>
              <sphereGeometry args={[0.4, 20, 14]} />
              <meshBasicMaterial color={INK} side={BackSide} />
            </mesh>
            <mesh position={[0, 0.26, 0.2]}>
              <sphereGeometry args={[0.24, 20, 14]} />
              <meshStandardMaterial color={inner} roughness={0.8} />
            </mesh>
          </>
        ) : (
          <>
            <mesh position={[0, h / 2 - 0.08, 0]}>
              <coneGeometry args={[0.42, h, 24]} />
              <meshStandardMaterial color={color} roughness={0.7} />
            </mesh>
            <mesh position={[0, h / 2 - 0.08, 0]} scale={[1.16, 1.1, 1.2]}>
              <coneGeometry args={[0.42, h, 24]} />
              <meshBasicMaterial color={INK} side={BackSide} />
            </mesh>
            <mesh position={[0, h * 0.19 - 0.12 + 0.28 * h, 0.12]} scale={[0.58, 0.62, 0.6]}>
              <coneGeometry args={[0.42, h, 20]} />
              <meshStandardMaterial color={inner} roughness={0.8} />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}

type Expression = "happy" | "upset" | "sleepy" | "surprised";

const EXPRESSIONS: readonly Expression[] = ["happy", "surprised", "sleepy"];

function Eyes({ cat, expression, phase }: { cat: CatSpec; expression: Expression; phase: number }) {
  const lids = useRef<(Group | null)[]>([]);
  const pupils = useRef<(Group | null)[]>([]);
  const open = useRef<(Group | null)[]>([]);
  const arcs = useRef<(Group | null)[]>([]);

  useFrame((st) => {
    const t = st.clock.elapsedTime + phase;
    if (expression === "upset") {
      pupils.current.forEach((p, i) => {
        if (p) p.position.x = Math.sin(t * 9 + i * 2) * 0.02;
      });
      return;
    }
    const p = t % 4.6;
    const b = Math.max(0, 1 - Math.abs(p - 4.5) / 0.09); // blink
    lids.current.forEach((l) => {
      if (l) l.scale.y = 1 - b * 0.92;
    });
    const q = t % 8;
    const squint = expression === "sleepy" || (expression === "happy" && q > 5 && q < 6.2);
    open.current.forEach((o) => {
      if (o) o.visible = !squint;
    });
    arcs.current.forEach((a) => {
      if (a) a.visible = squint;
    });
  });

  return (
    <>
      {([-1, 1] as const).map((s, i) => {
        const sf = surface(s * 0.4, 0.1, 0.045);
        const eyeScale: V3 =
          expression === "surprised" ? [1.12, 1.16, 1] : expression === "sleepy" ? [1, 0.6, 1] : [1, 1, 1];
        const pupilScale: V3 =
          expression === "upset"
            ? [0.07, 0.07, 0.04]
            : expression === "surprised"
              ? [0.08, 0.12, 0.05]
              : [0.095, 0.15, 0.05];
        return (
          <group key={s} position={sf.position} rotation={sf.rotation}>
            <group ref={(el) => { open.current[i] = el; }} scale={eyeScale}>
              <group ref={(el) => { lids.current[i] = el; }}>
                <mesh position={[0, 0, -0.02]} scale={[0.225, 0.26, 0.09]}>
                  <sphereGeometry args={[1, 20, 16]} />
                  <meshBasicMaterial color={INK} />
                </mesh>
                <mesh scale={[0.19, 0.23, 0.1]}>
                  <sphereGeometry args={[1, 20, 16]} />
                  <meshStandardMaterial color={cat.eye} roughness={0.35} />
                </mesh>
                <group ref={(el) => { pupils.current[i] = el; }}>
                  <mesh position={[0, 0, 0.075]} scale={pupilScale as V3}>
                    <sphereGeometry args={[1, 16, 12]} />
                    <meshBasicMaterial color={INK} />
                  </mesh>
                </group>
                <mesh position={[0.05, 0.075, 0.11]} scale={[0.04, 0.04, 0.03]}>
                  <sphereGeometry args={[1, 12, 10]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
                <mesh position={[-0.04, -0.06, 0.1]} scale={[0.02, 0.02, 0.02]}>
                  <sphereGeometry args={[1, 10, 8]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </group>
            </group>
            {(expression === "happy" || expression === "sleepy") && (
              <group ref={(el) => { arcs.current[i] = el; }} visible={false}>
                <mesh position={[0, -0.03, 0.06]}>
                  <torusGeometry args={[0.14, 0.032, 8, 20, Math.PI]} />
                  <meshBasicMaterial color={INK} />
                </mesh>
              </group>
            )}
          </group>
        );
      })}
    </>
  );
}

function Whiskers({ side, phase }: { side: -1 | 1; phase: number }) {
  const g = useRef<Group>(null);
  const pos = useMemo(() => surface(side * 0.55, -0.33, 0.28).position, [side]);
  useFrame((st) => {
    if (g.current) g.current.rotation.z = side * Math.sin((st.clock.elapsedTime + phase) * 2.2) * 0.09;
  });
  return (
    <group ref={g} position={pos}>
      {[0.2, -0.14].map((a) => (
        <group key={a} rotation={[0, side * 0.3, side * a]}>
          <mesh position={[side * 0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.011, 0.007, 0.6, 6]} />
            <meshBasicMaterial color={INK} transparent opacity={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Drop({ phase }: { phase: number }) {
  const g = useRef<Group>(null);
  const s = useMemo(() => surface(0.7, 0.5, 0.04), []);
  useFrame((st) => {
    if (!g.current) return;
    const k = ((st.clock.elapsedTime + phase) * 0.6) % 1;
    g.current.position.y = -k * 0.5;
    g.current.scale.setScalar(k < 0.1 ? k * 10 : k > 0.8 ? (1 - k) * 5 : 1);
  });
  return (
    <group position={s.position} rotation={s.rotation}>
      <group ref={g}>
        <mesh scale={[0.07, 0.1, 0.05]}>
          <sphereGeometry args={[1, 14, 12]} />
          <meshStandardMaterial color="#7DD3FC" roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

/* ───────────── the cat ───────────── */

function Cat3D({ cat, expression, phase, live }: { cat: CatSpec; expression: Expression; phase: number; live: boolean }) {
  const upset = expression === "upset";
  const T = (c: string, a = 0.4) => (upset ? mix(c, RED, a) : c);
  const fur = T(cat.fur);
  const accent = T(cat.accent);
  const mouthS = surface(0, -0.43, 0.3);
  const browY = 0.42;

  return (
    <>
      <ambientLight intensity={AMBIENT} />
      <directionalLight position={[2.5, 3.5, 5]} intensity={KEY} />
      <directionalLight position={[-3, 1, -2]} intensity={RIM} />

      <Rig phase={phase} upset={upset} live={live}>
        <group position={[0, -0.05, 0]}>
          {/* head + ink outline */}
          <group scale={[A, B, C]}>
            <mesh>
              <sphereGeometry args={[1, 48, 32]} />
              <meshStandardMaterial color={fur} roughness={0.7} />
            </mesh>
            <mesh scale={1.06}>
              <sphereGeometry args={[1, 32, 24]} />
              <meshBasicMaterial color={INK} side={BackSide} />
            </mesh>
          </group>

          <Ear side={-1} shape={cat.ears} color={T(cat.earL ?? cat.fur)} inner={cat.inner} phase={phase} upset={upset} />
          <Ear side={1} shape={cat.ears} color={T(cat.earR ?? cat.fur)} inner={cat.inner} phase={phase} upset={upset} />

          {/* coat pattern */}
          {cat.pattern === "tabby" && (
            <>
              <Decal x={0} y={0.64} w={0.05} h={0.2} color={accent} />
              <Decal x={-0.22} y={0.58} w={0.045} h={0.17} rot={0.35} color={accent} />
              <Decal x={0.22} y={0.58} w={0.045} h={0.17} rot={-0.35} color={accent} />
              {([-1, 1] as const).map((s) => (
                <group key={s}>
                  <Decal x={s * 0.86} y={0.05} w={0.17} h={0.035} color={accent} />
                  <Decal x={s * 0.84} y={-0.12} w={0.15} h={0.035} color={accent} />
                </group>
              ))}
            </>
          )}
          {cat.pattern === "tux" && <Decal x={0} y={0.35} w={0.2} h={0.55} t={0.15} lift={-0.08} color={accent} />}
          {cat.pattern === "points" && <Decal x={0} y={-0.15} w={0.62} h={0.5} t={0.25} lift={-0.2} color={accent} opacity={0.5} />}
          {cat.pattern === "calico" && (
            <>
              <Decal x={-0.55} y={0.42} w={0.5} h={0.38} rot={0.3} t={0.25} lift={-0.2} color={T("#FF9F55")} />
              <Decal x={0.58} y={0.38} w={0.45} h={0.4} rot={-0.2} t={0.25} lift={-0.2} color={T("#3A3552")} />
            </>
          )}
          {cat.pattern === "spots" &&
            ([[-0.7, 0.15], [-0.45, 0.5], [0, 0.62], [0.5, 0.45], [0.72, 0.1], [-0.8, -0.2], [0.78, -0.25]] as const).map(([x, y], i) => (
              <Decal key={i} x={x} y={y} w={0.07 + (i % 3) * 0.012} h={0.07 + (i % 3) * 0.012} t={0.04} color={accent} />
            ))}

          {/* muzzle + nose + blush */}
          <Decal x={0} y={-0.37} w={0.44} h={0.3} t={0.3} lift={-0.04} color={T(cat.muzzle, 0.15)} />
          <Decal x={0} y={-0.21} w={0.075} h={0.055} t={0.05} lift={0.2} color={NOSE} />
          {!upset && (
            <>
              <Decal x={-0.62} y={-0.28} w={0.14} h={0.085} t={0.04} color={cat.cheek} opacity={0.75} />
              <Decal x={0.62} y={-0.28} w={0.14} h={0.085} t={0.04} color={cat.cheek} opacity={0.75} />
            </>
          )}

          {/* mouth */}
          <group position={mouthS.position} rotation={mouthS.rotation}>
            {upset ? (
              <mesh position={[0, -0.06, 0]}>
                <torusGeometry args={[0.12, 0.016, 8, 18, Math.PI]} />
                <meshBasicMaterial color={INK} />
              </mesh>
            ) : expression === "surprised" ? (
              <group>
                <mesh scale={[0.1, 0.13, 0.05]}>
                  <sphereGeometry args={[1, 16, 12]} />
                  <meshBasicMaterial color={INK} />
                </mesh>
                <mesh position={[0, -0.025, 0.045]} scale={[0.052, 0.07, 0.025]}>
                  <sphereGeometry args={[1, 12, 10]} />
                  <meshBasicMaterial color="#FF7F91" />
                </mesh>
              </group>
            ) : (
              ([-1, 1] as const).map((s) => (
                <mesh key={s} position={[s * 0.08, 0, 0]} rotation={[0, 0, Math.PI]}>
                  <torusGeometry args={[0.08, 0.014, 8, 18, Math.PI]} />
                  <meshBasicMaterial color={INK} />
                </mesh>
              ))
            )}
          </group>

          <Eyes cat={cat} expression={expression} phase={phase} />

          {/* angry brows + sweat drop */}
          {upset &&
            ([-1, 1] as const).map((s) => {
              const sf = surface(s * 0.4, browY, 0.02);
              return (
                <group key={s} position={sf.position} rotation={sf.rotation}>
                  <mesh rotation={[0, 0, Math.PI / 2 + s * 0.4]}>
                    <capsuleGeometry args={[0.035, 0.24, 4, 8]} />
                    <meshBasicMaterial color={INK} />
                  </mesh>
                </group>
              );
            })}
          {expression === "surprised" &&
            ([-1, 1] as const).map((s) => {
              const sf = surface(s * 0.4, browY + 0.08, 0.02);
              return (
                <group key={s} position={sf.position} rotation={sf.rotation}>
                  <mesh rotation={[0, 0, s * -0.12]}>
                    <capsuleGeometry args={[0.024, 0.14, 4, 8]} />
                    <meshBasicMaterial color={INK} />
                  </mesh>
                </group>
              );
            })}
          {upset && <Drop phase={phase} />}

          <Whiskers side={-1} phase={phase} />
          <Whiskers side={1} phase={phase} />
        </group>
      </Rig>
    </>
  );
}

/* ───────────── public component (same API as before) ───────────── */

class Boundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  override componentDidCatch(): void {}
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface CatProps {
  className?: string;
  mood?: "auto" | Expression;
  /** Which cat to draw (0-7, wraps). Pass the region index to give every region its own cat. */
  variant?: number;
  /** false = render a single still frame (no animation, no cursor tracking). */
  animated?: boolean;
}

/** Eight 3D cats (react-three-fiber): they follow your cursor, blink, squint, twitch ears and wiggle whiskers. */
export function CatIcon({ className = "", mood = "auto", variant = 0, animated = true }: CatProps) {
  const idx = ((Math.floor(variant) % CAT_COUNT) + CAT_COUNT) % CAT_COUNT;
  const cat = CATS[idx]!;
  const expression = mood === "auto" ? EXPRESSIONS[idx % EXPRESSIONS.length]! : mood;
  const iconClassName = `cat-icon ${className}`.trim();

  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setReady(true);
  }, []);

  const live = animated && !reduced;

  // WebGL needs the browser, so render an empty box on the server / first paint
  if (!ready) return <div aria-hidden className={iconClassName} />;

  return (
    <div aria-hidden className={iconClassName} style={{ pointerEvents: "none" }}>
      <Boundary fallback={<Paw className="size-full text-ink" />}>
        <Canvas
          flat
          dpr={[1, 2]}
          frameloop={live ? "always" : "demand"}
          camera={{ position: [0, 0.12, 5.0], fov: 34 }}
          gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
          style={{ width: "100%", height: "100%", display: "block", pointerEvents: "none", background: "transparent" }}
        >
          <Cat3D cat={cat} expression={expression} phase={idx * 1.37} live={live} />
        </Canvas>
      </Boundary>
    </div>
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