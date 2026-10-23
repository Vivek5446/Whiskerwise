import { validGameState } from "./mainSaves";
import { useEffect, useState } from "react";
import { DAILY_PUZZLES } from "./daily-puzzles";
import { isSolved, type Puzzle } from "./rules";
import { computeStars, usePersisted } from "./storage";
import { type GameState } from "./useGame";

export type Clock = () => Date;
export const deviceClock: Clock = () => new Date();
const pad = (n: number) => String(n).padStart(2, "0");

/** Device-local date only; UTC is used below solely for calendar arithmetic. */
export function localDay(clock: Clock = deviceClock): string {
  const date = clock();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dayNumber(day: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), date = Number(match[3]);
  if (year < 1000 || month < 1 || month > 12 || date < 1 || date > 31) return null;
  const value = new Date(Date.UTC(year, month - 1, date));
  if (value.getUTCFullYear() !== year || value.getUTCMonth() !== month - 1 || value.getUTCDate() !== date) return null;
  return value.getTime() / 86_400_000;
}

export function shiftDay(day: string, offset: number): string {
  const ordinal = dayNumber(day);
  if (ordinal === null) throw new Error("Invalid calendar date");
  const date = new Date((ordinal + offset) * 86_400_000);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

const EPOCH = dayNumber("2026-01-01") ?? 0;
/** Permanent 30-day cycle, anchored to January 1, 2026; never consecutive repeats. */
export function dailyPuzzle(day: string): Puzzle | undefined {
  const ordinal = dayNumber(day);
  if (ordinal === null) return undefined;
  const index = ((ordinal - EPOCH) % DAILY_PUZZLES.length + DAILY_PUZZLES.length) % DAILY_PUZZLES.length;
  return DAILY_PUZZLES[index];
}

export function canPlayDaily(day: string, today: string): boolean {
  const date = dayNumber(day), current = dayNumber(today);
  // This milestone offers today only; older dates are history, not playable links.
  return date !== null && current !== null && date === current;
}

export function formatDay(day: string): string {
  const ordinal = dayNumber(day);
  if (ordinal === null) return day;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(ordinal * 86_400_000));
}

/** Refresh at midnight and after a suspended tab wakes; injectable for tests. */
export function useLocalDay(clock: Clock = deviceClock): string | null {
  const [day, setDay] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      const now = clock();
      setDay(localDay(() => now));
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(refresh, Math.max(1, midnight.getTime() - now.getTime() + 20));
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [clock]);
  return day;
}

export interface DailyRecord { puzzleId: number; stars: number }
export interface DailyProgress {
  completed: Record<string, DailyRecord>;
  lastCompleted: string | null;
  currentStreak: number;
  bestStreak: number;
  inProgress: { date: string; puzzleId: number; state: GameState } | null;
}
export const DEFAULT_DAILY: DailyProgress = { completed: {}, lastCompleted: null, currentStreak: 0, bestStreak: 0, inProgress: null };
export const DAILY_KEY = "purrzle.daily.v1";
export const useDailyProgress = () => usePersisted<DailyProgress>(DAILY_KEY, DEFAULT_DAILY);

/** Today or yesterday keeps the streak live; a missed intervening day breaks it. */
export function currentStreak(progress: DailyProgress, today: string): number {
  return progress.lastCompleted === today || progress.lastCompleted === shiftDay(today, -1) ? progress.currentStreak : 0;
}

export function dailyStatus(progress: DailyProgress, day: string): "Completed" | "In progress" | "Not started" {
  if (progress.completed[day]) return "Completed";
  return progress.inProgress?.date === day ? "In progress" : "Not started";
}

export function saveDailyGame(progress: DailyProgress, day: string, state: GameState, today: string): DailyProgress {
  const puzzle = dailyPuzzle(day);
  if (!puzzle || !canPlayDaily(day, today) || isSolved(state.board, puzzle)) return progress;
  return { ...progress, inProgress: { date: day, puzzleId: puzzle.id, state } };
}

/** Only a fixed-answer solve can write completion; replay updates stars, not streaks. */
export function completeDaily(progress: DailyProgress, day: string, state: GameState, today: string): DailyProgress {
  const puzzle = dailyPuzzle(day);
  if (!puzzle || !canPlayDaily(day, today) || !isSolved(state.board, puzzle)) return progress;
  const previous = progress.completed[day];
  const stars = computeStars(state.hintsUsed, state.mistakes);
  const streak = previous ? progress.currentStreak : progress.lastCompleted === shiftDay(day, -1) ? progress.currentStreak + 1 : 1;
  return {
    completed: { ...progress.completed, [day]: { puzzleId: puzzle.id, stars: Math.max(previous?.stars ?? 0, stars) } },
    lastCompleted: previous ? progress.lastCompleted : day,
    currentStreak: streak,
    bestStreak: Math.max(progress.bestStreak, streak),
    inProgress: progress.inProgress?.date === day ? null : progress.inProgress,
  };
}

export function resumeDaily(progress: DailyProgress, day: string): GameState | undefined {
  const saved = progress.inProgress, puzzle = dailyPuzzle(day);
  if (!saved || !puzzle || saved.date !== day || saved.puzzleId !== puzzle.id) return undefined;
  return validGameState(saved.state, puzzle) ? saved.state : undefined;
}