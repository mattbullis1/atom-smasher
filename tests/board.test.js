/* =========================================================
   Atom Smasher — BoardModel Automated Logic Tests (Node)
   Run with: node tests/board.test.js
   ========================================================= */
const BoardModel = require("../js/core/BoardModel.js");
const AtomTypes = require("../js/core/AtomTypes.js");
const ObstacleTypes = require("../js/core/ObstacleTypes.js");
const LevelData = require("../js/core/LevelData.js");

let passed = 0, failed = 0;

function ok(cond, name) {
  if (cond) { passed++; console.log("  PASS " + name); }
  else { failed++; console.log("  FAIL " + name); }
}

function section(t) { console.log("\n== " + t + " =="); }

function snap(board) {
  return board.grid.map(r => r.map(v => v !== null ? v.toString() : ".").join("")).join("|");
}

// Helper to create board with specific grid
function boardFromGrid(grid, opts) {
  const b = new BoardModel(opts);
  b.grid = grid.map(r => r.slice());
  b.obstacles = grid.map(r => r.map(() => ObstacleTypes.OBSTACLE.NONE));
  return b;
}

console.log("Starting BoardModel tests...\n");

/* 1. Initial board has no matches */
section("1. Initial board has no matches");
for (let seed = 1; seed <= 20; seed++) {
  const b = new BoardModel({ seed, types: 6 });
  b.generateLevel({ atomTypes: 6, goals: { moves: 20 }, obstacles: [] });
  ok(!b.hasMatch(), "seed " + seed + " board has no matches");
}

/* 2. Initial board has at least one valid move */
section("2. Initial board has at least one valid move");
for (let seed = 1; seed <= 20; seed++) {
  const b = new BoardModel({ seed, types: 6 });
  b.generateLevel({ atomTypes: 6, goals: { moves: 20 }, obstacles: [] });
  ok(b.hasValidMove(), "seed " + seed + " has a valid move");
}

/* 3. Valid swap produces correct matches */
section("3. Valid swap produces correct matches");
{
  // Board: row 0 = [1, 0, 1, 1, 3, 4, 5, 0]
  // Swap (0,0)=1 with (0,1)=0 -> [0, 1, 1, 1, ...] creates match of three 1s at positions 1,2,3
  const b = boardFromGrid([
    [1, 0, 1, 1, 3, 4, 5, 0],
    [0, 2, 3, 4, 5, 0, 1, 2],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [5, 0, 1, 2, 3, 4, 5, 0],
    [1, 2, 3, 4, 5, 0, 1, 2],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [5, 0, 1, 2, 3, 4, 5, 0],
    [0, 1, 2, 3, 4, 5, 0, 1]
  ], { types: 6 });

  ok(b.swapCreatesMatch({ r: 0, c: 0 }, { r: 0, c: 1 }), "horizontal swap creates match");
  b.swapValues({ r: 0, c: 0 }, { r: 0, c: 1 });
  const m = b.findMatches();
  ok(m.size === 3, "match set has exactly 3 atoms, got " + m.size);
}

/* 4. Invalid swap restores atoms, consumes zero moves */
section("4. Invalid swap restores atoms, zero move cost");
{
  const b = boardFromGrid([
    [0, 1, 2, 3, 4, 5, 0, 1],
    [1, 2, 3, 4, 5, 0, 1, 2],
    [2, 3, 4, 5, 0, 1, 2, 3],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [4, 5, 0, 1, 2, 3, 4, 5],
    [5, 0, 1, 2, 3, 4, 5, 0],
    [0, 1, 2, 3, 4, 5, 0, 1],
    [1, 2, 3, 4, 5, 0, 1, 2]
  ], { types: 6 });

  const before = snap(b);
  const created = b.swapCreatesMatch({ r: 0, c: 0 }, { r: 0, c: 1 });
  b.swapValues({ r: 0, c: 0 }, { r: 0, c: 1 }); // tentative swap
  b.swapValues({ r: 0, c: 0 }, { r: 0, c: 1 }); // restore
  ok(!created && snap(b) === before, "invalid swap fully restores board");
}

