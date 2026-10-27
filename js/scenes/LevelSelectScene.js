/* =========================================================
   Atom Smasher — Level Select Scene
   Shows level grid with stars, lock states, and progress.
   ========================================================= */
(function (root, factory) {
  const LevelSelectScene = factory();
  if (typeof module === "object" && module.exports) module.exports = LevelSelectScene;
  root.LevelSelectScene = LevelSelectScene;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  class LevelSelectScene extends Phaser.Scene {
    constructor() {
      super({ key: "LevelSelectScene" });
    }

    create() {
      this.saveManager = window.SaveManager;
      this.levelData = window.LevelData;
      this.progress = this.saveManager.loadProgress();

      // Deep-link for testing/debugging: ?level=N starts gameplay directly
      const deepLink = parseInt(new URLSearchParams(window.location.search).get("level"), 10);
      if (deepLink >= 1 && deepLink <= this.levelData.getMaxLevel()) {
        this.scene.start("GameScene", { levelId: deepLink });
        return;
      }

      this.createBackground();
      this.createTitle();
      this.createLevelGrid();
      this.createProgressBar();
      this.createSettingsButton();

      // Handle resize
      this.scale.on("resize", this.onResize, this);
    }

    createBackground() {
      // Dark reactor chamber background
      const g = this.add.graphics();
      g.fillStyle(0x050912, 1);
      g.fillRect(0, 0, this.scale.width, this.scale.height);

      // Subtle grid lines
      g.lineStyle(1, 0x0a1a2f, 0.5);
      for (let x = 0; x < this.scale.width; x += 60) {
        g.moveTo(x, 0);
        g.lineTo(x, this.scale.height);
      }
      for (let y = 0; y < this.scale.height; y += 60) {
        g.moveTo(0, y);
        g.lineTo(this.scale.width, y);
      }
      g.strokePath();

      // Animated background atoms (reuse from game)
      this.createBackgroundParticles();
    }

    createBackgroundParticles() {
      this.bgAtoms = [];
      for (let i = 0; i < 30; i++) {
        const x = Phaser.Math.Between(0, this.scale.width);
        const y = Phaser.Math.Between(0, this.scale.height);
        const radius = Phaser.Math.FloatBetween(2, 6);
        const color = Phaser.Math.Between(0, 5) === 0 ? 0x00d4ff : (Phaser.Math.Between(0, 1) ? 0xffd60a : 0xff1a7b);
        const alpha = Phaser.Math.FloatBetween(0.15, 0.4);
        const atom = this.add.ellipse(x, y, radius * 2, radius * 2, color, alpha);
        atom.setData("vel", {
          x: Phaser.Math.FloatBetween(-0.3, 0.3),
          y: Phaser.Math.FloatBetween(-0.3, 0.3)
        });
        this.bgAtoms.push(atom);
      }
    }

    updateBackgroundParticles() {
      if (!this.bgAtoms) return;
      for (const atom of this.bgAtoms) {
        const vel = atom.getData("vel");
        atom.x += vel.x;
        atom.y += vel.y;

        if (atom.x < 0) atom.x = this.scale.width;
        if (atom.x > this.scale.width) atom.x = 0;
        if (atom.y < 0) atom.y = this.scale.height;
        if (atom.y > this.scale.height) atom.y = 0;
      }
    }

    createTitle() {
      this.add.text(this.scale.width / 2, 60, "ATOM SMASHER", {
        fontFamily: "Consolas, monospace",
        fontSize: "42px",
        color: "#00d4ff",
        fontStyle: "bold",
        stroke: "#00d4ff55",
        strokeThickness: 2
      }).setOrigin(0.5);

      this.add.text(this.scale.width / 2, 100, "SELECT REACTION CHAMBER", {
        fontFamily: "Consolas, monospace",
        fontSize: "16px",
        color: "#7fdbff"
      }).setOrigin(0.5);
    }

    createLevelGrid() {
      this.levelButtons = [];
      const levels = this.levelData.getAllLevels();
      const cols = 5;
      const rows = 2;
      const btnSize = 120;
      const gap = 20;
      const startX = (this.scale.width - (cols * btnSize + (cols - 1) * gap)) / 2;
      const startY = 160;

      for (let i = 0; i < levels.length; i++) {
        const level = levels[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * (btnSize + gap);
        const y = startY + row * (btnSize + gap);

        const unlocked = this.progress.unlockedLevels.includes(level.id);
        const stars = this.progress.stars[level.id] || 0;
        const highScore = this.progress.highScores[level.id] || 0;

        const btn = this.createLevelButton(x, y, btnSize, level, unlocked, stars, highScore);
        this.levelButtons.push({ level, btn, unlocked });
      }
    }

    createLevelButton(x, y, size, level, unlocked, stars, highScore) {
      const container = this.add.container(x + size / 2, y + size / 2);
      container.setSize(size, size);
      container.setData("levelId", level.id);

      // Background
      const bg = this.add.graphics();
      if (unlocked) {
        bg.fillStyle(0x0d2439, 1);
        bg.lineStyle(2, 0x00d4ff, 1);
      } else {
        bg.fillStyle(0x1a1a2e, 1);
        bg.lineStyle(2, 0x3a3a5a, 0.5);
      }
      bg.fillRoundedRect(-size/2, -size/2, size, size, 12);
      bg.strokeRoundedRect(-size/2, -size/2, size, size, 12);
      container.add(bg);

      // Lock icon if locked
      if (!unlocked) {
        const lock = this.add.image(0, -10, "icon_lock").setScale(0.8);
        container.add(lock);
      } else {
        // Level name
        const nameText = this.add.text(0, -30, level.name, {
          fontFamily: "Consolas, monospace",
          fontSize: "14px",
          color: "#7fdbff",
          wordWrap: { width: size - 20 }
        }).setOrigin(0.5);
        container.add(nameText);

        // Stars
        const starContainer = this.add.container(0, 5);
        for (let s = 0; s < 3; s++) {
          const star = this.add.image((s - 1) * 24, 0, s < stars ? "star_filled" : "star_empty").setScale(0.5);
          starContainer.add(star);
        }
        container.add(starContainer);

        // High score
        const scoreText = this.add.text(0, 35, `BEST: ${highScore.toLocaleString()}`, {
          fontFamily: "Consolas, monospace",
          fontSize: "12px",
          color: "#ffd60a"
        }).setOrigin(0.5);
        container.add(scoreText);
      }

      // Level number badge
      const badge = this.add.text(-size/2 + 12, -size/2 + 12, level.id.toString(), {
        fontFamily: "Consolas, monospace",
        fontSize: "18px",
        color: unlocked ? "#00d4ff" : "#3a3a5a",
        backgroundColor: "#050912",
        padding: { x: 6, y: 2 }
      }).setOrigin(0.5);
      container.add(badge);

      // Make interactive
      if (unlocked) {
        container.setInteractive(new Phaser.Geom.Rectangle(-size/2, -size/2, size, size), Phaser.Geom.Rectangle.Contains)
          .on("pointerover", () => {
            if (unlocked) {
              bg.clear();
              bg.fillStyle(0x143a5c, 1);
              bg.lineStyle(2, 0x00d4ff, 1);
              bg.fillRoundedRect(-size/2, -size/2, size, size, 12);
              bg.strokeRoundedRect(-size/2, -size/2, size, size, 12);
              container.setScale(1.02);
            }
          })
          .on("pointerout", () => {
            bg.clear();
            bg.fillStyle(0x0d2439, 1);
            bg.lineStyle(2, 0x00d4ff, 1);
            bg.fillRoundedRect(-size/2, -size/2, size, size, 12);
            bg.strokeRoundedRect(-size/2, -size/2, size, size, 12);
            container.setScale(1);
          })
          .on("pointerdown", () => this.startLevel(level.id));
      } else {
        container.setInteractive(new Phaser.Geom.Rectangle(-size/2, -size/2, size, size), Phaser.Geom.Rectangle.Contains)
          .on("pointerdown", () => this.showLockedMessage(level.id));
      }

      return container;
    }

    createProgressBar() {
      const totalStars = this.progress.totalStars || 0;
      const maxStars = 30;
      const y = this.scale.height - 100;

      // Progress container
      const container = this.add.container(this.scale.width / 2, y);

      // Background track
      const track = this.add.graphics();
      track.fillStyle(0x1a1a2e, 1);
      track.lineStyle(1, 0x3a3a5a, 1);
      track.fillRoundedRect(-150, -10, 300, 20, 10);
      track.strokeRoundedRect(-150, -10, 300, 20, 10);
      container.add(track);

      // Progress fill
      const fillWidth = (totalStars / maxStars) * 300;
      const fill = this.add.graphics();
      fill.fillStyle(0x00d4ff, 1);
      fill.fillRoundedRect(-150, -10, fillWidth, 20, 10);
      container.add(fill);

      // Star markers
      for (let i = 1; i <= 10; i++) {
        const x = -150 + (i / 10) * 300;
        const marker = this.add.graphics();
        marker.fillStyle(i * 3 <= totalStars ? 0xffd60a : 0x3a3a5a, 1);
        marker.fillCircle(x, 0, 4);
        container.add(marker);
      }

      // Label
      const label = this.add.text(0, -30, `TOTAL STABILITY: ${totalStars} / ${maxStars}`, {
        fontFamily: "Consolas, monospace",
        fontSize: "14px",
        color: "#7fdbff"
      }).setOrigin(0.5);
      container.add(label);
    }

    createSettingsButton() {
      const btn = this.add.text(this.scale.width - 30, 30, "⚙", {
        fontFamily: "Consolas, monospace",
        fontSize: "28px",
        color: "#7fdbff"
      }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

      btn.on("pointerdown", () => this.showSettings());
      btn.on("pointerover", () => btn.setColor("#00d4ff"));
      btn.on("pointerout", () => btn.setColor("#7fdbff"));
    }

    showSettings() {
      // Simple settings overlay
      const overlay = this.add.container(0, 0).setDepth(100);
      const dim = this.add.rectangle(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height, 0x000510, 0.86);
      const panel = this.add.graphics();
      panel.fillStyle(0x0d2439, 1);
      panel.lineStyle(2, 0x00d4ff, 1);
      panel.fillRoundedRect(this.scale.width/2 - 180, this.scale.height/2 - 120, 360, 240, 16);
      panel.strokeRoundedRect(this.scale.width/2 - 180, this.scale.height/2 - 120, 360, 240, 16);

      const title = this.add.text(this.scale.width/2, this.scale.height/2 - 100, "SETTINGS", {
        fontFamily: "Consolas, monospace", fontSize: "24px", color: "#00d4ff"
      }).setOrigin(0.5);

      const settings = this.saveManager.loadSettings();
      const options = [
        { key: "sound", label: "SOUND EFFECTS", value: settings.sound },
        { key: "music", label: "MUSIC", value: settings.music },
        { key: "particles", label: "PARTICLES", value: settings.particles },
        { key: "neonGlow", label: "NEON GLOW", value: settings.neonGlow },
        { key: "vibration", label: "VIBRATION", value: settings.vibration }
      ];

      const toggles = [];
      options.forEach((opt, i) => {
        const y = this.scale.height/2 - 60 + i * 40;
        const label = this.add.text(this.scale.width/2 - 140, y, opt.label, {
          fontFamily: "Consolas, monospace", fontSize: "16px", color: "#ffffff"
        }).setOrigin(0, 0.5);

        const toggle = this.add.container(this.scale.width/2 + 100, y);
        const track = this.add.graphics();
        track.fillStyle(opt.value ? 0x00d4ff : 0x3a3a5a, 1);
        track.fillRoundedRect(-30, -12, 60, 24, 12);
        const knob = this.add.ellipse(opt.value ? 15 : -15, 0, 20, 20, 0xffffff);
        toggle.add([track, knob]);
        toggle.setData("option", opt.key);
        toggle.setInteractive(new Phaser.Geom.Rectangle(-30, -12, 60, 24), Phaser.Geom.Rectangle.Contains)
          .on("pointerdown", () => this.toggleSetting(opt.key, track, knob));

        toggles.push({ toggle, track, knob });
      });

      const closeBtn = this.add.text(this.scale.width/2, this.scale.height/2 + 100, "CLOSE", {
        fontFamily: "Consolas, monospace", fontSize: "20px", color: "#7fdbff",
        backgroundColor: "#0d2439", padding: { x: 20, y: 8 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on("pointerdown", () => overlay.destroy(true));

      overlay.add([dim, panel, title, closeBtn]);
      for (const t of toggles) {
        overlay.add(t.toggle); // track + knob are children of the toggle container
      }
    }

    toggleSetting(key, track, knob) {
      const settings = this.saveManager.loadSettings();
      settings[key] = !settings[key];
      this.saveManager.saveSettings(settings);

      track.clear();
      track.fillStyle(settings[key] ? 0x00d4ff : 0x3a3a5a, 1);
      track.fillRoundedRect(-30, -12, 60, 24, 12);
      this.scene.tweens.add({
        targets: knob,
        x: settings[key] ? 15 : -15,
        duration: 150,
        ease: "Back.easeOut"
      });
    }

    showLockedMessage(levelId) {
      const msg = this.add.text(this.scale.width/2, this.scale.height/2,
        `CHAMBER ${levelId} LOCKED\nCOMPLETE PREVIOUS REACTION`, {
        fontFamily: "Consolas, monospace", fontSize: "20px", color: "#ff6b35",
        align: "center", backgroundColor: "#0d2439", padding: { x: 24, y: 16 }
      }).setOrigin(0.5).setDepth(100);

      this.time.delayedCall(2000, () => msg.destroy());
    }

    startLevel(levelId) {
      this.scene.start("GameScene", { levelId });
    }

    onResize() {
      // Recreate UI on resize
      this.children.removeAll(true);
      this.create();
    }

    update() {
      this.updateBackgroundParticles();
    }
  }

  return LevelSelectScene;
});