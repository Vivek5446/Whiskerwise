import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DAILY_PUZZLES } from "./daily-puzzles";
import { LEVELS } from "./levels";
import { canPlayDaily, completeDaily, currentStreak, dailyPuzzle, dailyStatus, dayNumber, DEFAULT_DAILY, localDay, resumeDaily, saveDailyGame, shiftDay, useDailyProgress, useLocalDay } from "./daily";
import { emptyBoard, idx, isCorrectCell, isSolved, solvePuzzle, type Puzzle } from "./rules";
import { freshGame, useGame, type GameState } from "./useGame";

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.useRealTimers(); });
const solved = (day: string, hints = 0): GameState => {
  const puzzle = dailyPuzzle(day);
  if (!puzzle) throw new Error("Missing daily");
  const state = freshGame(puzzle);
  puzzle.solution.forEach((c, r) => { state.board[idx(puzzle.size, r, c)] = 2; });
  return { ...state, hintsUsed: hints };
};
const win = (progress = DEFAULT_DAILY, day = "2026-10-22", hints = 0) => completeDaily(progress, day, solved(day, hints), day);

describe("dedicated catalog", () => {
  it("has 30 permanently ordered distinct IDs", () => expect(DAILY_PUZZLES.map((p) => p.id)).toEqual(Array.from({ length: 30 }, (_, i) => 1001 + i)));
  it.each(DAILY_PUZZLES.map((p) => [p.id, p]))("daily %i has exactly one answer, accepted by gameplay", (_, p) => {
    expect(solvePuzzle(p.size, p.regions)).toEqual([p.solution]);
    const board = emptyBoard(p.size);
    p.solution.forEach((c, r) => { board[idx(p.size, r, c)] = 2; });
    expect(isSolved(board, p)).toBe(true);
    for (let i = 0; i < board.length; i++) expect(isCorrectCell(i, p)).toBe(board[i] === 2);
    expect(p.regions).toHaveLength(p.size ** 2);
    expect([...new Set(p.regions)].sort()).toEqual(Array.from({ length: p.size }, (_, i) => i));
  });
  it.each(DAILY_PUZZLES.map((p) => [p.id, p]))("daily %i has connected regions and retains mistake/undo rules", (_, p) => {
    for (let region = 0; region < p.size; region++) {
      const cells = new Set(p.regions.flatMap((v, i) => v === region ? [i] : []));
      const start = [...cells][0]; if (start === undefined) throw new Error("Missing region");
      const visited = new Set<number>(), queue = [start];
      while (queue.length) {
        const cell = queue.pop(); if (cell === undefined || visited.has(cell)) continue;
        visited.add(cell);
        const r = Math.floor(cell / p.size), c = cell % p.size;
        for (const [rr, cc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
          if (rr === undefined || cc === undefined || rr < 0 || cc < 0 || rr >= p.size || cc >= p.size) continue;
          const neighbor = idx(p.size, rr, cc); if (cells.has(neighbor) && !visited.has(neighbor)) queue.push(neighbor);
        }
      }
      expect(visited.size).toBe(cells.size);
    }
    const game = renderHook(() => useGame(p));
    const wrong = p.solution[0] === 0 ? 1 : 0;
    act(() => game.result.current.place(wrong, "cat"));
    expect(game.result.current.mistakes).toBe(1);
    act(() => game.result.current.undo()); expect(game.result.current.mistakes).toBe(0);
    act(() => game.result.current.place(wrong, "pencil")); expect(game.result.current.mistakes).toBe(0);
    act(() => p.solution.forEach((c, r) => game.result.current.place(idx(p.size, r, c), "cat")));
    expect(game.result.current.solved).toBe(true);
    game.unmount();
  });
  it("daily and main layouts are distinct under rotations, reflections and recoloring", () => {
    const signature = (p: Puzzle) => {
      const variants: string[] = [];
      for (let flip = 0; flip < 2; flip++) for (let turn = 0; turn < 4; turn++) {
        const cells = new Array<number>(p.regions.length);
        p.regions.forEach((reg, i) => {
          let r = Math.floor(i / p.size), c = i % p.size;
          if (flip) c = p.size - 1 - c;
          for (let t = 0; t < turn; t++) [r, c] = [c, p.size - 1 - r];
          cells[idx(p.size, r, c)] = reg;
        });
        const labels = new Map<number, number>();
        variants.push(cells.map((v) => { if (!labels.has(v)) labels.set(v, labels.size); return labels.get(v); }).join(""));
      }
      return `${p.size}:${variants.sort()[0]}`;
    };
    expect(new Set([...LEVELS, ...DAILY_PUZZLES].map(signature)).size).toBe(50);
  });
});

describe("local date schedule", () => {
  it("uses local date components, not UTC conversion", () => {
    const date = new Date(2026, 9, 22, 0, 5);
    date.toISOString = () => { throw new Error("UTC conversion forbidden"); };
    expect(localDay(() => date)).toBe("2026-10-22");
  });
  it("maps January 1 to ID 1001 and repeats after exactly 30 days", () => {
    expect(dailyPuzzle("2026-01-01")?.id).toBe(1001);
    expect(dailyPuzzle("2026-01-30")?.id).toBe(1030);
    expect(dailyPuzzle("2026-01-31")?.id).toBe(1001);
    for (let i = 0; i < 100; i++) {
      const day = shiftDay("2026-01-01", i);
      expect(dailyPuzzle(day)?.id).not.toBe(dailyPuzzle(shiftDay(day, 1))?.id);
      expect(dailyPuzzle(day)?.id).toBe(dailyPuzzle(shiftDay(day, 30))?.id);
    }
  });
  it("handles month, year, leap day and DST calendar boundaries", () => {
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDay("2028-02-28", 1)).toBe("2028-02-29");
    expect(shiftDay("2028-02-29", 1)).toBe("2028-03-01");
    expect(shiftDay("2026-03-08", 1)).toBe("2026-03-09");
    expect(dayNumber("2026-02-29")).toBeNull();
  });
  it("changes the challenge at local midnight with an injectable clock", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59));
    const { result } = renderHook(() => useLocalDay());
    expect(result.current).toBe("2026-12-31");
    act(() => vi.advanceTimersByTime(1100));
    expect(result.current).toBe("2027-01-01");
  });
  it("blocks future, invalid and past daily play", () => {
    expect(canPlayDaily("2026-10-23", "2026-10-22")).toBe(false);
    expect(canPlayDaily("2026-10-21", "2026-10-22")).toBe(false);
    expect(canPlayDaily("bad", "2026-10-22")).toBe(false);
    expect(canPlayDaily("2026-10-22", "2026-10-22")).toBe(true);
  });
});

