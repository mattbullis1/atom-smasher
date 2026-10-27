/* =========================================================
   Atom Smasher — Booster Scene
   Pre-game powerup selection using star currency.
   ========================================================= */
(function (root, factory) {
  const BoosterScene = factory();
  if (typeof module === "object" && module.exports) module.exports = BoosterScene;
  root.BoosterScene = BoosterScene;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  class BoosterScene extends Phaser.Scene {
    constructor() {
      super({ key: "BoosterScene" });
    }

    init(data) {
      this.levelId = data.levelId || 1;
      this.saveManager = window.SaveManager;
      this.levelData = window.LevelData;
      this.progress = this.saveManager.loadProgress();
      this.selectedBoosters = new Set();
    }

    create() {
      this.createBackground();
      this.createTitle();
      this.createBoosters();
      this.createBottomBar();
      this.createSettingsButton();
    }

    createBackground() {
      const g = this.add.graphics();
      g.fillStyle(0x050912, 1);
      g.fillRect(0, 0, this.scale.width, this.scale.height);

      // Subtle grid
      g.lineStyle(1, 0x0a1a2f, 0.3);
      for (let x = 0; x < this.scale.width; x += 60) {
        g.moveTo(x, 0);
        g.lineTo(x, this.scale.height);
      }
      for (let y = 0; y < this.scale.height; y += 60) {
        g.moveTo(0, y);
        g.lineTo(this.scale.width, y);
      }
      g.strokePath();
    }

    createTitle() {
      const level = this.levelData.getLevel(this.levelId);
      this.add.text(this.scale.width / 2, 60, `CHAMBER ${this.levelId}: ${level.name}`, {
        fontFamily: "Consolas, monospace", fontSize: "28px", color: "#00d4ff", fontStyle: "bold"
      }).setOrigin(0.5);

      this.add.text(this.scale.width / 2, 95, "SELECT BOOSTERS", {
        fontFamily: "Consolas, monospace", fontSize: "16px", color: "#7fdbff"
      }).setOrigin(0.5);
    }

    createBoosters() {
      this.boosters = [
        {
          id: "moves",
          key: "booster_moves",
          name: "EXTRA MOVES",
          desc: "+5 Moves",
          cost: 3,
          maxLevel: 1
        },
        {
          id: "bomb",
          key: "booster_bomb",
          name: "COLOR BOMB",
          desc: "Start with a Color Bomb",
          cost: 5,
          maxLevel: 1
        },
        {
          id: "shuffle",
          key: "booster_shuffle",
          name: "SHUFFLE",
          desc: "Free reshuffle if stuck",
          cost: 4,
          maxLevel: 1
        },
        {
          id: "special",
          key: "booster_special",
          name: "SPECIAL START",
          desc: "Start with a Wrapped atom",
          cost: 6,
          maxLevel: 1
        }
      ];

      this.boosterCards = [];
      const cardWidth = 160;
      const cardHeight = 200;
      const gap = 20;
      const startX = (this.scale.width - (this.boosters.length * cardWidth + (this.boosters.length - 1) * gap)) / 2;
      const startY = 150;

      for (let i = 0; i < this.boosters.length; i++) {
        const b = this.boosters[i];
        const x = startX + i * (cardWidth + gap);
        const y = startY;

        const card = this.createBoosterCard(x, y, cardWidth, cardHeight, b, i);
        this.boosterCards.push({ booster: b, card, index: i });
      }
    }

    createBoosterCard(x, y, w, h, booster, index) {
      const container = this.add.container(x + w / 2, y + h / 2);
      container.setSize(w, h);
      container.setData("boosterId", booster.id);

      // Card background
      const bg = this.add.graphics();
      bg.fillStyle(0x0d2439, 1);
      bg.lineStyle(2, 0x00d4ff, 1);
      bg.fillRoundedRect(-w/2, -h/2, w, h, 12);
      bg.strokeRoundedRect(-w/2, -h/2, w, h, 12);
      container.add(bg);

      // Booster icon background
      const icon = this.add.image(0, -50, booster.key).setScale(0.8);
      container.add(icon);

      // Symbol overlay (since fillText doesn't work in Graphics)
      const symbolMap = { moves: "+5", bomb: "💣", shuffle: "↻", special: "★" };
      const symbol = this.add.text(0, -50, symbolMap[booster.id] || "", {
        fontFamily: "Consolas, monospace", fontSize: "24px", color: "#ffffff",
        fontStyle: "bold", stroke: "#000000", strokeThickness: 3
      }).setOrigin(0.5);
      container.add(symbol);

      // Name
      const nameText = this.add.text(0, -10, booster.name, {
        fontFamily: "Consolas, monospace", fontSize: "14px", color: "#00d4ff", fontStyle: "bold",
        wordWrap: { width: w - 20 }
      }).setOrigin(0.5);
      container.add(nameText);

      // Description
      const descText = this.add.text(0, 15, booster.desc, {
        fontFamily: "Consolas, monospace", fontSize: "12px", color: "#7fdbff", wordWrap: { width: w - 20 }
      }).setOrigin(0.5);
      container.add(descText);

      // Cost
      const costContainer = this.add.container(0, 55);
      const star = this.add.image(-30, 0, "star_filled").setScale(0.5);
      const costText = this.add.text(10, 0, booster.cost.toString(), {
        fontFamily: "Consolas, monospace", fontSize: "18px", color: "#ffd60a", fontStyle: "bold"
      }).setOrigin(0, 0.5);
      costContainer.add([star, costText]);
      container.add(costContainer);

      // Selection checkmark (hidden initially)
      const checkmark = this.add.text(w/2 - 18, -h/2 + 18, "✓", {
        fontFamily: "Consolas, monospace", fontSize: "24px", color: "#00ff88", fontStyle: "bold",
        backgroundColor: "#050912", padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setVisible(false);
      container.add(checkmark);
      container.checkmark = checkmark;

      // Owned indicator
      const owned = this.isBoosterOwned(booster.id);
      if (owned) {
        const ownedBadge = this.add.text(0, h/2 - 18, "OWNED", {
          fontFamily: "Consolas, monospace", fontSize: "11px", color: "#00ff88",
          backgroundColor: "#050912", padding: { x: 8, y: 2 }
        }).setOrigin(0.5);
        container.add(ownedBadge);
      }

      // Interactivity
      if (!owned) {
        container.setInteractive(new Phaser.Geom.Rectangle(-w/2, -h/2, w, h), Phaser.Geom.Rectangle.Contains)
          .on("pointerover", () => {
            bg.clear();
            bg.fillStyle(0x143a5c, 1);
            bg.lineStyle(2, 0x00d4ff, 1);
            bg.fillRoundedRect(-w/2, -h/2, w, h, 12);
            bg.strokeRoundedRect(-w/2, -h/2, w, h, 12);
            container.setScale(1.02);
          })
          .on("pointerout", () => {
            bg.clear();
            bg.fillStyle(0x0d2439, 1);
            bg.lineStyle(2, 0x00d4ff, 1);
            bg.fillRoundedRect(-w/2, -h/2, w, h, 12);
            bg.strokeRoundedRect(-w/2, -h/2, w, h, 12);
            container.setScale(1);
          })
          .on("pointerdown", () => this.toggleBooster(booster.id, container));
      } else {
        container.setInteractive(new Phaser.Geom.Rectangle(-w/2, -h/2, w, h), Phaser.Geom.Rectangle.Contains)
          .on("pointerdown", () => this.toggleBooster(booster.id, container));
      }

      return container;
    }

    isBoosterOwned(boosterId) {
      // Check if booster was purchased and available for this run
      // For M3, boosters are single-use per level attempt
      return false; // Not owned by default
    }

    toggleBooster(boosterId, container) {
      const booster = this.boosters.find(b => b.id === boosterId);
      if (!booster) return;

      const totalStars = this.progress.totalStars || 0;
      const selectedCount = this.selectedBoosters.size;
      const maxBoosters = 2; // Max 2 boosters per level

      if (this.selectedBoosters.has(boosterId)) {
        // Deselect
        this.selectedBoosters.delete(boosterId);
        container.checkmark.setVisible(false);
      } else {
        // Check cost
        if (booster.cost > totalStars) {
          this.showMessage("NOT ENOUGH STARS", `#ff6b35`);
          return;
        }
        if (selectedCount >= 2) {
          this.showMessage("MAX 2 BOOSTERS", `#ff6b35`);
          return;
        }
        // Select
        this.selectedBoosters.add(boosterId);
        container.checkmark.setVisible(true);
      }
      this.updateBottomBar();
    }

    createBottomBar() {
      this.bottomBar = this.add.container(this.scale.width / 2, this.scale.height - 80);
      this.updateBottomBar();
    }

    updateBottomBar() {
      if (this.bottomBar) this.bottomBar.destroy();

      this.bottomBar = this.add.container(this.scale.width / 2, this.scale.height - 80);
      this.bottomBar.setDepth(10);

      const totalStars = this.progress.totalStars || 0;
      const selectedCost = Array.from(this.selectedBoosters).reduce((sum, id) => {
        const b = this.boosters.find(x => x.id === id);
        return sum + (b ? b.cost : 0);
      }, 0);

      // Background
      const bg = this.add.graphics();
      bg.fillStyle(0x0d2439, 1);
      bg.lineStyle(2, 0x00d4ff, 1);
      bg.fillRoundedRect(-160, -30, 320, 60, 12);
      bg.strokeRoundedRect(-160, -30, 320, 60, 12);
      this.bottomBar.add(bg);

      // Stars available
      const star = this.add.image(-130, 0, "star_filled").setScale(0.6);
      const starsText = this.add.text(-100, 0, `${totalStars}`, {
        fontFamily: "Consolas, monospace", fontSize: "24px", color: "#ffd60a", fontStyle: "bold"
      }).setOrigin(0, 0.5);
      this.bottomBar.add([star, starsText]);

      // Cost
      const costLabel = this.add.text(-20, -15, "COST", {
        fontFamily: "Consolas, monospace", fontSize: "11px", color: "#7fdbff"
      }).setOrigin(0.5);
      const costText = this.add.text(-20, 10, `${selectedCost}`, {
        fontFamily: "Consolas, monospace", fontSize: "22px", color: selectedCost > totalStars ? "#ff6b35" : "#ffd60a", fontStyle: "bold"
      }).setOrigin(0.5);
      this.bottomBar.add([costLabel, costText]);

      // Selected count
      const countText = this.add.text(100, 0, `${this.selectedBoosters.size}/2`, {
        fontFamily: "Consolas, monospace", fontSize: "18px", color: "#7fdbff"
      }).setOrigin(0.5);
      this.bottomBar.add(countText);

      // Start button — boosters optional, start with 0 selected
      const canStart = selectedCost <= totalStars;
      const btn = this.add.text(140, 0, "START", {
        fontFamily: "Consolas, monospace", fontSize: "18px", color: canStart ? "#7fdbff" : "#3a3a5a",
        backgroundColor: canStart ? "#0d2439" : "#1a1a2e", padding: { x: 16, y: 6 }
      }).setOrigin(1, 0.5).setInteractive({ useHandCursor: canStart });

      if (canStart) {
        btn.on("pointerdown", () => this.startLevel());
        btn.on("pointerover", () => btn.setColor("#00d4ff"));
        btn.on("pointerout", () => btn.setColor("#7fdbff"));
      }
      this.bottomBar.add(btn);
    }

    createSettingsButton() {
      const btn = this.add.text(this.scale.width - 30, 30, "⚙", {
        fontFamily: "Consolas, monospace", fontSize: "28px", color: "#7fdbff"
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
      this.scene.tweens.add({
        targets: knob,
        x: settings[key] ? 15 : -15,
        duration: 150,
        ease: "Back.easeOut"
      });
    }

    showMessage(text, color) {
      const msg = this.add.text(this.scale.width/2, this.scale.height/2, text, {
        fontFamily: "Consolas, monospace", fontSize: "24px", color: color,
        backgroundColor: "#0d2439", padding: { x: 24, y: 12 }
      }).setOrigin(0.5).setDepth(100);

      this.time.delayedCall(1500, () => msg.destroy());
    }

    startLevel() {
      const selectedCost = Array.from(this.selectedBoosters).reduce((sum, id) => {
        const b = this.boosters.find(x => x.id === id);
        return sum + (b ? b.cost : 0);
      }, 0);

      const totalStars = this.progress.totalStars || 0;
      if (selectedCost > totalStars) {
        this.showMessage("NOT ENOUGH STARS", "#ff6b35");
        return;
      }

      // Deduct stars
      this.progress.totalStars -= selectedCost;
      this.saveManager.saveProgress(this.progress);

      // Record selected boosters for level start
      const boosterData = Array.from(this.selectedBoosters);
      this.scene.start("GameScene", { levelId: this.levelId, boosters: boosterData });
    }
  }

  return BoosterScene;
});