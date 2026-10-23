import { createFileRoute } from "@tanstack/react-router";
import { Eye, Music, Sparkles, Volume2 } from "lucide-react";
import { useState } from "react";
import { Decor, GameButton, Screen, TopBar } from "@/components/game/ui";
import { DEFAULT_PROGRESS, useProgress, useSettings, type Settings } from "@/game/storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Purrzle" },
      { name: "description", content: "Sound, music and visual preferences for Purrzle." },
      { property: "og:title", content: "Settings — Purrzle" },
      { property: "og:description", content: "Sound, music and visual preferences for Purrzle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const ROWS: { key: keyof Settings; label: string; hint: string; icon: typeof Eye; tint: string }[] = [
  { key: "sound", label: "Sound effects", hint: "Soft pops and chimes", icon: Volume2, tint: "bg-region-2" },
  { key: "music", label: "Music", hint: "Coming soon", icon: Music, tint: "bg-region-0" },
  { key: "reducedMotion", label: "Reduce motion", hint: "Calmer animations", icon: Sparkles, tint: "bg-region-3" },
  { key: "showConflicts", label: "Show conflicts", hint: "Highlight cats that break a rule", icon: Eye, tint: "bg-region-1" },
];

function SettingsPage() {
  const [settings, setSettings] = useSettings();
  const [, setProgress] = useProgress();
  const [confirming, setConfirming] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  return (
    <Screen>
      <Decor />
      <TopBar title="Settings" />
      <div className="relative z-10 overflow-hidden rounded-3xl bg-card shadow-soft">
        {ROWS.map((r, i) => {
          const on = settings[r.key];
          const Icon = r.icon;
          return (
            <GameButton variant="cell" tone="plain"
              key={r.key}
              disabled={r.key === "music"}
              role="switch"
              aria-checked={r.key === "music" ? false : on}
              onClick={() => setSettings((s) => ({ ...s, [r.key]: !s[r.key] }))}
              className={cn("flex w-full items-center gap-3 p-4 text-left transition-colors active:bg-muted disabled:cursor-default disabled:opacity-55", i && "border-t")}
            >
              <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl text-ink", r.tint)}>
                <Icon className="size-5" strokeWidth={2.4} />
              </span>
              <span className="flex-1">
                <span className="block font-display text-lg font-semibold leading-tight">{r.label}</span>
                <span className="text-sm text-muted-foreground">{r.hint}</span>
              </span>
              <span className={cn("relative h-8 w-14 shrink-0 rounded-full border-2 transition-colors", on && r.key !== "music" ? "border-mint-deep bg-mint" : "border-border bg-muted")}>
                <span className={cn("absolute top-0.5 grid size-6 place-items-center rounded-full bg-card text-[10px] font-bold shadow-pop transition-transform duration-200", on ? "translate-x-[1.6rem] text-mint-deep" : "translate-x-0.5 text-muted-foreground")}>
                  {on && r.key !== "music" ? "ON" : "OFF"}
                </span>
              </span>
            </GameButton>
          );
        })}
      </div>

      <div className="relative z-10 mt-8">
        {confirming ? (
          <div className="animate-rise space-y-3 rounded-3xl bg-card p-5 text-center shadow-soft">
            <p className="font-display text-lg font-semibold">Reset all level progress?</p>
            <p className="text-sm text-muted-foreground">Your stars and unlocked levels will be cleared.</p>
            <div className="grid grid-cols-2 gap-3">
              <GameButton tone="plain" className="text-base" onClick={() => setConfirming(false)}>Keep</GameButton>
              <GameButton className="bg-destructive text-base [--btn-depth:var(--primary-deep)]" onClick={() => { setProgress(() => DEFAULT_PROGRESS); setConfirming(false); setResetDone(true); }}>Reset</GameButton>
            </div>
          </div>
        ) : (
          <GameButton variant="cell" tone="plain" onClick={() => { setConfirming(true); setResetDone(false); }} className="min-h-11 w-full rounded-2xl bg-transparent p-3 text-sm font-semibold text-destructive active:bg-destructive/10">
            {resetDone ? "Progress reset ✓" : "Reset progress"}
          </GameButton>
        )}
      </div>
    </Screen>
  );
}
