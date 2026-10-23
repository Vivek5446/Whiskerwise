import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Game } from "@/components/game/Game";
import { getLevel } from "@/game/levels";
import { recordWin, useProgress } from "@/game/storage";
import { resumeMain, saveMainGame, useMainSaves } from "@/game/mainSaves";
import { Kitten } from "@/components/game/Kitten";

export const Route = createFileRoute("/play/$levelId")({
  validateSearch: (s: Record<string, unknown>): { daily?: boolean } => (s["daily"] ? { daily: true } : {}),
  beforeLoad: ({ search }) => { if (search.daily) throw redirect({ to: "/daily" }); },
  loader: ({ params }) => {
    const level = getLevel(Number(params.levelId));
    if (!level) throw notFound();
    return { level };
  },
  head: ({ params }) => ({
    meta: [
      { title: `Level ${params.levelId} — Purrzle` },
      { name: "description", content: "Place one cat in every row, column and region. No cats may touch." },
      { property: "og:title", content: `Level ${params.levelId} — Purrzle` },
      { property: "og:description", content: "Can you seat every cat without any of them touching?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  const { level } = Route.useLoaderData();
  const [round, setRound] = useState(0);
  const [progress, setProgress, loaded] = useProgress();
  const [saves, setSaves, savesLoaded] = useMainSaves();
  if (!loaded || !savesLoaded) return <main className="grid min-h-[100dvh] place-items-center" aria-busy="true"><Kitten mood="thinking" className="size-28" /></main>;
  // Remount the game when the level changes (or on replay) so state resets cleanly.
  return <Game key={`${level.id}-${round}`} puzzle={level} locked={level.id > progress.unlocked} onMainComplete={(stars) => setProgress((p) => recordWin(p, level.id, stars))} onReplay={() => setRound((r) => r + 1)}
    main={{ initial: round === 0 ? resumeMain(saves, level.id) : undefined, onSave: (state) => setSaves((s) => saveMainGame(s, level.id, state)) }} />;
}

