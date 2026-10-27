/* =========================================================
   Atom Smasher — Obstacle Types & Behaviors
   Pure data, no Phaser dependencies.
   ========================================================= */
(function (root, factory) {
  const ObstacleTypes = factory();
  if (typeof module === "object" && module.exports) module.exports = ObstacleTypes;
  root.ObstacleTypes = ObstacleTypes;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  const OBSTACLE = {
    NONE: 0,
    STONE: 1,      // Immutable block, destroyed by adjacent match (1 hit)
    ICE_1: 2,      // Cracked ice (1 hit remaining)
    ICE_2: 3,      // Solid ice (2 hits remaining)
    CHAIN: 4       // Locks atom, broken by matching the chained atom
  };

  const OBSTACLE_DEFS = {
    [OBSTACLE.NONE]: {
      id: OBSTACLE.NONE,
      name: "NONE",
      blocksMovement: false,
      blocksFall: false,
      hitsToClear: 0,
      clearedByMatch: false,
      clearedByAdjacent: false,
      color: null,
      neonColor: null
    },
    [OBSTACLE.STONE]: {
      id: OBSTACLE.STONE,
      name: "STONE",
      blocksMovement: true,
      blocksFall: true,
      hitsToClear: 1,
      clearedByMatch: false,      // Can't be matched directly
      clearedByAdjacent: true,    // Destroyed when adjacent atom matches
      color: "#2a2a3a",
      neonColor: "#555577",
      shape: "rounded_rect",
      particleColor: "#8888aa"
    },
    [OBSTACLE.ICE_1]: {
      id: OBSTACLE.ICE_1,
      name: "ICE_CRACKED",
      blocksMovement: false,      // Atom can move, but ice remains
      blocksFall: false,
      hitsToClear: 1,
      clearedByMatch: true,       // Cleared when atom above matches
      clearedByAdjacent: true,    // Also damaged by adjacent matches
      color: "#44aaff",
      neonColor: "#88ccff",
      shape: "cracked_ice",
      particleColor: "#88ddff"
    },
    [OBSTACLE.ICE_2]: {
      id: OBSTACLE.ICE_2,
      name: "ICE_SOLID",
      blocksMovement: false,
      blocksFall: false,
      hitsToClear: 2,
      clearedByMatch: true,
      clearedByAdjacent: true,
      color: "#2288cc",
      neonColor: "#66aaff",
      shape: "solid_ice",
      particleColor: "#66bbff"
    },
    [OBSTACLE.CHAIN]: {
      id: OBSTACLE.CHAIN,
      name: "CHAIN",
      blocksMovement: true,       // Chained atom cannot swap
      blocksFall: true,           // Chained atom doesn't fall
      hitsToClear: 1,
      clearedByMatch: true,       // Broken when the chained atom is matched
      clearedByAdjacent: false,
      color: "#666666",
      neonColor: "#aaaaaa",
      shape: "chain_links",
      particleColor: "#cccccc"
    }
  };

  // Visual layering: obstacles render ON TOP of atoms (except CHAIN which wraps atom)
  const RENDER_LAYER = {
    [OBSTACLE.STONE]: "above",    // Full cell coverage
    [OBSTACLE.ICE_1]: "above",    // Semi-transparent overlay
    [OBSTACLE.ICE_2]: "above",    // More opaque overlay
    [OBSTACLE.CHAIN]: "overlay"   // Decorative overlay on atom
  };

  function getDef(id) {
    return OBSTACLE_DEFS[id] || OBSTACLE_DEFS[OBSTACLE.NONE];
  }

  function blocksMovement(id) {
    return getDef(id).blocksMovement;
  }

  function blocksFall(id) {
    return getDef(id).blocksFall;
  }

  function getRenderLayer(id) {
    return RENDER_LAYER[id] || "none";
  }

  function applyDamage(boardModel, r, c, source) {
    const current = boardModel.getObstacle(r, c);
    if (current === OBSTACLE.NONE) return false;

    const def = getDef(current);
    if (!def.clearedByMatch && !def.clearedByAdjacent) return false;

    let newObstacle = current;
    let cleared = false;

    if (current === OBSTACLE.STONE && (source === "adjacent" || source === "special")) {
      newObstacle = OBSTACLE.NONE;
      cleared = true;
    } else if (current === OBSTACLE.ICE_2) {
      newObstacle = OBSTACLE.ICE_1;
    } else if (current === OBSTACLE.ICE_1) {
      newObstacle = OBSTACLE.NONE;
      cleared = true;
    } else if (current === OBSTACLE.CHAIN && source === "match") {
      newObstacle = OBSTACLE.NONE;
      cleared = true;
    }

    if (newObstacle !== current) {
      boardModel.setObstacle(r, c, newObstacle);
      if (cleared) boardModel.collected.obstaclesCleared++;
      return true;
    }
    return false;
  }

  // Export
  return {
    OBSTACLE,
    OBSTACLE_DEFS,
    RENDER_LAYER,
    getDef,
    blocksMovement,
    blocksFall,
    getRenderLayer,
    applyDamage
  };
});