describe("daily rewards and saved play", () => {
  it("starting or placing an incorrect cat does not complete a day", () => {
    const p = dailyPuzzle("2026-10-22"); if (!p) throw new Error("Missing puzzle");
    const state = freshGame(p); state.board[p.solution[0] === 0 ? 1 : 0] = 2;
    const started = saveDailyGame(DEFAULT_DAILY, "2026-10-22", state, "2026-10-22");
    expect(dailyStatus(started, "2026-10-22")).toBe("In progress");
    expect(started.completed).toEqual({}); expect(started.currentStreak).toBe(0);
    expect(completeDaily(started, "2026-10-22", state, "2026-10-22")).toEqual(started);
  });
  it("first successful completion counts exactly one day", () => {
    const result = win(); expect(result.currentStreak).toBe(1); expect(result.bestStreak).toBe(1);
    expect(result.lastCompleted).toBe("2026-10-22"); expect(Object.keys(result.completed)).toEqual(["2026-10-22"]);
  });
  it("consecutive dates increment the current streak", () => expect(win(win(), "2026-10-23").currentStreak).toBe(2));
  it("skipping a day resets to one while preserving best streak", () => {
    const previous = win(win(), "2026-10-23");
    expect(currentStreak(previous, "2026-10-25")).toBe(0);
    const next = win(previous, "2026-10-25"); expect(next.currentStreak).toBe(1); expect(next.bestStreak).toBe(2);
  });
  it("replay never duplicates records or increments streak", () => expect(win(win())).toEqual(win()));
  it("a better replay improves stars without changing streak", () => {
    const previous = win(DEFAULT_DAILY, "2026-10-22", 3);
    const result = win(previous); expect(result.completed["2026-10-22"]?.stars).toBe(3); expect(result.currentStreak).toBe(1);
  });
  it("a weaker replay preserves the best star result", () => expect(win(win(), "2026-10-22", 3)).toEqual(win()));
  it("future solves and old-date replays cannot change today's streak", () => {
    const previous = win();
    expect(completeDaily(previous, "2026-10-23", solved("2026-10-23"), "2026-10-22")).toEqual(previous);
    expect(completeDaily(previous, "2026-10-22", solved("2026-10-22"), "2026-10-23")).toEqual(previous);
  });
  it("persists snapshots, counters, undo history and completion independently from main saves", async () => {
    const day = "2026-10-22", p = dailyPuzzle(day); if (!p) throw new Error("Missing daily");
    localStorage.setItem("purrzle.progress", '{"unlocked":2,"stars":{"1":3}}');
    const main = localStorage.getItem("purrzle.progress");
    const game = renderHook(() => useGame(p));
    act(() => { game.result.current.place(p.solution[0] === 0 ? 1 : 0, "cat"); game.result.current.hint(); });
    const hook = renderHook(useDailyProgress);
    act(() => hook.result.current[1]((s) => saveDailyGame(s, day, game.result.current.state, day)));
    await act(async () => {}); const snapshot = game.result.current.state;
    hook.unmount(); game.unmount();
    const reopened = renderHook(useDailyProgress);
    expect(resumeDaily(reopened.result.current[0], day)).toEqual(snapshot);
    expect(resumeDaily(reopened.result.current[0], "2026-10-23")).toBeUndefined();
    const resumed = renderHook(() => useGame(p, resumeDaily(reopened.result.current[0], day)));
    act(() => resumed.result.current.undo()); expect(resumed.result.current.hintsUsed).toBe(0); expect(resumed.result.current.mistakes).toBe(1);
    act(() => reopened.result.current[1]((s) => completeDaily(s, day, solved(day), day)));
    await act(async () => {}); reopened.unmount();
    const again = renderHook(useDailyProgress);
    expect(again.result.current[0].completed[day]).toEqual({ puzzleId: p.id, stars: 3 });
    expect(again.result.current[0].inProgress).toBeNull();
    expect(localStorage.getItem("purrzle.progress")).toBe(main);
  });
});