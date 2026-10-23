let ctx: AudioContext | null = null;

export function blip(kind: "place" | "mark" | "error" | "win" | "tap") {
  if (typeof window === "undefined") return;
  if (typeof AudioContext === "undefined") return;
  ctx ??= new AudioContext();
  const audio = ctx;
  if (audio.state === "suspended") void audio.resume().catch(() => {});
  const notes: Record<typeof kind, number[]> = {
    place: [660, 880],
    mark: [420],
    error: [220, 180],
    tap: [520],
    win: [523, 659, 784, 1047],
  };
  notes[kind].forEach((f, i) => {
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = kind === "error" ? "triangle" : "sine";
    o.frequency.value = f;
    const t = audio.currentTime + i * 0.08;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + 0.2);
  });
}
