/* =========================================================
   Atom Smasher — Atom Types & Neon Visual Definitions
   Pure data, no Phaser dependencies.
   ========================================================= */
(function (root, factory) {
  const AtomTypes = factory();
  if (typeof module === "object" && module.exports) module.exports = AtomTypes;
  root.AtomTypes = AtomTypes;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  // Base atom types (0-5)
  const BASE_ATOMS = [
    {
      id: 0,
      name: "HYDROGEN",
      symbol: "H",
      baseColor: "#00d4ff",      // Cyan
      neonColor: "#00ffff",      // Bright cyan outline
      glowColor: "#00ffff44",    // Glow rgba
      shape: "circle",
      particleColor: "#00ffff"
    },
    {
      id: 1,
      name: "HELIUM",
      symbol: "He",
      baseColor: "#ffd60a",      // Gold
      neonColor: "#ffff00",      // Bright yellow outline
      glowColor: "#ffff0044",
      shape: "hexagon",
      particleColor: "#ffff00"
    },
    {
      id: 2,
      name: "CARBON",
      symbol: "C",
      baseColor: "#ff1a7b",      // Magenta
      neonColor: "#ff00ff",      // Bright magenta outline
      glowColor: "#ff00ff44",
      shape: "square",
      particleColor: "#ff00ff"
    },
    {
      id: 3,
      name: "OXYGEN",
      symbol: "O",
      baseColor: "#00ff88",      // Emerald
      neonColor: "#00ff00",      // Bright green outline
      glowColor: "#00ff0044",
      shape: "triangle",
      particleColor: "#00ff00"
    },
    {
      id: 4,
      name: "NITROGEN",
      symbol: "N",
      baseColor: "#a855f7",      // Violet
      neonColor: "#bc8aff",      // Bright violet outline
      glowColor: "#bc8aff44",
      shape: "diamond",
      particleColor: "#bc8aff"
    },
    {
      id: 5,
      name: "URANIUM",
      symbol: "U",
      baseColor: "#ff6b35",      // Orange
      neonColor: "#ffaa00",      // Bright orange outline
      glowColor: "#ffaa0044",
      shape: "ring",
      particleColor: "#ffaa00"
    }
  ];

  // Special atom visual overlays
  const SPECIAL_VISUALS = {
    STRIPED_H: {
      name: "STRIPED_HORIZONTAL",
      description: "Clears entire row",
      overlay: "horizontal_stripes",
      pulseColor: "#ffffff"
    },
    STRIPED_V: {
      name: "STRIPED_VERTICAL",
      description: "Clears entire column",
      overlay: "vertical_stripes",
      pulseColor: "#ffffff"
    },
    WRAPPED: {
      name: "WRAPPED",
      description: "Clears 3x3 area",
      overlay: "swirl",
      pulseColor: "#ffff00"
    },
    COLOR_BOMB: {
      name: "COLOR_BOMB",
      description: "Clears all of one color",
      overlay: "prism",
      pulseColor: "#ffffff"
    },
    MEGA: {
      name: "MEGA_ATOM",
      description: "Clears entire board",
      overlay: "star",
      pulseColor: "#ff00ff"
    }
  };

  // Shape vertex generators (for procedural texture creation)
  const SHAPE_GENERATORS = {
    circle: (cx, cy, r) => {
      const pts = [];
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
      return pts;
    },
    hexagon: (cx, cy, r) => {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
      return pts;
    },
    square: (cx, cy, r) => {
      return [
        { x: cx - r, y: cy - r },
        { x: cx + r, y: cy - r },
        { x: cx + r, y: cy + r },
        { x: cx - r, y: cy + r }
      ];
    },
    triangle: (cx, cy, r) => {
      return [
        { x: cx, y: cy - r * 1.15 },
        { x: cx + r, y: cy + r * 0.58 },
        { x: cx - r, y: cy + r * 0.58 }
      ];
    },
    diamond: (cx, cy, r) => {
      return [
        { x: cx, y: cy - r },
        { x: cx + r, y: cy },
        { x: cx, y: cy + r },
        { x: cx - r, y: cy }
      ];
    },
    ring: (cx, cy, r) => {
      // Outer circle
      const outer = [];
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        outer.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
      // Inner circle (hole)
      const innerR = r * 0.55;
      const inner = [];
      for (let i = 31; i >= 0; i--) {
        const a = (i / 32) * Math.PI * 2;
        inner.push({ x: cx + Math.cos(a) * innerR, y: cy + Math.sin(a) * innerR });
      }
      return { outer, inner, isRing: true };
    }
  };

  // Neon outline animation config
  const NEON_CONFIG = {
    pulseSpeed: 2.0,        // cycles per second
    pulseIntensity: 0.4,    // alpha variation
    outlineWidth: 3,        // px at design resolution
    glowBlur: 8,            // px
    particleLife: 400,      // ms
    particleCount: 16
  };

  // Helper: get atom by ID
  function getAtom(id) {
    return BASE_ATOMS.find(a => a.id === id) || BASE_ATOMS[0];
  }

  // Helper: get atom by name
  function getAtomByName(name) {
    return BASE_ATOMS.find(a => a.name === name.toUpperCase()) || BASE_ATOMS[0];
  }

  // Helper: get shape generator
  function getShapeGenerator(shapeName) {
    return SHAPE_GENERATORS[shapeName] || SHAPE_GENERATORS.circle;
  }

  // Helper: get special visual
  function getSpecialVisual(type) {
    return SPECIAL_VISUALS[type] || null;
  }

  // Color utilities
  function hexToPhaserColor(hex) {
    return Phaser.Display.Color.HexStringToColor(hex).color;
  }

  function hexToRGBA(hex, alpha) {
    const c = Phaser.Display.Color.HexStringToColor(hex);
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
  }

  // Export
  return {
    BASE_ATOMS,
    SPECIAL_VISUALS,
    SHAPE_GENERATORS,
    NEON_CONFIG,
    getAtom,
    getAtomByName,
    getShapeGenerator,
    getSpecialVisual,
    hexToPhaserColor,
    hexToRGBA,
    COUNT: BASE_ATOMS.length
  };
});