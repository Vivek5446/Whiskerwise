import { act, renderHook, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LEVELS } from "./levels";
import { findConflicts, idx } from "./rules";
import { computeStars } from "./storage";
import { useGame } from "./useGame";

const puzzle = LEVELS[0];
if (!puzzle) throw new Error("Level 1 is required");
afterEach(cleanup);

describe("fixed-answer gameplay", () => {
  it.each(LEVELS.map((level) => [level.id, level]))("Level %i penalizes incorrect placement once and solves only its stored answer", (_, level) => {
    const { result } = renderHook(() => useGame(level));
    const wrong = level.solution[0] === 0 ? 1 : 0;
    act(() => { result.current.place(wrong, "cat"); });
    expect(result.current.mistakes).toBe(1);
    expect(result.current.solved).toBe(false);
    act(() => { result.current.undo(); });
    expect(result.current.mistakes).toBe(0);
    act(() => { level.solution.forEach((c, r) => result.current.place(idx(level.size, r, c), "cat")); });
    expect(result.current.solved).toBe(true);
    expect(result.current.mistakes).toBe(0);
  });
  it("accepts a cat at row 1 column 3 of Level 1", () => {
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { expect(result.current.place(2, "cat")).toEqual({ state: 2, clash: false }); });
    expect(result.current.board[2]).toBe(2);
    expect(result.current.catCount).toBe(1);
    expect(result.current.mistakes).toBe(0);
  });

  it("penalizes a non-clashing wrong cat exactly once, not on rerender", () => {
    const { result, rerender } = renderHook(() => useGame(puzzle));
    act(() => { expect(result.current.place(0, "cat")).toEqual({ state: 2, clash: true }); });
    expect(findConflicts(result.current.board, puzzle).size).toBe(0);
    expect(result.current.wrongCats.has(0)).toBe(true);
    expect(result.current.catCount).toBe(0);
    expect(result.current.mistakes).toBe(1);
    rerender();
    rerender();
    expect(result.current.mistakes).toBe(1);
    act(() => { result.current.place(0, "cat"); });
    expect(result.current.board[0]).toBe(0);
    expect(result.current.mistakes).toBe(1);
    act(() => { result.current.place(0, "cat"); });
    expect(result.current.mistakes).toBe(2);
  });

  it("manual X notes never incur mistakes, including answer cells", () => {
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.place(0, "pencil"); result.current.place(2, "pencil"); });
    expect(result.current.board[0]).toBe(1);
    expect(result.current.board[2]).toBe(1);
    expect(result.current.mistakes).toBe(0);
    expect(result.current.catCount).toBe(0);
  });

  it("Undo restores both the board and mistake count", () => {
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.place(2, "cat"); result.current.place(0, "cat"); });
    expect(result.current.mistakes).toBe(1);
    act(() => { result.current.undo(); });
    expect(result.current.board[0]).toBe(0);
    expect(result.current.board[2]).toBe(2);
    expect(result.current.mistakes).toBe(0);
  });

  it("restart resets board and counters but keeps the original answer; Undo restores the round", () => {
    const { result } = renderHook(() => useGame(puzzle));
    const answer = [...puzzle.solution];
    act(() => { result.current.place(0, "cat"); result.current.hint(); });
    expect(result.current.hintsUsed).toBe(1);
    act(() => { result.current.restart(); });
    expect(result.current.board).toEqual(new Array(25).fill(0));
    expect(result.current.mistakes).toBe(0);
    expect(result.current.hintsUsed).toBe(0);
    expect(puzzle.solution).toEqual(answer);
    act(() => { result.current.undo(); });
    expect(result.current.mistakes).toBe(1);
    expect(result.current.hintsUsed).toBe(1);
  });

  it("hints clear a wrong cat without adding X, then place a predetermined cat", () => {
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.place(0, "cat"); result.current.place(1, "pencil"); result.current.hint(); });
    expect(result.current.board[0]).toBe(0);
    expect(result.current.board[1]).toBe(1);
    act(() => { result.current.hint(); });
    expect(result.current.board[2]).toBe(2);
    expect(result.current.board.filter((value) => value === 1)).toHaveLength(1);
  });

  it("completing Level 1 yields three stars with zero mistakes", () => {
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { puzzle.solution.forEach((c, r) => result.current.place(idx(puzzle.size, r, c), "cat")); });
    expect(result.current.solved).toBe(true);
    expect(computeStars(result.current.hintsUsed, result.current.mistakes)).toBe(3);
  });

  it("two mistakes lower the existing star rating to two", () => {
    const { result } = renderHook(() => useGame(puzzle));
    act(() => {
      result.current.place(0, "cat"); result.current.place(0, "cat");
      result.current.place(0, "cat"); result.current.place(0, "cat");
      puzzle.solution.forEach((c, r) => result.current.place(idx(puzzle.size, r, c), "cat"));
    });
    expect(result.current.solved).toBe(true);
    expect(result.current.mistakes).toBe(2);
    expect(computeStars(0, result.current.mistakes)).toBe(2);
  });
});