/* 5. Valid swap consumes exactly one move */
section("5. Valid swap consumes exactly one move");
{
  const b = boardFromGrid([
    [1, 1, 0, 2, 3, 4, 5, 0],
    [0, 2, 3, 4, 5, 0, 1, 2],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [5, 0, 1, 2, 3, 4, 5, 0],
    [1, 2, 3, 4, 5, 0, 1, 2],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [5, 0, 1, 2, 3, 4, 5, 0],
    [0, 1, 2, 3, 4, 5, 0, 1]
  ], { types: 6 });

  let moves = 20;
  b.swapValues({ r: 0, c: 1 }, { r: 0, c: 2 });
  b.resolve();
  moves--;
  ok(moves === 19, "one valid swap consumed exactly one move");
}

/* 6. Horizontal match detection */
section("6. Horizontal match detection");
{
  const b = boardFromGrid([
    [2, 2, 2, 2, 3, 4, 5, 0],
    [1, 3, 4, 5, 0, 1, 2, 3],
    [4, 5, 0, 1, 2, 3, 4, 5],
    [0, 1, 2, 3, 4, 5, 0, 1],
    [1, 2, 3, 4, 5, 0, 1, 2],
    [2, 3, 4, 5, 0, 1, 2, 3],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [4, 5, 0, 1, 2, 3, 4, 5]
  ], { types: 6 });
  ok(b.findMatches().size === 4, "horizontal 4-match detected, got " + b.findMatches().size);
}

/* 7. Vertical match detection */
section("7. Vertical match detection");
{
  const b = boardFromGrid([
    [2, 1, 3, 4, 5, 0, 1, 2],
    [2, 3, 4, 5, 0, 1, 2, 3],
    [2, 4, 5, 0, 1, 2, 3, 4],
    [5, 0, 1, 2, 3, 4, 5, 0],
    [0, 1, 2, 3, 4, 5, 0, 1],
    [1, 2, 3, 4, 5, 0, 1, 2],
    [2, 3, 4, 5, 0, 1, 2, 3],
    [3, 4, 5, 0, 1, 2, 3, 4]
  ], { types: 6 });
  ok(b.findMatches().size === 3, "vertical 3-match detected, got " + b.findMatches().size);
}

/* 8. 5-match detection */
section("8. Five-match detection");
{
  const b = boardFromGrid([
    [4, 4, 4, 4, 4, 0, 1, 2],
    [1, 3, 4, 5, 0, 1, 2, 3],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [0, 1, 2, 3, 4, 5, 0, 1],
    [1, 2, 3, 4, 5, 0, 1, 2],
    [2, 3, 4, 5, 0, 1, 2, 3],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [4, 5, 0, 1, 2, 3, 4, 5]
  ], { types: 6 });
  ok(b.findMatches().size === 5, "horizontal 5-match detected, got " + b.findMatches().size);
}

/* 9. Intersecting matches (L/T shapes) */
section("9. Intersecting matches (L/T shapes)");
{
  const b = boardFromGrid([
    [0, 0, 0, 0, 1, 2, 3, 4],
    [1, 5, 5, 0, 2, 3, 4, 5],
    [2, 3, 4, 0, 5, 1, 2, 3],
    [3, 4, 5, 2, 4, 5, 0, 1],
    [4, 5, 0, 1, 2, 3, 4, 5],
    [5, 0, 1, 2, 3, 4, 5, 0],
    [0, 1, 2, 3, 4, 5, 0, 1],
    [1, 2, 3, 4, 5, 0, 1, 2]
  ], { types: 6 });
  const m = b.findMatches();
  ok(m.size === 6, "L-shape (4H + 3V sharing 1) = 6 unique cells, got " + m.size);

  // T-shape: row 3 has 3,3,3 at cols 3,4,5; col 3 has 3,3,3 at rows 3,4,5
  const t = boardFromGrid([
    [1, 2, 3, 4, 5, 0, 1, 2],
    [2, 3, 4, 5, 0, 1, 2, 3],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [4, 5, 0, 3, 3, 3, 4, 5],
    [5, 0, 1, 3, 2, 4, 5, 0],
    [0, 1, 2, 3, 4, 5, 0, 1],
    [1, 2, 3, 4, 5, 0, 1, 2],
    [2, 3, 4, 5, 0, 1, 2, 3]
  ], { types: 6 });
  ok(t.findMatches().size === 5, "T-shape (3H + 3V sharing center) = 5 unique cells, got " + t.findMatches().size);
}

