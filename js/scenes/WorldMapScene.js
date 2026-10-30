/* =========================================================
   Atom Smasher — World Map Scene
   50 levels, star gates, branching paths, replay any level.
   ========================================================= */
(function (root, factory) {
  const WorldMapScene = factory();
  if (typeof module === "object" && module.exports) module.exports = WorldMapScene;
  root.WorldMapScene = WorldMapScene;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  class WorldMapScene extends Phaser.Scene {
    constructor() {
      super({ key: "WorldMapScene" });
    }

    create() {
      try {
        this.saveManager = window.SaveManager;
        this.levelData = window.LevelData;
        this.progress = this.saveManager.loadProgress();

        this.createBackground();
        this.createTitle();
        this.createMapNodes();
        this.createPathLines();
        this.createLegend();
        this.createSettingsButton();

        // Handle resize — register only ONCE. create() is re-run by onResize(),
        // so re-registering here would multiply listeners and blow the stack.
        if (!this._resizeListenerAdded) {
          this._resizeListenerAdded = true;
          this.scale.on("resize", this.onResize, this);
          this.events.once("shutdown", () => {
            this.scale.off("resize", this.onResize, this);
            this._resizeListenerAdded = false;
          });
        }
      } catch (e) {
        console.error("WorldMapScene crash:", e);
        document.body.innerHTML = '<div style="color:#ff4444;font-family:monospace;font-size:18px;padding:40px;background:#050912">MAP ERROR: ' + (e.message || e) + '</div>';
      }
    }

    createBackground() {
      // Deep space reactor background
      const g = this.add.graphics();
      g.fillStyle(0x03050a, 1);
      g.fillRect(0, 0, this.scale.width, this.scale.height);

      // Plasma nebula clouds (animated color-shifting)
      this.plasmaClouds = [];
      for (let i = 0; i < 6; i++) {
        const cloud = this.add.graphics();
        const x = Phaser.Math.Between(0, this.scale.width);
        const y = Phaser.Math.Between(0, this.scale.height);
        const r = Phaser.Math.Between(200, 400);
        cloud.fillStyle(0x00d4ff, 0.04);
        cloud.fillCircle(x, y, r);
        cloud.setAlpha(0);
        this.plasmaClouds.push({ g: cloud, x, y, r, hue: i * 60, speed: Phaser.Math.FloatBetween(0.5, 2) });
      }

      // Grid lines
      g.lineStyle(0.5, 0x0a1a2f, 0.3);
      for (let x = 0; x < this.scale.width; x += 80) {
        g.moveTo(x, 0);
        g.lineTo(x, this.scale.height);
      }
      for (let y = 0; y < this.scale.height; y += 80) {
        g.moveTo(0, y);
        g.lineTo(this.scale.width, y);
      }
      g.strokePath();

      // Animated background particles
      this.createBackgroundParticles();
    }

    updatePlasmaClouds() {
      if (!this.plasmaClouds) return;
      const time = this.time.now * 0.001;
      for (const cloud of this.plasmaClouds) {
        const alpha = 0.03 + Math.sin(time * cloud.speed + cloud.hue) * 0.02;
        cloud.g.clear();
        cloud.g.fillStyle(0x00d4ff, alpha);
        cloud.g.fillCircle(cloud.x, cloud.y, cloud.r);
        cloud.g.setAlpha(Phaser.Math.Clamp(alpha, 0, 0.15));
      }
    }

    createBackgroundParticles() {
      this.bgParticles = [];
      for (let i = 0; i < 40; i++) {
        const x = Phaser.Math.Between(0, this.scale.width);
        const y = Phaser.Math.Between(0, this.scale.height);
        const radius = Phaser.Math.FloatBetween(1, 4);
        const color = Phaser.Math.Between(0, 2) === 0 ? 0x00d4ff : (Phaser.Math.Between(0, 1) ? 0xffd60a : 0xff1a7b);
        const alpha = Phaser.Math.FloatBetween(0.1, 0.3);
        const p = this.add.ellipse(x, y, radius * 2, radius * 2, color, alpha);
        p.setData("vel", {
          x: Phaser.Math.FloatBetween(-0.2, 0.2),
          y: Phaser.Math.FloatBetween(-0.2, 0.2)
        });
        this.bgParticles.push(p);
      }
    }

    updateBackgroundParticles() {
      if (!this.bgParticles) return;
      for (const p of this.bgParticles) {
        const vel = p.getData("vel");
        p.x += vel.x;
        p.y += vel.y;
        if (p.x < 0) p.x = this.scale.width;
        if (p.x > this.scale.width) p.x = 0;
        if (p.y < 0) p.y = this.scale.height;
        if (p.y > this.scale.height) p.y = 0;
      }
    }

    createTitle() {
      this.add.text(this.scale.width / 2, 40, "REACTOR NETWORK", {
        fontFamily: "Consolas, monospace",
        fontSize: "36px",
        color: "#00d4ff",
        fontStyle: "bold",
        stroke: "#00d4ff55",
        strokeThickness: 2
      }).setOrigin(0.5);

      this.add.text(this.scale.width / 2, 75, "SELECT CHAMBER", {
        fontFamily: "Consolas, monospace",
        fontSize: "16px",
        color: "#7fdbff"
      }).setOrigin(0.5);

      // Total stars
      const totalStars = this.progress.totalStars || 0;
      this.add.text(this.scale.width / 2, 100, `TOTAL STABILITY: ${totalStars} / 150`, {
        fontFamily: "Consolas, monospace",
        fontSize: "14px",
        color: "#ffd60a"
      }).setOrigin(0.5);
    }

    createMapNodes() {
      this.nodeContainers = [];
      const levels = this.levelData.getAllLevels();
      const maxLevel = levels.length;

      // Layout: 5 columns x 10 rows, but with branching
      // Using a curved path layout
      const positions = this.calculateNodePositions(maxLevel);

      for (let i = 0; i < maxLevel; i++) {
        const level = levels[i];
        const pos = positions[i];
        const levelId = level.id;

        const unlocked = this.progress.unlockedLevels.includes(levelId);
        const stars = this.progress.stars[levelId] || 0;
        const highScore = this.progress.highScores[levelId] || 0;
        const isCurrent = this.progress.currentLevel === levelId;

        const node = this.createMapNode(
          pos.x, pos.y,
          levelId, level.name,
          unlocked, stars, highScore,
          isCurrent, i === maxLevel - 1
        );
        this.nodeContainers.push({ levelId, node, pos, unlocked });
      }
    }

    calculateNodePositions(count) {
      // Create a winding path with branches
      const positions = [];
      const cols = 5;
      const rows = Math.ceil(count / cols);
      const paddingX = 60;
      const paddingY = 100;
      const startX = (this.scale.width - (cols - 1) * paddingX) / 2;
      const startY = 150;

      // Zigzag pattern with occasional branches
      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);

        // Alternate direction per row for zigzag
        const actualCol = row % 2 === 0 ? col : cols - 1 - col;

        let x = startX + actualCol * paddingX;
        let y = startY + row * paddingY;

        // Add some organic variation
        x += Phaser.Math.Between(-8, 8);
        y += Phaser.Math.Between(-8, 8);

        positions.push({ x, y, row, col: actualCol });
      }

      return positions;
    }

    createPathLines() {
      this.pathGraphics = this.add.graphics();
      this.pathGraphics.setDepth(5);

      const positions = this.nodeContainers.map(n => n.pos);
      for (let i = 0; i < positions.length - 1; i++) {
        const a = positions[i];
        const b = positions[i + 1];

        // Check if next node is unlocked
        const nextUnlocked = this.nodeContainers[i + 1].unlocked;
        const currentUnlocked = this.nodeContainers[i].unlocked;

        if (currentUnlocked || nextUnlocked) {
          // Active path
          this.pathGraphics.lineStyle(3, 0x00d4ff, 0.6);
        } else {
          // Locked path
          this.pathGraphics.lineStyle(2, 0x3a3a5a, 0.3);
        }

        // Straight line (Phaser Graphics has no quadraticCurveTo)
        this.pathGraphics.beginPath();
        this.pathGraphics.moveTo(a.x, a.y);
        this.pathGraphics.lineTo(b.x, b.y);
        this.pathGraphics.strokePath();

        // Arrow indicator at end of active path
        if (currentUnlocked && nextUnlocked && i < positions.length - 2) {
          this.drawArrow(a.x, a.y, b.x, b.y, 0x00d4ff, 0.6);
        }
      }
    }

    drawArrow(x1, y1, x2, y2, color, alpha) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 20) return;

      // Position arrow at 70% along path
      const ax = x1 + dx * 0.7;
      const ay = y1 + dy * 0.7;
      const angle = Math.atan2(dy, dx);

      this.pathGraphics.fillStyle(color, alpha);
      this.pathGraphics.beginPath();
      this.pathGraphics.moveTo(
        ax + Math.cos(angle) * 10,
        ay + Math.sin(angle) * 10
      );
      this.pathGraphics.lineTo(
        ax + Math.cos(angle - 2.5) * 10,
        ay + Math.sin(angle - 2.5) * 10
      );
      this.pathGraphics.lineTo(
        ax + Math.cos(angle + 2.5) * 10,
        ay + Math.sin(angle + 2.5) * 10
      );
      this.pathGraphics.fillPath();
    }

    createMapNode(x, y, levelId, levelName, unlocked, stars, highScore, isCurrent, isFinal) {
      const container = this.add.container(x, y);
      container.setSize(80, 80);
      container.setData("levelId", levelId);

      // Node background
      const nodeSize = isFinal ? 56 : 48;
      const bg = this.add.image(0, 0, unlocked
        ? (isCurrent ? "map_node_current" : (stars >= 3 ? "map_node_complete" : "map_node_unlocked"))
        : "map_node_locked");
      bg.setDisplaySize(nodeSize, nodeSize);
      container.add(bg);

      // Level number
      const numText = this.add.text(0, isFinal ? 8 : 0, levelId.toString(), {
        fontFamily: "Consolas, monospace",
        fontSize: isFinal ? "18px" : "14px",
        color: unlocked ? (isCurrent ? "#00d4ff" : (stars >= 3 ? "#ffd60a" : "#7fdbff")) : "#3a3a5a",
        fontStyle: isCurrent ? "bold" : "normal"
      }).setOrigin(0.5);
      container.add(numText);

      // Stars (only for unlocked, non-current)
      if (unlocked && !isCurrent && stars > 0) {
        const starY = isFinal ? -22 : -18;
        const starContainer = this.add.container(0, starY);
        for (let s = 0; s < stars; s++) {
          const star = this.add.image((s - 1) * 14, 0, "star_filled").setScale(0.35);
          starContainer.add(star);
        }
        container.add(starContainer);
      }

      // Final level badge
      if (isFinal) {
        const badge = this.add.text(0, 38, "FINAL", {
          fontFamily: "Consolas, monospace",
          fontSize: "10px",
          color: stars >= 3 ? "#ffd60a" : (unlocked ? "#00ff88" : "#3a3a5a"),
          backgroundColor: "#050912",
          padding: { x: 6, y: 2 }
        }).setOrigin(0.5);
        container.add(badge);
      }

      // Lock overlay if locked
      if (!unlocked) {
        const lock = this.add.image(0, -2, "icon_lock").setScale(0.5);
        lock.setTint(0x3a3a5a);
        container.add(lock);
      }

      // Make interactive
      if (unlocked) {
        bg.setInteractive({ useHandCursor: true })
          .on("pointerover", () => {
            container.setScale(1.1);
            this.showLevelTooltip(container, levelId, levelName, stars, highScore);
          })
          .on("pointerout", () => {
            container.setScale(1);
            this.hideLevelTooltip();
          })
          .on("pointerdown", () => {
            if (window.AudioManager) this.scene.get("BootScene").AudioManager?.playButton();
            this.startLevel(levelId);
          });
      } else {
        bg.setInteractive({ useHandCursor: true })
          .on("pointerdown", () => this.showLockedMessage(levelId));
      }

      // Pulse animation for current level
      if (isCurrent) {
        this.tweens.add({
          targets: bg,
          scale: { from: 1, to: 1.15 },
          duration: 1000,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
      }

      return container;
    }

    showLevelTooltip(container, levelId, levelName, stars, highScore) {
      if (this.tooltip) this.tooltip.destroy();

      const level = this.levelData.getLevel(levelId);
      this.tooltip = this.add.container(this.scale.width / 2, this.scale.height - 120);
      this.tooltip.setDepth(50);

      const bg = this.add.graphics();
      bg.fillStyle(0x0d2439, 0.95);
      bg.lineStyle(2, 0x00d4ff, 1);
      bg.fillRoundedRect(-160, -50, 320, 100, 12);
      bg.strokeRoundedRect(-160, -50, 320, 100, 12);
      this.tooltip.add(bg);

      const nameText = this.add.text(0, -40, `CHAMBER ${levelId}: ${levelName}`, {
        fontFamily: "Consolas, monospace", fontSize: "16px", color: "#00d4ff", fontStyle: "bold"
      }).setOrigin(0.5);
      this.tooltip.add(nameText);

      const descText = this.add.text(0, -15, level.description, {
        fontFamily: "Consolas, monospace", fontSize: "12px", color: "#7fdbff", wordWrap: { width: 300 }
      }).setOrigin(0.5);
      this.tooltip.add(descText);

      const starsText = this.add.text(-150, 15, `★ ${stars}/3`, {
        fontFamily: "Consolas, monospace", fontSize: "14px", color: "#ffd60a"
      }).setOrigin(0.5);
      this.tooltip.add(starsText);

      const scoreText = this.add.text(150, 15, `BEST: ${highScore.toLocaleString()}`, {
        fontFamily: "Consolas, monospace", fontSize: "14px", color: "#ffd60a"
      }).setOrigin(0.5);
      this.tooltip.add(scoreText);
    }

    hideLevelTooltip() {
      if (this.tooltip) {
        this.tooltip.destroy();
        this.tooltip = null;
      }
    }

    createLegend() {
      const legend = this.add.container(this.scale.width - 120, this.scale.height - 140);
      legend.setDepth(10);

      const items = [
        { icon: "map_node_current", label: "CURRENT" },
        { icon: "map_node_complete", label: "MASTERED (3★)" },
        { icon: "map_node_unlocked", label: "AVAILABLE" },
        { icon: "map_node_locked", label: "LOCKED" }
      ];

      for (let i = 0; i < items.length; i++) {
        const y = i * 28;
        const icon = this.add.image(-80, y, items[i].icon).setScale(0.5);
        const label = this.add.text(-50, y, items[i].label, {
          fontFamily: "Consolas, monospace", fontSize: "12px", color: "#7fdbff"
        }).setOrigin(0, 0.5);
        legend.add([icon, label]);
      }
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
      for (const t of toggles) overlay.add(t.toggle);
    }

    toggleSetting(key, track, knob) {
      const settings = this.saveManager.loadSettings();
      settings[key] = !settings[key];
      this.saveManager.saveSettings(settings);

      track.clear();
      track.fillStyle(settings[key] ? 0x00d4ff : 0x3a3a5a, 1);
      track.fillRoundedRect(-30, -12, 60, 24, 12);
      this.tweens.add({
        targets: knob,
        x: settings[key] ? 15 : -15,
        duration: 150,
        ease: "Back.easeOut"
      });
    }

    showLockedMessage(levelId) {
      const msg = this.add.text(this.scale.width/2, this.scale.height/2,
        `CHAMBER ${levelId} LOCKED\nEARN STARS TO UNLOCK`, {
        fontFamily: "Consolas, monospace", fontSize: "20px", color: "#ff6b35",
        align: "center", backgroundColor: "#0d2439", padding: { x: 24, y: 16 }
      }).setOrigin(0.5).setDepth(100);

      this.time.delayedCall(2000, () => msg.destroy());
    }

    startLevel(levelId) {
      // Launch booster scene first (if boosters available)
      if (this.progress.unlockedLevels.includes(levelId) && levelId > 1) {
        this.scene.start("BoosterScene", { levelId });
      } else {
        this.scene.start("GameScene", { levelId });
      }
    }

    onResize() {
      this.children.removeAll(true);
      this.create();
    }

    update() {
      this.updateBackgroundParticles();
      this.updatePlasmaClouds();
    }
  }

  return WorldMapScene;
});