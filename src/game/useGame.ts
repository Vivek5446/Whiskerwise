import { useCallback, useMemo, useRef, useState } from "react";
import { completedRegions, emptyBoard, findConflicts, incorrectCats, isCorrectCell, isSolved, nextHint, type Board, type CellState, type Puzzle } from "./rules";
import type { CellTool } from "./useCellTaps";

export interface Snapshot {
  board: Board;
  mistakes: number;
  hintsUsed: number;
  hintIndex: number | null;
}
export interface GameState extends Snapshot { history: Snapshot[] }
export const freshGame = (puzzle: Puzzle): GameState => ({ board: emptyBoard(puzzle.size), mistakes: 0, hintsUsed: 0, hintIndex: null, history: [] });

/** Atomic snapshots keep delayed independent taps and Undo counters consistent. */
export function useGame(puzzle: Puzzle, initial?: GameState) {
  const [game, setGame] = useState<GameState>(() => initial ?? freshGame(puzzle));
  const current = useRef(game);
  const update = useCallback((next: GameState) => {
    current.current = next;
    setGame(next);
  }, []);
  const commit = useCallback((next: Snapshot) => {
    const { history, ...previous } = current.current;
    update({ ...next, history: [...history.slice(-99), previous] });
  }, [update]);

  const place = useCallback((i: number, tool: CellTool): { state: CellState; clash: boolean } => {
    const previous = current.current;
    const old = previous.board[i];
    if (old === undefined || isSolved(previous.board, puzzle)) return { state: old ?? 0, clash: false };
    const target: CellState = tool === "cat" ? 2 : 1;
    const state: CellState = old === target ? 0 : target;
    const board = [...previous.board];
    board[i] = state;
    const clash = state === 2 && !isCorrectCell(i, puzzle);
    commit({ board, mistakes: previous.mistakes + (clash ? 1 : 0), hintsUsed: previous.hintsUsed, hintIndex: null });
    return { state, clash };
  }, [puzzle, commit]);

  const undo = useCallback(() => {
    const { history } = current.current;
    const previous = history.at(-1);
    if (previous) update({ ...previous, history: history.slice(0, -1) });
  }, [update]);
  const restart = useCallback(() => commit(freshGame(puzzle)), [commit, puzzle]);
  const hint = useCallback(() => {
    const previous = current.current;
    const h = nextHint(previous.board, puzzle);
    if (!h) return;
    const board = [...previous.board];
    // Clearing a wrong cat never writes a player's manual X note.
    board[h.index] = h.kind === "place" ? 2 : 0;
    commit({ board, mistakes: previous.mistakes, hintsUsed: previous.hintsUsed + 1, hintIndex: h.index });
  }, [puzzle, commit]);

  const { board, mistakes, hintsUsed, hintIndex } = game;
  const conflicts = useMemo(() => findConflicts(board, puzzle), [board, puzzle]);
  const wrongCats = useMemo(() => incorrectCats(board, puzzle), [board, puzzle]);
  const doneRegions = useMemo(() => completedRegions(board, puzzle), [board, puzzle]);
  const solved = useMemo(() => isSolved(board, puzzle), [board, puzzle]);
  const catCount = board.filter((v, i) => v === 2 && isCorrectCell(i, puzzle)).length;
  return { state: game, board, conflicts, wrongCats, doneRegions, solved, catCount, hintsUsed, mistakes, hintIndex, canUndo: game.history.length > 0, place, undo, restart, hint };
}