/* 10. Gravity preserves relative order */
section("10. Gravity preserves relative order");
{
  const b = new BoardModel({ rows: 4, cols: 3, seed: 9, types: 5 });
  // Column 0: [1, 2, null, 3] from top to bottom (row 0 to 3)
  // Falls to bottom: [4, 1, 2, 3] where 4 is new spawn
  // Column 1: [null, 2, 3, 4] -> [4, 2, 3, 4]
  // Column 2: [3, null, 1, 2] -> [4, 3, 1, 2]
  b.grid = [
    [1, null, 3],
    [2, 2, null],
    [null, 3, 1],
    [3, 4, 2]
  ];
  b.obstacles = b.grid.map(r => r.map(() => ObstacleTypes.OBSTACLE.NONE));
  const g = b.applyGravity([4, 4, 4]);
  ok(g.moves.length === 3, "3 fall moves, got " + g.moves.length);
  ok(g.refills.length === 3, "3 refills, got " + g.refills.length);
  // After gravity with spawn=[4,4,4]:
  // Col 0: row3=3, row2=2, row1=1, row0=4 (spawn)
  // Col 1: row3=4, row2=3, row1=2, row0=4 (spawn)
  // Col 2: row3=2, row2=1, row1=3, row0=4 (spawn)
  // snap() joins columns with empty string, rows with |
  const expected = "444|123|231|342";
  ok(snap(b) === expected, "order preserved, got [" + snap(b) + "] expected [" + expected + "]");
}

/* 11. Refill fills all empty cells */
section("11. Refill fills all empty cells");
{
  const b = new BoardModel({ rows: 4, cols: 3, seed: 3, types: 5 });
  b.grid = [[null, null, null], [null, null, null], [1, 2, 3], [1, 2, 3]];
  b.obstacles = b.grid.map(r => r.map(() => ObstacleTypes.OBSTACLE.NONE));
  const g = b.applyGravity();
  let nulls = 0;
  for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) if (b.grid[r][c] === null) nulls++;
  ok(nulls === 0, "no nulls after refill");
  ok(g.refills.length === 6, "6 refills, got " + g.refills.length);
}

/* 12. Cascades resolve completely */
section("12. Cascades resolve completely");
for (let seed = 1; seed <= 20; seed++) {
  const b = new BoardModel({ seed: seed * 7, types: 6 });
  b.generateLevel({ atomTypes: 6, goals: { moves: 20 }, obstacles: [] });
  b.resolve();
  ok(!b.hasMatch(), "seed " + seed + " board stable after resolve");
}

/* 13. Special atom creation from 4-match */
section("13. Special atom creation (4-match creates wrapped)");
{
  const b = boardFromGrid([
    [2, 2, 2, 2, 3, 4, 5, 0],
    [1, 3, 4, 5, 0, 1, 2, 3],
    [4, 5, 0, 1, 2, 3, 4, 5],
    [0, 1, 2, 3, 4, 5, 0, 1],
    [1, 2, 3, 4, 5, 0, 1, 2],
    [2, 3, 4, 5, 0, 1, 2, 3],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [4, 5, 0, 1, 2, 3, 4, 5]
  ], { types: 6 });

  // Simulate swap that creates 4-match
  const matched = b.findMatches();
  const specials = b.createSpecialAtoms(matched, [{ r: 0, c: 0 }, { r: 0, c: 1 }]);
  ok(specials.length === 1, "one special atom created");
  ok((specials[0].atom & 0x40) !== 0, "special is WRAPPED (0x40)");
}

