// Pure puzzle rules: no React, no storage.
export type CellState = 0 | 1 | 2; // 0 empty, 1 X mark, 2 cat
export type Board = CellState[]; // row-major, size*size

export interface Puzzle {
  id: number;
  size: number;
  regions: number[]; // row-major region index per cell
  solution: number[]; // solution[row] = column of the cat
  title: string;
  difficulty: "Cozy" | "Curious" | "Clever" | "Tricky" | "Purrplexing";
}

export const idx = (size: number, r: number, c: number) => r * size + c;

export function emptyBoard(size: number): Board {
  return new Array(size * size).fill(0) as Board;
}

export function catPositions(board: Board, size: number): [number, number][] {
  const out: [number, number][] = [];
  board.forEach((v, i) => v === 2 && out.push([Math.floor(i / size), i % size]));
  return out;
}

/** Cells whose cats break a rule (row, column, region or touching). */
export function findConflicts(board: Board, puzzle: Puzzle): Set<number> {
  const { size, regions } = puzzle;
  const cats = catPositions(board, size);
  const bad = new Set<number>();
  for (let a = 0; a < cats.length; a++) {
    for (let b = a + 1; b < cats.length; b++) {
      const first = cats[a];
      const second = cats[b];
      if (!first || !second) continue;
      const [r1, c1] = first;
      const [r2, c2] = second;
      const i1 = idx(size, r1, c1);
      const i2 = idx(size, r2, c2);
      const clash =
        r1 === r2 ||
        c1 === c2 ||
        regions[i1] === regions[i2] ||
        (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1);
      if (clash) {
        bad.add(i1);
        bad.add(i2);
      }
    }
  }
  return bad;
}

export function isCorrectCell(index: number, puzzle: Puzzle): boolean {
  return index >= 0 && index < puzzle.size * puzzle.size &&
    puzzle.solution[Math.floor(index / puzzle.size)] === index % puzzle.size;
}

/** Wrong-answer cats, even when they do not yet clash with another cat. */
export function incorrectCats(board: Board, puzzle: Puzzle): Set<number> {
  return new Set(board.flatMap((value, index) => value === 2 && !isCorrectCell(index, puzzle) ? [index] : []));
}

/** A win must satisfy the rules AND match the level's fixed answer. */
export function isSolved(board: Board, puzzle: Puzzle): boolean {
  if (board.length !== puzzle.size * puzzle.size || puzzle.solution.length !== puzzle.size) return false;
  const cats = catPositions(board, puzzle.size);
  if (cats.length !== puzzle.size) return false;
  return findConflicts(board, puzzle).size === 0 && incorrectCats(board, puzzle).size === 0;
}

/** Regions containing exactly one non-conflicting cat. */
export function completedRegions(board: Board, puzzle: Puzzle): Set<number> {
  const conflicts = findConflicts(board, puzzle);
  const counts = new Map<number, number>();
  board.forEach((v, i) => {
    const region = puzzle.regions[i];
    if (region !== undefined && v === 2 && isCorrectCell(i, puzzle) && !conflicts.has(i)) {
      counts.set(region, (counts.get(region) ?? 0) + 1);
    }
  });
  return new Set([...counts].filter(([, n]) => n === 1).map(([r]) => r));
}

/** Count solutions (up to limit) by backtracking. Used to validate puzzles. */
export function solvePuzzle(size: number, regions: number[], limit = 2): number[][] {
  const cols: number[] = [];
  const solutions: number[][] = [];
  const ok = (r: number, c: number) => {
    for (let rr = 0; rr < r; rr++) {
      const cc = cols[rr];
      if (cc === undefined) return false;
      if (cc === c || regions[idx(size, rr, cc)] === regions[idx(size, r, c)]) return false;
    }
    const previous = cols[r - 1];
    return previous === undefined || Math.abs(previous - c) > 1;
  };
  const go = (r: number) => {
    if (solutions.length >= limit) return;
    if (r === size) {
      solutions.push([...cols]);
      return;
    }
    for (let c = 0; c < size; c++) {
      if (ok(r, c)) {
        cols[r] = c;
        go(r + 1);
      }
    }
  };
  go(0);
  return solutions;
}

export function countSolutions(size: number, regions: number[], limit = 2): number {
  return solvePuzzle(size, regions, limit).length;
}

/** Next hint: fix a wrong cat, otherwise reveal one missing solution cat. */
export function nextHint(board: Board, puzzle: Puzzle): { index: number; kind: "remove" | "place" } | null {
  const { size, solution } = puzzle;
  for (let i = 0; i < board.length; i++) {
    if (board[i] === 2 && solution[Math.floor(i / size)] !== i % size) return { index: i, kind: "remove" };
  }
  for (let r = 0; r < size; r++) {
    const column = solution[r];
    if (column === undefined) continue;
    const i = idx(size, r, column);
    if (board[i] !== 2) return { index: i, kind: "place" };
  }
  return null;
}
