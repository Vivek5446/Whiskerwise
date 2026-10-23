import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { computeStars, normalizeProgress, recordWin, useProgress } from "./storage";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("20-level progression compatibility", () => {
  it("keeps an existing Level 2 save and stars unchanged", () => {
    expect(normalizeProgress({ unlocked: 2, stars: { 1: 2 } })).toEqual({ unlocked: 2, stars: { 1: 2 } });
  });
  it("opens Level 9 for a player who already completed the old final Level 8", () => {
    expect(normalizeProgress({ unlocked: 8, stars: { 1: 3, 8: 2 } })).toEqual({ unlocked: 9, stars: { 1: 3, 8: 2 } });
  });
  it("does not open Level 9 merely because Level 8 was unlocked", () => {
    expect(normalizeProgress({ unlocked: 8, stars: { 7: 3 } }).unlocked).toBe(8);
  });
  it.each(Array.from({ length: 19 }, (_, i) => i + 1))("winning Level %i opens exactly the next level", (id) => {
    expect(recordWin({ unlocked: id, stars: {} }, id, 3)).toEqual({ unlocked: id + 1, stars: { [id]: 3 } });
  });
  it("caps completion of Level 20 at Level 20", () => {
    expect(recordWin({ unlocked: 20, stars: {} }, 20, 3)).toEqual({ unlocked: 20, stars: { 20: 3 } });
  });
  it("a weaker replay preserves best stars, other results and unlocked levels", () => {
    expect(recordWin({ unlocked: 12, stars: { 1: 3, 8: 2, 11: 3 } }, 8, 1)).toEqual({ unlocked: 12, stars: { 1: 3, 8: 2, 11: 3 } });
  });
  it("a better replay improves only that level's best stars", () => {
    expect(recordWin({ unlocked: 12, stars: { 1: 3, 8: 1 } }, 8, 3)).toEqual({ unlocked: 12, stars: { 1: 3, 8: 3 } });
  });
  it("persists winning, replay results, and unlocks after unmount and reopening", async () => {
    localStorage.setItem("purrzle.progress", JSON.stringify({ unlocked: 8, stars: { 1: 3, 7: 2 } }));
    const first = renderHook(useProgress);
    await waitFor(() => expect(first.result.current[2]).toBe(true));
    act(() => first.result.current[1]((p) => recordWin(p, 8, 1)));
    await act(async () => {});
    act(() => first.result.current[1]((p) => recordWin(p, 8, 3)));
    await act(async () => {});
    first.unmount();
    const reopened = renderHook(useProgress);
    await waitFor(() => expect(reopened.result.current[0]).toEqual({ unlocked: 9, stars: { 1: 3, 7: 2, 8: 3 } }));
    expect(JSON.parse(localStorage.getItem("purrzle.progress") ?? "{}")).toEqual(reopened.result.current[0]);
  });
  it("keeps the existing three-star scoring thresholds", () => {
    expect(computeStars(0, 1)).toBe(3);
    expect(computeStars(0, 2)).toBe(2);
    expect(computeStars(1, 4)).toBe(2);
    expect(computeStars(1, 5)).toBe(1);
    expect(computeStars(2, 0)).toBe(1);
  });
});