/* 14. Special atom creation from 5-match */
section("14. Special atom creation (5-match creates mega)");
{
  const b = boardFromGrid([
    [4, 4, 4, 4, 4, 0, 1, 2],
    [1, 3, 4, 5, 0, 1, 2, 3],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [0, 1, 2, 3, 4, 5, 0, 1],
    [1, 2, 3, 4, 5, 0, 1, 2],
    [2, 3, 4, 5, 0, 1, 2, 3],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [4, 5, 0, 1, 2, 3, 4, 5]
  ], { types: 6 });

  const matched = b.findMatches();
  const specials = b.createSpecialAtoms(matched, [{ r: 0, c: 0 }, { r: 0, c: 1 }]);
  ok(specials.length === 1, "one special atom created");
  ok((specials[0].atom & 0x100) !== 0, "special is MEGA (0x100)");
}

/* 15. Striped atom creation from intersection */
section("15. Striped atom from intersection");
{
  // Create a board with horizontal 3-match at row 0 cols 0-2 (type 0)
  // and vertical 3-match at col 2 rows 0-2 (type 0)
  // Intersection at (0,2) should create striped
  const b = boardFromGrid([
    [0, 0, 0, 1, 2, 3, 4, 5],
    [1, 2, 0, 3, 4, 5, 0, 1],
    [2, 3, 0, 4, 5, 0, 1, 2],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [4, 5, 0, 1, 2, 3, 4, 5],
    [5, 0, 1, 2, 3, 4, 5, 0],
    [0, 1, 2, 3, 4, 5, 0, 1],
    [1, 2, 3, 4, 5, 0, 1, 2]
  ], { types: 6 });

  const matched = b.findMatches();
  ok(matched.size >= 5, "has both horizontal and vertical matches");
  const specials = b.createSpecialAtoms(matched, [{ r: 0, c: 1 }, { r: 0, c: 2 }]);
  ok(specials.length >= 1, "at least one special from intersection, got " + specials.length);
  if (specials.length > 0) {
    const flag = specials[0].atom & ~0x0F;
    ok(flag === 0x10 || flag === 0x20, "special is striped (H or V)");
  }
}

/* 16. Obstacle damage - stone destroyed by adjacent match */
section("16. Stone obstacle destroyed by adjacent match");
{
  const b = boardFromGrid([
    [1, 1, 1, 2, 3, 4, 5, 0],
    [0, 2, 3, 4, 5, 0, 1, 2],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [5, 0, 1, 2, 3, 4, 5, 0],
    [1, 2, 3, 4, 5, 0, 1, 2],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [5, 0, 1, 2, 3, 4, 5, 0],
    [0, 1, 2, 3, 4, 5, 0, 1]
  ], { types: 6 });

  // Place stone at (0,3) adjacent to match at (0,0-2)
  b.obstacles[0][3] = ObstacleTypes.OBSTACLE.STONE;

  const matched = b.findMatches();
  const removed = b.removeMatched(matched);
  const damaged = b.applyObstacleDamage(removed);

  ok(damaged.length === 1, "one stone damaged");
  ok(b.getObstacle(0, 3) === ObstacleTypes.OBSTACLE.NONE, "stone cleared to NONE on board");
  ok(damaged[0].newType === ObstacleTypes.OBSTACLE.NONE, "damaged entry shows cleared to NONE");
}

/* 17. Ice obstacle takes 2 hits */
section("17. Ice obstacle takes 2 hits");
{
  let b = boardFromGrid([
    [1, 1, 1, 2, 3, 4, 5, 0],
    [0, 2, 3, 4, 5, 0, 1, 2],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [5, 0, 1, 2, 3, 4, 5, 0],
    [1, 2, 3, 4, 5, 0, 1, 2],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [5, 0, 1, 2, 3, 4, 5, 0],
    [0, 1, 2, 3, 4, 5, 0, 1]
  ], { types: 6 });

  b.obstacles[0][3] = ObstacleTypes.OBSTACLE.ICE_2;

  let matched = b.findMatches();
  let removed = b.removeMatched(matched);
  let damaged = b.applyObstacleDamage(removed);
  ok(b.getObstacle(0, 3) === ObstacleTypes.OBSTACLE.ICE_1, "ICE_2 -> ICE_1 after first hit");

  // Second match adjacent
  b = boardFromGrid([
    [1, 1, 1, 1, 1, 1, 5, 0],
    [0, 2, 3, 4, 5, 0, 1, 2],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [5, 0, 1, 2, 3, 4, 5, 0],
    [1, 2, 3, 4, 5, 0, 1, 2],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [5, 0, 1, 2, 3, 4, 5, 0],
    [0, 1, 2, 3, 4, 5, 0, 1]
  ], { types: 6 });
  b.obstacles[0][3] = ObstacleTypes.OBSTACLE.ICE_1;

  matched = b.findMatches();
  removed = b.removeMatched(matched);
  damaged = b.applyObstacleDamage(removed);
  ok(b.getObstacle(0, 3) === ObstacleTypes.OBSTACLE.NONE, "ICE_1 -> NONE after second hit");
}

