import { useCallback, useEffect, useRef } from "react";

export const TAP_INTERVAL = 250;
export type CellTool = "cat" | "pencil";

/** Independent pending taps per cell; never expose the first-click X of a double tap. */
export function useCellTaps(onPlace: (index: number, tool: CellTool) => void, disabled = false) {
  const pending = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const callback = useRef(onPlace);
  callback.current = onPlace;

  const cancel = useCallback(() => {
    pending.current.forEach(clearTimeout);
    pending.current.clear();
  }, []);

  useEffect(() => {
    if (disabled) cancel();
    return cancel;
  }, [disabled, cancel]);

  const tap = useCallback((index: number) => {
    if (disabled) return;
    const previous = pending.current.get(index);
    if (previous !== undefined) {
      clearTimeout(previous);
      pending.current.delete(index);
      callback.current(index, "cat");
      return;
    }
    pending.current.set(index, setTimeout(() => {
      pending.current.delete(index);
      callback.current(index, "pencil");
    }, TAP_INTERVAL));
  }, [disabled]);

  const keyboard = useCallback((index: number, tool: CellTool) => {
    if (disabled) return;
    const timer = pending.current.get(index);
    if (timer !== undefined) clearTimeout(timer);
    pending.current.delete(index);
    callback.current(index, tool);
  }, [disabled]);

  return { tap, keyboard, cancel };
}