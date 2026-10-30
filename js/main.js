/* =========================================================
   Atom Smasher — Phaser Game Configuration (Milestone 3)
   Portrait mobile-first, 720x1280 design resolution.
   ========================================================= */
(function () {
  "use strict";

  // Game configuration
  const config = {
    type: Phaser.AUTO,
    parent: "game-root",
    width: 720,
    height: 1280,
    backgroundColor: "#050912",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 720,
      height: 1280,
      resizeInterval: 0,
      min: {
        width: 360,
        height: 640
      },
      max: {
        width: 1440,
        height: 2560
      }
    },
    // Performance settings for mobile
    render: {
      antialias: true,
      powerPreference: "low-power",
      pixelArt: false,
      roundPixels: false,
      transparent: false
    },
    // Input
    input: {
      activePointers: 2,
      touch: true,
      mouse: true,
      gamepad: false
    },
    // Physics not needed for match-3
    physics: {
      default: "arcade",
      arcade: { debug: false }
    },
    // Scene order (class references — Phaser does not auto-resolve string keys)
    scene: [
      window.BootScene,
      window.WorldMapScene,
      window.BoosterScene,
      window.GameScene,
      window.PauseScene
    ],
    // Audio enabled for M3
    audio: {
      disableAudio: false
    },
    // Callbacks
    callbacks: {
      postBoot: function (game) {
        // Expose core classes globally after Phaser boots
        window.Phaser = Phaser;
      }
    }
  };

  // Initialize game
  window.game = new Phaser.Game(config);

  // Global error handling — show errors on screen so user can report them
  window.addEventListener("error", function (e) {
    console.error("Game error:", e.error || e.message);
    const msg = e.error ? (e.error.stack || e.error.message) : (e.message || "Unknown error");
    showGlobalError("JS ERROR: " + msg);
  });

  window.addEventListener("unhandledrejection", function (e) {
    console.error("Unhandled promise rejection:", e.reason);
    const msg = e.reason ? (e.reason.stack || e.reason.message || String(e.reason)) : "Unknown rejection";
    showGlobalError("REJECTION: " + msg);
  });

  function showGlobalError(msg) {
    // Remove existing
    const old = document.getElementById("global-error");
    if (old) old.remove();
    const div = document.createElement("div");
    div.id = "global-error";
    div.style.position = "fixed";
    div.style.top = "0";
    div.style.left = "0";
    div.style.width = "100%";
    div.style.height = "100%";
    div.style.background = "#050912";
    div.style.color = "#ff6b35";
    div.style.fontFamily = "Consolas, monospace";
    div.style.fontSize = "14px";
    div.style.padding = "20px";
    div.style.zIndex = "9999";
    div.style.overflow = "auto";
    div.style.lineHeight = "1.5";
    div.innerHTML = "<div style='color:#00d4ff;font-weight:bold;font-size:18px;margin-bottom:10px;'>GAME CRASH — TAP TO DISMISS</div>" +
      msg.split("\n").map(l => "<div>" + l.replace(/</g,"&lt;").replace(/>/g,"&gt;") + "</div>").join("") +
      "<div style='margin-top:20px;color:#00d4ff;'>Tap anywhere to dismiss</div>";
    div.onclick = () => div.remove();
    document.body.appendChild(div);
  }

  // Prevent context menu on right-click
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });

  // Prevent pull-to-refresh and overscroll
  document.body.style.overscrollBehavior = "none";
  document.body.style.touchAction = "manipulation";

})();