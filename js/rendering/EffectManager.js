/* =========================================================
   Atom Smasher — Effect Manager
   Screen shake, time-slow, flash, slow-mo, vignette, color grading.
   ========================================================= */
(function (root, factory) {
  const EffectManager = factory();
  if (typeof module === "object" && module.exports) module.exports = EffectManager;
  root.EffectManager = EffectManager;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  class EffectManager {
    constructor(scene) {
      this.scene = scene;
      this.activeEffects = new Set();
      this.defaultShakeIntensity = 8;
      this.defaultShakeDuration = 150;
      this.timeScale = 1;
      this.vignette = null;
      this.colorGrade = null;
    }

    // ---- Screen Shake ----
    shake(intensity = null, duration = null, axis = "both") {
      const cam = this.scene.cameras.main;
      const i = intensity || this.defaultShakeIntensity;
      const d = duration || this.defaultShakeDuration;

      const shakeConfig = {
        duration: d,
        intensity: i,
        force: true
      };

      if (axis === "x") shakeConfig.axis = "x";
      else if (axis === "y") shakeConfig.axis = "y";

      cam.shake(shakeConfig);
      return cam;
    }

    shakeExplosion(r, c, boardOrigin, cellSize) {
      // Stronger shake for special atoms
      this.shake(15, 200);
    }

    shakeCombo(level) {
      // Progressive shake for combo levels
      const intensity = Math.min(5 + level * 3, 20);
      const duration = Math.min(100 + level * 30, 300);
      this.shake(intensity, duration);
    }

    shakeMatch(isSpecial = false) {
      this.shake(isSpecial ? 10 : 6, isSpecial ? 120 : 80);
    }

    shakeObstacleBreak() {
      this.shake(8, 100, "y");
    }

    // ---- Time Scale / Slow Motion ----
    setTimeScale(scale, duration = 0, ease = "Quad.easeOut") {
      const prev = this.timeScale;
      this.timeScale = Phaser.Math.Clamp(scale, 0.05, 1.5);

      // Apply to scene time
      this.scene.time.timeScale = this.timeScale;
      this.scene.tweens.timeScale = this.timeScale;

      if (duration > 0) {
        this.scene.time.delayedCall(duration, () => {
          this.setTimeScale(1, 200, ease);
        });
      }
      return prev;
    }

    slowMo(scale = 0.3, duration = 300) {
      return this.setTimeScale(scale, duration);
    }

    timeStop(duration = 100) {
      return this.setTimeScale(0.01, duration);
    }

    // ---- Flash / Color Flash ----
    flash(color = 0xffffff, duration = 100, alpha = 0.4) {
      const flash = this.scene.add.rectangle(
        this.scene.scale.width / 2,
        this.scene.scale.height / 2,
        this.scene.scale.width,
        this.scene.scale.height,
        color,
        alpha
      );
      flash.setDepth(500);
      flash.setBlendMode(Phaser.BlendModes.ADD);

      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration,
        ease: "Quad.easeOut",
        onComplete: () => flash.destroy()
      });
      return flash;
    }

    // Normalize a color given as number (0xRRGGBB) or hex string ("#RRGGBB")
    toColorInt(c) {
      if (typeof c === "number") return c;
      if (typeof c === "string" && c.length > 0) {
        return Phaser.Display.Color.HexStringToColor(c).color;
      }
      return 0xffffff;
    }

    colorFlash(hexColor, duration = 120, alpha = 0.35) {
      return this.flash(this.toColorInt(hexColor), duration, alpha);
    }

    comboFlash(level) {
      const colors = [0x00ff88, 0x00d4ff, 0xffd60a, 0xff6b35, 0xa855f7];
      this.colorFlash(colors[Math.min(level - 1, 4)] || 0xffffff, 150 + level * 20, 0.3 + level * 0.05);
    }

    // ---- Vignette ----
    showVignette(intensity = 0.6, duration = 0, color = 0x000000) {
      if (this.vignette) this.vignette.destroy();

      this.vignette = this.scene.add.graphics();
      this.vignette.setDepth(400);

      const w = this.scene.scale.width;
      const h = this.scene.scale.height;

      // Radial gradient simulation
      for (let i = 0; i < 20; i++) {
        const alpha = intensity * (1 - i / 20) * 0.8;
        const radius = Math.max(w, h) * (0.5 + i / 40);
        this.vignette.fillStyle(color, alpha);
        this.vignette.fillCircle(w / 2, h / 2, radius);
      }

      if (duration > 0) {
        this.scene.tweens.add({
          targets: this.vignette,
          alpha: 0,
          duration,
          onComplete: () => { this.vignette.destroy(); this.vignette = null; }
        });
      }
      return this.vignette;
    }

    hideVignette(duration = 300) {
      if (this.vignette) {
        this.scene.tweens.add({
          targets: this.vignette,
          alpha: 0,
          duration,
          onComplete: () => { this.vignette.destroy(); this.vignette = null; }
        });
      }
    }

    // ---- Color Grading (tint overlay) ----
    setColorGrade(hexColor, intensity = 0.3, duration = 0) {
      if (this.colorGrade) this.colorGrade.destroy();

      this.colorGrade = this.scene.add.rectangle(
        this.scene.scale.width / 2,
        this.scene.scale.height / 2,
        this.scene.scale.width,
        this.scene.scale.height,
        this.toColorInt(hexColor),
        intensity
      );
      this.colorGrade.setDepth(300);
      this.colorGrade.setBlendMode(Phaser.BlendModes.OVERLAY);

      if (duration > 0) {
        this.scene.tweens.add({
          targets: this.colorGrade,
          alpha: 0,
          duration,
          onComplete: () => { this.colorGrade.destroy(); this.colorGrade = null; }
        });
      }
      return this.colorGrade;
    }

    clearColorGrade(duration = 300) {
      if (this.colorGrade) {
        this.scene.tweens.add({
          targets: this.colorGrade,
          alpha: 0,
          duration,
          onComplete: () => { this.colorGrade.destroy(); this.colorGrade = null; }
        });
      }
    }

    // ---- Pulse / Breathing Effect ----
    pulseScale(target, scale = 1.1, duration = 500, yoyo = true, repeat = -1) {
      return this.scene.tweens.add({
        targets: target,
        scaleX: scale,
        scaleY: scale,
        duration,
        yoyo,
        repeat,
        ease: "Sine.easeInOut"
      });
    }

    pulseAlpha(target, alpha = 0.5, duration = 800, yoyo = true, repeat = -1) {
      return this.scene.tweens.add({
        targets: target,
        alpha,
        duration,
        yoyo,
        repeat,
        ease: "Sine.easeInOut"
      });
    }

    // ---- Staggered Children Animation ----
    staggerChildren(children, property, from, to, duration = 300, stagger = 50, ease = "Back.easeOut") {
      children.forEach((child, i) => {
        child[property] = from;
        this.scene.tweens.add({
          targets: child,
          [property]: to,
          duration,
          delay: i * stagger,
          ease
        });
      });
    }

    // ---- Cleanup ----
    destroy() {
      if (this.vignette) this.vignette.destroy();
      if (this.colorGrade) this.colorGrade.destroy();
      this.activeEffects.clear();
      this.scene.time.timeScale = 1;
      this.scene.tweens.timeScale = 1;
    }
  }

  return EffectManager;
});