/* =========================================================
   Atom Smasher — Asset Manifest (Asset Loading with Fallback)
   Checks assets/ folder first, falls back to procedural generation.
   ========================================================= */
(function (root, factory) {
  const AssetManifest = factory();
  if (typeof module === "object" && module.exports) module.exports = AssetManifest;
  root.AssetManifest = AssetManifest;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  class AssetManifest {
    constructor(basePath = "assets/") {
      this.basePath = basePath;
      // Cache-busting version — increment when assets change so refreshes fetch fresh files
      this.cacheBust = "?v=3";
      // External assets load by default. Add ?assets=0 to force procedural fallback.
      const search = (typeof window !== "undefined" && window.location) ? window.location.search : "";
      this.useExternal = !/[?&]assets=0/.test(search);
      this.manifest = {
        // Atoms: base + specials
        atoms: {
          base: [0, 1, 2, 3, 4, 5].map(i => `atom_${i}.png`),
          specials: [
            "special_striped_h.png",
            "special_striped_v.png",
            "special_wrapped.png",
            "special_color_bomb.png",
            "special_mega.png"
          ]
        },
        // Obstacles
        obstacles: [
          "obstacle_stone.png",
          "obstacle_ice_1.png",
          "obstacle_ice_2.png",
          "obstacle_chain.png"
        ],
        // UI
        ui: [
          "cell_bg.png",
          "particle.png",
          "btn_primary.png",
          "btn_secondary.png",
          "btn_danger.png",
          "btn_booster.png",
          "star_filled.png",
          "star_empty.png",
          "icon_lock.png",
          "booster_moves.png",
          "booster_bomb.png",
          "booster_shuffle.png",
          "booster_special.png",
          "map_node_locked.png",
          "map_node_unlocked.png",
          "map_node_current.png",
          "map_node_complete.png"
        ],
        // Combo texts
        combos: [
          "combo_good.png",
          "combo_great.png",
          "combo_awesome.png",
          "combo_spectacular.png",
          "combo_legendary.png"
        ],
        // Audio
        audio: {
          sfx: [
            "sfx_swap.ogg",
            "sfx_match.ogg",
            "sfx_cascade.ogg",
            "sfx_special_create.ogg",
            "sfx_special_activate.ogg",
            "sfx_combo_good.ogg",
            "sfx_combo_great.ogg",
            "sfx_combo_awesome.ogg",
            "sfx_combo_spectacular.ogg",
            "sfx_combo_legendary.ogg",
            "sfx_obstacle_break.ogg",
            "sfx_ice_crack.ogg",
            "sfx_chain_break.ogg",
            "sfx_win.ogg",
            "sfx_lose.ogg",
            "sfx_button.ogg",
            "sfx_levelup.ogg"
          ],
          music: [
            "music_ambient.ogg",
            "music_active.ogg",
            "music_combo.ogg"
          ]
        }
      };
      this.loaded = new Set();
      this.missing = new Set();
    }

    // Get full URL for an asset
    getUrl(assetName) {
      return this.basePath + assetName + this.cacheBust;
    }

    // Get all asset URLs for Phaser loader
    getAllUrls() {
      const urls = [];
      for (const category of Object.values(this.manifest)) {
        if (Array.isArray(category)) {
          urls.push(...category.map(a => this.getUrl(a)));
        } else if (category.base || category.specials) {
          for (const sub of [category.base, category.specials]) {
            if (!sub) continue;
            urls.push(...sub.map(a => this.getUrl(a)));
          }
        } else if (category.sfx || category.music) {
          urls.push(...category.sfx.map(a => this.getUrl(a)));
          urls.push(...category.music.map(a => this.getUrl(a)));
        }
      }
      return urls;
    }

    // Check if asset exists (async HEAD request)
    async checkAsset(url) {
      try {
        const response = await fetch(url, { method: "HEAD", cache: "no-cache" });
        return response.ok;
      } catch (e) {
        return false;
      }
    }

    // Validate all assets, return missing list
    async validateAll() {
      this.missing.clear();
      const allUrls = this.getAllUrls();
      const checks = allUrls.map(async (url) => {
        const exists = await this.checkAsset(url);
        if (!exists) this.missing.add(url);
      });
      await Promise.all(checks);
      return Array.from(this.missing);
    }

    // Load assets via Phaser loader with fallback tracking
    loadViaPhaser(loader) {
      if (!this.useExternal) return; // procedural-only mode
      // Load all declared assets
      for (const category of Object.values(this.manifest)) {
        if (Array.isArray(category)) {
          for (const asset of category) {
            const key = asset.replace(".png", "").replace(".ogg", "");
            const url = this.getUrl(asset);
            loader.image(key, url);
          }
        } else if (category.base || category.specials) {
          // Atoms: { base: [...], specials: [...] }
          for (const sub of [category.base, category.specials]) {
            if (!sub) continue;
            for (const asset of sub) {
              const key = asset.replace(".png", "").replace(".ogg", "");
              const url = this.getUrl(asset);
              loader.image(key, url);
            }
          }
        } else if (category.sfx || category.music) {
          for (const asset of category.sfx) {
            const key = asset.replace(".ogg", "");
            const url = this.getUrl(asset);
            loader.audio(key, [url, url.replace(".ogg", ".m4a")]);
          }
          for (const asset of category.music) {
            const key = asset.replace(".ogg", "");
            const url = this.getUrl(asset);
            loader.audio(key, [url, url.replace(".ogg", ".m4a")]);
          }
        }
      }
    }

    // Check if we have any assets at all
    async hasAnyAssets() {
      if (!this.useExternal) return false;
      const sample = this.getAllUrls().slice(0, 3);
      for (const url of sample) {
        if (await this.checkAsset(url)) return true;
      }
      return false;
    }

    // Get missing asset report
    getMissingReport() {
      return {
        totalDeclared: this.getAllUrls().length,
        missing: Array.from(this.missing),
        missingCount: this.missing.size
      };
    }
  }

  return AssetManifest;
});