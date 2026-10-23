// In-progress main-level boards, stored apart from stars/unlocks so a bad save can never touch rewards.
import { getLevel } from "./levels";
import { isSolved, type Puzzle } from "./rules";
import { usePersisted } from "./storage";
import type { GameState } from "./useGame";

export const MAIN_SAVES_KEY = "purrzle.main-boards.v1";
export type MainSaves = Record<string, GameState>;
export const useMainSaves = () => usePersisted<MainSaves>(MAIN_SAVES_KEY, {});

/** Shape check shared by daily and main resumes: unknown or damaged saves are ignored, not trusted. */
export function validGameState(state: unknown, puzzle: Puzzle): state is GameState {
  const ok = (s: unknown): boolean => {
    if (!s || typeof s !== "object") return false;
    const v = s as GameState;
    return Array.isArray(v.board) && v.board.length === puzzle.size ** 2 && v.board.every((c) => c === 0 || c === 1 || c === 2)
      && Number.isInteger(v.mistakes) && v.mistakes >= 0 && Number.isInteger(v.hintsUsed) && v.hintsUsed >= 0;
  };
  return ok(state) && Array.isArray((state as GameState).history) && (state as GameState).history.every(ok);
}

export function saveMainGame(saves: MainSaves, levelId: number, state: GameState): MainSaves {
  const level = getLevel(levelId);
  if (!level) return saves;
  if (isSolved(state.board, level) || state.history.length === 0) {
    if (!(levelId in saves)) return saves;
    const { [levelId]: _drop, ...rest } = saves;
    return rest;
  }
  return { ...saves, [levelId]: state };
}

export function clearMainGame(saves: MainSaves, levelId: number): MainSaves {
  if (!(levelId in saves)) return saves;
  const { [levelId]: _drop, ...rest } = saves;
  return rest;
}

export function resumeMain(saves: MainSaves, levelId: number): GameState | undefined {
  const level = getLevel(levelId), saved = saves[levelId];
  return level && validGameState(saved, level) && !isSolved(saved.board, level) ? saved : undefined;
}
