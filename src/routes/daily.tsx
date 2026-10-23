import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DailySummary } from "@/components/game/DailySummary";
import { Decor, Screen, Stars, TopBar } from "@/components/game/ui";
import { formatDay, useDailyProgress, useLocalDay } from "@/game/daily";

export const Route = createFileRoute("/daily")({
  head: () => ({ meta: [
    { title: "Daily Calendar — Purrzle" },
    { name: "description", content: "Today's dedicated cat puzzle, daily streaks and your completion calendar." },
    { property: "og:title", content: "Daily Calendar — Purrzle" },
    { property: "og:description", content: "A new daily cat puzzle and a trail of purrfect days." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: DailyPage,
});

function DailyPage() {
  const today = useLocalDay();
  const [progress, , loaded] = useDailyProgress();
  const navigate = useNavigate();
  return <Screen>
    <Decor /><TopBar title="Daily Calendar" />
    {today && loaded && <>
      <DailySummary full today={today} progress={progress} onPlay={() => navigate({ to: "/daily-play/$date", params: { date: today } })} />
      <section className="relative z-10 mt-7 w-full border-t-2 border-border pt-5">
        <h2 className="mb-4 text-xl font-semibold">Purrfect days</h2>
        {Object.entries(progress.completed).sort(([a], [b]) => b.localeCompare(a)).length === 0 ? <p className="text-sm text-muted-foreground">No completed days yet.</p> :
          <ul className="divide-y divide-border">{Object.entries(progress.completed).sort(([a], [b]) => b.localeCompare(a)).map(([day, record]) => <li key={day} className="flex items-center justify-between gap-2 py-3"><span className="text-sm font-semibold">{formatDay(day)}</span><Stars count={record.stars} /></li>)}</ul>}
      </section>
    </>}
  </Screen>;
}