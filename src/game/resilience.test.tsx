import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LEVELS } from "./levels";
import { clearMainGame, resumeMain, saveMainGame, validGameState } from "./mainSaves";
import { STORAGE_ISSUE_EVENT, backupKey, recordWin, usePersisted, useProgress } from "./storage";
import { freshGame, type GameState } from "./useGame";
import { canPlayDaily, dailyPuzzle, shiftDay } from "./daily";
import { DAILY_PUZZLES } from "./daily-puzzles";

const level = LEVELS[0]!;
const played = (): GameState => {
  const g = freshGame(level);
  const board = [...g.board];
  board[1] = 1;
  return { board, mistakes: 1, hintsUsed: 0, hintIndex: 0, history: [{ board: g.board, mistakes: 0, hintsUsed: 0, hintIndex: 0 }] } as GameState;
};

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("main-level board saves", () => {
  it("keeps an unfinished board with its mistakes and undo history", () => {
    const saves = saveMainGame({}, 1, played());
    expect(resumeMain(saves, 1)?.mistakes).toBe(1);
    expect(resumeMain(saves, 1)?.history).toHaveLength(1);
  });
  it("drops the board once the level is solved", () => {
    const saves = saveMainGame({}, 1, played());
    const solved = { ...played(), board: level.solution.reduce((b, c, r) => { b[r * level.size + c] = 2; return b; }, Array(level.size ** 2).fill(0)) };
    expect(saveMainGame(saves, 1, solved)).toEqual({});
  });
  it("ignores damaged or mismatched saves instead of crashing", () => {
    expect(resumeMain({ 1: { board: [9] } as unknown as GameState }, 1)).toBeUndefined();
    expect(resumeMain({ 20: played() }, 20)).toBeUndefined(); // 5×5 board on an 8×8 level
    expect(validGameState(null, level)).toBe(false);
    expect(clearMainGame({ 1: played() }, 1)).toEqual({});
  });
});

describe("storage resilience", () => {
  it("backs up an unreadable save instead of overwriting it", async () => {
    localStorage.setItem("purrzle.progress", "{not json");
    const events: string[] = [];
    window.addEventListener(STORAGE_ISSUE_EVENT, (e) => events.push((e as CustomEvent).detail.kind));
    const { result } = renderHook(() => useProgress());
    await act(async () => {});
    expect(localStorage.getItem(backupKey("purrzle.progress"))).toBe("{not json");
    expect(result.current[0].unlocked).toBe(1);
    expect(events).toContain("corrupt");
  });
  it("a full or blocked storage reports a notice and play continues", async () => {
    const events: string[] = [];
    window.addEventListener(STORAGE_ISSUE_EVENT, (e) => events.push((e as CustomEvent).detail.kind));
    const { result } = renderHook(() => usePersisted("purrzle.test", { n: 0 }));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
    await act(async () => result.current[1]((v) => ({ n: v.n + 1 })));
    expect(result.current[0].n).toBe(1);
    expect(events).toContain("write");
  });
  it("older saves load and keep best stars after an update", async () => {
    localStorage.setItem("purrzle.progress", JSON.stringify({ unlocked: 3, stars: { 1: 3, 2: 2 } }));
    const { result } = renderHook(() => useProgress());
    await act(async () => {});
    expect(result.current[0].stars).toEqual({ 1: 3, 2: 2 });
    expect(recordWin(result.current[0], 1, 1).stars[1]).toBe(3);
  });
});

describe("daily puzzles after a long offline stretch", () => {
  it("any later date maps locally to the same fixed catalog puzzle", () => {
    // 2026-01-01 is catalog entry 1001; the 30-day rotation repeats exactly.
    expect(dailyPuzzle("2026-01-01")?.id).toBe(1001);
    expect(dailyPuzzle("2026-10-26")?.id).toBe(dailyPuzzle(shiftDay("2026-10-26", -30))?.id);
    expect(dailyPuzzle("2027-01-01")?.id).toBe(DAILY_PUZZLES[365 % 30]!.id);
    expect(canPlayDaily("2026-10-29", "2026-10-29")).toBe(true);
    expect(canPlayDaily("2026-10-30", "2026-10-29")).toBe(false);
  });
});
