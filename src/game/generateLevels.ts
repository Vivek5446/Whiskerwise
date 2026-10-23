import { countSolutions } from "./rules";

/**
 * Generates a valid non-touching queens solution array for a given size.
 */
function getValidSolution(size: number): number[] | null {
  const cols: any[] = [];
  const solutions: number[][] = [];

  const ok = (r: number, c: number) => {
    for (let rr = 0; rr < r; rr++) {
      if (cols[rr] === c) return false; // same column
      if (Math.abs(r - rr) <= 1 && Math.abs(c - cols[rr]) <= 1) return false; // touching
    }
    return true;
  };

  const go = (r: number) => {
    if (solutions.length > 0) return;
    if (r === size) {
      solutions.push([...cols]);
      return;
    }
    // Randomize column checking order for variety
    const available = [];
    for (let c = 0; c < size; c++) if (ok(r, c)) available.push(c);
    available.sort(() => Math.random() - 0.5);

    for (const c of available) {
      cols[r] = c;
      go(r + 1);
      if (solutions.length > 0) return;
    }
  };

  go(0);
  return solutions[0] || null;
}

/**
 * Grows random contiguous regions from the solution seeds.
 */
function generateRegions(size: number, solution: number[]): number[] {
  const regions = new Array(size * size).fill(-1);
  const queue: { r: number; c: number; region: number }[] = [];
  
  // Seed each region exactly where the solution cat is
  for (let r = 0; r < size; r++) {
    const c :any= solution[r];
    regions[r * size + c] = r; 
    queue.push({ r, c, region: r });
  }
  
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  
  // Random flood fill
  while (queue.length > 0) {
    const randomIdx = Math.floor(Math.random() * queue.length);
    const { r, c, region }:any = queue.splice(randomIdx, 1)[0];
    
    const availableDirs = [...dirs].sort(() => Math.random() - 0.5);
    for (const [dr, dc] of availableDirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        const nIdx = nr * size + nc;
        if (regions[nIdx] === -1) {
          regions[nIdx] = region;
          queue.push({ r: nr, c: nc, region });
        }
      }
    }
  }
  return regions;
}

/**
 * Generate a guaranteed unique puzzle of the given size.
 */
function generatePuzzle(size: number) {
  let attempts = 0;
  
  while (true) {
    attempts++;
    const solution = getValidSolution(size);
    if (!solution) continue;

    const regions = generateRegions(size, solution);
    
    // VERIFICATION: Use your exact rules.ts solver to ensure it has ONLY 1 solution!
    const solCount = countSolutions(size, regions, 2);
    
    if (solCount === 1) {
      // Format the output exactly like the RAW array
      const regionStrings: string[] = [];
      for (let r = 0; r < size; r++) {
        const rowSlice = regions.slice(r * size, (r + 1) * size);
        regionStrings.push(`"${rowSlice.join("")}"`);
      }
      
      console.log(`  { size: ${size}, regions: [${regionStrings.join(", ")}], solution: [${solution.join(", ")}] }, // found in ${attempts} attempts`);
      return;
    }
  }
}

// --- Run the generator! ---
console.log("// --- SIZE 9 PUZZLES ---");
for(let i=0; i<3; i++) generatePuzzle(9);

console.log("\n// --- SIZE 10 PUZZLES ---");
for(let i=0; i<3; i++) generatePuzzle(10);