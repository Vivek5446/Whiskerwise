import { describe, expect, it } from "vitest";
import { LEVELS } from "./levels";
import originalLevels from "./fixtures/original-levels.json";
import { countSolutions, emptyBoard, findConflicts, idx, isCorrectCell, isSolved, solvePuzzle, type Board } from "./rules";

const solvedBoard = (p: (typeof LEVELS)[number]): Board => {
  const b = emptyBoard(p.size);
  p.solution.forEach((c, r) => (b[idx(p.size, r, c)] = 2));
  return b;
};

describe("levels", () => {
  it("contains exactly 20 sequential, stable level IDs", () => {
    expect(LEVELS.map((level) => level.id)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });
  it("preserves every original Level 1–8 layout, answer, size, and ID", () => {
    expect(LEVELS.slice(0, 8).map(({ id, size, regions, solution }) => ({ id, size, regions, solution }))).toEqual(originalLevels);
  });
  it.each(LEVELS.map((l) => [l.id, l]))("level %i has well-formed connected regions", (_, l) => {
    expect(l.regions).toHaveLength(l.size * l.size);
    expect([...new Set(l.regions)].sort((a, b) => a - b)).toEqual(Array.from({ length: l.size }, (_, i) => i));
    for (let region = 0; region < l.size; region++) {
      const cells = l.regions.flatMap((value, i) => value === region ? [i] : []);
      const start = cells[0];
      if (start === undefined) throw new Error("Missing region");
      const seen = new Set([start]);
      const queue = [start];
      while (queue.length) {
        const cell = queue.shift();
        if (cell === undefined) break;
        const r = Math.floor(cell / l.size), c = cell % l.size;
        for (const [rr, cc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
          if (rr === undefined || cc === undefined || rr < 0 || cc < 0 || rr >= l.size || cc >= l.size) continue;
          const neighbor = idx(l.size, rr, cc);
          if (l.regions[neighbor] === region && !seen.has(neighbor)) { seen.add(neighbor); queue.push(neighbor); }
        }
      }
      expect(seen.size).toBe(cells.length);
    }
  });
  it.each(LEVELS.map((l) => [l.id, l]))("level %i gameplay accepts exactly its stored coordinates", (_, l) => {
    for (let i = 0; i < l.size * l.size; i++) {
      expect(isCorrectCell(i, l)).toBe(l.solution[Math.floor(i / l.size)] === i % l.size);
    }
  });
  it("contains no repeated puzzle, including rotations, reflections, or recoloring", () => {
    const signatures = LEVELS.map((l) => {
      const variants: string[] = [];
      for (let flip = 0; flip < 2; flip++) for (let turn = 0; turn < 4; turn++) {
        const regions = new Array<number>(l.regions.length);
        l.regions.forEach((region, index) => {
          let r = Math.floor(index / l.size), c = index % l.size;
          if (flip) c = l.size - 1 - c;
          for (let t = 0; t < turn; t++) [r, c] = [c, l.size - 1 - r];
          regions[idx(l.size, r, c)] = region;
        });
        const labels = new Map<number, number>();
        variants.push(regions.map((region) => {
          if (!labels.has(region)) labels.set(region, labels.size);
          return labels.get(region);
        }).join(""));
      }
      return `${l.size}:${variants.sort()[0]}`;
    });
    expect(new Set(signatures).size).toBe(20);
  });
  it.each(LEVELS.map((l) => [l.id, l]))("level %i has exactly one solution", (_, l) => {
    expect(countSolutions(l.size, l.regions)).toBe(1);
  });
  it.each(LEVELS.map((l) => [l.id, l]))("level %i stored solution passes the rules", (_, l) => {
    expect(isSolved(solvedBoard(l), l)).toBe(true);
  });
  it.each(LEVELS.map((l) => [l.id, l]))("level %i solver returns exactly its stored answer", (_, l) => {
    expect(solvePuzzle(l.size, l.regions)).toEqual([l.solution]);
    expect(l.regions).toHaveLength(l.size * l.size);
    expect(new Set(l.regions).size).toBe(l.size);
    expect(l.solution).toHaveLength(l.size);
    expect(l.solution.every((c) => Number.isInteger(c) && c >= 0 && c < l.size)).toBe(true);
  });
});

describe("rules", () => {
  const p = LEVELS[0];
  if (!p) throw new Error("Level 1 is required");
  it("flags diagonally touching cats", () => {
    const b = emptyBoard(p.size);
    b[idx(5, 0, 0)] = 2;
    b[idx(5, 1, 1)] = 2;
    expect(findConflicts(b, p).size).toBe(2);
  });
  it("flags two cats in the same column", () => {
    const b = emptyBoard(p.size);
    b[idx(5, 0, 2)] = 2;
    b[idx(5, 3, 2)] = 2;
    expect(findConflicts(b, p).size).toBe(2);
  });
  it("is not solved with a missing cat", () => {
    const b = solvedBoard(p);
    const column = p.solution[0];
    if (column === undefined) throw new Error("Missing answer");
    b[idx(5, 0, column)] = 0;
    expect(isSolved(b, p)).toBe(false);
  });
  it("rejects a rule-valid board that differs from the fixed answer", () => {
    const board = solvedBoard(p);
    const mismatched = { ...p, solution: [0, 2, 4, 1, 3] };
    expect(findConflicts(board, mismatched).size).toBe(0);
    expect(isSolved(board, mismatched)).toBe(false);
  });
  it("X marks are not cats and cannot complete a board", () => {
    const board: Board = new Array(25).fill(1);
    expect(findConflicts(board, p).size).toBe(0);
    expect(isSolved(board, p)).toBe(false);
  });
});
