import { Link } from "@tanstack/react-router";
import { CalendarHeart, Check, Flame, Play, Trophy } from "lucide-react";
import { Kitten } from "./Kitten";
import { GameButton } from "./ui";
import { currentStreak, dailyStatus, formatDay, shiftDay, type DailyProgress } from "@/game/daily";
import { cn } from "@/lib/utils";

export function DailyCalendar({ today, progress }: { today: string; progress: DailyProgress }) {
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 5));
  return (
    <div className="grid w-full grid-cols-7 gap-1" aria-label="Recent daily completions">
      {days.map((day) => {
        const completed = progress.completed[day];
        const future = day > today;
        return <div key={day} aria-label={`${formatDay(day)}, ${completed ? `completed, ${completed.stars} stars` : future ? "unavailable" : day === today ? "today, incomplete" : "missed"}`} aria-current={day === today ? "date" : undefined}
          className={cn("flex min-w-0 flex-col items-center gap-1 rounded-lg py-2 text-xs", day === today ? "bg-primary/15 ring-2 ring-primary" : completed ? "bg-mint/35" : "bg-card", future && "opacity-40")}>
          <span className="font-semibold text-muted-foreground">{new Intl.DateTimeFormat(undefined, { weekday: "narrow", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))}</span>
          <span className="font-display text-sm font-semibold">{Number(day.slice(-2))}</span>
          {completed ? <Check className="size-3.5 text-mint-deep" strokeWidth={3} /> : <span className="grid h-3.5 place-items-center text-muted-foreground">{future ? "·" : day === today ? "○" : "–"}</span>}
        </div>;
      })}
    </div>
  );
}

export function DailySummary({ today, progress, onPlay, full = false }: { today: string; progress: DailyProgress; onPlay: () => void; full?: boolean }) {
  const status = dailyStatus(progress, today);
  return (
    <section className="relative z-10 w-full border-t-2 border-border pt-5 text-left" aria-label="Daily challenge">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <Kitten mood="hint" className={full ? "size-28" : "size-20"} />
          <CalendarHeart className="absolute bottom-0 right-0 size-7 rounded-full bg-card p-1 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-semibold">Daily Purrzle</h2>
          <p className="text-sm font-semibold text-muted-foreground">{formatDay(today)}</p>
          <p className={cn("mt-1 text-sm font-bold", status === "Completed" ? "text-mint-deep" : "text-secondary")}>{status}{status === "Completed" && ` · ${progress.completed[today]?.stars ?? 0}★`}</p>
        </div>
      </div>
      <div className="my-4 flex flex-wrap items-center justify-between gap-2 font-display font-semibold">
        <span className="flex items-center gap-1.5"><Flame className="size-5 text-primary" /> {currentStreak(progress, today)} day streak</span>
        <span className="flex items-center gap-1.5 text-muted-foreground"><Trophy className="size-4 text-star-deep" /> Best {progress.bestStreak}</span>
      </div>
      <GameButton className="mb-4 flex w-full items-center justify-center gap-2 px-3 text-base" onClick={onPlay}>
        <Play className="size-5 fill-current" /> {status === "Completed" ? "Replay Today's Puzzle" : status === "In progress" ? "Resume Today's Puzzle" : "Play Today's Puzzle"}
      </GameButton>
      <DailyCalendar today={today} progress={progress} />
      {!full && <Link to="/daily" className="mt-3 flex min-h-11 items-center justify-center gap-2 font-semibold text-secondary"><CalendarHeart className="size-4" /> Daily calendar</Link>}
    </section>
  );
}