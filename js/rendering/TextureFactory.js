/* =========================================================
   Atom Smasher — Enhanced Texture Factory (Production Quality)
   Generates glossy neon sprites at runtime — no external assets needed.
   Supports optional asset override via AssetManifest.
   ========================================================= */
(function (root, factory) {
  const TextureFactory = factory();
  if (typeof module === "object" && module.exports) module.exports = TextureFactory;
  root.TextureFactory = TextureFactory;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  // Design resolution
  const CELL_SIZE = 82;
  const ATOM_RADIUS = 32;
  const OUTLINE_WIDTH = 3;

  class TextureFactory {
    constructor(scene, assetManifest = null) {
      this.scene = scene;
      this.assetManifest = assetManifest;
      this.generated = new Set();
    }

    // Generate all textures needed for the game
    generateAll(AtomTypes, ObstacleTypes) {
      // Base atoms (0-5)
      for (let i = 0; i < AtomTypes.COUNT; i++) {
        this.generateAtomTexture(i, AtomTypes);
      }

      // Special atom overlays
      this.generateSpecialOverlays(AtomTypes);

      // Obstacle textures
      this.generateObstacleTextures(ObstacleTypes);

      // Cell background
      this.generateCellBackground();

      // Particle texture (simple circle with gradient)
      this.generateParticleTexture();

      // UI textures
      this.generateUITextures();

      // Combo text textures
      this.generateComboTextures();

      return this;
    }

    // Try to load from asset manifest first
    async tryLoadAsset(key) {
      if (!this.assetManifest) return false;
      const url = this.assetManifest.getUrl(key);
      if (!url) return false;
      try {
        await this.scene.load.image(key, url);
        return true;
      } catch (e) {
        return false;
      }
    }

    // ---- Base Atom Texture (Glossy Neon) ----
    generateAtomTexture(typeIndex, AtomTypes) {
      const key = `atom_${typeIndex}`;
      if (this.generated.has(key)) return;
      // External assets loaded via ?assets=1 take precedence
      if (this.scene.textures.exists(key)) {
        this.generated.add(key);
        return;
      }
      this.generated.add(key);

      const atom = AtomTypes.getAtom(typeIndex);
      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });

      const cx = CELL_SIZE / 2;
      const cy = CELL_SIZE / 2;
      const r = ATOM_RADIUS;

      // 1. Cell background (dark rounded rect with subtle inner glow)
      g.fillStyle(0x0a1626, 1);
      g.fillRoundedRect(2, 2, CELL_SIZE - 4, CELL_SIZE - 4, 10);
      // Inner edge highlight
      g.lineStyle(1, 0x1a3a5c, 0.6);
      g.strokeRoundedRect(3, 3, CELL_SIZE - 6, CELL_SIZE - 6, 9);

      // 2. Atom body shape with multi-layer gradient
      const bodyColor = Phaser.Display.Color.HexStringToColor(atom.baseColor).color;
      const neonColor = Phaser.Display.Color.HexStringToColor(atom.neonColor).color;
      const glowColor = Phaser.Display.Color.HexStringToColor(atom.glowColor || atom.neonColor).color;

      const shapeGen = AtomTypes.getShapeGenerator(atom.shape);

      // Outer glow layer (larger, transparent)
      g.fillStyle(glowColor, 0.18);
      const outerShape = shapeGen(cx, cy, r * 1.15);
      if (atom.shape === "ring") {
        g.fillPoints(outerShape.outer, true);
      } else {
        g.fillPoints(outerShape, true);
      }

      // Main body
      g.fillStyle(bodyColor, 1);
      const mainShape = shapeGen(cx, cy, r * 0.85);
      if (atom.shape === "ring") {
        g.fillPoints(mainShape.outer, true);
        // Inner hole
        g.fillStyle(0x0a1626, 1);
        g.fillPoints(mainShape.inner, true);
      } else {
        g.fillPoints(mainShape, true);
      }

      // Inner highlight (top-left curved shine)
      g.fillStyle(0xffffff, 0.35);
      const highlightShape = shapeGen(cx - r * 0.18, cy - r * 0.18, r * 0.42);
      if (atom.shape !== "ring") {
        g.fillPoints(highlightShape, true);
      } else {
        g.fillCircle(cx - r * 0.25, cy - r * 0.25, r * 0.35);
      }

      // Core glow (bright center)
      g.fillStyle(neonColor, 0.45);
      g.fillCircle(cx, cy, r * 0.32);

      // Neon outline (animated at runtime, but bake base here)
      g.lineStyle(OUTLINE_WIDTH, neonColor, 1);
      if (atom.shape === "ring") {
        g.strokePoints(mainShape.outer, true);
        g.strokePoints(mainShape.inner, true);
      } else {
        g.strokePoints(mainShape, true);
      }

      // Subtle specular dot
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(cx - r * 0.3, cy - r * 0.3, r * 0.1);

      g.generateTexture(key, CELL_SIZE, CELL_SIZE);
      g.destroy();
    }

    // ---- Special Atom Overlays ----
    generateSpecialOverlays(AtomTypes) {
      const specials = [
        { key: "special_striped_h", draw: (g, cx, cy, r, color) => this.drawStripedHorizontal(g, cx, cy, r, color) },
        { key: "special_striped_v", draw: (g, cx, cy, r, color) => this.drawStripedVertical(g, cx, cy, r, color) },
        { key: "special_wrapped", draw: (g, cx, cy, r, color) => this.drawWrapped(g, cx, cy, r, color) },
        { key: "special_color_bomb", draw: (g, cx, cy, r, color) => this.drawColorBomb(g, cx, cy, r, color) },
        { key: "special_mega", draw: (g, cx, cy, r, color) => this.drawMega(g, cx, cy, r, color) }
      ];

      for (const spec of specials) {
        if (this.generated.has(spec.key)) continue;
        this.generated.add(spec.key);

        const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
        const cx = CELL_SIZE / 2, cy = CELL_SIZE / 2, r = ATOM_RADIUS;
        const color = 0xffffff;

        spec.draw(g, cx, cy, r, color);
        g.generateTexture(spec.key, CELL_SIZE, CELL_SIZE);
        g.destroy();
      }
    }

    drawStripedHorizontal(g, cx, cy, r, color) {
      // Glowing horizontal stripes with arrow ends
      g.lineStyle(4, color, 0.95);
      const stripes = 5;
      const spacing = (r * 2) / (stripes + 1);
      for (let i = 1; i <= stripes; i++) {
        const y = cy - r + i * spacing;
        g.beginPath();
        g.moveTo(cx - r * 0.9, y);
        g.lineTo(cx + r * 0.9, y);
        g.strokePath();
      }
      // Arrow indicators on sides (glowing)
      g.fillStyle(color, 0.95);
      g.beginPath();
      g.moveTo(cx - r - 4, cy);
      g.lineTo(cx - r + 8, cy - 7);
      g.lineTo(cx - r + 8, cy + 7);
      g.fillPath();
      g.beginPath();
      g.moveTo(cx + r + 4, cy);
      g.lineTo(cx + r - 8, cy - 7);
      g.lineTo(cx + r - 8, cy + 7);
      g.fillPath();
      // Center pulse ring
      g.lineStyle(2, color, 0.5);
      g.strokeCircle(cx, cy, r * 0.2);
    }

    drawStripedVertical(g, cx, cy, r, color) {
      g.lineStyle(4, color, 0.95);
      const stripes = 5;
      const spacing = (r * 2) / (stripes + 1);
      for (let i = 1; i <= stripes; i++) {
        const x = cx - r + i * spacing;
        g.beginPath();
        g.moveTo(x, cy - r * 0.9);
        g.lineTo(x, cy + r * 0.9);
        g.strokePath();
      }
      // Arrow indicators on top/bottom
      g.fillStyle(color, 0.95);
      g.beginPath();
      g.moveTo(cx, cy - r - 4);
      g.lineTo(cx - 7, cy - r + 8);
      g.lineTo(cx + 7, cy - r + 8);
      g.fillPath();
      g.beginPath();
      g.moveTo(cx, cy + r + 4);
      g.lineTo(cx - 7, cy + r - 8);
      g.lineTo(cx + 7, cy + r - 8);
      g.fillPath();
      // Center pulse ring
      g.lineStyle(2, color, 0.5);
      g.strokeCircle(cx, cy, r * 0.2);
    }

    drawWrapped(g, cx, cy, r, color) {
      // Dual swirl pattern with glow
      g.lineStyle(3, color, 0.85);
      for (let loop = 0; loop < 2; loop++) {
        g.beginPath();
        for (let i = 0; i <= 48; i++) {
          const a = (i / 48) * Math.PI * 4 + loop * Math.PI;
          const radius = (r * 0.75) * (1 - i / 48) * 0.6 + r * 0.12;
          const x = cx + Math.cos(a) * radius;
          const y = cy + Math.sin(a) * radius;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.strokePath();
      }
      // Outer ring
      g.lineStyle(2, color, 0.4);
      g.strokeCircle(cx, cy, r * 0.85);
      // Center pulse
      g.fillStyle(color, 0.7);
      g.fillCircle(cx, cy, 7);
      // Four corner indicators
      g.fillStyle(color, 0.5);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        g.fillCircle(cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7, 3);
      }
    }

    drawColorBomb(g, cx, cy, r, color) {
      // Faceted prism with inner glow
      const facets = 8;
      g.lineStyle(2, color, 0.9);
      g.fillStyle(color, 0.12);

      for (let ring = 0; ring < 3; ring++) {
        const rr = r * (0.8 - ring * 0.22);
        g.beginPath();
        for (let i = 0; i <= facets; i++) {
          const a = (i / facets) * Math.PI * 2 - Math.PI / facets;
          const x = cx + Math.cos(a) * rr;
          const y = cy + Math.sin(a) * rr;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        if (ring === 0) g.fillPath();
        g.strokePath();
      }
      // Center sparkle
      g.fillStyle(color, 1);
      g.fillCircle(cx, cy, 5);
      // Four corner sparkles
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        g.fillCircle(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62, 2.5);
      }
      // Rotating indicator dots
      g.fillStyle(color, 0.6);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        g.fillCircle(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9, 2);
      }
    }

    drawMega(g, cx, cy, r, color) {
      // Pulsing star with orbiting particles
      const spikes = 8;
      const outerR = r * 0.88;
      const innerR = r * 0.32;

      g.fillStyle(color, 0.18);
      g.lineStyle(2.5, color, 0.95);

      g.beginPath();
      for (let i = 0; i <= spikes * 2; i++) {
        const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
        const rad = (i % 2 === 0) ? outerR : innerR;
        const x = cx + Math.cos(a) * rad;
        const y = cy + Math.sin(a) * rad;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.fillPath();
      g.strokePath();

      // Inner glow rings
      g.fillStyle(color, 0.4);
      g.fillCircle(cx, cy, innerR * 0.7);
      g.lineStyle(1, color, 0.3);
      g.strokeCircle(cx, cy, innerR);

      // Orbiting indicator dots (4)
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const orbitR = outerR * 1.15;
        g.fillStyle(color, 0.75);
        g.fillCircle(cx + Math.cos(a) * orbitR, cy + Math.sin(a) * orbitR, 3.5);
      }
      // Crosshair center
      g.lineStyle(1.5, color, 0.5);
      g.beginPath();
      g.moveTo(cx - 10, cy); g.lineTo(cx + 10, cy);
      g.moveTo(cx, cy - 10); g.lineTo(cx, cy + 10);
      g.strokePath();
    }

    // ---- Obstacle Textures ----
    generateObstacleTextures(ObstacleTypes) {
      const obstacles = [
        { id: ObstacleTypes.OBSTACLE.STONE, key: "obstacle_stone", draw: (g) => this.drawStone(g) },
        { id: ObstacleTypes.OBSTACLE.ICE_1, key: "obstacle_ice_1", draw: (g) => this.drawIce(g, false) },
        { id: ObstacleTypes.OBSTACLE.ICE_2, key: "obstacle_ice_2", draw: (g) => this.drawIce(g, true) },
        { id: ObstacleTypes.OBSTACLE.CHAIN, key: "obstacle_chain", draw: (g) => this.drawChain(g) }
      ];

      for (const obs of obstacles) {
        if (this.generated.has(obs.key)) continue;
        this.generated.add(obs.key);

        const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
        obs.draw(g);
        g.generateTexture(obs.key, CELL_SIZE, CELL_SIZE);
        g.destroy();
      }
    }

    drawStone(g) {
      const cx = CELL_SIZE / 2, cy = CELL_SIZE / 2, r = CELL_SIZE / 2 - 4;
      // Base dark stone with texture
      g.fillStyle(0x1a1a2e, 1);
      g.fillRoundedRect(4, 4, CELL_SIZE - 8, CELL_SIZE - 8, 12);
      // Stratified lines
      g.lineStyle(1, 0x2a2a4a, 0.5);
      for (let i = 0; i < 10; i++) {
        const y = 8 + i * 7;
        g.beginPath();
        g.moveTo(10, y);
        g.lineTo(CELL_SIZE - 10, y);
        g.strokePath();
      }
      // Major cracks
      g.lineStyle(2.5, 0x3a3a5a, 0.9);
      g.beginPath();
      g.moveTo(cx - 18, cy - 22);
      g.lineTo(cx + 12, cy + 2);
      g.lineTo(cx - 6, cy + 22);
      g.strokePath();
      // Secondary crack
      g.lineStyle(1.5, 0x3a3a5a, 0.6);
      g.beginPath();
      g.moveTo(cx + 10, cy - 15);
      g.lineTo(cx - 8, cy + 18);
      g.strokePath();
      // Neon edge highlight
      g.lineStyle(2, 0x555577, 0.5);
      g.strokeRoundedRect(4, 4, CELL_SIZE - 8, CELL_SIZE - 8, 12);
      // Top edge highlight
      g.fillStyle(0x3a3a5a, 0.3);
      g.fillRoundedRect(6, 6, CELL_SIZE - 12, 6, 8);
    }

    drawIce(g, isSolid) {
      const cx = CELL_SIZE / 2, cy = CELL_SIZE / 2, r = CELL_SIZE / 2 - 4;
      const alpha = isSolid ? 0.75 : 0.45;
      const neonAlpha = isSolid ? 0.55 : 0.35;

      // Ice base with gradient simulation
      g.fillStyle(0x44aaff, alpha);
      g.fillRoundedRect(4, 4, CELL_SIZE - 8, CELL_SIZE - 8, 10);

      // Crystalline facets
      g.lineStyle(1.5, 0x88ccff, neonAlpha);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x1 = cx + Math.cos(angle) * r * 0.25;
        const y1 = cy + Math.sin(angle) * r * 0.25;
        const x2 = cx + Math.cos(angle) * r * 0.92;
        const y2 = cy + Math.sin(angle) * r * 0.92;
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.strokePath();
      }

      // Concentric rings
      g.lineStyle(1, 0x88ccff, neonAlpha * 0.6);
      g.strokeCircle(cx, cy, r * 0.5);
      g.strokeCircle(cx, cy, r * 0.75);

      // Cracks for ICE_1 (cracked)
      if (!isSolid) {
        g.lineStyle(2.5, 0x66aaff, 0.85);
        g.beginPath();
        g.moveTo(cx - 22, cy - 12);
        g.lineTo(cx + 18, cy + 6);
        g.strokePath();
        g.beginPath();
        g.moveTo(cx + 12, cy - 18);
        g.lineTo(cx - 12, cy + 18);
        g.strokePath();
        // Small fracture
        g.lineStyle(1.5, 0x66aaff, 0.6);
        g.beginPath();
        g.moveTo(cx - 5, cy - 5);
        g.lineTo(cx + 8, cy - 12);
        g.strokePath();
      }

      // Neon border
      g.lineStyle(2, 0x88ccff, neonAlpha);
      g.strokeRoundedRect(4, 4, CELL_SIZE - 8, CELL_SIZE - 8, 10);

      // Top highlight (reflection)
      g.fillStyle(0xffffff, isSolid ? 0.18 : 0.1);
      g.fillRoundedRect(6, 6, CELL_SIZE - 12, 10, 8);
    }

    drawChain(g) {
      const cx = CELL_SIZE / 2, cy = CELL_SIZE / 2;
      const linkW = 20, linkH = 13;
      const cols = 3, rows = 3;

      // Shadow layer
      g.fillStyle(0x000000, 0.25);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = cx - (cols - 1) * linkW / 2 + col * linkW + 1;
          const y = cy - (rows - 1) * linkH / 2 + row * linkH + 1;
          g.fillRoundedRect(x - linkW / 2, y - linkH / 2, linkW, linkH, 6);
        }
      }

      // Chain links
      g.lineStyle(3.5, 0xaaaaaa, 0.95);
      g.fillStyle(0xdddddd, 0.4);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = cx - (cols - 1) * linkW / 2 + col * linkW;
          const y = cy - (rows - 1) * linkH / 2 + row * linkH;
          g.strokeRoundedRect(x - linkW / 2, y - linkH / 2, linkW, linkH, 7);
          g.fillRoundedRect(x - linkW / 2, y - linkH / 2, linkW, linkH, 7);
        }
      }

      // Vertical connectors
      g.lineStyle(2.5, 0xaaaaaa, 0.7);
      for (let col = 0; col < cols; col++) {
        const x = cx - (cols - 1) * linkW / 2 + col * linkW;
        for (let row = 0; row < rows - 1; row++) {
          const y1 = cy - (rows - 1) * linkH / 2 + row * linkH + linkH / 2;
          const y2 = y1 + linkH / 2;
          g.beginPath();
          g.moveTo(x, y1);
          g.lineTo(x, y2);
          g.strokePath();
        }
      }

      // Highlights on links
      g.fillStyle(0xffffff, 0.15);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = cx - (cols - 1) * linkW / 2 + col * linkW;
          const y = cy - (rows - 1) * linkH / 2 + row * linkH;
          g.fillRoundedRect(x - linkW / 2 + 2, y - linkH / 2 + 2, linkW - 4, 4, 4);
        }
      }
    }

    // ---- Cell Background ----
    generateCellBackground() {
      const key = "cell_bg";
      if (this.generated.has(key)) return;
      this.generated.add(key);

      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      // Dark rounded rect with subtle border and inner glow
      g.fillStyle(0x0b1a2e, 1);
      g.fillRoundedRect(2, 2, CELL_SIZE - 4, CELL_SIZE - 4, 10);
      g.lineStyle(1, 0x143a5c, 1);
      g.strokeRoundedRect(2, 2, CELL_SIZE - 4, CELL_SIZE - 4, 10);
      // Inner top highlight
      g.fillStyle(0x1a3a5c, 0.3);
      g.fillRoundedRect(4, 4, CELL_SIZE - 8, 6, 8);
      g.generateTexture(key, CELL_SIZE, CELL_SIZE);
      g.destroy();
    }

    // ---- Particle Texture (with radial gradient) ----
    generateParticleTexture() {
      const key = "particle";
      if (this.generated.has(key)) return;
      this.generated.add(key);

      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      const size = 32;
      const cx = size / 2;
      // Radial gradient simulation: multiple circles
      for (let i = 0; i < 4; i++) {
        const alpha = 1 - i * 0.22;
        const radius = (size / 2) * (1 - i * 0.18);
        g.fillStyle(0xffffff, alpha);
        g.fillCircle(cx, cx, radius);
      }
      g.generateTexture(key, size, size);
      g.destroy();
    }

    // ---- UI Textures ----
    generateUITextures() {
      // Button backgrounds
      this.generateButtonTexture("btn_primary", 0x0d2439, 0x00d4ff, "PLAY");
      this.generateButtonTexture("btn_secondary", 0x1a1a2e, 0x7fdbff, "MENU");
      this.generateButtonTexture("btn_danger", 0x3a0d0d, 0xff6b35, "RETRY");
      this.generateButtonTexture("btn_booster", 0x1a2a1a, 0x00ff88, "BOOST");

      // Star textures
      this.generateStarTexture("star_filled", true);
      this.generateStarTexture("star_empty", false);

      // Lock icon
      this.generateLockTexture("icon_lock");

      // Booster icons
      this.generateBoosterIcon("booster_moves", "+5", 0x7fdbff);
      this.generateBoosterIcon("booster_bomb", "💣", 0xff6b35);
      this.generateBoosterIcon("booster_shuffle", "↻", 0x00ff88);
      this.generateBoosterIcon("booster_special", "★", 0xffd60a);

      // World map nodes
      this.generateMapNode("map_node_locked", false);
      this.generateMapNode("map_node_unlocked", true);
      this.generateMapNode("map_node_current", true, true);
      this.generateMapNode("map_node_complete", true, false, true);
    }

    generateButtonTexture(key, bgColor, borderColor, label) {
      if (this.generated.has(key)) return;
      this.generated.add(key);

      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      const w = 180, h = 56, r = 10;
      // Shadow
      g.fillStyle(0x000000, 0.3);
      g.fillRoundedRect(2, 4, w, h, r);
      // Background
      g.fillStyle(bgColor, 1);
      g.fillRoundedRect(0, 0, w, h, r);
      // Border
      g.lineStyle(2, borderColor, 1);
      g.strokeRoundedRect(0, 0, w, h, r);
      // Inner highlight
      g.fillStyle(0xffffff, 0.08);
      g.fillRoundedRect(4, 4, w - 8, 18, 8);
      g.generateTexture(key, w, h);
      g.destroy();
    }

    generateStarTexture(key, filled) {
      if (this.generated.has(key)) return;
      this.generated.add(key);

      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      const size = 40, cx = size / 2, cy = size / 2, r = size * 0.45;

      if (filled) {
        // Glow
        g.fillStyle(0xffd60a, 0.3);
        g.fillCircle(cx, cy, r * 1.3);
        // Star
        g.fillStyle(0xffd60a, 1);
        g.lineStyle(1, 0xffaa00, 1);
      } else {
        g.fillStyle(0x1a1a2e, 1);
        g.lineStyle(2, 0x3a3a5a, 1);
      }

      g.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
        const innerA = a + Math.PI / 5;
        g.lineTo(cx + Math.cos(innerA) * r * 0.38, cy + Math.sin(innerA) * r * 0.38);
      }
      g.closePath();
      g.fillPath();
      g.strokePath();
      g.generateTexture(key, size, size);
      g.destroy();
    }

    generateLockTexture(key) {
      if (this.generated.has(key)) return;
      this.generated.add(key);

      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      const size = 40, cx = size / 2, cy = size / 2;
      // Shackle
      g.lineStyle(4, 0x7fdbff, 1);
      g.beginPath();
      g.arc(cx, cy - 4, 12, Math.PI, 0, false);
      g.strokePath();
      // Body
      g.fillStyle(0x0d2439, 1);
      g.fillRoundedRect(cx - 10, cy + 2, 20, 18, 4);
      g.lineStyle(2, 0x00d4ff, 1);
      g.strokeRoundedRect(cx - 10, cy + 2, 20, 18, 4);
      // Keyhole
      g.fillStyle(0x7fdbff, 1);
      g.fillCircle(cx, cy + 8, 2.5);
      g.fillRect(cx - 2, cy + 10.5, 4, 5);
      g.generateTexture(key, size, size);
      g.destroy();
    }

    generateBoosterIcon(key, symbol, color) {
      if (this.generated.has(key)) return;
      this.generated.add(key);

      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      const size = 56, cx = size / 2, cy = size / 2, r = 22;
      // Background
      g.fillStyle(0x0a1a2e, 1);
      g.fillCircle(cx, cy, r + 4);
      g.lineStyle(2, color, 1);
      g.strokeCircle(cx, cy, r + 4);
      // Symbol rendered at runtime by caller — texture is background only
      g.generateTexture(key, size, size);
      g.destroy();
    }

    generateMapNode(key, unlocked, isCurrent = false, isComplete = false) {
      if (this.generated.has(key)) return;
      this.generated.add(key);

      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      const size = 56, cx = size / 2, cy = size / 2, r = 20;

      if (!unlocked) {
        // Locked node
        g.fillStyle(0x1a1a2e, 1);
        g.fillCircle(cx, cy, r + 4);
        g.lineStyle(2, 0x3a3a5a, 0.5);
        g.strokeCircle(cx, cy, r + 4);
        // Lock symbol
        g.lineStyle(2.5, 0x555577, 1);
        g.beginPath();
        g.arc(cx, cy - 2, 8, Math.PI, 0, false);
        g.strokePath();
        g.fillStyle(0x3a3a5a, 1);
        g.fillRoundedRect(cx - 7, cy + 2, 14, 12, 3);
        g.lineStyle(1.5, 0x555577, 1);
        g.strokeRoundedRect(cx - 7, cy + 2, 14, 12, 3);
      } else if (isCurrent) {
        // Current level - pulsing ring
        g.fillStyle(0x00d4ff, 0.15);
        g.fillCircle(cx, cy, r + 10);
        g.lineStyle(3, 0x00d4ff, 1);
        g.strokeCircle(cx, cy, r + 4);
        g.fillStyle(0x00d4ff, 1);
        g.fillCircle(cx, cy, r);
      } else if (isComplete) {
        // Completed - gold ring
        g.fillStyle(0xffd60a, 0.15);
        g.fillCircle(cx, cy, r + 8);
        g.lineStyle(3, 0xffd60a, 1);
        g.strokeCircle(cx, cy, r + 4);
        g.fillStyle(0xffd60a, 1);
        g.fillCircle(cx, cy, r);
        // Checkmark
        g.lineStyle(3, 0x0a1a2e, 1);
        g.beginPath();
        g.moveTo(cx - 6, cy);
        g.lineTo(cx - 1, cy + 5);
        g.lineTo(cx + 7, cy - 6);
        g.strokePath();
      } else {
        // Unlocked but not played
        g.fillStyle(0x0d2439, 1);
        g.fillCircle(cx, cy, r + 4);
        g.lineStyle(2, 0x7fdbff, 1);
        g.strokeCircle(cx, cy, r + 4);
        g.fillStyle(0x7fdbff, 0.2);
        g.fillCircle(cx, cy, r);
      }

      g.generateTexture(key, size, size);
      g.destroy();
    }

    // ---- Combo Text Textures ----
    generateComboTextures() {
      const combos = [
        { key: "combo_good", text: "GOOD!", color: 0x00ff88 },
        { key: "combo_great", text: "GREAT!", color: 0x00d4ff },
        { key: "combo_awesome", text: "AWESOME!", color: 0xffd60a },
        { key: "combo_spectacular", text: "SPECTACULAR!", color: 0xff6b35 },
        { key: "combo_legendary", text: "LEGENDARY!", color: 0xa855f7 }
      ];

      for (const c of combos) {
        if (this.generated.has(c.key)) continue;
        this.generated.add(c.key);

        const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
        const w = 320, h = 96;
        // Glow background + border only (label is drawn as live Text by ParticleManager)
        g.fillStyle(c.color, 0.15);
        g.fillRoundedRect(0, 0, w, h, 16);
        g.lineStyle(3, c.color, 0.9);
        g.strokeRoundedRect(0, 0, w, h, 16);
        g.generateTexture(c.key, w, h);
        g.destroy();
      }
    }

    // ---- Cleanup ----
    destroy() {
      this.generated.clear();
    }
  }

  return TextureFactory;
});