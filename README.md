# Atom Smasher

A neon match-3 puzzle game built with **Phaser 3** (vanilla JS, no build step). Smash atoms, forge special elements, and chain cascades through 50 chambers.

## Play

Self-contained — serve the folder with any static web server, e.g. XAMPP:

```
http://localhost:8080/atom-smasher/
```

Deep link to any chamber (1–50):

```
http://localhost:8080/atom-smasher/?level=12
```

Force the procedural fallback art (ignore `assets/`):

```
http://localhost:8080/atom-smasher/?assets=0
```

## Features

- **50 levels / 10 tiers** — stone, ice (2-layer), chains, conveyors, regen and reversal mechanics
- **Special atoms** — Striped (row/column), Wrapped (3×3), Color Bomb (all of one color), MEGA (board clear)
- **Combo system** — cascade waves escalate visuals: shockwaves → **nuclear blasts** (fireball, mushroom column, multi-ring shockwave, embers, debris, screen flash)
- **Juice** — match pops + highlight rings, score float-ups, combo counter, background flash, plasma nebula clouds, twinkling sparkles, screen shake, slow-mo
- **Audio** — Web Audio synthesized SFX (no audio files required); SFX pool + music layers with graceful fallback
- **Progress** — localStorage save (stars, high scores, settings), star-gated world map, boosters bought with stars
- **Persistence-safe** — optional external sprite art with automatic procedural fallback

## Controls

- **Tap** two adjacent atoms to swap
- **Swipe** an atom toward a neighbor
- **Arrow keys + Enter/Escape** — keyboard play
- Pause / restart via the on-screen buttons

## Project structure

```
index.html            Entry point (loads Phaser first, then modules)
css/styles.css        Minimal shell
lib/phaser.min.js     Phaser 3.80.1 (vendored)
js/main.js            Phaser config + global error reporting
js/core/              Pure logic: BoardModel, LevelData, AtomTypes, ObstacleTypes,
                      SaveManager, AssetManifest, AudioManager
js/rendering/         TextureFactory, AtomRenderer, ParticleManager, EffectManager
js/input/             SwapController
js/scenes/            Boot, WorldMap, Booster, Game, Pause
assets/sprites/atoms/ Sliced atom sprite PNGs (optional art)
tests/board.test.js   126 assertions — pure logic test suite
```

## Development

Run the logic test suite (no browser needed):

```
node tests/board.test.js
```

Cache busting: bump `?v=N` in `index.html` and `this.cacheBust` in `js/core/AssetManifest.js` when shipping asset changes.

## License

MIT
