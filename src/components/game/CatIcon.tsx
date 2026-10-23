import { Canvas, useFrame } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BackSide, Color, Euler, type Group, type Mesh } from "three";

type Pattern = "none" | "tabby" | "tux" | "points" | "calico" | "spots";
type EarShape = "point" | "round" | "fold";
type V3 = [number, number, number];

export type Expression =
  | "happy"
  | "smile"
  | "wink"
  | "laugh"
  | "smug"
  | "surprised"
  | "sleepy"
  | "upset";

const AUTO_EXPRESSIONS: readonly Expression[] = [
  "happy",
  // "wink",
  "smile",
  "laugh",
  // "smug",
  "surprised",
  "sleepy",
  "happy",
];

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
  { name: "Marmalade", fur: "#FF9F55", accent: "#D9662A", muzzle: "#FFF4E6", inner: "#FFA8A8", eye: "#52C43B", cheek: "#FF7878", pattern: "tabby", ears: "point" },
  { name: "Tuxedo", fur: "#35314B", accent: "#FFFFFF", muzzle: "#FFFFFF", inner: "#FF9BB3", eye: "#FFC928", cheek: "#FF8FA8", pattern: "tux", ears: "point" },
  { name: "Siamese", fur: "#F7E8D0", earL: "#6E4E3C", earR: "#6E4E3C", accent: "#6E4E3C", muzzle: "#FFF8EC", inner: "#D4A38B", eye: "#3FA9FF", cheek: "#F29B88", pattern: "points", ears: "point" },
  { name: "Calico", fur: "#FFFDF9", earL: "#FF9F55", earR: "#35314B", accent: "#FF9F55", muzzle: "#FFFFFF", inner: "#FFA8A8", eye: "#48B85A", cheek: "#FF94A0", pattern: "calico", ears: "round" },
  { name: "Fold", fur: "#9BA7C0", accent: "#6C7994", muzzle: "#EEF2FA", inner: "#EDA4B8", eye: "#FFA226", cheek: "#F59CB0", pattern: "none", ears: "fold" },
  { name: "Snowy", fur: "#FFFFFF", accent: "#DCE2F0", muzzle: "#FFF0F5", inner: "#FFB0C4", eye: "#45B3FF", cheek: "#FF94B2", pattern: "none", ears: "round" },
  { name: "Spotty", fur: "#F7C443", accent: "#8C5811", muzzle: "#FFF6D6", inner: "#FFA894", eye: "#2AC4A8", cheek: "#FF8270", pattern: "spots", ears: "round" },
  { name: "Lilac", fur: "#C9A7FF", accent: "#946CE3", muzzle: "#F6EEFF", inner: "#FFA8D4", eye: "#FFCF33", cheek: "#FF85BA", pattern: "tabby", ears: "point" },
];

export const CAT_COUNT = CATS.length;

/* ───────────── tuning ───────────── */
const AMBIENT = 1.65;
const KEY = 1.6;
const RIM = 0.6;
const INK = "#261738";
const RED = "#FF3B4A";
const NOSE = "#FF6B93";
const MOUTH_PINK = "#FF6B8B";
const TONGUE_PINK = "#FF8FA8";

// Cute chubby kawaii head ellipsoid radii (wide cheeks, slightly shorter height)
const A = 1.08;
const B = 0.88;
const C = 0.94;

/* ───────────── helpers ───────────── */
const mix = (hex: string, to: string, a: number) =>
  "#" + new Color(hex).lerp(new Color(to), a).getHexString();

