/* =========================================================
   Atom Smasher — Particle Manager
   Handles all particle effects: match explosions, special activations,
   combo bursts, obstacle breaks, cascade trails.
   ========================================================= */
(function (root, factory) {
  const ParticleManager = factory();
  if (typeof module === "object" && module.exports) module.exports = ParticleManager;
  root.ParticleManager = ParticleManager;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  class ParticleManager {
    constructor(scene, AtomTypes) {
      this.scene = scene;
      this.AtomTypes = AtomTypes;
      this.activeEmitters = [];
      this.pools = new Map(); // Reusable emitters
    }

    // ---- Match Explosion (color-matched) ----
    explodeMatch(r, c, baseType, boardOrigin, cellSize, options = {}) {
      const atomDef = this.AtomTypes.getAtom(baseType);
      const color = atomDef.particleColor || atomDef.neonColor;
      const count = options.count || 16;
      const isSpecial = options.isSpecial || false;

      const x = boardOrigin.x + c * cellSize + cellSize / 2;
      const y = boardOrigin.y + r * cellSize + cellSize / 2;

      // Main burst
      this.createBurst(x, y, color, {
        count: isSpecial ? count * 2 : count,
        speed: isSpecial ? { min: 100, max: 350 } : { min: 60, max: 250 },
        scale: { start: isSpecial ? 0.7 : 0.5, end: 0 },
        lifespan: isSpecial ? 600 : 400,
        blendMode: Phaser.BlendModes.ADD,
        gravityY: 50
      });

      // Ring expansion
      this.createRing(x, y, color, {
        radius: isSpecial ? 120 : 80,
        duration: isSpecial ? 400 : 300
      });

      // Sparkle trail
      if (isSpecial) {
        this.createSparkles(x, y, color, 8);
      }
    }

    // ---- Special Atom Activation ----
    activateSpecial(r, c, baseType, specialType, boardOrigin, cellSize) {
      const atomDef = this.AtomTypes.getAtom(baseType);
      const color = atomDef.particleColor || atomDef.neonColor;
      const x = boardOrigin.x + c * cellSize + cellSize / 2;
      const y = boardOrigin.y + r * cellSize + cellSize / 2;

      switch (specialType) {
        case "striped_h":
        case "striped_v":
          this.activateStriped(x, y, color, specialType);
          break;
        case "wrapped":
          this.activateWrapped(x, y, color);
          break;
        case "color_bomb":
          this.activateColorBomb(x, y, color);
          break;
        case "mega":
          this.activateMega(x, y, color);
          break;
      }
    }

    activateStriped(x, y, color, direction) {
      // Beam across row/column
      const isHorizontal = direction === "striped_h";
      const length = isHorizontal ? this.scene.scale.width : this.scene.scale.height;
      const beam = this.scene.add.graphics();
      beam.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 0.4);
      if (isHorizontal) {
        beam.fillRect(0, y - 30, length, 60);
      } else {
        beam.fillRect(x - 30, 0, 60, length);
      }
      beam.setDepth(150);

      this.scene.tweens.add({
        targets: beam,
        alpha: 0,
        scaleX: isHorizontal ? 1.2 : 1,
        scaleY: isHorizontal ? 1 : 1.2,
        duration: 250,
        ease: "Quad.easeOut",
        onComplete: () => beam.destroy()
      });

      // Particles along the beam
      const count = isHorizontal ? 20 : 20;
      for (let i = 0; i < count; i++) {
        const px = isHorizontal ? (i / count) * length : x;
        const py = isHorizontal ? y : (i / count) * length;
        this.createSparkle(px, py, color);
      }
    }

    activateWrapped(x, y, color) {
      // 3x3 expanding rings
      for (let ring = 0; ring < 3; ring++) {
        this.scene.time.delayedCall(ring * 80, () => {
          this.createRing(x, y, color, {
            radius: 100 + ring * 40,
            duration: 400 + ring * 100,
            thickness: 4
          });
          this.createBurst(x, y, color, {
            count: 12,
            speed: { min: 80, max: 200 },
            scale: { start: 0.6, end: 0 },
            lifespan: 500
          });
        });
      }
    }

    activateColorBomb(x, y, color) {
      // Expanding sphere + color-matched particles
      for (let wave = 0; wave < 4; wave++) {
        this.scene.time.delayedCall(wave * 100, () => {
          this.createRing(x, y, color, {
            radius: 60 + wave * 80,
            duration: 500,
            thickness: 3
          });
          this.createBurst(x, y, color, {
            count: 15,
            speed: { min: 100, max: 300 },
            scale: { start: 0.7, end: 0 },
            lifespan: 600,
            blendMode: Phaser.BlendModes.ADD
          });
        });
      }
      // Central implosion
      this.createImplosion(x, y, color);
    }

    activateMega(x, y, color) {
      // Screen-wide effect
      // Flash
      const flash = this.scene.add.rectangle(
        this.scene.scale.width / 2,
        this.scene.scale.height / 2,
        this.scene.scale.width,
        this.scene.scale.height,
        Phaser.Display.Color.HexStringToColor(color).color,
        0.25
      );
      flash.setDepth(200);
      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 300,
        onComplete: () => flash.destroy()
      });

      // Massive burst
      this.createBurst(x, y, color, {
        count: 60,
        speed: { min: 150, max: 500 },
        scale: { start: 1, end: 0 },
        lifespan: 1000,
        blendMode: Phaser.BlendModes.ADD,
        gravityY: 100
      });

      // Multiple rings
      for (let i = 0; i < 5; i++) {
        this.scene.time.delayedCall(i * 120, () => {
          this.createRing(x, y, color, {
            radius: 150 + i * 100,
            duration: 800,
            thickness: 5
          });
        });
      }

      // Implosion
      this.createImplosion(x, y, color, 2);
    }

    // ---- Combo Effects ----
    showComboText(comboLevel, x, y) {
      try {
        const labels = ["", "GOOD!", "GREAT!", "AWESOME!", "SPECTACULAR!", "LEGENDARY!"];
        const palette = ["#00ff88", "#00d4ff", "#ffd60a", "#ff6b35", "#a855f7"];
        if (comboLevel < 1 || comboLevel >= labels.length) return;

        const key = "combo_" + ["good", "great", "awesome", "spectacular", "legendary"][comboLevel - 1];
        const img = this.scene.add.image(x, y, key);
        img.setDepth(200);
        img.setScale(0.5);

        const txt = this.scene.add.text(x, y, labels[comboLevel], {
          fontFamily: "Consolas, monospace",
          fontSize: "40px",
          fontStyle: "bold",
          color: palette[comboLevel - 1] || "#ffffff",
          stroke: "#050912",
          strokeThickness: 6
        }).setOrigin(0.5).setDepth(201).setScale(0.5);

        this.scene.tweens.add({
          targets: [img, txt],
          scaleX: 1.1,
          scaleY: 1.1,
          alpha: 0,
          y: y - 60,
          duration: 800,
          ease: "Back.easeOut",
          onComplete: () => { img.destroy(); txt.destroy(); }
        });

        // Burst particles
        const colors = [0x00ff88, 0x00d4ff, 0xffd60a, 0xff6b35, 0xa855f7];
        this.createBurst(x, y, colors[comboLevel - 1] || 0xffffff, {
          count: 20 + comboLevel * 5,
          speed: { min: 50, max: 200 },
          scale: { start: 0.6, end: 0 },
          lifespan: 600
        });
      } catch (e) {
        console.error("showComboText crash:", e);
      }
    }

    // ---- Obstacle Break Effects ----
    breakObstacle(r, c, obstacleType, boardOrigin, cellSize) {
      const x = boardOrigin.x + c * cellSize + cellSize / 2;
      const y = boardOrigin.y + r * cellSize + cellSize / 2;

      let color, count;
      switch (obstacleType) {
        case 1: // STONE
          color = 0x8888aa; count = 12; break;
        case 2: // ICE_1
          color = 0x88ddff; count = 10; break;
        case 3: // ICE_2
          color = 0x66bbff; count = 14; break;
        case 4: // CHAIN
          color = 0xcccccc; count = 8; break;
        default:
          color = 0xffffff; count = 8;
      }

      this.createBurst(x, y, color, {
        count,
        speed: { min: 80, max: 220 },
        scale: { start: 0.5, end: 0 },
        lifespan: 400,
        gravityY: 80
      });

      // Shards for stone/ice
      if (obstacleType === 1 || obstacleType === 2 || obstacleType === 3) {
        this.createShards(x, y, color, 6);
      }
    }

    // ---- Cascade Trail (falling atoms) ----
    cascadeTrail(r, c, baseType, boardOrigin, cellSize) {
      const atomDef = this.AtomTypes.getAtom(baseType);
      const color = atomDef.particleColor || atomDef.neonColor;
      const x = boardOrigin.x + c * cellSize + cellSize / 2;
      const y = boardOrigin.y + r * cellSize + cellSize / 2;

      // Small trail behind falling atom
      const trail = this.scene.add.particles(x, y, "particle", {
        lifespan: 200,
        speed: { min: 10, max: 40 },
        angle: { min: -30, max: 30 },
        scale: { start: 0.3, end: 0 },
        alpha: { start: 0.5, end: 0 },
        tint: Phaser.Display.Color.HexStringToColor(color).color,
        quantity: 1,
        frequency: 30,
        blendMode: Phaser.BlendModes.ADD
      });

      this.scene.time.delayedCall(300, () => trail.destroy());
    }

    // ---- Low-level Particle Primitives ----
    createBurst(x, y, colorHex, options) {
      const color = Phaser.Display.Color.HexStringToColor(colorHex).color;
      const emitter = this.scene.add.particles(x, y, "particle", {
        x: x, y: y,
        lifespan: options.lifespan || 400,
        speed: options.speed || { min: 50, max: 200 },
        angle: { min: 0, max: 360 },
        scale: options.scale || { start: 0.5, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: color,
        quantity: options.count || 16,
        blendMode: options.blendMode || Phaser.BlendModes.NORMAL,
        gravityY: options.gravityY || 0,
        emitting: false
      });
      emitter.explode(options.count || 16);
      this.activeEmitters.push(emitter);
      this.scene.time.delayedCall((options.lifespan || 400) + 100, () => {
        emitter.destroy();
        this.activeEmitters = this.activeEmitters.filter(e => e !== emitter);
      });
    }

    createRing(x, y, colorHex, options) {
      const color = Phaser.Display.Color.HexStringToColor(colorHex).color;
      const radius = options.radius || 80;
      const duration = options.duration || 300;
      const thickness = options.thickness || 3;

      const ring = this.scene.add.graphics();
      ring.lineStyle(thickness, color, 0.8);
      ring.strokeCircle(x, y, 0);
      ring.setDepth(100);

      this.scene.tweens.add({
        targets: ring,
        alpha: 0,
        scale: radius / 10,
        duration,
        ease: "Quad.easeOut",
        onComplete: () => ring.destroy()
      });
    }

    createImplosion(x, y, colorHex, intensity = 1) {
      const color = Phaser.Display.Color.HexStringToColor(colorHex).color;
      const particles = intensity * 20;

      for (let i = 0; i < particles; i++) {
        const angle = (i / particles) * Math.PI * 2;
        const dist = 30 + Math.random() * 50;
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist;

        const p = this.scene.add.particles(px, py, "particle", {
          lifespan: 400,
          speed: { min: 100, max: 250 },
          angle: angle * 180 / Math.PI + 90 + Phaser.Math.Between(-15, 15),
          scale: { start: 0.6, end: 0 },
          alpha: { start: 1, end: 0 },
          tint: color,
          quantity: 1,
          blendMode: Phaser.BlendModes.ADD
        });
        p.explode(1);
        this.scene.time.delayedCall(500, () => p.destroy());
      }
    }

    createSparkles(x, y, colorHex, count = 8) {
      const color = Phaser.Display.Color.HexStringToColor(colorHex).color;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const dist = 40 + Math.random() * 30;
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist;

        const sparkle = this.scene.add.particles(px, py, "particle", {
          lifespan: 500,
          speed: 0,
          scale: { start: 0.4, end: 0.8 },
          alpha: { start: 1, end: 0 },
          tint: color,
          quantity: 1,
          blendMode: Phaser.BlendModes.ADD
        });
        sparkle.explode(1);
        this.scene.time.delayedCall(600, () => sparkle.destroy());
      }
    }

    createSparkle(x, y, colorHex) {
      const color = Phaser.Display.Color.HexStringToColor(colorHex).color;
      const p = this.scene.add.particles(x, y, "particle", {
        lifespan: 400,
        speed: { min: 20, max: 60 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.4, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: color,
        quantity: 1,
        blendMode: Phaser.BlendModes.ADD
      });
      p.explode(1);
      this.scene.time.delayedCall(500, () => p.destroy());
    }

    createShards(x, y, colorHex, count) {
      const color = Phaser.Display.Color.HexStringToColor(colorHex).color;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const speed = 100 + Math.random() * 150;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 50;

        const shard = this.scene.add.rectangle(x, y, 6, 6, color, 1);
        shard.setDepth(100);
        shard.setOrigin(0.5);

        this.scene.tweens.add({
          targets: shard,
          x: x + vx * 0.5,
          y: y + vy * 0.5 + 200,
          rotation: Math.random() * Math.PI * 4,
          alpha: 0,
          scale: 0,
          duration: 600,
          ease: "Quad.easeOut",
          onComplete: () => shard.destroy()
        });
      }
    }

    // ---- Cleanup ----
    destroyAll() {
      for (const emitter of this.activeEmitters) {
        emitter.destroy();
      }
      this.activeEmitters = [];
    }

    pauseAll() {
      for (const emitter of this.activeEmitters) {
        emitter.pause();
      }
    }

    resumeAll() {
      for (const emitter of this.activeEmitters) {
        emitter.resume();
      }
    }
  }

  return ParticleManager;
});