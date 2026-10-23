import { useCallback, useEffect, useState } from "react";
import { LEVELS } from "./levels";

export interface Progress {
  unlocked: number; // highest unlocked level id
  stars: Record<number, number>;
}
export interface Settings {
  sound: boolean;
  music: boolean;
  reducedMotion: boolean;
  showConflicts: boolean;
}

export const DEFAULT_PROGRESS: Progress = { unlocked: 1, stars: {} };
export const DEFAULT_SETTINGS: Settings = { sound: true, music: false, reducedMotion: false, showConflicts: true };

export type StorageIssue = "read" | "write" | "corrupt";
export const STORAGE_ISSUE_EVENT = "purrzle-storage-issue";
export const backupKey = (key: string) => `${key}.backup`;

export function reportStorageIssue(kind: StorageIssue) {
  if (typeof window === "undefined") return;
  queueMicrotask(() => window.dispatchEvent(new CustomEvent(STORAGE_ISSUE_EVENT, { detail: { kind } })));
}

/** Writes never throw: full or blocked storage reports a recoverable notice instead. */
export function safeWrite(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    reportStorageIssue("write");
    return false;
  }
}

export function usePersisted<T>(key: string, fallback: T, normalize?: (value: T) => T) {
  const [value, setValue] = useState<T>(fallback);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      reportStorageIssue("read");
    }
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("bad shape");
        const saved = { ...fallback, ...(parsed as object) } as T;
        const next = normalize ? normalize(saved) : saved;
        setValue(next);
        if (JSON.stringify(next) !== raw) safeWrite(key, JSON.stringify(next));
      } catch {
        // Keep unreadable saves instead of silently overwriting them.
        safeWrite(backupKey(key), raw);
        reportStorageIssue("corrupt");
      }
    }
    setLoaded(true);
    const onSync = (e: Event) => {
      if ((e as CustomEvent).detail?.key === key) setValue((e as CustomEvent).detail.value);
    };
    window.addEventListener("purrzle-sync", onSync);
    return () => window.removeEventListener("purrzle-sync", onSync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = useCallback(
    (fn: (prev: T) => T) => {
      setValue((prev) => {
        const next = fn(prev);
        safeWrite(key, JSON.stringify(next));
        queueMicrotask(() => window.dispatchEvent(new CustomEvent("purrzle-sync", { detail: { key, value: next } })));
        return next;
      });
    },
    [key],
  );
  return [value, update, loaded] as const;
}

/** Completed former final levels open the added trail without replaying them. */
export function normalizeProgress(progress: Progress): Progress {
  const completed = Object.entries(progress.stars)
    .filter(([id, stars]) => stars > 0 && LEVELS.some((level) => level.id === Number(id)))
    .map(([id]) => Number(id));
  const next = Math.min(Math.max(0, ...completed) + 1, LEVELS.length);
  return { ...progress, unlocked: Math.max(progress.unlocked, next) };
}

/** Preserve the highest unlocked level and the best result of every replay. */
export function recordWin(progress: Progress, levelId: number, stars: number): Progress {
  return {
    unlocked: Math.max(progress.unlocked, Math.min(levelId + 1, LEVELS.length)),
    stars: { ...progress.stars, [levelId]: Math.max(progress.stars[levelId] ?? 0, stars) },
  };
}

export const useProgress = () => usePersisted<Progress>("purrzle.progress", DEFAULT_PROGRESS, normalizeProgress);
export const useSettings = () => usePersisted<Settings>("purrzle.settings", DEFAULT_SETTINGS);

/** Stars: 3 with no hints and few mistakes, fewer otherwise. */
export function computeStars(hintsUsed: number, mistakes: number): number {
  if (hintsUsed === 0 && mistakes <= 1) return 3;
  if (hintsUsed <= 1 && mistakes <= 4) return 2;
  return 1;
}
