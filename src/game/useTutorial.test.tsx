import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TUTORIAL_KEY, useTutorial } from "./useTutorial";

beforeEach(() => localStorage.clear());
afterEach(cleanup);
describe("first-play tutorial", () => {
  it("opens on first play and persists completion", () => {
    const { result, unmount } = renderHook(() => useTutorial());
    expect(result.current.open).toBe(true);
    act(() => result.current.complete());
    expect(result.current.open).toBe(false);
    expect(localStorage.getItem(TUTORIAL_KEY)).toBe("done");
    unmount();
    const replay = renderHook(() => useTutorial());
    expect(replay.result.current.open).toBe(false);
  });
  it("Help reopens the tutorial without changing saved game progress", () => {
    localStorage.setItem(TUTORIAL_KEY, "done");
    localStorage.setItem("purrzle.progress", '{"unlocked":2,"stars":{"1":3}}');
    const { result } = renderHook(() => useTutorial());
    act(() => result.current.replay());
    expect(result.current.open).toBe(true);
    act(() => result.current.complete());
    expect(localStorage.getItem("purrzle.progress")).toBe('{"unlocked":2,"stars":{"1":3}}');
  });
});