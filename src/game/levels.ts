import type { Puzzle } from "./rules";

// Curated puzzles, each verified to have exactly one solution (see levels.test.ts).
const RAW: { size: number; regions: string[]; solution: number[] }[] = [
  { size: 5, regions: ["10000", "10202", "11222", "13322", "33442"], solution: [2, 0, 4, 1, 3] },
  { size: 5, regions: ["00000", "11302", "33322", "33322", "33224"], solution: [2, 0, 3, 1, 4] },
  { size: 6, regions: ["111022", "111122", "114422", "333422", "344444", "344445"], solution: [3, 1, 4, 0, 2, 5] },
  { size: 6, regions: ["002333", "222213", "222213", "222233", "224433", "254433"], solution: [0, 4, 2, 5, 3, 1] },
  { size: 7, regions: ["0000111", "2000111", "2200011", "4203311", "4203311", "4443566", "4443366"], solution: [2, 5, 1, 3, 0, 4, 6] },
  { size: 7, regions: ["1111110", "1111111", "2223111", "2233111", "4443331", "5553336", "5555366"], solution: [6, 4, 1, 3, 0, 2, 5] },
  { size: 8, regions: ["00011111", "00011144", "20344444", "33333444", "33353444", "55555444", "55655444", "55654447"], solution: [1, 5, 0, 3, 6, 4, 2, 7] },
  { size: 8, regions: ["33301122", "33331122", "77333322", "73333352", "74333555", "74555555", "77655555", "77775555"], solution: [3, 5, 7, 4, 1, 6, 2, 0] },
  { size: 6, regions: ["100233", "102233", "222233", "422333", "444333", "444553"], solution: [2, 0, 3, 5, 1, 4] },
  { size: 7, regions: ["1111100", "1111110", "1111122", "1111322", "4155552", "6655522", "6665552"], solution: [5, 2, 6, 4, 0, 3, 1] },
  { size: 8, regions: ["11111100", "11141002", "11144402", "44143400", "44443335", "44455555", "44555655", "74566665"], solution: [6, 2, 7, 4, 1, 3, 5, 0] },
  { size: 6, regions: ["001111", "001111", "002111", "332111", "334445", "334555"], solution: [1, 4, 2, 0, 3, 5] },
  { size: 7, regions: ["1111000", "3311002", "4335552", "4335555", "4445555", "6455555", "6655555"], solution: [5, 3, 6, 2, 0, 4, 1] },
  { size: 8, regions: ["41111000", "44114002", "41144442", "44443342", "44544333", "44555555", "44445655", "74455666"], solution: [6, 2, 7, 4, 1, 3, 5, 0] },
  { size: 6, regions: ["110222", "110222", "122222", "144233", "144433", "444455"], solution: [2, 0, 3, 5, 1, 4] },
  { size: 8, regions: ["11111000", "14111100", "44443302", "44433333", "44535333", "44555555", "44545656", "74444666"], solution: [6, 2, 7, 4, 1, 3, 5, 0] },
  { size: 6, regions: ["220011", "222111", "222231", "422331", "444411", "554444"], solution: [3, 5, 1, 4, 2, 0] },
  { size: 6, regions: ["001111", "001111", "302111", "302411", "334445", "335555"], solution: [1, 4, 2, 0, 3, 5] },
  { size: 7, regions: ["1111200", "1111223", "1111223", "5554443", "5444443", "5564444", "5564444"], solution: [5, 1, 4, 6, 3, 0, 2] },
  { size: 7, regions: ["0001111", "0001111", "2233111", "3333511", "4333511", "4466566", "4466666"], solution: [2, 5, 1, 3, 0, 4, 6] },

{ size: 9, regions: ["000111222", "033114422", "033344422", "553334446", "557734866", "557778886", "557778886", "577778866", "555777866"], solution: [2, 5, 0, 7, 4, 1, 8, 3, 6] }, 
  { size: 9, regions: ["001122333", "001122333", "044125533", "444455553", "444455556", "477755566", "777888666", "778888666", "777888866"], solution: [3, 0, 6, 2, 8, 5, 1, 4, 7] },

// --- SIZE 10 PUZZLES ---
  { size: 10, regions: ["0000112233", "0000112233", "4001122233", "4441555233", "4441555233", "4445555663", "7445588663", "7775888666", "7778888666", "7779999966"], solution: [4, 1, 7, 0, 3, 8, 5, 2, 9, 6] },

];

const TITLES = [
  "First Paws", "Sunny Seats", "Window Watch", "Yarn Corners",
  "Garden Guests", "Whisker Walk", "Moonlit Mews", "Rooftop Cats",
  "Secret Nooks", "Ribbon Tangle", "Pawprint Picnic", "Hidden Hammocks",
  "Whisker Weave", "Catnip Corners", "Velvet Mazes", "Midnight Paws",
  "Tangled Tails", "Quiet Clues", "Nine Lives", "Purrfect Finale",
  "Sleepy Shadows", 
  "Stretching Sunbeams", 
  "Tilted Towers", 
  "Mirrored Meows", 
  "Upside Down Alleys"
];

export const LEVELS: Puzzle[] = RAW.map((p, i) => ({
  id: i + 1,
  size: p.size,
  regions: p.regions.join("").split("").map(Number),
  solution: p.solution,
  title: TITLES[i] ?? `Cat Puzzle ${i + 1}`,
  difficulty: i < 2 ? "Cozy" : i < 4 ? "Curious" : i < 8 ? "Clever" : i < 12 ? "Tricky" : "Purrplexing",
}));

export const getLevel = (id: number) => LEVELS.find((l) => l.id === id);

