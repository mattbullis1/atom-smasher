/* =========================================================
   Atom Smasher — BoardModel (pure game-state logic)
   No Phaser / no rendering. Deterministic via seeded RNG.
   UMD: works in browser (window.BoardModel) and Node (module.exports).
   ========================================================= */
(function (root, factory) {
  const Board = factory();
  if (typeof module === "object" && module.exports) module.exports = Board;
  root.BoardModel = Board;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  // ---- Seeded RNG (mulberry32) ----
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- Constants ----
  const ROWS = 8;
  const COLS = 8;
  const MIN_MATCH = 3;
  const MAX_CASCADE_WAVES = 200;

  // Atom base types (0-5)
  const ATOM = {
    H: 0, He: 1, C: 2, O: 3, N: 4, U: 5,
    // Special atoms (base type + special flag encoded in upper bits)
    // Special flags: 0x10 = stripedH, 0x20 = stripedV, 0x40 = wrapped, 0x80 = colorBomb, 0x100 = mega
    STRIPED_H_FLAG: 0x10,
    STRIPED_V_FLAG: 0x20,
    WRAPPED_FLAG: 0x40,
    COLOR_BOMB_FLAG: 0x80,
    MEGA_FLAG: 0x100,
    BASE_MASK: 0x0F
  };

  // Obstacle types
  const OBSTACLE = {
    NONE: 0,
    STONE: 1,      // Destroyed by adjacent match (1 hit)
    ICE_1: 2,      // Cracked ice (1 hit remaining)
    ICE_2: 3,      // Solid ice (2 hits remaining)
    CHAIN: 4       // Locks atom, broken by matching the atom
  };

  // Special atom type helpers
  function makeSpecial(baseType, flag) {
    return (baseType & ATOM.BASE_MASK) | flag;
  }

  function getBaseType(atom) {
    return atom & ATOM.BASE_MASK;
  }

  function getSpecialFlag(atom) {
    return atom & ~ATOM.BASE_MASK;
  }

  function isSpecial(atom) {
    return (atom & ~ATOM.BASE_MASK) !== 0;
  }

  function hasFlag(atom, flag) {
    return (atom & flag) !== 0;
  }

  // ---- BoardModel Class ----
  class BoardModel {
    constructor(opts) {
      opts = opts || {};
      this.rows = opts.rows || ROWS;
      this.cols = opts.cols || COLS;
      this.atomTypes = opts.atomTypes || 6; // base types only
      this.seed = opts.seed;
      this.rng = mulberry32(opts.seed !== undefined ? opts.seed : (Math.random() * 0xffffffff) >>> 0);

      // Grid: each cell holds atom value (base type + special flags)
      this.grid = [];
      // Obstacle grid: parallel grid
      this.obstacles = [];

      // Level goals state
      this.goals = null;
      this.collected = { score: 0, atoms: [0,0,0,0,0,0], obstaclesCleared: 0 };
      this.movesLeft = 0;
      this.waveIndex = 0;
    }

    reseed(seed) {
      if (seed !== undefined) this.seed = seed;
      this.rng = mulberry32(this.seed !== undefined ? this.seed : (Math.random() * 0xffffffff) >>> 0);
    }

    _rand(choices) {
      if (Array.isArray(choices)) return choices[(this.rng() * choices.length) | 0];
      return (this.rng() * this.atomTypes) | 0;
    }

    // ---- Grid Access ----
    get(r, c) {
      if (!this.inBounds(r, c)) return null;
      return this.grid[r][c];
    }

    set(r, c, v) {
      if (this.inBounds(r, c)) this.grid[r][c] = v;
    }

    getObstacle(r, c) {
      if (!this.inBounds(r, c)) return OBSTACLE.NONE;
      return this.obstacles[r][c] || OBSTACLE.NONE;
    }

    setObstacle(r, c, v) {
      if (this.inBounds(r, c)) this.obstacles[r][c] = v;
    }

    inBounds(r, c) {
      return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }

    cellIndex(r, c) {
      return r * this.cols + c;
    }

    // ---- Board Generation ----
    generateLevel(levelData) {
      this.goals = levelData.goals || { score: 0, moves: 20 };
      this.movesLeft = this.goals.moves || 20;
      this.collected = { score: 0, atoms: [0,0,0,0,0,0], obstaclesCleared: 0 };
      this.waveIndex = 0;

      const maxAttempts = 60;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        this.grid = [];
        this.obstacles = [];

        for (let r = 0; r < this.rows; r++) {
          this.grid[r] = [];
          this.obstacles[r] = [];
          for (let c = 0; c < this.cols; c++) {
            // Apply level preset obstacles
            let obstacle = OBSTACLE.NONE;
            if (levelData.obstacles && levelData.obstacles[r] && levelData.obstacles[r][c] !== undefined) {
              obstacle = levelData.obstacles[r][c];
            }
            this.obstacles[r][c] = obstacle;

            // Generate atom (skip if obstacle is STONE - no atom on stone)
            let atom = 0;
            if (obstacle !== OBSTACLE.STONE) {
              const banned = [];
              if (c >= 2 && this.grid[r][c-1] === this.grid[r][c-2]) banned.push(this.grid[r][c-1]);
              if (r >= 2 && this.grid[r-1][c] === this.grid[r-2][c]) banned.push(this.grid[r-1][c]);
              const choices = [];
              const types = levelData.atomTypes || this.atomTypes;
              for (let t = 0; t < types; t++) if (banned.indexOf(t) === -1) choices.push(t);
              atom = choices.length > 0 ? choices[(this.rng() * choices.length) | 0] : 0;
            }
            this.grid[r][c] = atom;
          }
        }

        // Place level-specific obstacles after grid gen
        if (levelData.obstacles) {
          for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
              if (levelData.obstacles[r] && levelData.obstacles[r][c] !== undefined) {
                this.obstacles[r][c] = levelData.obstacles[r][c];
              }
            }
          }
        }

        if (!this.hasMatch() && this.hasValidMove()) {
          return true;
        }
      }
      return false;
    }

    // ---- Match Detection ----
    findMatches() {
      const matched = new Set();

      // Horizontal runs
      for (let r = 0; r < this.rows; r++) {
        let runStart = 0;
        for (let c = 1; c <= this.cols; c++) {
          const prev = this.grid[r][c - 1];
          const cur = c < this.cols ? this.grid[r][c] : -1;
          if (c === this.cols || getBaseType(cur) !== getBaseType(prev) || this.getObstacle(r, c) === OBSTACLE.STONE) {
            if (c - runStart >= MIN_MATCH) {
              for (let k = runStart; k < c; k++) {
                if (this.getObstacle(r, k) !== OBSTACLE.STONE) {
                  matched.add(this.cellIndex(r, k));
                }
              }
            }
            runStart = c;
          }
        }
      }

      // Vertical runs
      for (let c = 0; c < this.cols; c++) {
        let runStart = 0;
        for (let r = 1; r <= this.rows; r++) {
          const prev = this.grid[r - 1][c];
          const cur = r < this.rows ? this.grid[r][c] : -1;
          if (r === this.rows || getBaseType(cur) !== getBaseType(prev) || this.getObstacle(r, c) === OBSTACLE.STONE) {
            if (r - runStart >= MIN_MATCH) {
              for (let k = runStart; k < r; k++) {
                if (this.getObstacle(k, c) !== OBSTACLE.STONE) {
                  matched.add(this.cellIndex(k, c));
                }
              }
            }
            runStart = r;
          }
        }
      }

      return matched;
    }

    hasMatch() {
      return this.findMatches().size > 0;
    }

    // Check if a specific cell is part of a match (for swap validation)
    _matchAtCell(r, c) {
      const v = this.grid[r][c];
      const baseType = getBaseType(v);
      if (baseType === undefined || baseType === null) return false;
      const orth = [[0, 1], [1, 0]];
      for (let i = 0; i < orth.length; i++) {
        const dr = orth[i][0], dc = orth[i][1];
        let count = 1;
        for (let s = 1; s < this.cols; s++) {
          const rr = r + dr * s, cc = c + dc * s;
          if (!this.inBounds(rr, cc)) break;
          if (getBaseType(this.grid[rr][cc]) === baseType && this.getObstacle(rr, cc) !== OBSTACLE.STONE) count++;
          else break;
        }
        for (let s = 1; s < this.cols; s++) {
          const rr = r - dr * s, cc = c - dc * s;
          if (!this.inBounds(rr, cc)) break;
          if (getBaseType(this.grid[rr][cc]) === baseType && this.getObstacle(rr, cc) !== OBSTACLE.STONE) count++;
          else break;
        }
        if (count >= MIN_MATCH) return true;
      }
      return false;
    }

    // ---- Swap Validation ----
    swapCreatesMatch(a, b) {
      this.swapValues(a, b);
      const ok = this._matchAtCell(a.r, a.c) || this._matchAtCell(b.r, b.c);
      this.swapValues(a, b); // restore
      return ok;
    }

    swapValues(a, b) {
      const t = this.grid[a.r][a.c];
      this.grid[a.r][a.c] = this.grid[b.r][b.c];
      this.grid[b.r][b.c] = t;
    }

    // ---- Valid Move Detection ----
    hasValidMove() {
      return this.findAnyValidSwap() !== null;
    }

    findAnyValidSwap() {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          // Skip if cell has CHAIN obstacle (can't move chained atoms)
          if (this.getObstacle(r, c) === OBSTACLE.CHAIN) continue;
          const a = { r, c };
          if (c + 1 < this.cols && this.getObstacle(r, c+1) !== OBSTACLE.CHAIN) {
            const b = { r, c: c + 1 };
            if (this.swapCreatesMatch(a, b)) return { a, b };
          }
          if (r + 1 < this.rows && this.getObstacle(r+1, c) !== OBSTACLE.CHAIN) {
            const b = { r: r + 1, c };
            if (this.swapCreatesMatch(a, b)) return { a, b };
          }
        }
      }
      return null;
    }

    // ---- Match Removal ----
    removeMatched(matched) {
      const removed = [];
      matched.forEach((idx) => {
        const r = Math.floor(idx / this.cols), c = idx % this.cols;
        const atom = this.grid[r][c];
        if (atom === undefined || atom === null) return;
        const baseType = getBaseType(atom);
        const specialFlag = getSpecialFlag(atom);
        removed.push({ r, c, type: baseType, special: specialFlag, atom });
        this.grid[r][c] = null;

        // Track collected atoms for level goals
        if (baseType < 6) {
          this.collected.atoms[baseType]++;
        }
      });
      return removed;
    }

    // ---- Special Atom Creation ----
    // Called after a valid swap to create special atoms from 4/5/L/T matches
    createSpecialAtoms(matched, swapCells) {
      // Count matches per base type per line
      const horizontalRuns = new Map(); // key: "r,type" -> {cells[], length}
      const verticalRuns = new Map();   // key: "c,type" -> {cells[], length}

      // Analyze horizontal runs in matched set
      for (let r = 0; r < this.rows; r++) {
        let runStart = 0;
        for (let c = 1; c <= this.cols; c++) {
          const prev = c > 0 ? this.grid[r][c-1] : null;
          const cur = c < this.cols ? this.grid[r][c] : null;
          const prevBase = prev !== null ? getBaseType(prev) : -1;
          const curBase = cur !== null ? getBaseType(cur) : -2;
          const prevMatched = prev !== null && matched.has(this.cellIndex(r, c-1));
          const curMatched = cur !== null && matched.has(this.cellIndex(r, c));
          if (c === this.cols || !curMatched || prevBase !== curBase) {
            if (c - runStart >= MIN_MATCH) {
              const key = `${r},${prevBase}`;
              const cells = [];
              for (let k = runStart; k < c; k++) cells.push({r, c: k});
              if (!horizontalRuns.has(key) || horizontalRuns.get(key).length < cells.length) {
                horizontalRuns.set(key, { cells, length: cells.length, type: prevBase });
              }
            }
            runStart = c;
          }
        }
      }

      // Analyze vertical runs in matched set
      for (let c = 0; c < this.cols; c++) {
        let runStart = 0;
        for (let r = 1; r <= this.rows; r++) {
          const prev = this.grid[r-1][c];
          const cur = r < this.rows ? this.grid[r][c] : null;
          const prevBase = prev !== null ? getBaseType(prev) : -1;
          const curBase = cur !== null ? getBaseType(cur) : -2;
          const prevMatched = prev !== null && matched.has(this.cellIndex(r-1, c));
          const curMatched = cur !== null && matched.has(this.cellIndex(r, c));
          if (r === this.rows || !curMatched || prevBase !== curBase) {
            if (r - runStart >= MIN_MATCH) {
              const key = `${c},${prevBase}`;
              const cells = [];
              for (let k = runStart; k < r; k++) cells.push({r: k, c});
              if (!verticalRuns.has(key) || verticalRuns.get(key).length < cells.length) {
                verticalRuns.set(key, { cells, length: cells.length, type: prevBase });
              }
            }
            runStart = r;
          }
        }
      }

      // Determine special atoms to create
      const specialCreations = []; // {r, c, atom}

      // Process horizontal runs
      for (const [key, run] of horizontalRuns) {
        const { cells, length, type } = run;
        if (length >= 5) {
          // 5-match creates MEGA at center (or first cell of run)
          const center = cells[Math.floor(cells.length / 2)];
          specialCreations.push({ r: center.r, c: center.c, atom: makeSpecial(type, ATOM.MEGA_FLAG) });
        } else if (length === 4) {
          // 4-match creates WRAPPED at center
          const center = cells[Math.floor(cells.length / 2)];
          specialCreations.push({ r: center.r, c: center.c, atom: makeSpecial(type, ATOM.WRAPPED_FLAG) });
        }
      }

      // Process vertical runs
      for (const [key, run] of verticalRuns) {
        const { cells, length, type } = run;
        if (length >= 5) {
          const center = cells[Math.floor(cells.length / 2)];
          specialCreations.push({ r: center.r, c: center.c, atom: makeSpecial(type, ATOM.MEGA_FLAG) });
        } else if (length === 4) {
          const center = cells[Math.floor(cells.length / 2)];
          specialCreations.push({ r: center.r, c: center.c, atom: makeSpecial(type, ATOM.WRAPPED_FLAG) });
        }
      }

      // Check for L/T intersections (cell in both horizontal and vertical run >= 3)
      // These create STRIPED atoms
      const hCells = new Set();
      for (const run of horizontalRuns.values()) {
        if (run.length >= 3) {
          for (const cell of run.cells) hCells.add(`${cell.r},${cell.c}`);
        }
      }
      for (const run of verticalRuns.values()) {
        if (run.length >= 3) {
          for (const cell of run.cells) {
            const key = `${cell.r},${cell.c}`;
            if (hCells.has(key)) {
              // Intersection - create striped (direction based on longer run)
              const hRun = horizontalRuns.get(`${cell.r},${run.type}`);
              const vRun = verticalRuns.get(`${cell.c},${run.type}`);
              const hLen = hRun ? hRun.length : 0;
              const vLen = vRun ? vRun.length : 0;
              const flag = hLen >= vLen ? ATOM.STRIPED_H_FLAG : ATOM.STRIPED_V_FLAG;
              specialCreations.push({ r: cell.r, c: cell.c, atom: makeSpecial(run.type, flag) });
            }
          }
        }
      }

      // Apply special atom creations (but don't overwrite MEGA)
      for (const sc of specialCreations) {
        const existing = this.grid[sc.r][sc.c];
        if (existing !== null && !hasFlag(existing, ATOM.MEGA_FLAG)) {
          this.grid[sc.r][sc.c] = sc.atom;
        }
      }

      return specialCreations;
    }

    // ---- Gravity & Refill ----
    applyGravity(spawn) {
      const moves = [], refills = [];
      for (let c = 0; c < this.cols; c++) {
        let write = this.rows - 1;
        for (let r = this.rows - 1; r >= 0; r--) {
          const v = this.grid[r][c];
          const obs = this.obstacles[r][c];
          // Stone obstacles don't fall and split the column into segments.
          if (obs === OBSTACLE.STONE) {
            // Refill the segment that ends just below this stone.
            this.refillSegment(c, r + 1, write, refills, spawn);
            write = r - 1;
            continue;
          }
          if (v !== null) {
            if (write !== r) {
              moves.push({ col: c, from: r, to: write, type: v });
              this.grid[write][c] = v;
              this.grid[r][c] = null;
              // Move obstacle too
              if (this.obstacles[r][c] !== OBSTACLE.NONE && this.obstacles[r][c] !== OBSTACLE.STONE) {
                this.obstacles[write][c] = this.obstacles[r][c];
                this.obstacles[r][c] = OBSTACLE.NONE;
              }
            }
            write--;
          }
        }
        // Refill the top segment (above the highest stone, or the whole column).
        this.refillSegment(c, 0, write, refills, spawn);
      }
      return { moves, refills };
    }

    // Fill every empty cell in one vertical segment [topRow .. write] with a
    // new atom. Called once per segment so holes below a stone wall are
    // refilled too — previously only the top segment was replenished.
    refillSegment(col, topRow, write, refills, spawn) {
      for (let r = write; r >= topRow; r--) {
        if (this.obstacles[r][col] === OBSTACLE.STONE) continue;
        const v = spawn ? spawn[refills.length] : (this.rng() * this.atomTypes) | 0;
        this.grid[r][col] = v;
        refills.push({ col, row: r, type: v, fromRow: topRow - 1 });
      }
    }

    // ---- Cascade Resolution ----
    resolve() {
      const waves = [];
      for (let wave = 0; wave < MAX_CASCADE_WAVES; wave++) {
        const matched = this.findMatches();
        if (matched.size === 0) break;

        const removed = this.removeMatched(matched);

        // Calculate wave score
        let waveScore = 0;
        for (const rem of removed) {
          waveScore += 10 * (rem.type + 1);
          // Bonus for special atoms
          if (rem.special & ATOM.STRIPED_H_FLAG) waveScore += 50;
          if (rem.special & ATOM.STRIPED_V_FLAG) waveScore += 50;
          if (rem.special & ATOM.WRAPPED_FLAG) waveScore += 100;
          if (rem.special & ATOM.COLOR_BOMB_FLAG) waveScore += 200;
          if (rem.special & ATOM.MEGA_FLAG) waveScore += 500;
        }
        waveScore *= (wave + 1);
        this.collected.score += waveScore;

        const g = this.applyGravity();
        waves.push({ removed, moves: g.moves, refills: g.refills, score: waveScore });
        this.waveIndex = wave + 1;
      }
      return waves;
    }

    // ---- Special Atom Effects Resolution ----
    // Returns additional cells to clear from special atom activations
    resolveSpecials(activatedSpecials) {
      const extraCleared = new Set();

      for (const spec of activatedSpecials) {
        const { r, c, atom } = spec;
        const baseType = getBaseType(atom);
        const flag = getSpecialFlag(atom);

        if (flag & ATOM.STRIPED_H_FLAG) {
          // Clear entire row
          for (let cc = 0; cc < this.cols; cc++) {
            if (this.getObstacle(r, cc) !== OBSTACLE.STONE) {
              extraCleared.add(this.cellIndex(r, cc));
            }
          }
        }
        if (flag & ATOM.STRIPED_V_FLAG) {
          // Clear entire column
          for (let rr = 0; rr < this.rows; rr++) {
            if (this.getObstacle(rr, c) !== OBSTACLE.STONE) {
              extraCleared.add(this.cellIndex(rr, c));
            }
          }
        }
        if (flag & ATOM.WRAPPED_FLAG) {
          // Clear 3x3 area around
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const rr = r + dr, cc = c + dc;
              if (this.inBounds(rr, cc) && this.getObstacle(rr, cc) !== OBSTACLE.STONE) {
                extraCleared.add(this.cellIndex(rr, cc));
              }
            }
          }
        }
        if (flag & ATOM.COLOR_BOMB_FLAG) {
          // Clear all atoms of swapped type (handled in combo logic)
        }
        if (flag & ATOM.MEGA_FLAG) {
          // Clear entire board
          for (let rr = 0; rr < this.rows; rr++) {
            for (let cc = 0; cc < this.cols; cc++) {
              if (this.getObstacle(rr, cc) !== OBSTACLE.STONE) {
                extraCleared.add(this.cellIndex(rr, cc));
              }
            }
          }
        }
      }

      // Remove extra cleared atoms
      const extraRemoved = [];
      extraCleared.forEach((idx) => {
        const r = Math.floor(idx / this.cols), c = idx % this.cols;
        const atom = this.grid[r][c];
        if (atom !== null && atom !== undefined) {
          const baseType = getBaseType(atom);
          const specialFlag = getSpecialFlag(atom);
          extraRemoved.push({ r, c, type: baseType, special: specialFlag, atom });
          this.grid[r][c] = null;
          if (baseType < 6) this.collected.atoms[baseType]++;
        }
      });

      if (extraRemoved.length > 0) {
        const g = this.applyGravity();
        return { removed: extraRemoved, moves: g.moves, refills: g.refills };
      }
      return null;
    }

    // ---- Combo Resolution ----
    // Given two special atoms that were swapped, resolve the combo
    resolveCombo(specA, specB) {
      const flagA = getSpecialFlag(specA.atom);
      const flagB = getSpecialFlag(specB.atom);
      const typeA = getBaseType(specA.atom);
      const typeB = getBaseType(specB.atom);
      const cleared = new Set();

      // Color Bomb + any special
      if ((flagA & ATOM.COLOR_BOMB_FLAG) || (flagB & ATOM.COLOR_BOMB_FLAG)) {
        const bomb = (flagA & ATOM.COLOR_BOMB_FLAG) ? specA : specB;
        const other = (flagA & ATOM.COLOR_BOMB_FLAG) ? specB : specA;
        const bombType = getBaseType(bomb.atom);
        const otherType = getBaseType(other.atom);
        const otherFlag = getSpecialFlag(other.atom);

        if (otherFlag & ATOM.COLOR_BOMB_FLAG) {
          // Color Bomb + Color Bomb = clear entire board
          for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
              if (this.getObstacle(r, c) !== OBSTACLE.STONE) cleared.add(this.cellIndex(r, c));
            }
          }
        } else if (otherFlag & (ATOM.STRIPED_H_FLAG | ATOM.STRIPED_V_FLAG | ATOM.WRAPPED_FLAG | ATOM.MEGA_FLAG)) {
          // Color Bomb + Special = turn all of other's base type into that special and activate
          for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
              const atom = this.grid[r][c];
              if (atom !== null && getBaseType(atom) === otherType && this.getObstacle(r, c) !== OBSTACLE.STONE) {
                cleared.add(this.cellIndex(r, c));
                // Would create special atoms here in full implementation
              }
            }
          }
        } else {
          // Color Bomb + Normal = clear all of that type
          for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
              const atom = this.grid[r][c];
              if (atom !== null && getBaseType(atom) === otherType && this.getObstacle(r, c) !== OBSTACLE.STONE) {
                cleared.add(this.cellIndex(r, c));
              }
            }
          }
        }
      }
      // Striped + Striped
      else if ((flagA & (ATOM.STRIPED_H_FLAG | ATOM.STRIPED_V_FLAG)) && (flagB & (ATOM.STRIPED_H_FLAG | ATOM.STRIPED_V_FLAG))) {
        // Clear both row and column of both atoms
        [specA, specB].forEach(s => {
          const rr = s.r, cc = s.c;
          for (let c = 0; c < this.cols; c++) if (this.getObstacle(rr, c) !== OBSTACLE.STONE) cleared.add(this.cellIndex(rr, c));
          for (let r = 0; r < this.rows; r++) if (this.getObstacle(r, cc) !== OBSTACLE.STONE) cleared.add(this.cellIndex(r, cc));
        });
      }
      // Striped + Wrapped
      else if ((flagA & (ATOM.STRIPED_H_FLAG | ATOM.STRIPED_V_FLAG)) && (flagB & ATOM.WRAPPED_FLAG)) {
        const striped = (flagA & (ATOM.STRIPED_H_FLAG | ATOM.STRIPED_V_FLAG)) ? specA : specB;
        const wrapped = (flagA & ATOM.WRAPPED_FLAG) ? specA : specB;
        // Clear 3 rows and 3 columns centered on wrapped
        for (let dr = -1; dr <= 1; dr++) {
          const rr = wrapped.r + dr;
          if (rr >= 0 && rr < this.rows) {
            for (let c = 0; c < this.cols; c++) if (this.getObstacle(rr, c) !== OBSTACLE.STONE) cleared.add(this.cellIndex(rr, c));
          }
        }
        for (let dc = -1; dc <= 1; dc++) {
          const cc = wrapped.c + dc;
          if (cc >= 0 && cc < this.cols) {
            for (let r = 0; r < this.rows; r++) if (this.getObstacle(r, cc) !== OBSTACLE.STONE) cleared.add(this.cellIndex(r, cc));
          }
        }
      }
      // Wrapped + Wrapped
      else if ((flagA & ATOM.WRAPPED_FLAG) && (flagB & ATOM.WRAPPED_FLAG)) {
        [specA, specB].forEach(s => {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const rr = s.r + dr, cc = s.c + dc;
              if (this.inBounds(rr, cc) && this.getObstacle(rr, cc) !== OBSTACLE.STONE) {
                cleared.add(this.cellIndex(rr, cc));
              }
            }
          }
        });
      }
      // Mega + anything = clear board
      else if ((flagA & ATOM.MEGA_FLAG) || (flagB & ATOM.MEGA_FLAG)) {
        for (let r = 0; r < this.rows; r++) {
          for (let c = 0; c < this.cols; c++) {
            if (this.getObstacle(r, c) !== OBSTACLE.STONE) cleared.add(this.cellIndex(r, c));
          }
        }
      }

      // Apply clearing
      const removed = [];
      cleared.forEach((idx) => {
        const r = Math.floor(idx / this.cols), c = idx % this.cols;
        const atom = this.grid[r][c];
        if (atom !== null && atom !== undefined) {
          const baseType = getBaseType(atom);
          const specialFlag = getSpecialFlag(atom);
          removed.push({ r, c, type: baseType, special: specialFlag, atom });
          this.grid[r][c] = null;
          if (baseType < 6) this.collected.atoms[baseType]++;
        }
      });

      if (removed.length > 0) {
        const g = this.applyGravity();
        return { removed, moves: g.moves, refills: g.refills };
      }
      return null;
    }

    // ---- Obstacle Damage ----
    // Call after matches are removed to damage adjacent obstacles
    applyObstacleDamage(clearedCells) {
      const damaged = [];
      for (const cell of clearedCells) {
        const r = cell.r, c = cell.c;
        // Check 4 neighbors for obstacles
        const neighbors = [[r-1,c], [r+1,c], [r,c-1], [r,c+1]];
        for (const [nr, nc] of neighbors) {
          if (!this.inBounds(nr, nc)) continue;
          const obs = this.getObstacle(nr, nc);
          if (obs === OBSTACLE.STONE) {
            // Stone destroyed by adjacent match
            this.setObstacle(nr, nc, OBSTACLE.NONE);
            damaged.push({ r: nr, c: nc, prevType: obs, newType: OBSTACLE.NONE });
            this.collected.obstaclesCleared++;
          } else if (obs === OBSTACLE.ICE_2) {
            this.setObstacle(nr, nc, OBSTACLE.ICE_1);
            damaged.push({ r: nr, c: nc, prevType: obs, newType: OBSTACLE.ICE_1 });
          } else if (obs === OBSTACLE.ICE_1) {
            this.setObstacle(nr, nc, OBSTACLE.NONE);
            damaged.push({ r: nr, c: nc, prevType: obs, newType: OBSTACLE.NONE });
            this.collected.obstaclesCleared++;
          } else if (obs === OBSTACLE.CHAIN) {
            // Chain broken if the matched atom was the chained one
            // This is handled in match removal - chain breaks when atom is matched
          }
        }
      }
      return damaged;
    }

    // Helper for tests
    isCellInteractive(r, c) {
      const obs = this.getObstacle(r, c);
      return obs !== OBSTACLE.STONE && obs !== OBSTACLE.CHAIN;
    }

    // ---- Level Goals ----
    // Win = ALL primary goals met (score / obstacles / collect).
    // failed = moves exhausted without winning. `survive` is implied by not failing.
    checkGoals() {
      if (!this.goals) return { complete: false, failed: false, stars: 0 };
      const g = this.goals;
      let met = 0, total = 0;
      if (g.score !== undefined) { total++; if (this.collected.score >= g.score) met++; }
      if (g.obstacles !== undefined) { total++; if (this.collected.obstaclesCleared >= g.obstacles) met++; }
      if (g.collect) { total++; if (this.collected.atoms[g.collect.type] >= g.collect.count) met++; }
      const complete = total > 0 && met === total;
      const failed = !complete && this.movesLeft <= 0;
      return { complete, failed, stars: complete ? Math.min(3, met) : 0 };
    }

    // ---- Deadlock Reshuffle ----
    shuffle() {
      const pool = [];
      const obstaclePool = [];
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.getObstacle(r, c) !== OBSTACLE.STONE) {
            pool.push(this.grid[r][c]);
            obstaclePool.push(this.obstacles[r][c]);
          } else {
            pool.push(null);
            obstaclePool.push(OBSTACLE.STONE);
          }
        }
      }

      for (let attempt = 0; attempt < 200; attempt++) {
        // Fisher-Yates shuffle (only non-stone positions)
        const indices = [];
        for (let i = 0; i < pool.length; i++) {
          if (pool[i] !== null) indices.push(i);
        }
        for (let i = indices.length - 1; i > 0; i--) {
          const j = (this.rng() * (i + 1)) | 0;
          const ti = indices[i], tj = indices[j];
          const t = pool[ti]; pool[ti] = pool[tj]; pool[tj] = t;
          const to = obstaclePool[ti]; obstaclePool[ti] = obstaclePool[tj]; obstaclePool[tj] = to;
        }

        let k = 0, hasMatch = false;
        this.grid = [];
        this.obstacles = [];
        for (let r = 0; r < this.rows; r++) {
          this.grid[r] = [];
          this.obstacles[r] = [];
          for (let c = 0; c < this.cols; c++) {
            this.grid[r][c] = pool[k];
            this.obstacles[r][c] = obstaclePool[k];
            k++;
          }
        }
        if (this.hasMatch()) { hasMatch = true; continue; }
        if (this.hasValidMove()) return true;
      }
      // Fallback: regenerate
      return this.generateLevel({ goals: this.goals, atomTypes: this.atomTypes, obstacles: this.obstacles });
    }

    // ---- Restart ----
    restart(levelData) {
      this.reseed(this.seed);
      return this.generateLevel(levelData);
    }

    // ---- Serialization for Save ----
    toJSON() {
      return {
        seed: this.seed,
        grid: this.grid.map(row => row.slice()),
        obstacles: this.obstacles.map(row => row.slice()),
        goals: this.goals,
        collected: { ...this.collected, atoms: this.collected.atoms.slice() },
        movesLeft: this.movesLeft,
        waveIndex: this.waveIndex
      };
    }

    static fromJSON(data, opts) {
      const board = new BoardModel(opts);
      board.seed = data.seed;
      board.rng = mulberry32(data.seed);
      board.grid = data.grid.map(row => row.slice());
      board.obstacles = data.obstacles.map(row => row.slice());
      board.goals = data.goals;
      board.collected = { ...data.collected, atoms: data.collected.atoms.slice() };
      board.movesLeft = data.movesLeft;
      board.waveIndex = data.waveIndex;
      return board;
    }
  }

  // Export constants for external use
  BoardModel.ATOM = ATOM;
  BoardModel.OBSTACLE = OBSTACLE;
  BoardModel.ROWS = ROWS;
  BoardModel.COLS = COLS;
  BoardModel.MIN_MATCH = MIN_MATCH;

  return BoardModel;
});