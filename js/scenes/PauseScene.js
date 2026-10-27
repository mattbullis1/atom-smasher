/* =========================================================
   Atom Smasher — Pause Scene
   Simple pause overlay with resume/menu options.
   ========================================================= */
(function (root, factory) {
  const PauseScene = factory();
  if (typeof module === "object" && module.exports) module.exports = PauseScene;
  root.PauseScene = PauseScene;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  class PauseScene extends Phaser.Scene {
    constructor() {
      super({ key: "PauseScene" });
    }

    create() {
      const gameScene = this.scene.get("GameScene");

      const overlay = this.add.container(0, 0).setDepth(300);
      const dim = this.add.rectangle(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height, 0x000510, 0.9);

      const title = this.add.text(this.scale.width/2, this.scale.height/2 - 80, "REACTION PAUSED", {
        fontFamily: "Consolas, monospace", fontSize: "32px", color: "#7fdbff"
      }).setOrigin(0.5);

      const btnResume = this.add.text(this.scale.width/2, this.scale.height/2, "RESUME", {
        fontFamily: "Consolas, monospace", fontSize: "28px", color: "#7fdbff",
        backgroundColor: "#0d2439", padding: { x: 32, y: 12 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.resumeGame())
        .on("pointerover", () => btnResume.setColor("#00d4ff"))
        .on("pointerout", () => btnResume.setColor("#7fdbff"));

      const btnRestart = this.add.text(this.scale.width/2, this.scale.height/2 + 80, "RESTART", {
        fontFamily: "Consolas, monospace", fontSize: "24px", color: "#ff6b35",
        backgroundColor: "#1a1a2e", padding: { x: 24, y: 10 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          this.scene.stop("GameScene");
          this.scene.start("GameScene", { levelId: gameScene.levelId });
          this.scene.stop();
        })
        .on("pointerover", () => btnRestart.setColor("#ffaa00"))
        .on("pointerout", () => btnRestart.setColor("#ff6b35"));

      const btnMenu = this.add.text(this.scale.width/2, this.scale.height/2 + 150, "CHAMBER SELECT", {
        fontFamily: "Consolas, monospace", fontSize: "22px", color: "#7fdbff",
        backgroundColor: "#1a1a2e", padding: { x: 20, y: 8 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          this.scene.stop("GameScene");
          this.scene.start("LevelSelectScene");
          this.scene.stop();
        })
        .on("pointerover", () => btnMenu.setColor("#00d4ff"))
        .on("pointerout", () => btnMenu.setColor("#7fdbff"));

      // Keyboard shortcuts
      this.input.keyboard.once("keydown-ESC", () => this.resumeGame());
      this.input.keyboard.once("keydown-P", () => this.resumeGame());

      overlay.add([dim, title, btnResume, btnRestart, btnMenu]);
    }

    resumeGame() {
      this.scene.resume("GameScene");
      this.scene.stop();
    }
  }

  return PauseScene;
});