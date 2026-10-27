/* =========================================================
   Atom Smasher — Level Definitions (50 Levels for Milestone 3)
   JSON-serializable, no Phaser dependencies.
   ========================================================= */
(function (root, factory) {
  const LevelData = factory();
  if (typeof module === "object" && module.exports) module.exports = LevelData;
  root.LevelData = LevelData;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  // Obstacle types (inline to avoid circular dependency)
  const OBSTACLE = {
    NONE: 0,
    STONE: 1,
    ICE_1: 2,
    ICE_2: 3,
    CHAIN: 4
  };

  // Helper to create empty obstacle grid
  function emptyObstacles() {
    const grid = [];
    for (let r = 0; r < 8; r++) {
      grid[r] = [];
      for (let c = 0; c < 8; c++) grid[r][c] = OBSTACLE.NONE;
    }
    return grid;
  }

  // ==========================================
  // TIER 1: FOUNDATIONS (Levels 1-5)
  // ==========================================

  // Level 1: Tutorial - Basic matching
  const level1 = {
    id: 1,
    name: "First Reaction",
    description: "Match atoms to score points!",
    board: { preset: "random" },
    goals: { score: 3000, moves: 25 },
    atomTypes: 4,
    obstacles: emptyObstacles(),
    starThresholds: { score: [1000, 3000, 6000] },
    boostersAllowed: []
  };

  // Level 2: Introduce 5th atom type
  const level2 = {
    id: 2,
    name: "Noble Gas",
    description: "Helium joins the reaction. 5 atom types now.",
    board: { preset: "random" },
    goals: { score: 5000, moves: 22 },
    atomTypes: 5,
    obstacles: emptyObstacles(),
    starThresholds: { score: [2000, 5000, 9000] },
    boostersAllowed: []
  };

  // Level 3: All 6 atom types
  const level3 = {
    id: 3,
    name: "Full Spectrum",
    description: "All 6 elements active. Watch for cascades!",
    board: { preset: "random" },
    goals: { score: 8000, moves: 20 },
    atomTypes: 6,
    obstacles: emptyObstacles(),
    starThresholds: { score: [3000, 8000, 15000] },
    boostersAllowed: []
  };

  // Level 4: Stone blocks introduced
  const level4 = {
    id: 4,
    name: "Solid State",
    description: "Stone blocks impede your progress. Match adjacent to break them.",
    board: { preset: "random" },
    goals: { score: 6000, obstacles: 4, moves: 22 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[1][1] = OBSTACLE.STONE; g[1][6] = OBSTACLE.STONE;
      g[6][1] = OBSTACLE.STONE; g[6][6] = OBSTACLE.STONE;
      return g;
    })(),
    starThresholds: { score: [2000, 6000, 12000], obstacles: [2, 4, 6] },
    boostersAllowed: []
  };

  // Level 5: More stone blocks
  const level5 = {
    id: 5,
    name: "Quarry",
    description: "A wall of stone stands in your way.",
    board: { preset: "random" },
    goals: { score: 5000, obstacles: 6, moves: 20 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      for (let c = 0; c < 8; c++) {
        if (c !== 2 && c !== 5) g[3][c] = OBSTACLE.STONE;
      }
      return g;
    })(),
    starThresholds: { score: [2000, 5000, 10000], obstacles: [3, 6, 8] },
    boostersAllowed: []
  };

  // ==========================================
  // TIER 2: CRYOGENICS (Levels 6-10)
  // ==========================================

  // Level 6: Ice introduced
  const level6 = {
    id: 6,
    name: "Deep Freeze",
    description: "Ice covers atoms. Match beneath to crack and break it.",
    board: { preset: "random" },
    goals: { score: 7000, obstacles: 4, moves: 22 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[2][2] = OBSTACLE.ICE_2; g[2][5] = OBSTACLE.ICE_2;
      g[5][2] = OBSTACLE.ICE_2; g[5][5] = OBSTACLE.ICE_2;
      return g;
    })(),
    starThresholds: { score: [3000, 7000, 13000], obstacles: [2, 4, 6] },
    boostersAllowed: []
  };

  // Level 7: Chains introduced
  const level7 = {
    id: 7,
    name: "Bound Atoms",
    description: "Chained atoms cannot move. Match them to break free.",
    board: { preset: "random" },
    goals: { score: 6000, obstacles: 4, moves: 20 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[3][3] = OBSTACLE.CHAIN; g[3][4] = OBSTACLE.CHAIN;
      g[4][3] = OBSTACLE.CHAIN; g[4][4] = OBSTACLE.CHAIN;
      return g;
    })(),
    starThresholds: { score: [2500, 6000, 11000], obstacles: [2, 4, 5] },
    boostersAllowed: ["moves"]
  };

  // Level 8: Mixed obstacles
  const level8 = {
    id: 8,
    name: "Complex Compound",
    description: "Stone, ice, and chains combined. Plan carefully.",
    board: { preset: "random" },
    goals: { score: 10000, obstacles: 6, moves: 25 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[0][0] = OBSTACLE.STONE; g[0][7] = OBSTACLE.STONE;
      g[7][0] = OBSTACLE.STONE; g[7][7] = OBSTACLE.STONE;
      g[3][3] = OBSTACLE.ICE_2; g[3][4] = OBSTACLE.ICE_2;
      g[4][3] = OBSTACLE.ICE_2; g[4][4] = OBSTACLE.ICE_2;
      g[1][3] = OBSTACLE.CHAIN; g[1][4] = OBSTACLE.CHAIN;
      g[6][3] = OBSTACLE.CHAIN; g[6][4] = OBSTACLE.CHAIN;
      return g;
    })(),
    starThresholds: { score: [4000, 10000, 18000], obstacles: [3, 6, 9] },
    boostersAllowed: ["moves", "shuffle"]
  };

  // Level 9: Collection goal
  const level9 = {
    id: 9,
    name: "Isotope Harvest",
    description: "Collect 15 Oxygen atoms. Obstacles guard the prize.",
    board: { preset: "random" },
    goals: { score: 8000, collect: { type: 3, count: 15 }, obstacles: 4, moves: 22 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[2][1] = OBSTACLE.ICE_2; g[2][6] = OBSTACLE.ICE_2;
      g[5][1] = OBSTACLE.ICE_2; g[5][6] = OBSTACLE.ICE_2;
      g[3][3] = OBSTACLE.CHAIN; g[3][4] = OBSTACLE.CHAIN;
      g[4][3] = OBSTACLE.CHAIN; g[4][4] = OBSTACLE.CHAIN;
      return g;
    })(),
    starThresholds: { score: [3000, 8000, 14000], collect: [5, 15, 25], obstacles: [2, 4, 6] },
    boostersAllowed: ["moves", "bomb"]
  };

  // Level 10: Survival challenge
  const level10 = {
    id: 10,
    name: "Critical Mass",
    description: "Survive 15 moves with a board full of obstacles. Create special atoms!",
    board: { preset: "random" },
    goals: { score: 12000, survive: true, moves: 15 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if ((r + c) % 2 === 0) {
            g[r][c] = (r % 2 === 0) ? OBSTACLE.STONE : OBSTACLE.ICE_2;
          }
        }
      }
      g[3][3] = OBSTACLE.NONE; g[3][4] = OBSTACLE.NONE;
      g[4][3] = OBSTACLE.NONE; g[4][4] = OBSTACLE.NONE;
      return g;
    })(),
    starThresholds: { score: [5000, 12000, 20000] },
    boostersAllowed: ["moves", "shuffle", "special"]
  };

  // ==========================================
  // TIER 3: ISOTOPE LAB (Levels 11-15) - Color Bomb Tutorial
  // ==========================================

  const level11 = {
    id: 11,
    name: "Prism Chamber",
    description: "Create 5-matches to forge Color Bombs. They clear all atoms of one type!",
    board: { preset: "random" },
    goals: { score: 10000, collect: { type: 0, count: 10 }, moves: 22 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      // Place some ice to guide 5-match creation
      g[2][2] = OBSTACLE.ICE_2; g[2][5] = OBSTACLE.ICE_2;
      g[5][2] = OBSTACLE.ICE_2; g[5][5] = OBSTACLE.ICE_2;
      return g;
    })(),
    starThresholds: { score: [4000, 10000, 18000], collect: [3, 10, 20] },
    boostersAllowed: ["moves", "bomb", "shuffle"]
  };

  const level12 = {
    id: 12,
    name: "Color Cascade",
    description: "Color Bombs trigger massive chain reactions. Detonate one!",
    board: { preset: "random" },
    goals: { score: 15000, moves: 20 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[3][3] = OBSTACLE.CHAIN; g[3][4] = OBSTACLE.CHAIN;
      g[4][3] = OBSTACLE.CHAIN; g[4][4] = OBSTACLE.CHAIN;
      return g;
    })(),
    starThresholds: { score: [5000, 15000, 28000] },
    boostersAllowed: ["moves", "bomb", "shuffle"]
  };

  const level13 = {
    id: 13,
    name: "Spectrum Split",
    description: "Combine Color Bomb with a Striped atom for devastating row/column clears.",
    board: { preset: "random" },
    goals: { score: 18000, moves: 20 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[2][2] = OBSTACLE.ICE_2; g[2][5] = OBSTACLE.ICE_2;
      g[5][2] = OBSTACLE.ICE_2; g[5][5] = OBSTACLE.ICE_2;
      return g;
    })(),
    starThresholds: { score: [6000, 18000, 32000] },
    boostersAllowed: ["moves", "bomb", "special"]
  };

  const level14 = {
    id: 14,
    name: "Prism Break",
    description: "Color Bomb + Wrapped = turns all of that color into Wrapped atoms!",
    board: { preset: "random" },
    goals: { score: 20000, moves: 22 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[1][1] = OBSTACLE.STONE; g[1][6] = OBSTACLE.STONE;
      g[6][1] = OBSTACLE.STONE; g[6][6] = OBSTACLE.STONE;
      return g;
    })(),
    starThresholds: { score: [7000, 20000, 35000] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  const level15 = {
    id: 15,
    name: "White Light",
    description: "Master the Color Bomb. Clear 25 Hydrogen atoms using only combos.",
    board: { preset: "random" },
    goals: { collect: { type: 0, count: 25 }, moves: 20 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if ((r === 2 || r === 5) && (c === 2 || c === 5)) {
            g[r][c] = OBSTACLE.ICE_2;
          }
        }
      }
      return g;
    })(),
    starThresholds: { collect: [10, 25, 40] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  // ==========================================
  // TIER 4: REACTOR CORE (Levels 16-20) - Mega Atom
  // ==========================================

  const level16 = {
    id: 16,
    name: "Mega Genesis",
    description: "Match 5 in a T/L shape to create a MEGA atom. It clears the entire board!",
    board: { preset: "random" },
    goals: { score: 22000, moves: 22 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[3][2] = OBSTACLE.CHAIN; g[3][5] = OBSTACLE.CHAIN;
      g[4][2] = OBSTACLE.CHAIN; g[4][5] = OBSTACLE.CHAIN;
      return g;
    })(),
    starThresholds: { score: [8000, 22000, 40000] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  const level17 = {
    id: 17,
    name: "Critical Reaction",
    description: "Mega + Color Bomb = total annihilation. Create this combo!",
    board: { preset: "random" },
    goals: { score: 25000, moves: 20 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[2][3] = OBSTACLE.ICE_2; g[2][4] = OBSTACLE.ICE_2;
      g[5][3] = OBSTACLE.ICE_2; g[5][4] = OBSTACLE.ICE_2;
      return g;
    })(),
    starThresholds: { score: [10000, 25000, 45000] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  const level18 = {
    id: 18,
    name: "Chain Reaction",
    description: "Clear 8 stone blocks. MEGA atoms shatter stone instantly!",
    board: { preset: "random" },
    goals: { score: 20000, obstacles: 8, moves: 22 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      // Stone ring
      for (let c = 1; c < 7; c++) { g[1][c] = OBSTACLE.STONE; g[6][c] = OBSTACLE.STONE; }
      for (let r = 2; r < 6; r++) { g[r][1] = OBSTACLE.STONE; g[r][6] = OBSTACLE.STONE; }
      g[3][3] = OBSTACLE.NONE; g[3][4] = OBSTACLE.NONE;
      g[4][3] = OBSTACLE.NONE; g[4][4] = OBSTACLE.NONE;
      return g;
    })(),
    starThresholds: { score: [8000, 20000, 38000], obstacles: [4, 8, 12] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  const level19 = {
    id: 19,
    name: "Fusion Core",
    description: "Create 3 MEGA atoms in a single level. The ultimate test!",
    board: { preset: "random" },
    goals: { score: 30000, moves: 20 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if ((r + c) % 3 === 0) g[r][c] = OBSTACLE.CHAIN;
        }
      }
      // Clear center
      g[3][3] = OBSTACLE.NONE; g[3][4] = OBSTACLE.NONE;
      g[4][3] = OBSTACLE.NONE; g[4][4] = OBSTACLE.NONE;
      return g;
    })(),
    starThresholds: { score: [12000, 30000, 55000] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  const level20 = {
    id: 20,
    name: "Singularity",
    description: "Survive 12 moves. MEGA atoms are your only salvation.",
    board: { preset: "random" },
    goals: { survive: true, moves: 12 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      // Dense stone/ice mix
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if ((r + c) % 2 === 0) g[r][c] = OBSTACLE.STONE;
          else if ((r + c) % 3 === 0) g[r][c] = OBSTACLE.ICE_2;
        }
      }
      g[3][3] = OBSTACLE.NONE; g[3][4] = OBSTACLE.NONE;
      g[4][3] = OBSTACLE.NONE; g[4][4] = OBSTACLE.NONE;
      return g;
    })(),
    starThresholds: { score: [15000, 35000, 60000] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  // ==========================================
  // TIER 5: QUANTUM TUNNEL (Levels 21-25) - Moving Obstacles
  // ==========================================

  const level21 = {
    id: 21,
    name: "Conveyor Belt",
    description: "Stone blocks shift right each turn. Time your matches!",
    board: { preset: "random" },
    goals: { score: 18000, obstacles: 6, moves: 22 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[3][0] = OBSTACLE.STONE; g[3][1] = OBSTACLE.STONE;
      g[4][0] = OBSTACLE.STONE; g[4][1] = OBSTACLE.STONE;
      return g;
    })(),
    starThresholds: { score: [6000, 18000, 32000], obstacles: [3, 6, 9] },
    boostersAllowed: ["moves", "shuffle", "special"],
    conveyor: { rows: [3, 4], direction: 1, speed: 1 }
  };

  const level22 = {
    id: 22,
    name: "Dual Conveyor",
    description: "Two rows move in opposite directions. Plan ahead!",
    board: { preset: "random" },
    goals: { score: 20000, obstacles: 8, moves: 22 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[2][0] = OBSTACLE.STONE; g[2][1] = OBSTACLE.STONE;
      g[5][6] = OBSTACLE.STONE; g[5][7] = OBSTACLE.STONE;
      return g;
    })(),
    starThresholds: { score: [7000, 20000, 35000], obstacles: [4, 8, 12] },
    boostersAllowed: ["moves", "shuffle", "special"],
    conveyor: { rows: [2, 5], direction: [1, -1], speed: 1 }
  };

  const level23 = {
    id: 23,
    name: "Ice Flow",
    description: "Ice blocks slide down each turn. Match quickly before they stack!",
    board: { preset: "random" },
    goals: { score: 22000, obstacles: 6, moves: 20 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[0][2] = OBSTACLE.ICE_2; g[0][5] = OBSTACLE.ICE_2;
      return g;
    })(),
    starThresholds: { score: [8000, 22000, 40000], obstacles: [3, 6, 9] },
    boostersAllowed: ["moves", "bomb", "shuffle"],
    conveyor: { cols: [2, 5], direction: 1, speed: 1, type: "ice" }
  };

  const level24 = {
    id: 24,
    name: "Chaos Theory",
    description: "Stone moves right, ice moves down. Total chaos!",
    board: { preset: "random" },
    goals: { score: 25000, obstacles: 10, moves: 22 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[2][0] = OBSTACLE.STONE; g[2][1] = OBSTACLE.STONE;
      g[0][3] = OBSTACLE.ICE_2; g[0][4] = OBSTACLE.ICE_2;
      return g;
    })(),
    starThresholds: { score: [10000, 25000, 48000], obstacles: [5, 10, 15] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"],
    conveyor: { rows: [2], direction: 1, speed: 1, cols: [3, 4], colDir: 1, speed: 1 }
  };

  const level25 = {
    id: 25,
    name: "Entropy",
    description: "Survive 15 moves with conveyors in all directions.",
    board: { preset: "random" },
    goals: { survive: true, moves: 15 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      // Four conveyors
      g[1][0] = OBSTACLE.STONE; g[1][1] = OBSTACLE.STONE;
      g[6][6] = OBSTACLE.STONE; g[6][7] = OBSTACLE.STONE;
      g[0][2] = OBSTACLE.ICE_2; g[0][5] = OBSTACLE.ICE_2;
      g[7][2] = OBSTACLE.ICE_2; g[7][5] = OBSTACLE.ICE_2;
      return g;
    })(),
    starThresholds: { score: [12000, 30000, 55000] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"],
    conveyor: { rows: [1, 6], direction: [1, -1], cols: [2, 5], colDir: [1, -1] }
  };

  // ==========================================
  // TIER 6: PLASMA CHAMBER (Levels 26-30) - Booster Mastery
  // ==========================================

  const level26 = {
    id: 26,
    name: "Booster Bay",
    description: "Use a pre-game Color Bomb booster to jumpstart your reaction.",
    board: { preset: "random" },
    goals: { score: 18000, moves: 18 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[3][3] = OBSTACLE.CHAIN; g[3][4] = OBSTACLE.CHAIN;
      g[4][3] = OBSTACLE.CHAIN; g[4][4] = OBSTACLE.CHAIN;
      return g;
    })(),
    starThresholds: { score: [6000, 18000, 32000] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"],
    tutorialBooster: "bomb"
  };

  const level27 = {
    id: 27,
    name: "Shuffle Strategy",
    description: "Free reshuffle booster lets you reset a deadlock instantly.",
    board: { preset: "random" },
    goals: { score: 20000, moves: 20 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[2][2] = OBSTACLE.ICE_2; g[2][5] = OBSTACLE.ICE_2;
      g[5][2] = OBSTACLE.ICE_2; g[5][5] = OBSTACLE.ICE_2;
      return g;
    })(),
    starThresholds: { score: [7000, 20000, 35000] },
    boostersAllowed: ["moves", "shuffle", "special"],
    tutorialBooster: "shuffle"
  };

  const level28 = {
    id: 28,
    name: "Special Delivery",
    description: "Start with a Wrapped atom. Plan your first move for maximum impact!",
    board: { preset: "random" },
    goals: { score: 22000, moves: 18 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[1][1] = OBSTACLE.STONE; g[1][6] = OBSTACLE.STONE;
      g[6][1] = OBSTACLE.STONE; g[6][6] = OBSTACLE.STONE;
      return g;
    })(),
    starThresholds: { score: [8000, 22000, 40000] },
    boostersAllowed: ["moves", "bomb", "special"],
    tutorialBooster: "special"
  };

  const level29 = {
    id: 29,
    name: "Combo Master",
    description: "Achieve a LEGENDARY combo (5+) using boosters strategically.",
    board: { preset: "random" },
    goals: { score: 30000, moves: 20 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[3][3] = OBSTACLE.CHAIN; g[3][4] = OBSTACLE.CHAIN;
      g[4][3] = OBSTACLE.CHAIN; g[4][4] = OBSTACLE.CHAIN;
      return g;
    })(),
    starThresholds: { score: [12000, 30000, 55000] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  const level30 = {
    id: 30,
    name: "Plasma Overload",
    description: "Survive 15 moves. Use all 4 booster types wisely!",
    board: { preset: "random" },
    goals: { survive: true, moves: 15 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if ((r + c) % 3 === 0) g[r][c] = OBSTACLE.STONE;
          else if ((r + c) % 3 === 1) g[r][c] = OBSTACLE.ICE_2;
          else if ((r + c) % 3 === 2) g[r][c] = OBSTACLE.CHAIN;
        }
      }
      g[3][3] = OBSTACLE.NONE; g[3][4] = OBSTACLE.NONE;
      g[4][3] = OBSTACLE.NONE; g[4][4] = OBSTACLE.NONE;
      return g;
    })(),
    starThresholds: { score: [15000, 35000, 60000] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  // ==========================================
  // TIER 7: HEAVY WATER (Levels 31-35) - Ice Walls & Chain Mazes
  // ==========================================

  const level31 = {
    id: 31,
    name: "Glacier Wall",
    description: "A massive ice wall blocks your path. Chip away at it!",
    board: { preset: "random" },
    goals: { score: 25000, obstacles: 12, moves: 25 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      // Thick ice wall across middle
      for (let c = 0; c < 8; c++) {
        if (c !== 3 && c !== 4) g[3][c] = OBSTACLE.ICE_2;
        if (c !== 2 && c !== 5) g[4][c] = OBSTACLE.ICE_2;
      }
      return g;
    })(),
    starThresholds: { score: [10000, 25000, 45000], obstacles: [6, 12, 18] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  const level32 = {
    id: 32,
    name: "Ice Maze",
    description: "Navigate a labyrinth of ice. Match underneath to carve a path.",
    board: { preset: "random" },
    goals: { score: 28000, obstacles: 16, moves: 24 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      // Maze pattern
      for (let r = 1; r < 7; r++) {
        for (let c = 1; c < 7; c++) {
          if ((r + c) % 2 === 0) g[r][c] = OBSTACLE.ICE_2;
        }
      }
      g[3][3] = OBSTACLE.NONE; g[3][4] = OBSTACLE.NONE;
      g[4][3] = OBSTACLE.NONE; g[4][4] = OBSTACLE.NONE;
      return g;
    })(),
    starThresholds: { score: [12000, 28000, 50000], obstacles: [8, 16, 24] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  const level33 = {
    id: 33,
    name: "Chain Prison",
    description: "Chained atoms form a cage. Break out by matching the prisoners!",
    board: { preset: "random" },
    goals: { score: 25000, obstacles: 12, moves: 22 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      // Chain cage
      for (let c = 1; c < 7; c++) { g[2][c] = OBSTACLE.CHAIN; g[5][c] = OBSTACLE.CHAIN; }
      for (let r = 3; r < 5; r++) { g[r][1] = OBSTACLE.CHAIN; g[r][6] = OBSTACLE.CHAIN; }
      return g;
    })(),
    starThresholds: { score: [10000, 25000, 45000], obstacles: [6, 12, 18] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  const level34 = {
    id: 34,
    name: "Permafrost",
    description: "Solid ice (2 layers) everywhere. Only special atoms can break through fast enough.",
    board: { preset: "random" },
    goals: { score: 30000, obstacles: 20, moves: 25 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if ((r + c) % 2 === 0 && !(r >= 3 && r <= 4 && c >= 3 && c <= 4)) {
            g[r][c] = OBSTACLE.ICE_2;
          }
        }
      }
      return g;
    })(),
    starThresholds: { score: [15000, 30000, 55000], obstacles: [10, 20, 30] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  const level35 = {
    id: 35,
    name: "Absolute Zero",
    description: "Survive 18 moves. Ice regenerates each turn unless destroyed by specials!",
    board: { preset: "random" },
    goals: { survive: true, moves: 18 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if ((r + c) % 3 === 0) g[r][c] = OBSTACLE.ICE_2;
        }
      }
      g[3][3] = OBSTACLE.NONE; g[3][4] = OBSTACLE.NONE;
      g[4][3] = OBSTACLE.NONE; g[4][4] = OBSTACLE.NONE;
      return g;
    })(),
    starThresholds: { score: [18000, 35000, 60000] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"],
    iceRegen: true
  };

  // ==========================================
  // TIER 8: CRITICAL MASS (Levels 36-40) - Multi-Goal Tight Moves
  // ==========================================

  const level36 = {
    id: 36,
    name: "Triple Threat",
    description: "Score 20k, clear 8 obstacles, collect 15 Carbon. Only 18 moves!",
    board: { preset: "random" },
    goals: { score: 20000, obstacles: 8, collect: { type: 2, count: 15 }, moves: 18 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[2][2] = OBSTACLE.STONE; g[2][5] = OBSTACLE.STONE;
      g[5][2] = OBSTACLE.STONE; g[5][5] = OBSTACLE.STONE;
      g[3][3] = OBSTACLE.ICE_2; g[3][4] = OBSTACLE.ICE_2;
      g[4][3] = OBSTACLE.ICE_2; g[4][4] = OBSTACLE.ICE_2;
      return g;
    })(),
    starThresholds: { score: [8000, 20000, 35000], obstacles: [4, 8, 12], collect: [5, 15, 25] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  const level37 = {
    id: 37,
    name: "Precision",
    description: "Clear exactly 20 obstacles. No more, no less. 15 moves.",
    board: { preset: "random" },
    goals: { obstacles: 20, moves: 15 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if ((r + c) % 2 === 0) g[r][c] = OBSTACLE.STONE;
          else g[r][c] = OBSTACLE.ICE_2;
        }
      }
      g[3][3] = OBSTACLE.NONE; g[3][4] = OBSTACLE.NONE;
      g[4][3] = OBSTACLE.NONE; g[4][4] = OBSTACLE.NONE;
      return g;
    })(),
    starThresholds: { obstacles: [10, 20, 30] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  const level38 = {
    id: 38,
    name: "Collection Run",
    description: "Collect 20 of each: Hydrogen, Helium, Carbon. 20 moves.",
    board: { preset: "random" },
    goals: { collect: { type: 0, count: 20 }, collect2: { type: 1, count: 20 }, collect3: { type: 2, count: 20 }, moves: 20 },
    atomTypes: 6,
    obstacles: emptyObstacles(),
    starThresholds: { collect: [10, 20, 30], collect2: [10, 20, 30], collect3: [10, 20, 30] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  const level39 = {
    id: 39,
    name: "Speed Run",
    description: "Score 40,000 in 15 moves. Create massive combos!",
    board: { preset: "random" },
    goals: { score: 40000, moves: 15 },
    atomTypes: 6,
    obstacles: emptyObstacles(),
    starThresholds: { score: [15000, 40000, 70000] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  const level40 = {
    id: 40,
    name: "Gauntlet",
    description: "Score 25k, clear 10 obstacles, collect 10 Oxygen. 16 moves. No room for error.",
    board: { preset: "random" },
    goals: { score: 25000, obstacles: 10, collect: { type: 3, count: 10 }, moves: 16 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      // Stone border
      for (let c = 0; c < 8; c++) { g[0][c] = OBSTACLE.STONE; g[7][c] = OBSTACLE.STONE; }
      for (let r = 1; r < 7; r++) { g[r][0] = OBSTACLE.STONE; g[r][7] = OBSTACLE.STONE; }
      // Ice center
      g[3][3] = OBSTACLE.ICE_2; g[3][4] = OBSTACLE.ICE_2;
      g[4][3] = OBSTACLE.ICE_2; g[4][4] = OBSTACLE.ICE_2;
      // Chains
      g[2][2] = OBSTACLE.CHAIN; g[2][5] = OBSTACLE.CHAIN;
      g[5][2] = OBSTACLE.CHAIN; g[5][5] = OBSTACLE.CHAIN;
      return g;
    })(),
    starThresholds: { score: [10000, 25000, 45000], obstacles: [5, 10, 15], collect: [4, 10, 16] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  // ==========================================
  // TIER 9: FUSION HORIZON (Levels 41-45) - Advanced Combos Required
  // ==========================================

  const level41 = {
    id: 41,
    name: "Combo Alchemy",
    description: "Create 3 Color Bomb + Striped combos. 20 moves.",
    board: { preset: "random" },
    goals: { score: 35000, moves: 20 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[3][3] = OBSTACLE.CHAIN; g[3][4] = OBSTACLE.CHAIN;
      g[4][3] = OBSTACLE.CHAIN; g[4][4] = OBSTACLE.CHAIN;
      return g;
    })(),
    starThresholds: { score: [15000, 35000, 60000] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  const level42 = {
    id: 42,
    name: "Wrapped Fusion",
    description: "Color Bomb + Wrapped = 3 Wrapped atoms detonate. Do it 5 times!",
    board: { preset: "random" },
    goals: { score: 40000, moves: 22 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[2][2] = OBSTACLE.ICE_2; g[2][5] = OBSTACLE.ICE_2;
      g[5][2] = OBSTACLE.ICE_2; g[5][5] = OBSTACLE.ICE_2;
      return g;
    })(),
    starThresholds: { score: [18000, 40000, 70000] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  const level43 = {
    id: 43,
    name: "Striped Symphony",
    description: "Striped + Striped clears 2 rows + 2 columns. Chain 4 of these!",
    board: { preset: "random" },
    goals: { score: 45000, moves: 20 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[1][1] = OBSTACLE.STONE; g[1][6] = OBSTACLE.STONE;
      g[6][1] = OBSTACLE.STONE; g[6][6] = OBSTACLE.STONE;
      return g;
    })(),
    starThresholds: { score: [20000, 45000, 80000] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  const level44 = {
    id: 44,
    name: "Mega Orchestra",
    description: "MEGA + Color Bomb = board clear. Do it twice in one level!",
    board: { preset: "random" },
    goals: { score: 50000, moves: 22 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[3][3] = OBSTACLE.CHAIN; g[3][4] = OBSTACLE.CHAIN;
      g[4][3] = OBSTACLE.CHAIN; g[4][4] = OBSTACLE.CHAIN;
      return g;
    })(),
    starThresholds: { score: [25000, 50000, 90000] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"]
  };

  const level45 = {
    id: 45,
    name: "Perfect Storm",
    description: "Survive 20 moves. Every special combo spawns a new special atom!",
    board: { preset: "random" },
    goals: { survive: true, moves: 20 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if ((r + c) % 4 === 0) g[r][c] = OBSTACLE.STONE;
          else if ((r + c) % 4 === 1) g[r][c] = OBSTACLE.ICE_2;
          else if ((r + c) % 4 === 2) g[r][c] = OBSTACLE.CHAIN;
        }
      }
      g[3][3] = OBSTACLE.NONE; g[3][4] = OBSTACLE.NONE;
      g[4][3] = OBSTACLE.NONE; g[4][4] = OBSTACLE.NONE;
      return g;
    })(),
    starThresholds: { score: [30000, 60000, 100000] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"],
    specialSpawner: true
  };

  // ==========================================
  // TIER 10: SINGULARITY (Levels 46-50) - Final Gauntlet
  // ==========================================

  const level46 = {
    id: 46,
    name: "Event Horizon",
    description: "Score 60,000. Stone regenerates. Ice spreads. Chains multiply. 20 moves.",
    board: { preset: "random" },
    goals: { score: 60000, moves: 20 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if ((r + c) % 3 === 0) g[r][c] = OBSTACLE.STONE;
          else if ((r + c) % 3 === 1) g[r][c] = OBSTACLE.ICE_2;
          else g[r][c] = OBSTACLE.CHAIN;
        }
      }
      g[3][3] = OBSTACLE.NONE; g[3][4] = OBSTACLE.NONE;
      g[4][3] = OBSTACLE.NONE; g[4][4] = OBSTACLE.NONE;
      return g;
    })(),
    starThresholds: { score: [25000, 60000, 100000] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"],
    stoneRegen: true,
    iceSpread: true,
    chainMultiply: true
  };

  const level47 = {
    id: 47,
    name: "Neutron Star",
    description: "Clear 30 obstacles. Gravity reversed (atoms fall UP). 22 moves.",
    board: { preset: "random" },
    goals: { obstacles: 30, moves: 22 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if ((r + c) % 2 === 0) g[r][c] = OBSTACLE.STONE;
          else g[r][c] = OBSTACLE.ICE_2;
        }
      }
      g[3][3] = OBSTACLE.NONE; g[3][4] = OBSTACLE.NONE;
      g[4][3] = OBSTACLE.NONE; g[4][4] = OBSTACLE.NONE;
      return g;
    })(),
    starThresholds: { obstacles: [15, 30, 45] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"],
    reverseGravity: true
  };

  const level48 = {
    id: 48,
    name: "Black Hole",
    description: "Center 4 cells are a void - atoms disappear! Score 70,000 in 18 moves.",
    board: { preset: "random" },
    goals: { score: 70000, moves: 18 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      // Black hole in center
      g[3][3] = OBSTACLE.STONE; g[3][4] = OBSTACLE.STONE;
      g[4][3] = OBSTACLE.STONE; g[4][4] = OBSTACLE.STONE;
      // But treat as void in renderer
      return g;
    })(),
    starThresholds: { score: [30000, 70000, 120000] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"],
    voidCenter: true
  };

  const level49 = {
    id: 49,
    name: "Supernova",
    description: "Create 5 MEGA atoms. Board reshuffles after each MEGA. 25 moves.",
    board: { preset: "random" },
    goals: { score: 80000, moves: 25 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      g[1][1] = OBSTACLE.STONE; g[1][6] = OBSTACLE.STONE;
      g[6][1] = OBSTACLE.STONE; g[6][6] = OBSTACLE.STONE;
      return g;
    })(),
    starThresholds: { score: [40000, 80000, 140000] },
    boostersAllowed: ["moves", "bomb", "shuffle", "special"],
    megaCounter: true,
    reshuffleOnMega: true
  };

  const level50 = {
    id: 50,
    name: "OMEGA POINT",
    description: "THE FINAL TEST. Score 100,000. All mechanics active. 20 moves. No boosters.",
    board: { preset: "random" },
    goals: { score: 100000, moves: 20 },
    atomTypes: 6,
    obstacles: (() => {
      const g = emptyObstacles();
      // Maximum chaos
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const v = (r * 8 + c) % 7;
          if (v === 0) g[r][c] = OBSTACLE.STONE;
          else if (v === 1) g[r][c] = OBSTACLE.ICE_2;
          else if (v === 2) g[r][c] = OBSTACLE.CHAIN;
        }
      }
      // Clear small center
      g[3][3] = OBSTACLE.NONE; g[3][4] = OBSTACLE.NONE;
      g[4][3] = OBSTACLE.NONE; g[4][4] = OBSTACLE.NONE;
      return g;
    })(),
    starThresholds: { score: [50000, 100000, 180000] },
    boostersAllowed: [], // No boosters for the final challenge
    stoneRegen: true,
    iceSpread: true,
    chainMultiply: true,
    reverseGravity: false,
    voidCenter: false,
    megaCounter: false
  };

  const ALL_LEVELS = [
    level1, level2, level3, level4, level5,
    level6, level7, level8, level9, level10,
    level11, level12, level13, level14, level15,
    level16, level17, level18, level19, level20,
    level21, level22, level23, level24, level25,
    level26, level27, level28, level29, level30,
    level31, level32, level33, level34, level35,
    level36, level37, level38, level39, level40,
    level41, level42, level43, level44, level45,
    level46, level47, level48, level49, level50
  ];

  function getLevel(id) {
    return ALL_LEVELS.find(l => l.id === id) || level1;
  }

  function getAllLevels() {
    return ALL_LEVELS;
  }

  function getMaxLevel() {
    return ALL_LEVELS.length;
  }

  // Save/load helpers
  function getDefaultProgress() {
    return {
      currentLevel: 1,
      unlockedLevels: [1],
      stars: {}, // { levelId: stars }
      highScores: {}, // { levelId: score }
      totalStars: 0,
      totalScore: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      settings: {
        sound: true,
        music: true,
        particles: true,
        neonGlow: true,
        vibration: true,
        reducedMotion: false
      }
    };
  }

  return {
    ALL_LEVELS,
    getLevel,
    getAllLevels,
    getMaxLevel,
    getDefaultProgress,
    OBSTACLE // re-export for convenience
  };
});