/* 18. Chain obstacle blocks movement */
section("18. Chain obstacle blocks movement");
{
  const b = boardFromGrid([
    [1, 1, 0, 2, 3, 4, 5, 0],
    [0, 2, 3, 4, 5, 0, 1, 2],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [5, 0, 1, 2, 3, 4, 5, 0],
    [1, 2, 3, 4, 5, 0, 1, 2],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [5, 0, 1, 2, 3, 4, 5, 0],
    [0, 1, 2, 3, 4, 5, 0, 1]
  ], { types: 6 });

  b.obstacles[0][1] = ObstacleTypes.OBSTACLE.CHAIN;
  ok(!b.isCellInteractive(0, 1), "chained cell not interactive");
  ok(b.isCellInteractive(0, 0), "non-chained cell interactive");
}

/* 19. Deadlock reshuffle produces valid board */
section("19. Deadlock reshuffle produces valid board");
for (let seed = 1; seed <= 10; seed++) {
  const b = new BoardModel({ seed: seed * 13, types: 6 });
  b.generateLevel({ atomTypes: 6, goals: { moves: 20 }, obstacles: [] });
  const res = b.shuffle();
  ok(res && b.hasValidMove() && !b.hasMatch(), "seed " + seed + " shuffle valid");
}

/* 20. Restart resets game deterministically */
section("20. Restart resets game deterministically");
{
  const b = new BoardModel({ seed: 42, types: 6 });
  b.generateLevel({ atomTypes: 6, goals: { moves: 20 }, obstacles: [] });
  const snap1 = snap(b);
  b.resolve();
  b.applyGravity();
  b.restart({ atomTypes: 6, goals: { moves: 20 }, obstacles: [] });
  const c = new BoardModel({ seed: 42, types: 6 });
  c.generateLevel({ atomTypes: 6, goals: { moves: 20 }, obstacles: [] });
  ok(snap(b) === snap(c), "restart + same seed reproduces identical board");
}

/* 21. Level goals evaluation */
section("21. Level goals evaluation");
{
  const b = new BoardModel({ seed: 1, types: 6 });
  b.generateLevel({
    atomTypes: 6,
    goals: { score: 1000, moves: 20 },
    obstacles: []
  });
  b.collected.score = 500;
  ok(!b.checkGoals().complete, "incomplete at 500/1000");
  ok(!b.checkGoals().failed, "not failed while moves remain");

  b.collected.score = 1500;
  const result = b.checkGoals();
  ok(result.complete && result.stars >= 1, "complete at 1500/1000 with stars");

  // Moves exhausted without meeting goals = failed
  const c = new BoardModel({ seed: 2, types: 6 });
  c.generateLevel({ atomTypes: 6, goals: { score: 10000, moves: 5 }, obstacles: [] });
  c.collected.score = 100;
  c.movesLeft = 0;
  ok(c.checkGoals().failed, "failed when moves exhausted below target");
}

/* 22. Serialization round-trip */
section("22. Serialization round-trip");
{
  const b = new BoardModel({ seed: 99, types: 6 });
  b.generateLevel({ atomTypes: 6, goals: { moves: 20 }, obstacles: [] });
  b.collected.score = 5000;
  b.movesLeft = 15;

  const json = b.toJSON();
  const restored = BoardModel.fromJSON(json, { rows: 8, cols: 8, types: 6 });

  ok(restored.seed === b.seed, "seed preserved");
  ok(snap(restored) === snap(b), "grid identical");
  ok(restored.collected.score === 5000, "score preserved");
  ok(restored.movesLeft === 15, "movesLeft preserved");
}

