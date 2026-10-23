import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Game } from "@/components/game/Game";
import { Kitten } from "@/components/game/Kitten";
import { canPlayDaily, completeDaily, currentStreak, dailyPuzzle, formatDay, localDay, resumeDaily, saveDailyGame, useDailyProgress, useLocalDay } from "@/game/daily";

export const Route = createFileRoute("/daily-play/$date")({
  head: ({ params }) => ({ meta: [
    { title: `Daily Puzzle ${params.date} — Purrzle` },
    { name: "description", content: "Solve today's dedicated fixed-answer cat puzzle and grow your daily streak." },
    { property: "og:title", content: `Daily Puzzle ${params.date} — Purrzle` },
    { property: "og:description", content: "One cat per row, column and color. A purrfect daily challenge." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: DailyPlay,
});

function DailyPlay() {
  const { date } = Route.useParams();
  const today = useLocalDay();
  const [progress, setProgress, loaded] = useDailyProgress();
  const [round, setRound] = useState(0);
  if (!today || !loaded) return <main className="grid min-h-[100dvh] place-items-center" aria-busy="true"><Kitten mood="thinking" className="size-28" /></main>;
  const puzzle = dailyPuzzle(date);
  if (!puzzle || !canPlayDaily(date, today)) return <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
    <Kitten mood="thinking" className="size-28" /><h1 className="text-2xl font-bold">Challenge unavailable</h1>
    <p className="text-muted-foreground">Today's challenge is {formatDay(today)}.</p>
    <Link to="/daily" className="btn-game bg-primary px-6 py-3 text-primary-foreground">Daily calendar</Link>
  </main>;
  return <Game key={`${date}-${round}`} puzzle={puzzle} onReplay={() => setRound((r) => r + 1)} daily={{
    date, initial: round === 0 ? resumeDaily(progress, date) : undefined,
    currentStreak: currentStreak(progress, today), bestStreak: progress.bestStreak,
    onSave: (state) => setProgress((p) => saveDailyGame(p, date, state, localDay())),
    onComplete: (state) => setProgress((p) => completeDaily(p, date, state, localDay())),
  }} />;
}