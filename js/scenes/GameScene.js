/* =========================================================
   Atom Smasher — Game Scene (Main Gameplay)
   Handles board rendering, input, cascades, combos, goals.
   ========================================================= */
(function (root, factory) {
  const GameScene = factory();
  if (typeof module === "object" && module.exports) module.exports = GameScene;
  root.GameScene = GameScene;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  class GameScene extends Phaser.Scene {
    constructor() {
      super({ key: "GameScene" });
    }

    init(data) {
      this.levelId = data.levelId || 1;
      this.resumeData = data.resumeData || null;
    }

    create() {
      try {
      // Get core systems from registry
      this.AtomTypes = this.game.registry.get("AtomTypes");
      this.ObstacleTypes = this.game.registry.get("ObstacleTypes");
      this.LevelData = this.game.registry.get("LevelData");
      this.SaveManager = this.game.registry.get("SaveManager");
      this.BoardModel = this.game.registry.get("BoardModel");
      this.TextureFactory = this.game.registry.get("TextureFactory");
      this.AudioManager = this.game.registry.get("AudioManager");
      this.ParticleManager = new window.ParticleManager(this, this.AtomTypes);

      // Load level data
      this.level = this.LevelData.getLevel(this.levelId);

      // Initialize board model
      this.initBoard();

      // Handle boosters from pre-game selection
      if (this.boosters) {
        this.applyBoosters(this.boosters);
      }

      // Layout calculations
      this.cellSize = 82;
      this.boardPx = this.cellSize * 8;
      this.originX = (this.scale.width - this.boardPx) / 2;
      this.originY = 220;

      // Create renderer
      this.renderer = new window.AtomRenderer(this, this.board, this.TextureFactory);
      this.renderer.setBoardPosition(this.originX, this.originY);

      // Create swap controller
      this.swapController = new window.SwapController(this, this.board, this.renderer, {
        onValidSwap: (a, b, done) => this.onValidSwap(a, b, done),
        onInvalidSwap: (a, b) => this.onInvalidSwap(a, b)
      });

      // Game state
      this.busy = false;
      this.waveIndex = 0;
      this.selectedPos = null;
      this.comboLevel = 0;
      this.specialsCreated = 0;

      // Build UI
      this.createBackground();
      this.buildBoard();
      this.buildHUD();

      // Input
      this.input.on("pointerdown", (p) => this.swapController.onPointerDown(p));
      this.input.on("pointerup", (p) => this.swapController.onPointerUp(p));
      this.input.on("pointermove", (p) => this.swapController.onPointerMove(p));
      this.input.keyboard.on("keydown", (e) => this.swapController.onKeyDown(e));

      // Pause/resume handling
      this.game.events.on("pause", () => this.onPause(), this);
      this.game.events.on("resume", () => this.onResume(), this);

      // Initial settle delay
      this.busy = true;
      this.time.delayedCall(300, () => { this.busy = false; });

      // Start ambient music
      if (this.AudioManager) {
        this.AudioManager.playMusic("music_ambient", "ambient");
      }
      } catch (e) {
        console.error("GameScene crash:", e);
        document.body.innerHTML = '<div style="color:#ff4444;font-family:monospace;font-size:16px;padding:40px;background:#050912">GAME ERROR: ' + (e.message || e) + '</div>';
      }
    }

    initBoard() {
      if (this.resumeData) {
        // Restore from snapshot
        this.board = this.BoardModel.fromJSON(this.resumeData.board, {
          rows: 8, cols: 8, types: this.level.atomTypes
        });
        this.board.movesLeft = this.resumeData.movesLeft;
        this.board.collected = this.resumeData.collected;
        this.board.waveIndex = this.resumeData.waveIndex;
      } else {
        // New game
        this.board = new this.BoardModel({
          rows: 8, cols: 8, types: this.level.atomTypes
        });
        this.board.generateLevel(this.level);
      }
    }

    applyBoosters(boosterIds) {
      for (const id of boosterIds) {
        switch (id) {
          case "moves":
            this.board.movesLeft += 5;
            break;
          case "bomb":
            // Add a color bomb at a random position (will be placed after board gen)
            this.pendingColorBomb = true;
            break;
          case "shuffle":
            this.freeReshuffle = true;
            break;
          case "special":
            this.pendingWrapped = true;
            break;
        }
      }
      // Apply pending specials after board generation
      if (this.pendingColorBomb || this.pendingWrapped) {
        this.time.delayedCall(100, () => this.placePendingSpecials());
      }
    }

    placePendingSpecials() {
      const emptyCells = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (this.board.getObstacle(r, c) === this.ObstacleTypes.OBSTACLE.NONE) {
            emptyCells.push({ r, c });
          }
        }
      }
      if (emptyCells.length === 0) return;

      if (this.pendingColorBomb) {
        const pos = Phaser.Utils.Array.GetRandom(emptyCells);
        const ATOM = this.board.constructor.ATOM;
        this.board.set(pos.r, pos.c, pos.atom | ATOM.COLOR_BOMB_FLAG);
        this.pendingColorBomb = false;
      }
      if (this.pendingWrapped) {
        const pos = Phaser.Utils.Array.GetRandom(emptyCells);
        const ATOM = this.board.constructor.ATOM;
        this.board.set(pos.r, pos.c, pos.atom | ATOM.WRAPPED_FLAG);
        this.pendingWrapped = false;
      }
      this.renderer.rebuildAll(false);
    }

    createBackground() {
      // Reactor chamber backdrop
      const g = this.add.graphics();
      g.fillStyle(0x050912, 1);
      g.fillRect(0, 0, this.scale.width, this.scale.height);

      // Plasma nebula clouds
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

      // Chamber frame
      g.fillStyle(0x0a1a2f, 1);
      g.fillRoundedRect(this.originX - 12, this.originY - 12, this.boardPx + 24, this.boardPx + 24, 18);
      g.lineStyle(2, 0x1a4a74, 1);
      g.strokeRoundedRect(this.originX - 12, this.originY - 12, this.boardPx + 24, this.boardPx + 24, 18);

      // Cell backgrounds
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          this.add.image(
            this.originX + c * this.cellSize + this.cellSize / 2,
            this.originY + r * this.cellSize + this.cellSize / 2,
            "cell_bg"
          );
        }
      }

      // Title
      this.add.text(this.scale.width / 2, 40, `CHAMBER ${this.levelId}: ${this.level.name}`, {
        fontFamily: "Consolas, monospace", fontSize: "24px", color: "#00d4ff", fontStyle: "bold"
      }).setOrigin(0.5);
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

    buildBoard() {
      // Instant layout (no stagger) — avoids long intro delays on low-end devices
      this.renderer.buildAllSprites(false);
    }

    buildHUD() {
      const style = { fontFamily: "Consolas, monospace", fontSize: "22px" };

      // Moves left
      this.txtMoves = this.add.text(20, 120, `MOVES: ${this.board.movesLeft}`, {
        ...style, color: "#7fdbff"
      }).setOrigin(0, 0.5);

      // Score
      this.txtScore = this.add.text(this.scale.width / 2, 120, `SCORE: ${this.board.collected.score}`, {
        ...style, color: "#ffd60a"
      }).setOrigin(0.5);

      // Wave/Combo
      this.txtWave = this.add.text(this.scale.width - 20, 120, `WAVE: 0`, {
        ...style, color: "#00ff88"
      }).setOrigin(1, 0.5);

      // Diagnostic step display (shows where animation chain is)
      this.txtStep = this.add.text(20, 150, "STEP: idle", {
        fontFamily: "Consolas, monospace", fontSize: "16px", color: "#7fdbff"
      }).setOrigin(0, 0.5).setAlpha(0.7);

      // Goals display
      this.createGoalsHUD();

      // Status message
      this.txtStatus = this.add.text(this.scale.width / 2, this.scale.height - 40, "", {
        fontFamily: "Consolas, monospace", fontSize: "18px", color: "#7fdbff"
      }).setOrigin(0.5);

      // Restart button (top right)
      this.btnRestart = this.add.text(this.scale.width - 30, 30, "↻", {
        fontFamily: "Consolas, monospace", fontSize: "28px", color: "#7fdbff",
        backgroundColor: "#0d2439", padding: { x: 10, y: 6 }
      }).setOrigin(1, 0).setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.confirmRestart())
        .on("pointerover", () => this.btnRestart.setColor("#00d4ff"))
        .on("pointerout", () => this.btnRestart.setColor("#7fdbff"));

      // Pause button (top left)
      this.btnPause = this.add.text(30, 30, "⏸", {
        fontFamily: "Consolas, monospace", fontSize: "28px", color: "#7fdbff",
        backgroundColor: "#0d2439", padding: { x: 10, y: 6 }
      }).setOrigin(0, 0).setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.pauseGame())
        .on("pointerover", () => this.btnPause.setColor("#00d4ff"))
        .on("pointerout", () => this.btnPause.setColor("#7fdbff"));
    }

    createGoalsHUD() {
      const goals = this.level.goals;
      let y = 150;
      const goalTexts = [];

      if (goals.score) {
        goalTexts.push({ label: "TARGET", value: goals.score.toLocaleString(), current: this.board.collected.score, color: "#ffd60a" });
      }
      if (goals.obstacles) {
        goalTexts.push({ label: "CLEAR", value: goals.obstacles, current: this.board.collected.obstaclesCleared, color: "#00ff88" });
      }
      if (goals.collect) {
        const atomDef = this.AtomTypes.getAtom(goals.collect.type);
        goalTexts.push({ label: `COLLECT ${atomDef.symbol}`, value: goals.collect.count, current: this.board.collected.atoms[goals.collect.type], color: atomDef.neonColor });
      }
      if (goals.survive) {
        goalTexts.push({ label: "SURVIVE", value: goals.moves, current: this.board.movesLeft, color: "#7fdbff" });
      }

      this.goalContainers = [];
      for (let i = 0; i < goalTexts.length; i++) {
        const g = goalTexts[i];
        const x = 80 + i * 160;
        const y = 178; // below the MOVES/SCORE/WAVE row
        const container = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0x0a1a2f, 0.8);
        bg.lineStyle(1, g.color, 0.5);
        bg.fillRoundedRect(-70, -15, 140, 30, 8);
        bg.strokeRoundedRect(-70, -15, 140, 30, 8);
        container.add(bg);

        const label = this.add.text(0, -18, g.label, {
          fontFamily: "Consolas, monospace", fontSize: "10px", color: "#7fdbff"
        }).setOrigin(0.5);
        container.add(label);

        const value = this.add.text(0, 4, `${g.current} / ${g.value}`, {
          fontFamily: "Consolas, monospace", fontSize: "16px", color: g.color
        }).setOrigin(0.5);
        container.add(value);

        this.goalContainers.push({ container, value, goal: g });
      }
    }

    updateHUD() {
      try {
        this.txtMoves.setText(`MOVES: ${this.board.movesLeft}`);
        this.txtScore.setText(`SCORE: ${this.board.collected.score}`);
        this.txtWave.setText(`WAVE: ${this.waveIndex}`);

        // Update goals
        for (const gc of this.goalContainers) {
          const g = gc.goal;
          let current = 0;
          if (g.label === "TARGET") current = this.board.collected.score;
          else if (g.label === "CLEAR") current = this.board.collected.obstaclesCleared;
          else if (g.label.startsWith("COLLECT")) current = this.board.collected.atoms[this.level.goals.collect?.type || 0];
          else if (g.label === "SURVIVE") current = this.board.movesLeft;
          gc.value.setText(`${current} / ${g.value}`);
        }
      } catch (e) {
        console.error("updateHUD crash:", e);
      }
    }

    setStep(label) {
      if (this.txtStep) this.txtStep.setText(`STEP: ${label}`);
    }

    // ---- Swap Handling ----
    onValidSwap(a, b, done) {
      try {
        this.busy = true;
        this.setStep("swap");
        // Safety: force-unlock after 3 s even if animation chain stalls
        const guard = this.time.delayedCall(3000, () => {
          console.warn("Swap guard fired — forcing busy=false");
          this.busy = false;
          this.txtStatus.setText("HICCUP — TAP TO CONTINUE");
          this.time.delayedCall(1500, () => this.txtStatus.setText(""));
        });

        // Play swap sound
        if (this.AudioManager) this.AudioManager.playSwap();

        // Subtle swap feedback
        if (this.EffectManager) this.EffectManager.shake(4, 60);

        // Animate swap
        this.renderer.animateSwap(a, b, () => {
          try {
            guard.remove(false);
            // Apply swap to board model, then remap sprite matrix to match
            this.board.swapValues(a, b);
            this.renderer.commitSwap(a, b);

            // Consume move
            this.board.movesLeft--;
            this.updateHUD();

            // Check for special atom creation from this swap
            this.processSwapResult(a, b, () => {
              if (done) done();
            });
          } catch (e) {
            console.error("Swap complete crash:", e);
            this.showGameError("SWAP ERROR: " + (e.message || e));
            this.busy = false;
            if (done) done();
          }
        });
      } catch (e) {
        console.error("onValidSwap crash:", e);
        this.showGameError("SWAP ERROR: " + (e.message || e));
        this.busy = false;
        if (done) done();
      }
    }

    showGameError(msg) {
      const overlay = this.add.container(0, 0).setDepth(300);
      const dim = this.add.rectangle(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height, 0x000510, 0.9);
      const box = this.add.graphics();
      box.fillStyle(0x3a0d0d, 1);
      box.lineStyle(3, 0xff6b35, 1);
      box.fillRoundedRect(this.scale.width/2 - 200, this.scale.height/2 - 60, 400, 120, 16);
      box.strokeRoundedRect(this.scale.width/2 - 200, this.scale.height/2 - 60, 400, 120, 16);
      const title = this.add.text(this.scale.width/2, this.scale.height/2 - 30, "GAME ERROR", {
        fontFamily: "Consolas, monospace", fontSize: "20px", color: "#ff6b35", fontStyle: "bold"
      }).setOrigin(0.5);
      const detail = this.add.text(this.scale.width/2, this.scale.height/2 + 10, msg, {
        fontFamily: "Consolas, monospace", fontSize: "14px", color: "#ffffff",
        wordWrap: { width: 360 }
      }).setOrigin(0.5);
      const btn = this.add.text(this.scale.width/2, this.scale.height/2 + 55, "DISMISS", {
        fontFamily: "Consolas, monospace", fontSize: "16px", color: "#00d4ff",
        backgroundColor: "#0d2439", padding: { x: 16, y: 6 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on("pointerdown", () => overlay.destroy(true));
      overlay.add([dim, box, title, detail, btn]);
    }

    onInvalidSwap(a, b) {
      // Invalid swap - no move consumed, board already restored by model
      this.renderer.syncSprites();
      // Play invalid swap sound
      if (this.AudioManager) this.AudioManager.playSfx("sfx_button", { volume: 0.4 });
    }

    processSwapResult(swapA, swapB, done) {
      try {
        this.setStep("match");
        // Find matches after swap
        const matched = this.board.findMatches();

        if (matched.size === 0) {
          // Shouldn't happen if swapCreatesMatch worked, but safety
          this.busy = false;
          if (done) done();
          return;
        }

        // Match found - visual feedback
        if (this.EffectManager) {
          this.EffectManager.colorFlash(this.getDominantMatchColor(matched), 120, 0.35);
          this.EffectManager.shakeMatch(true);
        }

        // Create special atoms from matches
        const specials = this.board.createSpecialAtoms(matched, [swapA, swapB]);
        this.specialsCreated = (this.specialsCreated || 0) + specials.length;

        // Play match sound
        if (this.AudioManager) this.AudioManager.playMatch();

        // Remove matched atoms
        const removed = this.board.removeMatched(matched);

        // Apply obstacle damage from adjacent matches
        const damaged = this.board.applyObstacleDamage(removed);

        // Animate removal with particles
        this.renderer.animateRemoval(removed, () => {
          try {
            // Particle effects for each removed atom
            for (const cell of removed) {
              if (this.ParticleManager) {
                this.ParticleManager.explodeMatch(cell.r, cell.c, cell.type, { originX: this.originX, originY: this.originY }, this.cellSize);
              }
            }

            // Animate obstacle damage
            this.renderer.animateObstacleDamage(damaged, () => {
              try {
                // Particle effects for obstacles
                for (const cell of damaged) {
                  if (this.ParticleManager) {
                    this.ParticleManager.breakObstacle(cell.r, cell.c, cell.type, { originX: this.originX, originY: this.originY }, this.cellSize);
                  }
                }

                // Apply gravity
                const gravity = this.board.applyGravity();
                this.renderer.animateFalls(gravity.moves, gravity.refills, () => {
                  try {
                    // Cascade trails for falling atoms
                    for (const move of gravity.moves) {
                      if (this.ParticleManager) {
                        const atom = this.board.get(move.to, move.col);
                        if (atom) {
                          this.ParticleManager.cascadeTrail(move.to, move.col, atom & 0x0F, { originX: this.originX, originY: this.originY }, this.cellSize);
                        }
                      }
                    }
                    // Resolve cascades
                    this.resolveCascades(done);
                  } catch (e) {
                    console.error("Cascade trail crash:", e);
                    this.showGameError("CASCADE ERROR: " + (e.message || e));
                    this.busy = false;
                    if (done) done();
                  }
                });
              } catch (e) {
                console.error("Obstacle damage crash:", e);
                this.showGameError("OBSTACLE ERROR: " + (e.message || e));
                this.busy = false;
                if (done) done();
              }
            });
          } catch (e) {
            console.error("Removal particles crash:", e);
            this.showGameError("REMOVAL ERROR: " + (e.message || e));
            this.busy = false;
            if (done) done();
          }
        });
      } catch (e) {
        console.error("processSwapResult crash:", e);
        this.showGameError("MATCH ERROR: " + (e.message || e));
        this.busy = false;
        if (done) done();
      }
    }

    // ---- Cascade Resolution ----
    resolveCascades(done) {
      try {
        // Safety: force-unlock after 10 s
        const guard = this.time.delayedCall(10000, () => {
          console.warn("Cascade guard fired — forcing busy=false");
          this.busy = false;
          this.txtStatus.setText("HICCUP — TAP TO CONTINUE");
          this.time.delayedCall(1500, () => this.txtStatus.setText(""));
          if (done) done();
        });

        this.comboLevel = 0;

        const processWave = () => {
          try {
            this.setStep("cascade " + (this.waveIndex + 1));
            const matched = this.board.findMatches();

            if (matched.size === 0) {
              guard.remove(false);
              this.checkSpecialActivations(() => {
                try {
                  this.afterSettle(done);
                } catch (e) {
                  console.error("afterSettle crash:", e);
                  this.showGameError("SETTLE ERROR: " + (e.message || e));
                  this.busy = false;
                  if (done) done();
                }
              });
              return;
            }

            this.waveIndex++;
            this.comboLevel = Math.min(5, this.comboLevel + 1);

            // Combo visual effects
            if (this.EffectManager && this.comboLevel >= 2) {
              this.EffectManager.comboFlash(this.comboLevel);
              this.EffectManager.shakeCombo(this.comboLevel);
              if (this.comboLevel >= 4) {
                this.EffectManager.slowMo(0.25, 400);
              } else if (this.comboLevel === 3) {
                this.EffectManager.slowMo(0.4, 300);
              }
            }

            const removed = this.board.removeMatched(matched);

            // Score
            let waveScore = 0;
            for (const rem of removed) {
              waveScore += 10 * (rem.type + 1);
              if (rem.special) waveScore += rem.special & 0x100 ? 500 : (rem.special & 0x40 ? 100 : 50);
            }
            waveScore *= this.waveIndex;
            this.board.collected.score += waveScore;
            this.updateHUD();

            // Play cascade sound
            if (this.AudioManager) this.AudioManager.playCascade(this.waveIndex);

            // Combo sound
            if (this.comboLevel >= 2 && this.AudioManager) {
              this.AudioManager.playCombo(this.comboLevel);
            }
            if (this.comboLevel >= 2) {
              // Show combo text
              this.showComboText(this.comboLevel);
            }

            // Obstacle damage
            const damaged = this.board.applyObstacleDamage(removed);

            // Animate with particles
            this.renderer.animateRemoval(removed, () => {
              try {
                // Particle effects for each removed atom
                for (const cell of removed) {
                  if (this.ParticleManager) {
                    this.ParticleManager.explodeMatch(cell.r, cell.c, cell.type, { originX: this.originX, originY: this.originY }, this.cellSize);
                  }
                }

                this.renderer.animateObstacleDamage(damaged, () => {
                  try {
                    // Particle effects for obstacles
                    for (const cell of damaged) {
                      if (this.ParticleManager) {
                        this.ParticleManager.breakObstacle(cell.r, cell.c, cell.type, { originX: this.originX, originY: this.originY }, this.cellSize);
                      }
                    }

                    // Gravity
                    const gravity = this.board.applyGravity();
                    this.renderer.animateFalls(gravity.moves, gravity.refills, () => {
                      try {
                        // Cascade trails for falling atoms
                        for (const move of gravity.moves) {
                          if (this.ParticleManager) {
                            const atom = this.board.get(move.to, move.col);
                            if (atom) {
                              this.ParticleManager.cascadeTrail(move.to, move.col, atom & 0x0F, { originX: this.originX, originY: this.originY }, this.cellSize);
                            }
                          }
                        }
                        // Continue cascade
                        processWave();
                      } catch (e) {
                        console.error("Cascade continue crash:", e);
                        this.showGameError("CASCADE ERROR: " + (e.message || e));
                        this.busy = false;
                        if (done) done();
                      }
                    });
                  } catch (e) {
                    console.error("Cascade obstacle crash:", e);
                    this.showGameError("OBSTACLE ERROR: " + (e.message || e));
                    this.busy = false;
                    if (done) done();
                  }
                });
              } catch (e) {
                console.error("Cascade removal crash:", e);
                this.showGameError("REMOVAL ERROR: " + (e.message || e));
                this.busy = false;
                if (done) done();
              }
            });
          } catch (e) {
            console.error("processWave crash:", e);
            this.showGameError("WAVE ERROR: " + (e.message || e));
            this.busy = false;
            if (done) done();
          }
        };

        processWave();
      } catch (e) {
        console.error("resolveCascades crash:", e);
        this.showGameError("CASCADE ERROR: " + (e.message || e));
        this.busy = false;
        if (done) done();
      }
    }

    showComboText(level) {
      const x = this.scale.width / 2;
      const y = this.scale.height / 2;
      if (this.ParticleManager) {
        this.ParticleManager.showComboText(level, x, y);
      }
    }

    // ---- Special Activation Check ----
    // Called when a cascade wave finds no more matches. Special atoms created
    // from matches are consumed immediately by removeMatched(), and
    // booster-placed specials (color bomb / wrapped) await player match, so
    // nothing auto-activates here — proceed directly to settle.
    checkSpecialActivations(done) {
      if (done) done();
    }

    afterSettle(done) {
      try {
        this.setStep("settle");
        // Check level completion (all primary goals met)
        const goalResult = this.board.checkGoals();

        if (goalResult.complete) {
          this.handleLevelComplete(goalResult.stars);
          return;
        }

        // Moves exhausted without meeting goals
        if (goalResult.failed || this.board.movesLeft <= 0) {
          this.handleOutOfMoves();
          return;
        }

        // Check for deadlock
        if (!this.board.hasValidMove()) {
          this.handleDeadlock(done);
          return;
        }

        this.busy = false;
        if (done) done();
      } catch (e) {
        console.error("afterSettle crash:", e);
        this.showGameError("SETTLE ERROR: " + (e.message || e));
        this.busy = false;
        if (done) done();
      }
    }

    handleDeadlock(done) {
      try {
        this.txtStatus.setText("NO VALID REACTIONS — RECALIBRATING...");
        this.board.shuffle();
        this.time.delayedCall(500, () => {
          try {
            this.renderer.rebuildAll(true, () => {
              this.txtStatus.setText("");
              this.busy = false;
              if (done) done();
            });
          } catch (e) {
            console.error("Deadlock rebuild crash:", e);
            this.showGameError("DEADLOCK ERROR: " + (e.message || e));
            this.busy = false;
            if (done) done();
          }
        });
      } catch (e) {
        console.error("handleDeadlock crash:", e);
        this.showGameError("DEADLOCK ERROR: " + (e.message || e));
        this.busy = false;
        if (done) done();
      }
    }

    handleOutOfMoves() {
      try {
        this.busy = true;
        this.showGameOver(false);
      } catch (e) {
        console.error("handleOutOfMoves crash:", e);
        this.showGameError("GAME OVER ERROR: " + (e.message || e));
        this.busy = false;
      }
    }

    handleLevelComplete(goalStars) {
      try {
        this.busy = true;

        // Stars from level thresholds (fallback: one per primary goal met)
        const th = this.level.starThresholds;
        let stars = goalStars > 0 ? goalStars : 1;
        if (th && th.score) {
          stars = th.score.filter(t => this.board.collected.score >= t).length;
          stars = Math.max(1, Math.min(3, stars));
        }

        // Save progress
        const stats = {
          longestCascade: this.waveIndex,
          specialAtomsCreated: this.specialsCreated || 0,
          obstaclesCleared: this.board.collected.obstaclesCleared
        };
        this.SaveManager.recordLevelComplete(this.levelId, stars, this.board.collected.score, stats);

        // Show victory
        this.showGameOver(true, stars);
      } catch (e) {
        console.error("handleLevelComplete crash:", e);
        this.showGameError("VICTORY ERROR: " + (e.message || e));
        this.busy = false;
      }
    }

    // ---- Game Over / Victory ----
    showGameOver(victory, stars = 0) {
      // Play win/lose sound
      if (this.AudioManager) {
        if (victory) this.AudioManager.playWin();
        else this.AudioManager.playLose();
      }

      // Victory/defeat effects
      if (this.EffectManager) {
        if (victory) {
          this.EffectManager.colorFlash("#00ff88", 800, 0.4);
          this.EffectManager.shake(12, 600);
          this.EffectManager.showVignette(0.4, 2000, 0x00ff88);
        } else {
          this.EffectManager.colorFlash("#ff6b35", 600, 0.4);
          this.EffectManager.shake(10, 500);
          this.EffectManager.showVignette(0.5, 1500, 0xff6b35);
        }
      }

      const overlay = this.add.container(0, 0).setDepth(200);
      const dim = this.add.rectangle(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height, 0x000510, 0.92);

      if (victory) {
        const title = this.add.text(this.scale.width/2, this.scale.height/2 - 100, "REACTION STABLE", {
          fontFamily: "Consolas, monospace", fontSize: "36px", color: "#00ff88", fontStyle: "bold"
        }).setOrigin(0.5);

        // Stars
        const starContainer = this.add.container(this.scale.width/2, this.scale.height/2 - 20);
        for (let s = 0; s < 3; s++) {
          const star = this.add.image((s - 1) * 50, 0, s < stars ? "star_filled" : "star_empty").setScale(1.2);
          starContainer.add(star);
        }

        const scoreText = this.add.text(this.scale.width/2, this.scale.height/2 + 60, `FINAL SCORE: ${this.board.collected.score.toLocaleString()}`, {
          fontFamily: "Consolas, monospace", fontSize: "24px", color: "#ffd60a"
        }).setOrigin(0.5);

        const btnNext = this.add.text(this.scale.width/2, this.scale.height/2 + 130, this.levelId < 50 ? "NEXT CHAMBER" : "REACTOR SECURE", {
          fontFamily: "Consolas, monospace", fontSize: "22px", color: "#7fdbff",
          backgroundColor: "#0d2439", padding: { x: 24, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true })
          .on("pointerdown", () => {
            overlay.destroy(true);
            if (this.levelId < 50) {
              this.scene.start("BoosterScene", { levelId: this.levelId + 1 });
            } else {
              this.scene.start("WorldMapScene");
            }
          });

        const btnRetry = this.add.text(this.scale.width/2, this.scale.height/2 + 190, "RETRY", {
          fontFamily: "Consolas, monospace", fontSize: "20px", color: "#7fdbff",
          backgroundColor: "#1a1a2e", padding: { x: 20, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true })
          .on("pointerdown", () => {
            overlay.destroy(true);
            this.restartLevel();
          });

        overlay.add([dim, title, starContainer, scoreText, btnNext, btnRetry]);
      } else {
        const title = this.add.text(this.scale.width/2, this.scale.height/2 - 80, "REACTION FAILED", {
          fontFamily: "Consolas, monospace", fontSize: "36px", color: "#ff6b35", fontStyle: "bold"
        }).setOrigin(0.5);

        const msg = this.add.text(this.scale.width/2, this.scale.height/2 - 10, "MOVES EXHAUSTED", {
          fontFamily: "Consolas, monospace", fontSize: "20px", color: "#7fdbff"
        }).setOrigin(0.5);

        const scoreText = this.add.text(this.scale.width/2, this.scale.height/2 + 50, `SCORE: ${this.board.collected.score.toLocaleString()}`, {
          fontFamily: "Consolas, monospace", fontSize: "22px", color: "#ffd60a"
        }).setOrigin(0.5);

        const btnRetry = this.add.text(this.scale.width/2, this.scale.height/2 + 130, "RETRY", {
          fontFamily: "Consolas, monospace", fontSize: "24px", color: "#7fdbff",
          backgroundColor: "#0d2439", padding: { x: 32, y: 12 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true })
          .on("pointerdown", () => {
            overlay.destroy(true);
            this.restartLevel();
          });

        const btnMenu = this.add.text(this.scale.width/2, this.scale.height/2 + 200, "CHAMBER SELECT", {
          fontFamily: "Consolas, monospace", fontSize: "20px", color: "#7fdbff",
          backgroundColor: "#1a1a2e", padding: { x: 20, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true })
          .on("pointerdown", () => {
            overlay.destroy(true);
            this.scene.start("WorldMapScene");
          });

        overlay.add([dim, title, msg, scoreText, btnRetry, btnMenu]);
      }
    }

    restartLevel() {
      this.scene.restart({ levelId: this.levelId });
    }

    confirmRestart() {
      const overlay = this.add.container(0, 0).setDepth(200);
      const dim = this.add.rectangle(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height, 0x000510, 0.86);
      const msg = this.add.text(this.scale.width/2, this.scale.height/2 - 20, "ABORT REACTION?", {
        fontFamily: "Consolas, monospace", fontSize: "24px", color: "#ff6b35"
      }).setOrigin(0.5);

      const btnYes = this.add.text(this.scale.width/2 - 80, this.scale.height/2 + 40, "YES", {
        fontFamily: "Consolas, monospace", fontSize: "22px", color: "#7fdbff",
        backgroundColor: "#0d2439", padding: { x: 24, y: 10 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          overlay.destroy(true);
          this.scene.start("LevelSelectScene");
        });

      const btnNo = this.add.text(this.scale.width/2 + 80, this.scale.height/2 + 40, "NO", {
        fontFamily: "Consolas, monospace", fontSize: "22px", color: "#7fdbff",
        backgroundColor: "#1a1a2e", padding: { x: 24, y: 10 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on("pointerdown", () => overlay.destroy(true));

      overlay.add([dim, msg, btnYes, btnNo]);
    }

    pauseGame() {
      if (this.AudioManager) this.AudioManager.pauseAll();
      this.scene.pause();
      this.scene.launch("PauseScene");
    }

    onPause() {
      // Save snapshot for resume
      this.SaveManager.saveSnapshot(this.board, this.levelId);
      if (this.AudioManager) this.AudioManager.pauseAll();
    }

    onResume() {
      // Clear snapshot on resume
      this.SaveManager.clearSnapshot();
      if (this.AudioManager) this.AudioManager.resumeAll();
    }

    update() {
      // Update background particles if any
      this.updatePlasmaClouds();
    }

    // Helper: get dominant match color for flash effect
    getDominantMatchColor(matched) {
      const colorCounts = {};
      for (const idx of matched) {
        const r = Math.floor(idx / this.board.cols);
        const c = idx % this.board.cols;
        const atom = this.board.get(r, c);
        if (atom) {
          const baseType = atom & 0x0F;
          const atomDef = this.AtomTypes.getAtom(baseType);
          if (atomDef) {
            colorCounts[atomDef.neonColor] = (colorCounts[atomDef.neonColor] || 0) + 1;
          }
        }
      }
      let maxColor = "#00d4ff", maxCount = 0;
      for (const [color, count] of Object.entries(colorCounts)) {
        if (count > maxCount) { maxCount = count; maxColor = color; }
      }
      return maxColor;
    }
  }

  return GameScene;
});