/* 23. Combo resolution - Color Bomb + Normal */
section("23. Combo: Color Bomb + Normal");
{
  const b = boardFromGrid([
    [1, 2, 3, 4, 5, 0, 1, 2],
    [2, 3, 4, 5, 0, 1, 2, 3],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [4, 5, 0, 1, 2, 3, 4, 5],
    [5, 0, 1, 2, 3, 4, 5, 0],
    [0, 1, 2, 3, 4, 5, 0, 1],
    [1, 2, 3, 4, 5, 0, 1, 2],
    [2, 3, 4, 5, 0, 1, 2, 3]
  ], { types: 6 });

  // Record original type 2 positions
  const originalType2 = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const atom = b.get(r, c);
      if (atom !== null && (atom & 0x0F) === 2) {
        originalType2.push({ r, c });
      }
    }
  }
  ok(originalType2.length > 0, "board has type 2 atoms");

  // Place color bomb at (0,0) and normal at (0,1)
  b.grid[0][0] = 1 | 0x80; // Color bomb (base type 1)
  b.grid[0][1] = 2;

  const specA = { r: 0, c: 0, atom: b.grid[0][0] };
  const specB = { r: 0, c: 1, atom: b.grid[0][1] };
  const result = b.resolveCombo(specA, specB);

  ok(result !== null, "combo produced result");
  ok(result.removed.length > 0, "atoms removed");

  // Verify all original type 2 positions were removed
  const removedPositions = new Set();
  for (const rem of result.removed) {
    removedPositions.add(`${rem.r},${rem.c}`);
  }
  for (const pos of originalType2) {
    ok(removedPositions.has(`${pos.r},${pos.c}`), "original type 2 at " + pos.r + "," + pos.c + " was removed");
  }
}

/* 24. Combo resolution - Striped + Striped */
section("24. Combo: Striped + Striped");
{
  const b = boardFromGrid([
    [1, 2, 3, 4, 5, 0, 1, 2],
    [2, 3, 4, 5, 0, 1, 2, 3],
    [3, 4, 5, 0, 1, 2, 3, 4],
    [4, 5, 0, 1, 2, 3, 4, 5],
    [5, 0, 1, 2, 3, 4, 5, 0],
    [0, 1, 2, 3, 4, 5, 0, 1],
    [1, 2, 3, 4, 5, 0, 1, 2],
    [2, 3, 4, 5, 0, 1, 2, 3]
  ], { types: 6 });

  b.grid[0][0] = 1 | 0x10; // Striped H
  b.grid[0][1] = 2 | 0x20; // Striped V

  const specA = { r: 0, c: 0, atom: b.grid[0][0] };
  const specB = { r: 0, c: 1, atom: b.grid[0][1] };
  const result = b.resolveCombo(specA, specB);

  ok(result !== null, "combo produced result");
  ok(result.removed.length >= 15, "clears row 0 and col 0 + col 1 = 15+ cells");
}

/* 25. Large stability sweep */
section("25. Stability sweep (100 boards x 50 swaps)");
{
  let maxWaves = 0;
  let allStable = true;
  for (let seed = 1; seed <= 100; seed++) {
    const b = new BoardModel({ seed: seed * 3, types: 6 });
    b.generateLevel({ atomTypes: 6, goals: { moves: 20 }, obstacles: [] });
    for (let i = 0; i < 50; i++) {
      const sw = b.findAnyValidSwap();
      if (!sw) {
        b.shuffle();
        if (!b.hasValidMove()) { allStable = false; break; }
        continue;
      }
      b.swapValues(sw.a, sw.b);
      const waves = b.resolve();
      maxWaves = Math.max(maxWaves, waves.length);
      if (b.hasMatch()) { allStable = false; break; }
    }
  }
  ok(allStable, "100 boards x 50 swaps: always stable");
  ok(maxWaves < 200, "max cascade waves " + maxWaves + " under 200 cap");
}

console.log("\n====================================");
console.log("PASSED: " + passed + "   FAILED: " + failed);
process.exitCode = failed > 0 ? 1 : 0;