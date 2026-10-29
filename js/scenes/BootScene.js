/* =========================================================
   Atom Smasher — Boot Scene
   Loads assets via AssetManifest, generates procedural fallbacks,
   initializes AudioManager and core systems.
   ========================================================= */
(function (root, factory) {
  const BootScene = factory();
  if (typeof module === "object" && module.exports) module.exports = BootScene;
  root.BootScene = BootScene;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  class BootScene extends Phaser.Scene {
    constructor() {
      super({ key: "BootScene", active: false });
    }

    preload() {
      // Initialize AssetManifest and load external assets if available
      this.assetManifest = new window.AssetManifest("assets/");
      this.assetManifest.loadViaPhaser(this.load);

      // Show loading progress
      const progressBar = this.add.graphics();
      const progressBox = this.add.graphics();
      progressBox.fillStyle(0x1a1a2e, 0.8);
      progressBox.fillRoundedRect(this.scale.width / 2 - 160, this.scale.height / 2 - 25, 320, 50, 10);

      const loadingText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 50, "INITIALIZING REACTOR...", {
        fontFamily: "Consolas, monospace", fontSize: "24px", color: "#00d4ff"
      }).setOrigin(0.5);

      const percentText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 5, "0%", {
        fontFamily: "Consolas, monospace", fontSize: "28px", color: "#7fdbff"
      }).setOrigin(0.5);

      this.load.on("progress", (value) => {
        progressBar.clear();
        progressBar.fillStyle(0x00d4ff, 1);
        progressBar.fillRoundedRect(this.scale.width / 2 - 150, this.scale.height / 2 - 15, 300 * value, 30, 5);
        percentText.setText(Math.round(value * 100) + "%");
      });

      this.load.on("complete", () => {
        progressBar.destroy();
        progressBox.destroy();
        loadingText.destroy();
        percentText.destroy();
      });
    }

    create() {
      try {
        this.initializeCoreSystems();
        this.generateTextures();
        this.initializeAudio();
        this.enableAudioOnInteraction();
        this.checkExternalAssets();

        const levelParam = parseInt(new URLSearchParams(window.location.search).get("level"), 10);
        if (levelParam >= 1 && levelParam <= 50) {
          this.scene.start("GameScene", { levelId: levelParam });
        } else {
          this.scene.start("WorldMapScene");
        }
      } catch (e) {
        console.error("Boot crash:", e);
        document.body.innerHTML = '<div style="color:#ff4444;font-family:monospace;font-size:18px;padding:40px;background:#050912">BOOT ERROR: ' + (e.message || e) + '</div>';
      }
    }

    checkExternalAssets() {
      // Non-blocking check for external assets
      this.assetManifest.hasAnyAssets().then(hasAssets => {
        if (!hasAssets) {
          console.log("No external assets found — using procedural generation");
        } else {
          console.log("External assets detected");
        }
      }).catch(() => {
        console.log("Asset check failed — using procedural generation");
      });
    }

    initializeCoreSystems() {
      // Make core classes globally accessible to other scenes
      this.game.registry.set("AtomTypes", window.AtomTypes);
      this.game.registry.set("ObstacleTypes", window.ObstacleTypes);
      this.game.registry.set("LevelData", window.LevelData);
      this.game.registry.set("SaveManager", window.SaveManager);
      this.game.registry.set("BoardModel", window.BoardModel);
      this.game.registry.set("AssetManifest", this.assetManifest);

      // Also attach to scene for easy access
      this.AtomTypes = window.AtomTypes;
      this.ObstacleTypes = window.ObstacleTypes;
      this.LevelData = window.LevelData;
      this.SaveManager = window.SaveManager;
      this.BoardModel = window.BoardModel;
    }

    generateTextures() {
      const textureFactory = new window.TextureFactory(this, this.assetManifest);
      textureFactory.generateAll(this.AtomTypes, this.ObstacleTypes);

      // Store factory for other scenes
      this.game.registry.set("TextureFactory", textureFactory);
      this.textureFactory = textureFactory;
    }

    initializeAudio() {
      this.audioManager = new window.AudioManager(this);
      this.game.registry.set("AudioManager", this.audioManager);
      this.AudioManager = this.audioManager;
    }

    enableAudioOnInteraction() {
      const unlockAudio = () => {
        // Initialize Web Audio context on first interaction (browser requirement)
        if (this.audioManager) this.audioManager.initAudioContext();
        if (this.audioManager && this.audioManager.audioContext && this.audioManager.audioContext.state === "suspended") {
          this.audioManager.audioContext.resume();
        }
        // Remove listeners after first interaction
        this.input.off("pointerdown", unlockAudio);
        this.input.keyboard.off("keydown", unlockAudio);
      };
      this.input.on("pointerdown", unlockAudio, this);
      this.input.keyboard.on("keydown", unlockAudio, this);
    }
  }

  return BootScene;
});