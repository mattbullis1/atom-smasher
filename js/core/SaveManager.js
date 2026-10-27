/* =========================================================
   Atom Smasher — Save Manager (localStorage)
   Handles game progress, settings, and board snapshots.
   ========================================================= */
(function (root, factory) {
  const SaveManager = factory();
  if (typeof module === "object" && module.exports) module.exports = SaveManager;
  root.SaveManager = SaveManager;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  const STORAGE_KEY = "atom_smasher_save";
  const SETTINGS_KEY = "atom_smasher_settings";
  const SNAPSHOT_KEY = "atom_smasher_snapshot";

  const DEFAULT_SETTINGS = {
    sound: true,
    music: true,
    particles: true,
    neonGlow: true,
    vibration: true,
    reducedMotion: false
  };

  const DEFAULT_PROGRESS = {
    currentLevel: 1,
    unlockedLevels: [1],
    stars: {},        // { "1": 3, "2": 2, ... }
    highScores: {},   // { "1": 15000, "2": 8000, ... }
    totalStars: 0,
    totalScore: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    longestCascade: 0,
    specialAtomsCreated: 0,
    obstaclesCleared: 0
  };

  // Check if localStorage is available
  function isStorageAvailable() {
    try {
      const test = "__storage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  const storageAvailable = isStorageAvailable();

  // ---- Settings ----
  function loadSettings() {
    if (!storageAvailable) return { ...DEFAULT_SETTINGS };
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.warn("Failed to load settings:", e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  function saveSettings(settings) {
    if (!storageAvailable) return false;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (e) {
      console.warn("Failed to save settings:", e);
      return false;
    }
  }

  function updateSetting(key, value) {
    const settings = loadSettings();
    settings[key] = value;
    return saveSettings(settings);
  }

  // ---- Progress ----
  function loadProgress() {
    if (!storageAvailable) return { ...DEFAULT_PROGRESS };
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // Merge with defaults to handle new fields
        return { ...DEFAULT_PROGRESS, ...parsed, stars: { ...DEFAULT_PROGRESS.stars, ...parsed.stars }, highScores: { ...DEFAULT_PROGRESS.highScores, ...parsed.highScores } };
      }
    } catch (e) {
      console.warn("Failed to load progress:", e);
    }
    return { ...DEFAULT_PROGRESS };
  }

  function saveProgress(progress) {
    if (!storageAvailable) return false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      return true;
    } catch (e) {
      console.warn("Failed to save progress:", e);
      return false;
    }
  }

  function updateProgress(updates) {
    const progress = loadProgress();
    Object.assign(progress, updates);
    return saveProgress(progress);
  }

  function recordLevelComplete(levelId, stars, score, stats) {
    const progress = loadProgress();

    // Unlock next level
    if (!progress.unlockedLevels.includes(levelId + 1) && levelId < 10) {
      progress.unlockedLevels.push(levelId + 1);
      progress.unlockedLevels.sort((a, b) => a - b);
    }

    // Update stars (keep best)
    const currentStars = progress.stars[levelId] || 0;
    if (stars > currentStars) {
      progress.stars[levelId] = stars;
      progress.totalStars = Object.values(progress.stars).reduce((a, b) => a + b, 0);
    }

    // Update high score
    const currentHigh = progress.highScores[levelId] || 0;
    if (score > currentHigh) {
      progress.highScores[levelId] = score;
    }

    // Update stats
    progress.gamesPlayed++;
    if (stars > 0) progress.gamesWon++;
    progress.totalScore += score;
    if (stats) {
      if (stats.longestCascade > progress.longestCascade) progress.longestCascade = stats.longestCascade;
      if (stats.specialAtomsCreated) progress.specialAtomsCreated += stats.specialAtomsCreated;
      if (stats.obstaclesCleared) progress.obstaclesCleared += stats.obstaclesCleared;
    }

    // Update current level if this was the current one
    if (progress.currentLevel === levelId && levelId < 10) {
      progress.currentLevel = levelId + 1;
    }

    return saveProgress(progress);
  }

  function getLevelStars(levelId) {
    const progress = loadProgress();
    return progress.stars[levelId] || 0;
  }

  function getLevelHighScore(levelId) {
    const progress = loadProgress();
    return progress.highScores[levelId] || 0;
  }

  function isLevelUnlocked(levelId) {
    const progress = loadProgress();
    return progress.unlockedLevels.includes(levelId);
  }

  function getCurrentLevel() {
    const progress = loadProgress();
    return progress.currentLevel;
  }

  function setCurrentLevel(levelId) {
    const progress = loadProgress();
    progress.currentLevel = levelId;
    return saveProgress(progress);
  }

  function getTotalStars() {
    const progress = loadProgress();
    return progress.totalStars;
  }

  function getProgressSummary() {
    const progress = loadProgress();
    return {
      currentLevel: progress.currentLevel,
      unlockedLevels: progress.unlockedLevels.slice(),
      totalStars: progress.totalStars,
      maxStars: 30, // 10 levels * 3 stars
      gamesPlayed: progress.gamesPlayed,
      gamesWon: progress.gamesWon,
      totalScore: progress.totalScore
    };
  }

  // ---- Board Snapshot (for mid-game resume) ----
  function saveSnapshot(boardModel, levelId) {
    if (!storageAvailable) return false;
    try {
      const data = {
        levelId,
        timestamp: Date.now(),
        board: boardModel.toJSON()
      };
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn("Failed to save snapshot:", e);
      return false;
    }
  }

  function loadSnapshot() {
    if (!storageAvailable) return null;
    try {
      const data = localStorage.getItem(SNAPSHOT_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn("Failed to load snapshot:", e);
    }
    return null;
  }

  function clearSnapshot() {
    if (!storageAvailable) return;
    try {
      localStorage.removeItem(SNAPSHOT_KEY);
    } catch (e) { /* ignore */ }
  }

  function hasSnapshot() {
    if (!storageAvailable) return false;
    try {
      return localStorage.getItem(SNAPSHOT_KEY) !== null;
    } catch (e) {
      return false;
    }
  }

  // ---- Clear All Data ----
  function clearAllData() {
    if (!storageAvailable) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SETTINGS_KEY);
      localStorage.removeItem(SNAPSHOT_KEY);
    } catch (e) { /* ignore */ }
  }

  // Export
  return {
    // Settings
    loadSettings,
    saveSettings,
    updateSetting,
    DEFAULT_SETTINGS,

    // Progress
    loadProgress,
    saveProgress,
    updateProgress,
    recordLevelComplete,
    getLevelStars,
    getLevelHighScore,
    isLevelUnlocked,
    getCurrentLevel,
    setCurrentLevel,
    getTotalStars,
    getProgressSummary,
    DEFAULT_PROGRESS,

    // Snapshot
    saveSnapshot,
    loadSnapshot,
    clearSnapshot,
    hasSnapshot,

    // Utility
    clearAllData,
    isStorageAvailable: () => storageAvailable
  };
});