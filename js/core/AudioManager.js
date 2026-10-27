/* =========================================================
   Atom Smasher — Audio Manager
   Handles SFX pooling, music layers, mute, and Web Audio synthesis fallback.
   ========================================================= */
(function (root, factory) {
  const AudioManager = factory();
  if (typeof module === "object" && module.exports) module.exports = AudioManager;
  root.AudioManager = AudioManager;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  class AudioManager {
    constructor(scene) {
      this.scene = scene;
      this.enabled = true;
      this.musicEnabled = true;
      this.sfxEnabled = true;
      this.masterVolume = 0.7;
      this.musicVolume = 0.5;
      this.sfxVolume = 0.7;

      // Audio context for synthesis fallback
      this.audioContext = null;
      this.synthEnabled = false;

      // Music layers
      this.musicLayers = {
        ambient: null,
        active: null,
        combo: null
      };
      this.currentMusicState = "ambient"; // ambient, active, combo
      this.musicFadeTime = 1000;

      // SFX pool
      this.sfxPool = new Map(); // key -> [sound instances]
      this.maxPoolSize = 4;

      // Settings (synced with SaveManager)
      this.loadSettings();
    }

    // Initialize audio context (call on first user interaction)
    initAudioContext() {
      if (this.audioContext) return;
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.synthEnabled = true;
        console.log("AudioManager: Web Audio API initialized");
      } catch (e) {
        console.warn("AudioManager: Web Audio API not available", e);
        this.synthEnabled = false;
      }
    }

    // Load settings from SaveManager
    loadSettings() {
      if (window.SaveManager) {
        const settings = window.SaveManager.loadSettings();
        this.enabled = settings.sound !== false;
        this.musicEnabled = settings.music !== false;
        this.sfxEnabled = settings.sound !== false; // SFX tied to sound setting
      }
    }

    // Save settings
    saveSettings() {
      if (window.SaveManager) {
        window.SaveManager.updateSetting("sound", this.sfxEnabled);
        window.SaveManager.updateSetting("music", this.musicEnabled);
      }
    }

    // Toggle master sound
    toggleSound(enabled) {
      this.enabled = enabled;
      this.sfxEnabled = enabled;
      if (!enabled) this.stopAllMusic();
      this.saveSettings();
    }

    // Toggle music
    toggleMusic(enabled) {
      this.musicEnabled = enabled;
      if (!enabled) this.stopAllMusic();
      else this.resumeMusic();
      this.saveSettings();
    }

    // Set volumes
    setMasterVolume(v) { this.masterVolume = Phaser.Math.Clamp(v, 0, 1); this.updateAllVolumes(); }
    setMusicVolume(v) { this.musicVolume = Phaser.Math.Clamp(v, 0, 1); this.updateMusicVolumes(); }
    setSfxVolume(v) { this.sfxVolume = Phaser.Math.Clamp(v, 0, 1); }

    updateAllVolumes() {
      this.updateMusicVolumes();
      // SFX volumes applied per-play
    }

    updateMusicVolumes() {
      const vol = this.masterVolume * this.musicVolume;
      for (const layer of Object.values(this.musicLayers)) {
        if (layer) layer.volume = vol;
      }
    }

    // ---- Music Layer Management ----
    playMusic(key, layer = "ambient", loop = true) {
      if (!this.enabled || !this.musicEnabled) return;
      // Procedural build ships no music files — skip silently
      if (!this.scene.cache.audio.exists(key)) return;

      // Stop current layer
      if (this.musicLayers[layer]) {
        this.musicLayers[layer].stop();
      }

      const sound = this.scene.sound.add(key, { loop, volume: this.masterVolume * this.musicVolume });
      this.musicLayers[layer] = sound;
      sound.play();

      // Update state
      if (layer === "ambient") this.currentMusicState = "ambient";
    }

    crossfadeTo(layer, key, duration = null) {
      if (!this.enabled || !this.musicEnabled) return;
      if (!this.scene.cache.audio.exists(key)) return;
      const fadeTime = duration || this.musicFadeTime;

      // Fade out current layers
      for (const [name, sound] of Object.entries(this.musicLayers)) {
        if (sound && name !== layer && sound.isPlaying) {
          this.scene.tweens.add({
            targets: sound,
            volume: 0,
            duration: fadeTime,
            onComplete: () => sound.stop()
          });
        }
      }

      // Fade in new layer
      const sound = this.scene.sound.add(key, { loop: true, volume: 0 });
      this.musicLayers[layer] = sound;
      sound.play();
      this.scene.tweens.add({
        targets: sound,
        volume: this.masterVolume * this.musicVolume,
        duration: fadeTime
      });
      this.currentMusicState = layer;
    }

    setMusicState(state) {
      // state: "ambient", "active", "combo"
      if (state === this.currentMusicState) return;
      switch (state) {
        case "ambient":
          this.crossfadeTo("ambient", "music_ambient");
          break;
        case "active":
          this.crossfadeTo("active", "music_active");
          break;
        case "combo":
          this.crossfadeTo("combo", "music_combo", 300);
          // Auto-return to active after combo
          this.scene.time.delayedCall(3000, () => {
            if (this.currentMusicState === "combo") this.setMusicState("active");
          });
          break;
      }
    }

    pauseMusic() {
      for (const sound of Object.values(this.musicLayers)) {
        if (sound && sound.isPlaying) sound.pause();
      }
    }

    resumeMusic() {
      if (!this.enabled || !this.musicEnabled) return;
      for (const sound of Object.values(this.musicLayers)) {
        if (sound && sound.isPaused) sound.resume();
      }
    }

    stopAllMusic() {
      for (const sound of Object.values(this.musicLayers)) {
        if (sound) {
          sound.stop();
          sound.destroy();
        }
      }
      this.musicLayers = { ambient: null, active: null, combo: null };
    }

    // ---- SFX Playback with Pooling ----
    playSfx(key, options = {}) {
      if (!this.enabled || !this.sfxEnabled) return null;

      // Ensure Web Audio context is initialized (safety net for browsers)
      if (!this.audioContext) this.initAudioContext();

      // No audio file loaded → use Web Audio synthesis fallback
      if (!this.scene.cache.audio.exists(key)) {
        this.synthFor(key);
        return null;
      }

      const volume = (options.volume || 1) * this.masterVolume * this.sfxVolume;
      const rate = options.rate || 1;
      const delay = options.delay || 0;

      const play = () => {
        // Get or create pool
        if (!this.sfxPool.has(key)) this.sfxPool.set(key, []);
        const pool = this.sfxPool.get(key);

        // Find available instance
        let sound = pool.find(s => !s.isPlaying);
        if (!sound) {
          if (pool.length < this.maxPoolSize) {
            sound = this.scene.sound.add(key, { volume, rate });
            pool.push(sound);
          } else {
            // Steal oldest
            sound = pool.shift();
            sound.stop();
            pool.push(sound);
          }
        }

        sound.volume = volume;
        sound.rate = rate;
        sound.play();
        return sound;
      };

      if (delay > 0) {
        this.scene.time.delayedCall(delay, play);
        return null;
      }
      return play();
    }

    // Play SFX with pitch variation for repeated sounds
    playSfxVaried(key, options = {}) {
      const variation = options.pitchVariation || 0.1;
      const rate = 1 + (Math.random() - 0.5) * variation * 2;
      return this.playSfx(key, { ...options, rate });
    }

    // Convenience methods for common SFX
    playSwap() { this.playSfxVaried("sfx_swap", { volume: 0.5 }); }
    playMatch() { this.playSfxVaried("sfx_match", { volume: 0.7 }); }
    playCascade(wave) { this.playSfx("sfx_cascade", { volume: 0.5 + wave * 0.05, rate: 1 + wave * 0.02 }); }
    playSpecialCreate() { this.playSfx("sfx_special_create", { volume: 0.8 }); }
    playSpecialActivate(type) {
      const volume = type === "mega" ? 1 : 0.85;
      this.playSfx("sfx_special_activate", { volume });
    }
    playCombo(level) {
      const keys = ["", "sfx_combo_good", "sfx_combo_great", "sfx_combo_awesome", "sfx_combo_spectacular", "sfx_combo_legendary"];
      if (level >= 1 && level < keys.length) this.playSfx(keys[level], { volume: 0.8 });
    }
    playObstacleBreak(type) {
      const key = type === 1 ? "sfx_obstacle_break" : (type === 2 || type === 3 ? "sfx_ice_crack" : "sfx_chain_break");
      this.playSfx(key, { volume: 0.7 });
    }
    playWin() { this.playSfx("sfx_win", { volume: 0.9 }); }
    playLose() { this.playSfx("sfx_lose", { volume: 0.9 }); }
    playButton() { this.playSfx("sfx_button", { volume: 0.6 }); }
    playLevelUp() { this.playSfx("sfx_levelup", { volume: 0.8 }); }

    // ---- Web Audio Synthesis Fallback (for missing assets) ----
    // Generates simple tones programmatically
    synthTone(frequency, duration, type = "sine", volume = 0.3) {
      if (!this.synthEnabled || !this.audioContext) return;
      if (this.audioContext.state === "suspended") this.audioContext.resume();

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.value = volume * this.masterVolume * this.sfxVolume;

      const now = this.audioContext.currentTime;
      osc.start(now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.stop(now + duration);
    }

    // Synthesized SFX replacements
    synthSwap() { this.synthTone(440, 0.1, "sine", 0.2); }
    synthMatch() { this.synthTone(660, 0.15, "triangle", 0.3); }
    synthCascade(wave) { this.synthTone(880 + wave * 50, 0.1, "square", 0.2); }
    synthSpecial() { this.synthTone(520, 0.3, "sawtooth", 0.4); }
    synthCombo(level) { this.synthTone(440 * level, 0.2, "triangle", 0.3); }
    synthWin() { this.synthTone(880, 0.5, "sine", 0.4); }
    synthLose() { this.synthTone(220, 0.8, "sawtooth", 0.3); }

    // Map missing SFX keys to synth equivalents
    synthFor(key) {
      switch (key) {
        case "sfx_swap": this.synthSwap(); break;
        case "sfx_match": this.synthMatch(); break;
        case "sfx_cascade": this.synthCascade(1); break;
        case "sfx_special_create":
        case "sfx_special_activate": this.synthSpecial(); break;
        case "sfx_combo_good": this.synthCombo(1); break;
        case "sfx_combo_great": this.synthCombo(2); break;
        case "sfx_combo_awesome": this.synthCombo(3); break;
        case "sfx_combo_spectacular": this.synthCombo(4); break;
        case "sfx_combo_legendary": this.synthCombo(5); break;
        case "sfx_win": this.synthWin(); break;
        case "sfx_lose": this.synthLose(); break;
        default: this.synthTone(500, 0.08, "sine", 0.15);
      }
    }

    // ---- Pause/Resume (for game pause) ----
    pauseAll() {
      this.pauseMusic();
      for (const pool of this.sfxPool.values()) {
        for (const sound of pool) {
          if (sound.isPlaying) sound.pause();
        }
      }
    }

    resumeAll() {
      this.resumeMusic();
      for (const pool of this.sfxPool.values()) {
        for (const sound of pool) {
          if (sound.isPaused) sound.resume();
        }
      }
    }

    // ---- Cleanup ----
    destroy() {
      this.stopAllMusic();
      for (const pool of this.sfxPool.values()) {
        for (const sound of pool) sound.destroy();
      }
      this.sfxPool.clear();
      if (this.audioContext) this.audioContext.close();
    }
  }

  return AudioManager;
});