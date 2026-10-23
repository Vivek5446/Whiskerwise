import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCellTaps } from "./useCellTaps";
import { useGame } from "./useGame";
import { LEVELS } from "./levels";

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("cell tap timing", () => {
  it("single tap waits 250ms before marking X", () => {
    const place = vi.fn();
    const { result } = renderHook(() => useCellTaps(place));
    act(() => result.current.tap(0));
    act(() => vi.advanceTimersByTime(249));
    expect(place).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(place).toHaveBeenCalledExactlyOnceWith(0, "pencil");
  });

  it("double tap places exactly one cat with no intermediate X", () => {
    const place = vi.fn();
    const { result } = renderHook(() => useCellTaps(place));
    act(() => result.current.tap(0));
    act(() => vi.advanceTimersByTime(100));
    expect(place).not.toHaveBeenCalled();
    act(() => result.current.tap(0));
    act(() => vi.advanceTimersByTime(1000));
    expect(place).toHaveBeenCalledExactlyOnceWith(0, "cat");
  });

  it("quick taps on different cells mark both independently", () => {
    const place = vi.fn();
    const { result } = renderHook(() => useCellTaps(place));
    act(() => result.current.tap(0));
    act(() => vi.advanceTimersByTime(100));
    act(() => result.current.tap(1));
    act(() => vi.advanceTimersByTime(150));
    expect(place.mock.calls).toEqual([[0, "pencil"]]);
    act(() => vi.advanceTimersByTime(100));
    expect(place.mock.calls).toEqual([[0, "pencil"], [1, "pencil"]]);
  });

  it("double tapping the second cell leaves the first cell's pending mark intact", () => {
    const place = vi.fn();
    const { result } = renderHook(() => useCellTaps(place));
    act(() => { result.current.tap(0); result.current.tap(1); result.current.tap(1); });
    act(() => vi.advanceTimersByTime(250));
    expect(place.mock.calls).toEqual([[1, "cat"], [0, "pencil"]]);
  });

  it("pending taps survive rerenders with the latest callback and original cell identity", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ place }) => useCellTaps(place), { initialProps: { place: first } });
    act(() => result.current.tap(4));
    rerender({ place: second });
    act(() => vi.advanceTimersByTime(250));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledExactlyOnceWith(4, "pencil");
  });

  it("pause and unmount cancel pending actions", () => {
    const place = vi.fn();
    const { result, rerender, unmount } = renderHook(({ disabled }) => useCellTaps(place, disabled), { initialProps: { disabled: false } });
    act(() => result.current.tap(0));
    rerender({ disabled: true });
    act(() => vi.advanceTimersByTime(250));
    expect(place).not.toHaveBeenCalled();
    rerender({ disabled: false });
    act(() => result.current.tap(1));
    unmount();
    act(() => vi.advanceTimersByTime(250));
    expect(place).not.toHaveBeenCalled();
  });

  it("keyboard placement is immediate and cancels the cell's pending tap", () => {
    const place = vi.fn();
    const { result } = renderHook(() => useCellTaps(place));
    act(() => { result.current.tap(2); result.current.keyboard(2, "cat"); });
    act(() => vi.advanceTimersByTime(250));
    expect(place).toHaveBeenCalledExactlyOnceWith(2, "cat");
  });

  it("one double tap of a wrong cell incurs exactly one game mistake", () => {
    const puzzle = LEVELS[0];
    if (!puzzle) throw new Error("Level 1 required");
    const { result } = renderHook(() => {
      const game = useGame(puzzle);
      return { game, taps: useCellTaps(game.place) };
    });
    act(() => { result.current.taps.tap(0); result.current.taps.tap(0); });
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.game.board[0]).toBe(2);
    expect(result.current.game.mistakes).toBe(1);
    act(() => result.current.game.undo());
    expect(result.current.game.board[0]).toBe(0);
    expect(result.current.game.mistakes).toBe(0);
  });
});