/** Point + orientation on the head ellipsoid surface, optionally lifted along the normal. */
function surface(x: number, y: number, lift = 0) {
  const k = 1 - (x / A) ** 2 - (y / B) ** 2;
  const z = C * Math.sqrt(Math.max(k, 0.01));
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

/** A flattened ellipsoid stuck cleanly to the face surface */
function Decal({
  x,
  y,
  w,
  h,
  t = 0.035,
  lift = 0.008,
  rot = 0,
  color,
  opacity = 1,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  t?: number;
  lift?: number;
  rot?: number;
  color: string;
  opacity?: number;
}) {
  const s = useMemo(() => surface(x, y, lift), [x, y, lift]);
  return (
    <group position={s.position} rotation={s.rotation}>
      <mesh rotation={[0, 0, rot]} scale={[w, h, t]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial
          color={color}
          roughness={0.75}
          transparent={opacity < 1}
          opacity={opacity}
          depthWrite={opacity === 1}
        />
      </mesh>
    </group>
  );
}

/* ───────────── parts ───────────── */

function Rig({
  children,
  phase,
  expression,
}: {
  children: ReactNode;
  phase: number;
  expression: Expression;
}) {
  const g = useRef<Group>(null);

  useFrame((st) => {
    const grp = g.current;
    if (!grp) return;
    const t = st.clock.elapsedTime + phase;

    // Base breathing & cute bobbing
    let rx = Math.sin(t * 1.4) * 0.035;
    let ry = Math.sin(t * 0.9) * 0.1;
    let rz = Math.sin(t * 1.2) * 0.045;
    let py = Math.sin(t * 2.1) * 0.03;
    let px = 0;
    let sc = 0.85 * (1 + Math.sin(t * 2.1) * 0.014);

    // Expression-specific game animations
    if (expression === "laugh") {
      // Joyful rapid chuckle bounce
      py += Math.abs(Math.sin(t * 9.5)) * 0.055;
      rx -= 0.06 + Math.sin(t * 9.5) * 0.04;
      sc *= 1 + Math.sin(t * 9.5) * 0.02;
    } else if (expression === "wink") {
      // Playful head tilt
      rz += 0.12 + Math.sin(t * 2.5) * 0.03;
      py += Math.abs(Math.sin(t * 3.2)) * 0.02;
    } else if (expression === "smug") {
      // Sassy chin-up side look
      rx -= 0.07;
      ry += 0.14 + Math.sin(t * 1.1) * 0.04;
      rz -= 0.06;
    } else if (expression === "upset") {
      // Angry tremble
      px = Math.sin(t * 50) * 0.016;
      rx += 0.06;
    } else if (expression === "sleepy") {
      // Slow nodding off
      rx += 0.09 + Math.sin(t * 0.8) * 0.05;
      ry *= 0.4;
      py = Math.sin(t * 1.0) * 0.018;
    } else if (expression === "surprised") {
      // Perked up alert
      sc *= 1.03;
      py += Math.sin(t * 4) * 0.015;
    }

    grp.rotation.set(rx, ry, rz);
    grp.position.set(px, py, 0);
    grp.scale.setScalar(sc);
  });

  return <group ref={g}>{children}</group>;
}

function Ear({
  side,
  shape,
  color,
  inner,
  phase,
  expression,
}: {
  side: -1 | 1;
  shape: EarShape;
  color: string;
  inner: string;
  phase: number;
  expression: Expression;
}) {
  const g = useRef<Group>(null);
  const base = shape === "fold" ? 0.92 : shape === "round" ? 0.36 : 0.38;
  const h = shape === "fold" ? 0.58 : 0.82;

  useFrame((st) => {
    if (!g.current) return;
    const t = st.clock.elapsedTime + phase + (side > 0 ? 1.8 : 0);
    const p = t % 5.5;
    const tw = p < 0.4 ? Math.sin((p / 0.4) * Math.PI * 3) * (1 - p / 0.4) * 0.22 : 0;

    let moodOffset = 0;
    if (expression === "upset") moodOffset = 0.32;
    else if (expression === "sleepy") moodOffset = 0.18;
    else if (expression === "surprised") moodOffset = -0.08;
    else if (expression === "wink" && side === 1) moodOffset = 0.12;

    g.current.rotation.z = -side * (base + tw + moodOffset);
  });

  return (
    <group
      ref={g}
      position={[side * 0.62, 0.54, -0.04]}
      rotation={[shape === "fold" ? 0.45 : 0.06, -side * 0.1, -side * base]}
    >
      <group scale={[1, 1, 0.62]}>
        {shape === "round" ? (
          <>
            <mesh position={[0, 0.25, 0]} scale={[1.02, 1.05, 1]}>
              <sphereGeometry args={[0.38, 24, 18]} />
              <meshStandardMaterial color={color} roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.25, 0]} scale={[1.15, 1.18, 1.15]}>
              <sphereGeometry args={[0.38, 20, 14]} />
              <meshBasicMaterial color={INK} side={BackSide} />
            </mesh>
            <mesh position={[0, 0.22, 0.18]} scale={[0.95, 0.95, 0.7]}>
              <sphereGeometry args={[0.23, 20, 14]} />
              <meshStandardMaterial color={inner} roughness={0.8} />
            </mesh>
          </>
        ) : (
          <>
            {/* Slightly rounded cute cone ear */}
            <mesh position={[0, h / 2 - 0.08, 0]}>
              <coneGeometry args={[0.42, h, 28]} />
              <meshStandardMaterial color={color} roughness={0.7} />
            </mesh>
            <mesh position={[0, h / 2 - 0.08, 0]} scale={[1.15, 1.1, 1.18]}>
              <coneGeometry args={[0.42, h, 24]} />
              <meshBasicMaterial color={INK} side={BackSide} />
            </mesh>
            <mesh position={[0, h * 0.35 - 0.08, 0.13]} scale={[0.58, 0.62, 0.55]}>
              <coneGeometry args={[0.42, h, 20]} />
              <meshStandardMaterial color={inner} roughness={0.8} />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}

/** Happy curved eye arc (^ or v shape) */
function HappyEyeArc({ flip = false, tilt = 0 }: { flip?: boolean; tilt?: number }) {
  return (
    <group rotation={[0, 0, tilt]}>
      <mesh position={[0, flip ? 0.04 : -0.04, 0.03]} rotation={[0, 0, flip ? Math.PI : 0]}>
        <torusGeometry args={[0.135, 0.034, 12, 24, Math.PI]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      {/* Cute little eyelash flicks at outer corners */}
      {[-1, 1].map((c) => (
        <mesh
          key={c}
          position={[c * 0.135, flip ? 0.04 : -0.04, 0.03]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <sphereGeometry args={[0.034, 10, 10]} />
          <meshBasicMaterial color={INK} />
        </mesh>
      ))}
    </group>
  );
}

function Eyes({
  cat,
  expression,
  phase,
}: {
  cat: CatSpec;
  expression: Expression;
  phase: number;
}) {
  const openGroups = useRef<(Group | null)[]>([]);
  const closedGroups = useRef<(Group | null)[]>([]);
  const pupils = useRef<(Group | null)[]>([]);
  const shines = useRef<(Mesh | null)[]>([]);
  const lids = useRef<(Mesh | null)[]>([]);

  const irisDark = useMemo(() => mix(cat.eye, "#000000", 0.32), [cat.eye]);
  const irisLight = useMemo(() => mix(cat.eye, "#ffffff", 0.35), [cat.eye]);

  useFrame((st) => {
    const t = st.clock.elapsedTime + phase;

    // Periodic natural blink every ~4.2 seconds
    const blinkCycle = t % 4.2;
    const isBlinking = blinkCycle > 4.04;

    // Periodic happy squint when in "happy" mood
    const happySquint = expression === "happy" && (t % 7.5) > 5.8 && (t % 7.5) < 7.0;

    ([-1, 1] as const).forEach((side, i) => {
      const openG = openGroups.current[i];
      const closedG = closedGroups.current[i];
      const pupilG = pupils.current[i];
      const shineM = shines.current[i];
      const lidM = lids.current[i];

      // Determine if this eye should show the closed arc instead of the open eyeball
      const forceClosed =
        expression === "laugh" ||
        expression === "smile" ||
        (expression === "wink" && side === 1) ||
        happySquint ||
        isBlinking;

      if (openG) openG.visible = !forceClosed;
      if (closedG) closedG.visible = forceClosed;

      // Subtle eye darting / pupil life
      if (pupilG) {
        if (expression === "upset") {
          pupilG.position.x = Math.sin(t * 14 + i) * 0.015;
          pupilG.position.y = Math.cos(t * 11 + i) * 0.01;
        } else if (expression === "smug") {
          pupilG.position.x = 0.025;
          pupilG.position.y = 0.01;
        } else {
          pupilG.position.x = Math.sin(t * 0.8) * 0.012;
          pupilG.position.y = Math.sin(t * 1.1) * 0.008;
        }
      }

      // Sparkle pulse
      if (shineM) {
        const s = 1 + Math.sin(t * 5 + i) * 0.12;
        shineM.scale.set(0.052 * s, 0.058 * s, 0.02);
      }

      // Upper lid position for smug / sleepy
      if (lidM) {
        lidM.visible = expression === "smug" || expression === "sleepy";
      }
    });
  });

  return (
    <>
      {([-1, 1] as const).map((s, i) => {
        // Place eyes lower and wider for baby-schema cuteness
        const sf = surface(s * 0.41, 0.05, 0.02);
        const eyeScale: V3 =
          expression === "surprised"
            ? [1.12, 1.15, 1]
            : [1.04, 1.08, 1];

        const pupilScale: V3 =
          expression === "upset"
            ? [0.06, 0.09, 0.02]
            : expression === "surprised"
              ? [0.09, 0.12, 0.02]
              : [0.115, 0.145, 0.02];

        return (
          <group key={s} position={sf.position} rotation={sf.rotation}>
            {/* OPEN EYE */}
            <group ref={(el) => { openGroups.current[i] = el; }} scale={eyeScale}>
              {/* Thick dark outline / lash rim */}
              <mesh position={[0, 0.01, 0]} scale={[0.235, 0.255, 0.06]}>
                <sphereGeometry args={[1, 24, 18]} />
                <meshBasicMaterial color={INK} />
              </mesh>

              {/* Cute outer upper eyelash wing */}
              <mesh
                position={[s * 0.19, 0.14, 0.01]}
                rotation={[0, 0, -s * 0.45]}
                scale={[0.06, 0.022, 0.02]}
              >
                <sphereGeometry args={[1, 10, 8]} />
                <meshBasicMaterial color={INK} />
              </mesh>

              {/* Outer dark iris ring */}
              <mesh position={[0, 0, 0.018]} scale={[0.205, 0.225, 0.055]}>
                <sphereGeometry args={[1, 24, 18]} />
                <meshBasicMaterial color={irisDark} />
              </mesh>

              {/* Main vibrant iris */}
              <mesh position={[0, -0.005, 0.028]} scale={[0.19, 0.21, 0.05]}>
                <sphereGeometry args={[1, 24, 18]} />
                <meshBasicMaterial color={cat.eye} />
              </mesh>

              {/* Lower glowing iris crescent */}
              <mesh position={[0, -0.055, 0.042]} scale={[0.14, 0.11, 0.035]}>
                <sphereGeometry args={[1, 20, 14]} />
                <meshBasicMaterial color={irisLight} />
              </mesh>

              {/* Pupil + Catchlights */}
              <group ref={(el) => { pupils.current[i] = el; }}>
                <mesh position={[0, 0.005, 0.055]} scale={pupilScale}>
                  <sphereGeometry args={[1, 20, 16]} />
                  <meshBasicMaterial color={INK} />
                </mesh>

                {/* Big kawaii top-right catchlight */}
                <mesh
                  ref={(el) => { shines.current[i] = el; }}
                  position={[0.065, 0.075, 0.075]}
                  scale={[0.052, 0.058, 0.02]}
                >
                  <sphereGeometry args={[1, 14, 12]} />
                  <meshBasicMaterial color="#FFFFFF" />
                </mesh>

                {/* Secondary bottom-left catchlight */}
                <mesh position={[-0.065, -0.07, 0.075]} scale={[0.028, 0.03, 0.02]}>
                  <sphereGeometry args={[1, 12, 10]} />
                  <meshBasicMaterial color="#FFFFFF" />
                </mesh>
              </group>

              {/* Half-closed upper eyelid for "smug" or "sleepy" */}
              <mesh
                ref={(el) => { lids.current[i] = el; }}
                visible={expression === "smug" || expression === "sleepy"}
                position={[0, 0.11, 0.068]}
                rotation={[0, 0, expression === "smug" ? -s * 0.12 : 0]}
                scale={[0.23, 0.13, 0.04]}
              >
                <sphereGeometry args={[1, 20, 14]} />
                <meshStandardMaterial color={cat.fur} roughness={0.7} />
              </mesh>
              {(expression === "smug" || expression === "sleepy") && (
                <mesh
                  position={[0, 0.03, 0.082]}
                  rotation={[0, 0, (expression === "smug" ? -s * 0.12 : 0) + Math.PI / 2]}
                >
                  <capsuleGeometry args={[0.018, 0.38, 6, 12]} />
                  <meshBasicMaterial color={INK} />
                </mesh>
              )}
            </group>

            {/* CLOSED / SQUINTING EYE ARC (^_^ or u_u) */}
            <group ref={(el) => { closedGroups.current[i] = el; }} visible={false}>
              <HappyEyeArc
                flip={expression === "sleepy"}
                tilt={expression === "laugh" ? -s * 0.12 : 0}
              />
            </group>
          </group>
        );
      })}
    </>
  );
}

/** Cute 3D Cat Nose + Muzzle + Expression Mouth */
function MuzzleAndMouth({
  cat,
  expression,
  upset,
  phase,
}: {
  cat: CatSpec;
  expression: Expression;
  upset: boolean;
  phase: number;
}) {
  const nosePos = useMemo(() => surface(0, -0.14, 0.032), []);
  const mouthPos = useMemo(() => surface(0, -0.25, 0.032), []);
  const laughRef = useRef<Group>(null);

  useFrame((st) => {
    if (laughRef.current && expression === "laugh") {
      const t = st.clock.elapsedTime + phase;
      const chatter = 1 + Math.sin(t * 14) * 0.15;
      laughRef.current.scale.set(1, chatter, 1);
    }
  });

  const muzzleColor = upset ? mix(cat.muzzle, RED, 0.15) : cat.muzzle;

  return (
    <>
      {/* Plump peanut-shaped muzzle puffs */}
      <Decal x={-0.11} y={-0.21} w={0.21} h={0.165} t={0.065} lift={0.005} color={muzzleColor} />
      <Decal x={0.11} y={-0.21} w={0.21} h={0.165} t={0.065} lift={0.005} color={muzzleColor} />
      <Decal x={0} y={-0.24} w={0.22} h={0.15} t={0.05} lift={0.002} color={muzzleColor} />

      {/* Cute upside-down triangular button nose */}
      <group position={nosePos.position} rotation={nosePos.rotation}>
        <mesh rotation={[0, 0, Math.PI]} scale={[1.25, 0.85, 0.6]}>
          <coneGeometry args={[0.058, 0.068, 3]} />
          <meshStandardMaterial color={NOSE} roughness={0.4} />
        </mesh>
        {/* Tiny nose highlight */}
        <mesh position={[0, 0.015, 0.022]} scale={[0.032, 0.014, 0.01]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color="#FFB8CC" />
        </mesh>
      </group>

      {/* Mouth variations */}
      <group position={mouthPos.position} rotation={mouthPos.rotation}>
        {expression === "upset" ? (
          /* Wavy grumpy frown */
          <mesh position={[0, -0.055, 0.015]}>
            <torusGeometry args={[0.085, 0.017, 10, 22, Math.PI]} />
            <meshBasicMaterial color={INK} />
          </mesh>
        ) : expression === "surprised" ? (
          /* Cute little "o" gasp mouth */
          <group position={[0, -0.02, 0.01]}>
            <mesh scale={[0.075, 0.095, 0.03]}>
              <sphereGeometry args={[1, 18, 14]} />
              <meshBasicMaterial color={INK} />
            </mesh>
            <mesh position={[0, -0.018, 0.018]} scale={[0.05, 0.055, 0.02]}>
              <sphereGeometry args={[1, 14, 10]} />
              <meshBasicMaterial color={TONGUE_PINK} />
            </mesh>
          </group>
        ) : expression === "smug" ? (
          /* Sassy lopsided ":3" smirk with raised corner */
          <group position={[0.01, 0.015, 0.015]} rotation={[0, 0, 0.12]}>
            <mesh position={[-0.06, 0.01, 0]} rotation={[0, 0, Math.PI]}>
              <torusGeometry args={[0.06, 0.016, 10, 20, Math.PI]} />
              <meshBasicMaterial color={INK} />
            </mesh>
            <mesh position={[0.065, 0.02, 0]} rotation={[0, 0, Math.PI * 1.08]}>
              <torusGeometry args={[0.07, 0.016, 10, 20, Math.PI * 1.15]} />
              <meshBasicMaterial color={INK} />
            </mesh>
          </group>
        ) : (
          /* Classic ":3" ω cat mouth (plus open happy tongue for laugh/smile/wink) */
          <group position={[0, 0.02, 0.015]}>
            {([-1, 1] as const).map((s) => (
              <mesh key={s} position={[s * 0.065, 0.01, 0]} rotation={[0, 0, Math.PI]}>
                <torusGeometry args={[0.065, 0.017, 10, 22, Math.PI]} />
                <meshBasicMaterial color={INK} />
              </mesh>
            ))}

            {/* Open joyful mouth underneath the :3 for laugh, smile, or wink */}
            {(expression === "laugh" || expression === "smile" || expression === "wink") && (
              <group
                ref={laughRef}
                position={[0, -0.052, -0.004]}
                scale={expression === "laugh" ? [1.2, 1.25, 1] : [0.95, 0.9, 1]}
              >
                {/* Dark mouth cavity */}
                <mesh scale={[0.095, 0.085, 0.025]}>
                  <sphereGeometry args={[1, 18, 14]} />
                  <meshBasicMaterial color={INK} />
                </mesh>
                {/* Pink inner mouth */}
                <mesh position={[0, -0.005, 0.012]} scale={[0.08, 0.07, 0.02]}>
                  <sphereGeometry args={[1, 16, 12]} />
                  <meshBasicMaterial color={MOUTH_PINK} />
                </mesh>
                {/* Cute bright pink tongue */}
                <mesh position={[0, -0.022, 0.02]} scale={[0.062, 0.048, 0.018]}>
                  <sphereGeometry args={[1, 14, 10]} />
                  <meshBasicMaterial color={TONGUE_PINK} />
                </mesh>
              </group>
            )}
          </group>
        )}
      </group>
    </>
  );
}

function Whiskers({ side, phase }: { side: -1 | 1; phase: number }) {
  const g = useRef<Group>(null);
  const s = useMemo(() => surface(side * 0.68, -0.18, 0.02), [side]);

  useFrame((st) => {
    if (g.current) {
      g.current.rotation.z =
        side * Math.sin((st.clock.elapsedTime + phase) * 2.4) * 0.07;
    }
  });

  return (
    <group position={s.position} rotation={s.rotation}>
      <group ref={g}>
        {[0.16, -0.12].map((angle, idx) => (
          <group key={idx} position={[0, idx === 0 ? 0.03 : -0.03, 0]} rotation={[0, -side * 0.25, side * angle]}>
            <mesh position={[side * 0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.012, 0.36, 4, 8]} />
              <meshBasicMaterial color={INK} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function Drop({ phase }: { phase: number }) {
  const g = useRef<Group>(null);
  const s = useMemo(() => surface(0.68, 0.42, 0.05), []);
  useFrame((st) => {
    if (!g.current) return;
    const k = ((st.clock.elapsedTime + phase) * 0.65) % 1;
    g.current.position.y = -k * 0.42;
    g.current.scale.setScalar(k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) * 5 : 1);
  });
  return (
    <group position={s.position} rotation={s.rotation}>
      <group ref={g}>
        <mesh scale={[0.065, 0.095, 0.05]}>
          <sphereGeometry args={[1, 14, 12]} />
          <meshStandardMaterial color="#7DD3FC" roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

/* ───────────── the cat ───────────── */

function Cat3D({
  cat,
  expression,
  phase,
}: {
  cat: CatSpec;
  expression: Expression;
  phase: number;
}) {
  const upset = expression === "upset";
  const T = (c: string, a = 0.35) => (upset ? mix(c, RED, a) : c);
  const fur = T(cat.fur);
  const accent = T(cat.accent);
  const browY = 0.36;

  return (
    <>
      <ambientLight intensity={AMBIENT} />
      <directionalLight position={[2.5, 3.5, 5]} intensity={KEY} />
      <directionalLight position={[-3, 1, -2]} intensity={RIM} />

      <Rig phase={phase} expression={expression}>
        <group position={[0, -0.05, 0]}>
          {/* Chubby head + clean cel-shaded ink outline */}
          <group scale={[A, B, C]}>
            <mesh>
              <sphereGeometry args={[1, 48, 36]} />
              <meshStandardMaterial color={fur} roughness={0.72} />
            </mesh>
            <mesh scale={1.055}>
              <sphereGeometry args={[1, 32, 24]} />
              <meshBasicMaterial color={INK} side={BackSide} />
            </mesh>
          </group>

          {/* Ears */}
          <Ear
            side={-1}
            shape={cat.ears}
            color={T(cat.earL ?? cat.fur)}
            inner={cat.inner}
            phase={phase}
            expression={expression}
          />
          <Ear
            side={1}
            shape={cat.ears}
            color={T(cat.earR ?? cat.fur)}
            inner={cat.inner}
            phase={phase}
            expression={expression}
          />

          {/* Coat Patterns */}
          {cat.pattern === "tabby" && (
            <>
              <Decal x={0} y={0.62} w={0.05} h={0.18} color={accent} />
              <Decal x={-0.19} y={0.57} w={0.045} h={0.15} rot={0.28} color={accent} />
              <Decal x={0.19} y={0.57} w={0.045} h={0.15} rot={-0.28} color={accent} />
              {([-1, 1] as const).map((s) => (
                <group key={s}>
                  <Decal x={s * 0.86} y={0.02} w={0.14} h={0.035} color={accent} />
                  <Decal x={s * 0.84} y={-0.12} w={0.12} h={0.035} color={accent} />
                </group>
              ))}
            </>
          )}
          {cat.pattern === "tux" && (
            <Decal x={0} y={-0.18} w={0.34} h={0.42} t={0.04} lift={0.003} color={accent} />
          )}
          {cat.pattern === "points" && (
            <Decal x={0} y={-0.12} w={0.52} h={0.38} t={0.04} lift={0.003} color={accent} opacity={0.55} />
          )}
          {cat.pattern === "calico" && (
            <>
              <Decal x={-0.52} y={0.42} w={0.42} h={0.32} rot={0.3} t={0.04} lift={0.004} color={T("#FF9F55")} />
              <Decal x={0.54} y={0.38} w={0.38} h={0.34} rot={-0.2} t={0.04} lift={0.004} color={T("#35314B")} />
            </>
          )}
          {cat.pattern === "spots" &&
            (
              [
                [-0.68, 0.22],
                [-0.42, 0.52],
                [0, 0.62],
                [0.46, 0.48],
                [0.7, 0.18],
              ] as const
            ).map(([x, y], i) => (
              <Decal
                key={i}
                x={x}
                y={y}
                w={0.075 + (i % 2) * 0.015}
                h={0.065 + (i % 2) * 0.015}
                t={0.03}
                color={accent}
              />
            ))}

          {/* Rosy Kawaii Blush (extra vibrant on laugh/smile/wink) */}
          {!upset && (
            <>
              {([-1, 1] as const).map((s) => (
                <group key={s}>
                  <Decal
                    x={s * 0.58}
                    y={-0.14}
                    w={0.155}
                    h={0.09}
                    t={0.03}
                    lift={0.012}
                    color={cat.cheek}
                    opacity={
                      expression === "laugh" || expression === "smile" || expression === "wink"
                        ? 0.88
                        : 0.72
                    }
                  />
                  {/* Cute anime blush slash marks */}
                  <Decal
                    x={s * 0.56}
                    y={-0.14}
                    w={0.018}
                    h={0.045}
                    rot={-0.35}
                    lift={0.025}
                    color="#FFFFFF"
                    opacity={0.65}
                  />
                  <Decal
                    x={s * 0.62}
                    y={-0.14}
                    w={0.018}
                    h={0.045}
                    rot={-0.35}
                    lift={0.025}
                    color="#FFFFFF"
                    opacity={0.65}
                  />
                </group>
              ))}
            </>
          )}

          {/* Muzzle, Triangle Nose & Expressive Mouth */}
          <MuzzleAndMouth cat={cat} expression={expression} upset={upset} phase={phase} />

          {/* Kawaii Eyes */}
          <Eyes cat={cat} expression={expression} phase={phase} />

          {/* Expressive Brows */}
          {upset &&
            ([-1, 1] as const).map((s) => {
              const sf = surface(s * 0.36, browY, 0.03);
              return (
                <group key={s} position={sf.position} rotation={sf.rotation}>
                  <mesh rotation={[0, 0, Math.PI / 2 + s * 0.42]}>
                    <capsuleGeometry args={[0.032, 0.22, 4, 8]} />
                    <meshBasicMaterial color={INK} />
                  </mesh>
                </group>
              );
            })}

          {expression === "smug" &&
            ([-1, 1] as const).map((s) => {
              const sf = surface(s * 0.38, browY + (s > 0 ? 0.04 : -0.02), 0.03);
              return (
                <group key={s} position={sf.position} rotation={sf.rotation}>
                  <mesh rotation={[0, 0, Math.PI / 2 - s * (s > 0 ? 0.18 : -0.15)]}>
                    <capsuleGeometry args={[0.022, 0.16, 4, 8]} />
                    <meshBasicMaterial color={INK} />
                  </mesh>
                </group>
              );
            })}

          {expression === "surprised" &&
            ([-1, 1] as const).map((s) => {
              const sf = surface(s * 0.38, browY + 0.06, 0.03);
              return (
                <group key={s} position={sf.position} rotation={sf.rotation}>
                  <mesh rotation={[0, 0, Math.PI / 2 - s * 0.2]}>
                    <capsuleGeometry args={[0.02, 0.14, 4, 8]} />
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

/* ───────────── public component (same API + new moods) ───────────── */

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

/** Eight 3D kawaii cats (react-three-fiber): idle animations, winks, laughs, smirks, blinks, ear twitches. */
export function CatIcon({ className = "", mood = "auto", variant = 0, animated = true }: CatProps) {
  const idx = ((Math.floor(variant) % CAT_COUNT) + CAT_COUNT) % CAT_COUNT;
  const cat = CATS[idx]!;
  const expression = mood === "auto" ? AUTO_EXPRESSIONS[idx % AUTO_EXPRESSIONS.length]! : mood;
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
          camera={{ position: [0, 0.06, 4.8], fov: 34 }}
          gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            pointerEvents: "none",
            background: "transparent",
          }}
        >
          <Cat3D cat={cat} expression={expression} phase={idx * 1.37} />
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