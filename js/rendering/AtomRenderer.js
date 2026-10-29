/* =========================================================
   Atom Smasher — Atom Renderer (Phaser Sprites & Animations)
   Handles atom display, neon effects, and animations.
   ========================================================= */
(function (root, factory) {
  const AtomRenderer = factory();
  if (typeof module === "object" && module.exports) module.exports = AtomRenderer;
  root.AtomRenderer = AtomRenderer;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  class AtomRenderer {
    constructor(scene, boardModel, textureFactory) {
      this.scene = scene;
      this.board = boardModel;
      this.textureFactory = textureFactory;
      this.sprites = []; // 8x8 grid of Phaser sprites
      this.cellSize = 82;
      this.originX = 0;
      this.originY = 0;
      this.glowTweens = new Map(); // sprite -> tween for neon pulse
    }

    // Initialize board position
    setBoardPosition(originX, originY) {
      this.originX = originX;
      this.originY = originY;
    }

    // Build initial sprites for entire board
    buildAllSprites(animate = true) {
      this.clearAllSprites();
      this.sprites = [];

      for (let r = 0; r < 8; r++) {
        this.sprites[r] = [];
        for (let c = 0; c < 8; c++) {
          const atom = this.board.get(r, c);
          const obstacle = this.board.getObstacle(r, c);
          const sprite = this.createAtomSprite(r, c, atom, obstacle);
          this.sprites[r][c] = sprite;
          if (animate) {
            sprite.setAlpha(0);
            this.scene.tweens.add({
              targets: sprite,
              alpha: 1,
              duration: 180,
              delay: (r * 8 + c) * 15,
              ease: "Back.easeOut"
            });
          }
        }
      }
    }

    createAtomSprite(r, c, atom, obstacle) {
      const x = this.originX + c * this.cellSize + this.cellSize / 2;
      const y = this.originY + r * this.cellSize + this.cellSize / 2;

      // Determine texture key
      let textureKey = "cell_bg";
      if (atom !== null && atom !== undefined) {
        textureKey = `atom_${atom & 0x0F}`; // base type
      }

      const sprite = this.scene.add.sprite(x, y, textureKey);
      sprite.setData("boardR", r);
      sprite.setData("boardC", c);
      sprite.setData("baseType", atom & 0x0F);
      sprite.setData("specialFlag", atom & ~0x0F);

      // Scale atom to fit within cell (leave ~15% padding)
      const fitScale = (this.cellSize * 0.85) / Math.max(sprite.width, sprite.height);
      sprite.setScale(fitScale);

      // Add special overlay if needed
      this.addSpecialOverlay(sprite, atom);

      // Add obstacle overlay if needed
      this.addObstacleOverlay(sprite, obstacle);

      // Start neon pulse animation
      this.startNeonPulse(sprite, atom);

      return sprite;
    }

    addSpecialOverlay(sprite, atom) {
      if (!atom || (atom & ~0x0F) === 0) return;

      const flag = atom & ~0x0F;
      const ATOM = this.board.constructor.ATOM || {
        STRIPED_H_FLAG: 0x10,
        STRIPED_V_FLAG: 0x20,
        WRAPPED_FLAG: 0x40,
        COLOR_BOMB_FLAG: 0x80,
        MEGA_FLAG: 0x100
      };

      let overlayKey = null;
      if (flag & ATOM.STRIPED_H_FLAG) overlayKey = "special_striped_h";
      else if (flag & ATOM.STRIPED_V_FLAG) overlayKey = "special_striped_v";
      else if (flag & ATOM.WRAPPED_FLAG) overlayKey = "special_wrapped";
      else if (flag & ATOM.COLOR_BOMB_FLAG) overlayKey = "special_color_bomb";
      else if (flag & ATOM.MEGA_FLAG) overlayKey = "special_mega";

      if (overlayKey) {
        const overlay = this.scene.add.sprite(sprite.x, sprite.y, overlayKey);
        overlay.setScale(0.8);
        overlay.setDepth(sprite.depth + 1);
        sprite.specialOverlay = overlay;

        // Pulse animation for special atoms
        this.scene.tweens.add({
          targets: overlay,
          scale: { from: 0.8, to: 1.0 },
          alpha: { from: 0.7, to: 1 },
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
      }
    }

    addObstacleOverlay(sprite, obstacle) {
      if (!obstacle || obstacle === 0) return;

      const ObstacleTypes = this.scene.ObstacleTypes;
      if (!ObstacleTypes) return;

      const key = obstacle === ObstacleTypes.OBSTACLE.STONE ? "obstacle_stone" :
                  obstacle === ObstacleTypes.OBSTACLE.ICE_1 ? "obstacle_ice_1" :
                  obstacle === ObstacleTypes.OBSTACLE.ICE_2 ? "obstacle_ice_2" :
                  obstacle === ObstacleTypes.OBSTACLE.CHAIN ? "obstacle_chain" : null;

      if (key) {
        const overlay = this.scene.add.sprite(sprite.x, sprite.y, key);
        overlay.setDepth(sprite.depth + (obstacle === ObstacleTypes.OBSTACLE.CHAIN ? 2 : 1));
        sprite.obstacleOverlay = overlay;
      }
    }

    startNeonPulse(sprite, atom) {
      if (!atom) return;

      // Neon outline pulse using tint animation
      const baseType = atom & 0x0F;
      const AtomTypes = this.scene.AtomTypes;
      if (!AtomTypes) return;

      const atomDef = AtomTypes.getAtom(baseType);
      const neonColor = atomDef.neonColor;

      // Store original tint
      sprite.setData("neonColor", neonColor);

      // Store base scale so pulse stays relative to fitted size
      const baseScale = sprite.scaleX;
      const tween = this.scene.tweens.add({
        targets: sprite,
        scaleX: baseScale * 1.08,
        scaleY: baseScale * 1.08,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
      this.glowTweens.set(sprite, tween);
    }

    stopNeonPulse(sprite) {
      const tween = this.glowTweens.get(sprite);
      if (tween) {
        tween.stop();
        this.glowTweens.delete(sprite);
      }
    }

    // ---- Swap Animation ----
    // After the model swap commits, remap the sprite matrix so sprites[r][c]
    // holds the sprite of the atom actually AT (r, c). Without this, cascade
    // removal/fall animations target the wrong sprites.
    commitSwap(a, b) {
      const sa = this.sprites[a.r] && this.sprites[a.r][a.c];
      const sb = this.sprites[b.r] && this.sprites[b.r][b.c];
      if (sa && sb) {
        this.sprites[a.r][a.c] = sb;
        this.sprites[b.r][b.c] = sa;
      }
      this.syncSprites();
    }

    animateSwap(posA, posB, onComplete) {
      const spriteA = this.sprites[posA.r][posA.c];
      const spriteB = this.sprites[posB.r][posB.c];

      if (!spriteA || !spriteB) {
        if (onComplete) onComplete();
        return;
      }

      const xA = spriteA.x, yA = spriteA.y;
      const xB = spriteB.x, yB = spriteB.y;

      // Stop neon pulses during swap
      this.stopNeonPulse(spriteA);
      this.stopNeonPulse(spriteB);

      const duration = 130;
      this.scene.tweens.add({
        targets: spriteA,
        x: xB, y: yB,
        duration,
        ease: "Sine.easeInOut"
      });
      this.scene.tweens.add({
        targets: spriteB,
        x: xA, y: yA,
        duration,
        ease: "Sine.easeInOut",
        onComplete: () => {
          // Restart neon pulses
          this.startNeonPulse(spriteA, this.board.get(posB.r, posB.c));
          this.startNeonPulse(spriteB, this.board.get(posA.r, posA.c));
          if (onComplete) onComplete();
        }
      });
    }

    animateInvalidSwap(posA, posB, onComplete) {
      const spriteA = this.sprites[posA.r][posA.c];
      const spriteB = this.sprites[posB.r][posB.c];

      if (!spriteA || !spriteB) {
        if (onComplete) onComplete();
        return;
      }

      const xA = spriteA.x, yA = spriteA.y;
      const xB = spriteB.x, yB = spriteB.y;

      // Quick shake
      this.scene.tweens.add({
        targets: [spriteA, spriteB],
        x: "+=6",
        duration: 50,
        yoyo: true,
        repeat: 3,
        ease: "Sine.easeInOut",
        onComplete: () => {
          // Animate back to original positions
          this.scene.tweens.add({
            targets: spriteA,
            x: xA, y: yA,
            duration: 130,
            ease: "Sine.easeInOut"
          });
          this.scene.tweens.add({
            targets: spriteB,
            x: xB, y: yB,
            duration: 130,
            ease: "Sine.easeInOut",
            onComplete: () => {
              if (onComplete) onComplete();
            }
          });
        }
      });
    }

    // ---- Match Removal Animation ----
    animateRemoval(removedCells, onComplete) {
      const targets = [];
      for (const cell of removedCells) {
        const sprite = this.sprites[cell.r][cell.c];
        if (sprite) {
          targets.push({ sprite, cell });
          // Do NOT null sprite here — tweens still need it. Null in onComplete instead.
        }
      }

      if (targets.length === 0) {
        if (onComplete) onComplete();
        return;
      }

      // Safety: force onComplete after 1 s if animation chain stalls
      const guard = this.scene.time.delayedCall(1000, () => {
        console.warn("animateRemoval guard fired");
        if (onComplete) onComplete();
      });

      // Color-matched flash + shrink
      const removalTweens = [];
      let completed = 0;
      const total = targets.length;
      for (const { sprite, cell } of targets) {
        const atom = cell.atom || this.board.get(cell.r, cell.c);
        const baseType = atom & 0x0F;
        const AtomTypes = this.scene.AtomTypes;
        let tintColor = 0xffffff;

        if (AtomTypes) {
          const atomDef = AtomTypes.getAtom(baseType);
          tintColor = Phaser.Display.Color.HexStringToColor(atomDef.neonColor).color;
        }

        // Flash with neon color
        sprite.setTint(tintColor);
        this.stopNeonPulse(sprite);

        if (sprite.specialOverlay) sprite.specialOverlay.setTint(tintColor);
        if (sprite.obstacleOverlay) sprite.obstacleOverlay.setTint(tintColor);

        // Match pop + highlight ring
        const highlight = this.scene.add.graphics();
        highlight.lineStyle(3, tintColor, 0.9);
        highlight.strokeCircle(0, 0, this.cellSize * 0.55);
        highlight.setPosition(sprite.x, sprite.y);
        highlight.setDepth(sprite.depth + 5);

        this.scene.tweens.add({
          targets: sprite,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 60,
          ease: "Back.easeOut",
          onComplete: () => {
            this.scene.tweens.add({
              targets: [sprite, highlight],
              scaleX: 0.1,
              scaleY: 0.1,
              alpha: 0,
              duration: 110,
              ease: "Quad.easeIn",
              onComplete: () => {
                highlight.destroy();
                // Null sprite matrix entry AFTER tween completes
                this.sprites[cell.r][cell.c] = null;
                if (sprite.specialOverlay) sprite.specialOverlay.destroy();
                if (sprite.obstacleOverlay) sprite.obstacleOverlay.destroy();
                sprite.destroy();
                completed++;
                if (completed === total) {
                  guard.remove(false);
                  if (onComplete) onComplete();
                }
              }
            });
          }
        });
        removalTweens.push(highlight);
      }
    }

    // ---- Fall Animation ----
    animateFalls(fallMoves, refills, onComplete) {
      const animations = [];

      // Existing sprites falling
      for (const move of fallMoves) {
        if (!this.sprites[move.from]) continue;
        const sprite = this.sprites[move.from][move.col];
        if (!sprite) continue;

        this.sprites[move.from][move.col] = null;
        this.sprites[move.to][move.col] = sprite;
        sprite.setData("boardR", move.to);
        sprite.setData("boardC", move.col);

        const targetY = this.originY + move.to * this.cellSize + this.cellSize / 2;
        const dist = Math.abs(targetY - sprite.y);
        const duration = Math.max(100, Math.min(300, dist * 1.5));

        animations.push(this.scene.tweens.add({
          targets: sprite,
          y: targetY,
          duration,
          ease: "Bounce.easeOut"
        }));
      }

      // New sprites spawning from top
      for (const refill of refills) {
        const x = this.originX + refill.col * this.cellSize + this.cellSize / 2;
        const startY = this.originY - this.cellSize; // Above board
        const targetY = this.originY + refill.row * this.cellSize + this.cellSize / 2;

        const textureKey = `atom_${refill.type}`;
        const sprite = this.scene.add.sprite(x, startY, textureKey);
        sprite.setData("boardR", refill.row);
        sprite.setData("boardC", refill.col);
        sprite.setData("baseType", refill.type);
        sprite.setData("specialFlag", 0);

        // Scale to fit cell (same as createAtomSprite)
        const fitScale = (this.cellSize * 0.85) / Math.max(sprite.width, sprite.height);
        sprite.setScale(fitScale);

        this.sprites[refill.row][refill.col] = sprite;

        // Add special overlay if needed (refills don't have specials initially)
        this.startNeonPulse(sprite, refill.type);

        const dist = targetY - startY;
        const duration = Math.max(150, Math.min(350, dist * 1.2));

        animations.push(this.scene.tweens.add({
          targets: sprite,
          y: targetY,
          duration,
          ease: "Bounce.easeOut"
        }));
      }

      if (animations.length === 0) {
        if (onComplete) onComplete();
        return;
      }

      // Safety: force onComplete after 2 s if fall chain stalls
      const guard = this.scene.time.delayedCall(2000, () => {
        console.warn("animateFalls guard fired");
        if (onComplete) onComplete();
      });

      // Wait for all falls to complete
      let completed = 0;
      for (const tween of animations) {
        tween.on("complete", () => {
          completed++;
          if (completed === animations.length) {
            guard.remove(false);
            if (onComplete) onComplete();
          }
        });
      }
    }

    // ---- Special Atom Activation Effects ----
    activateSpecial(pos, onComplete) {
      const sprite = this.sprites[pos.r][pos.c];
      if (!sprite) { if (onComplete) onComplete(); return; }

      const atom = this.board.get(pos.r, pos.c);
      const flag = atom & ~0x0F;
      const ATOM = this.board.constructor.ATOM || {
        STRIPED_H_FLAG: 0x10,
        STRIPED_V_FLAG: 0x20,
        WRAPPED_FLAG: 0x40,
        COLOR_BOMB_FLAG: 0x80,
        MEGA_FLAG: 0x100
      };

      // Screen flash effect
      this.flashScreen(atom & 0x0F);

      // Particle burst at position
      this.burstParticles(pos.r, pos.c, atom & 0x0F);

      // Specific effect based on special type
      if (flag & ATOM.STRIPED_H_FLAG) {
        this.animateStripedHorizontal(pos.r, onComplete);
      } else if (flag & ATOM.STRIPED_V_FLAG) {
        this.animateStripedVertical(pos.c, onComplete);
      } else if (flag & ATOM.WRAPPED_FLAG) {
        this.animateWrapped(pos.r, pos.c, onComplete);
      } else if (flag & ATOM.COLOR_BOMB_FLAG) {
        this.animateColorBomb(pos.r, pos.c, onComplete);
      } else if (flag & ATOM.MEGA_FLAG) {
        this.animateMega(pos.r, pos.c, onComplete);
      } else {
        if (onComplete) onComplete();
      }
    }

    animateStripedHorizontal(row, onComplete) {
      const targets = [];
      for (let c = 0; c < 8; c++) {
        const sprite = this.sprites[row][c];
        if (sprite) targets.push(sprite);
      }
      this.animateLineClear(targets, onComplete);
    }

    animateStripedVertical(col, onComplete) {
      const targets = [];
      for (let r = 0; r < 8; r++) {
        const sprite = this.sprites[r][col];
        if (sprite) targets.push(sprite);
      }
      this.animateLineClear(targets, onComplete);
    }

    animateLineClear(targets, onComplete) {
      if (targets.length === 0) { if (onComplete) onComplete(); return; }

      // Beam effect across the line
      const first = targets[0];
      const last = targets[targets.length - 1];

      // Create beam sprite
      const beam = this.scene.add.graphics();
      beam.fillStyle(0x00ffff, 0.6);
      beam.fillRect(
        Math.min(first.x, last.x) - 20,
        first.y - 15,
        Math.abs(last.x - first.x) + 40,
        30
      );
      beam.setDepth(100);

      this.scene.tweens.add({
        targets: beam,
        alpha: 0,
        scaleX: 1.5,
        duration: 200,
        ease: "Quad.easeOut",
        onComplete: () => beam.destroy()
      });

      // Remove targets with delay
      this.scene.time.delayedCall(100, () => {
        let completed = 0;
        for (const sprite of targets) {
          const r = sprite.getData("boardR");
          const c = sprite.getData("boardC");
          this.stopNeonPulse(sprite);
          this.scene.tweens.add({
            targets: sprite,
            scaleX: 0.1,
            scaleY: 0.1,
            alpha: 0, duration: 150,
            onComplete: () => {
              this.sprites[r][c] = null;
              if (sprite.specialOverlay) sprite.specialOverlay.destroy();
              if (sprite.obstacleOverlay) sprite.obstacleOverlay.destroy();
              sprite.destroy();
              completed++;
              if (completed === targets.length && onComplete) onComplete();
            }
          });
        }
      });
    }

    animateWrapped(r, c, onComplete) {
      const targets = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
            const sprite = this.sprites[rr][cc];
            if (sprite) targets.push({ sprite, r: rr, c: cc });
          }
        }
      }
      this.animateAreaClear(targets, onComplete);
    }

    animateColorBomb(r, c, onComplete) {
      const baseType = this.board.get(r, c) & 0x0F;
      const targets = [];
      for (let rr = 0; rr < 8; rr++) {
        for (let cc = 0; cc < 8; cc++) {
          const sprite = this.sprites[rr][cc];
          if (sprite && (sprite.getData("baseType") === baseType)) {
            targets.push({ sprite, r: rr, c: cc });
          }
        }
      }
      this.animateAreaClear(targets, onComplete);
    }

    animateMega(r, c, onComplete) {
      const targets = [];
      for (let rr = 0; rr < 8; rr++) {
        for (let cc = 0; cc < 8; cc++) {
          const sprite = this.sprites[rr][cc];
          if (sprite) targets.push({ sprite, r: rr, c: cc });
        }
      }
      this.animateAreaClear(targets, onComplete);
    }

    animateAreaClear(targets, onComplete) {
      if (targets.length === 0) { if (onComplete) onComplete(); return; }

      // Expanding ring effect
      const centerX = this.originX + 4 * this.cellSize;
      const centerY = this.originY + 4 * this.cellSize;

      const ring = this.scene.add.graphics();
      ring.lineStyle(4, 0x00ffff, 0.8);
      ring.strokeCircle(centerX, centerY, 0);
      ring.setDepth(100);

      this.scene.tweens.add({
        targets: ring,
        alpha: 0,
        scaleX: 3,
        scaleY: 3,
        duration: 300,
        ease: "Quad.easeOut",
        onComplete: () => ring.destroy()
      });

      // Staggered removal
      this.scene.time.delayedCall(50, () => {
        let completed = 0;
        targets.forEach(({ sprite, r, c }, i) => {
          this.stopNeonPulse(sprite);
          this.scene.time.delayedCall(i * 10, () => {
            this.scene.tweens.add({
              targets: sprite,
              scaleX: 0.1,
              scaleY: 0.1,
              alpha: 0, duration: 150,
              onComplete: () => {
                this.sprites[r][c] = null;
                if (sprite.specialOverlay) sprite.specialOverlay.destroy();
                if (sprite.obstacleOverlay) sprite.obstacleOverlay.destroy();
                sprite.destroy();
                completed++;
                if (completed === targets.length && onComplete) onComplete();
              }
            });
          });
        });
      });
    }

    // ---- Obstacle Damage Animation ----
    animateObstacleDamage(damagedCells, onComplete) {
      const targets = [];
      for (const cell of damagedCells) {
        const sprite = this.sprites[cell.r]?.[cell.c];
        if (sprite && sprite.obstacleOverlay) {
          targets.push({ sprite, cell });
          // Crack effect
          this.scene.tweens.add({
            targets: sprite.obstacleOverlay,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
              // Restore alpha after crack animation
              if (sprite.obstacleOverlay) {
                sprite.obstacleOverlay.setAlpha(1);
              }
            }
          });
        }
      }

      if (targets.length === 0) {
        if (onComplete) onComplete();
        return;
      }

      // Wait for all crack animations to complete (3 cycles * 100ms = 300ms)
      this.scene.time.delayedCall(350, () => {
        if (onComplete) onComplete();
      });
    }

    // ---- Utility Effects ----
    flashScreen(baseType) {
      const AtomTypes = this.scene.AtomTypes;
      if (!AtomTypes) return;

      const atomDef = AtomTypes.getAtom(baseType);
      const color = atomDef.neonColor;

      const flash = this.scene.add.rectangle(
        this.scene.scale.width / 2,
        this.scene.scale.height / 2,
        this.scene.scale.width,
        this.scene.scale.height,
        Phaser.Display.Color.HexStringToColor(color).color,
        0.15
      );
      flash.setDepth(200);
      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 150,
        onComplete: () => flash.destroy()
      });
    }

    burstParticles(r, c, baseType) {
      const AtomTypes = this.scene.AtomTypes;
      if (!AtomTypes) return;

      const atomDef = AtomTypes.getAtom(baseType);
      const color = Phaser.Display.Color.HexStringToColor(atomDef.particleColor).color;

      const x = this.originX + c * this.cellSize + this.cellSize / 2;
      const y = this.originY + r * this.cellSize + this.cellSize / 2;

      const particles = this.scene.add.particles(0, 0, "particle", {
        x: x, y: y,
        lifespan: 400,
        speed: { min: 50, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: color,
        quantity: 12,
        blendMode: Phaser.BlendModes.ADD
      });

      this.scene.time.delayedCall(500, () => particles.destroy());
    }

    // ---- Selection Highlight ----
    showSelection(pos, show) {
      const sprite = this.sprites[pos.r]?.[pos.c];
      if (!sprite) return;

      if (show) {
        // Add selection ring
        if (!sprite.selectionRing) {
          const g = this.scene.add.graphics();
          g.lineStyle(3, 0x00d4ff, 1);
          g.strokeRoundedRect(
            sprite.x - this.cellSize / 2 + 2,
            sprite.y - this.cellSize / 2 + 2,
            this.cellSize - 4, this.cellSize - 4, 10
          );
          g.setDepth(sprite.depth + 5);
          sprite.selectionRing = g;

          // Pulse animation
          this.scene.tweens.add({
            targets: g,
            alpha: { from: 1, to: 0.4 },
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
          });
        }
      } else {
        if (sprite.selectionRing) {
          sprite.selectionRing.destroy();
          sprite.selectionRing = null;
        }
      }
    }

    // ---- Rebuild All (after reshuffle/restart) ----
    rebuildAll(animate = true, onComplete) {
      this.clearAllSprites();
      this.buildAllSprites(animate);
      if (onComplete) {
        this.scene.time.delayedCall(animate ? 300 : 0, onComplete);
      }
    }

    clearAllSprites() {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const sprite = this.sprites[r]?.[c];
          if (sprite) {
            this.stopNeonPulse(sprite);
            if (sprite.specialOverlay) sprite.specialOverlay.destroy();
            if (sprite.obstacleOverlay) sprite.obstacleOverlay.destroy();
            if (sprite.selectionRing) sprite.selectionRing.destroy();
            sprite.destroy();
          }
        }
      }
      this.sprites = [];
      this.glowTweens.clear();
    }

    // Get sprite at board position
    getSprite(r, c) {
      return this.sprites[r]?.[c] || null;
    }

    // Update sprite positions (after board model changes)
    syncSprites() {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const sprite = this.sprites[r]?.[c];
          if (sprite) {
            sprite.setData("boardR", r);
            sprite.setData("boardC", c);
            const atom = this.board.get(r, c);
            sprite.setData("baseType", atom & 0x0F);
            sprite.setData("specialFlag", atom & ~0x0F);
          }
        }
      }
    }
  }

  return AtomRenderer;
});