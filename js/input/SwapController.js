/* =========================================================
   Atom Smasher — Swap Controller (Touch/Mouse Input)
   Translates pointer events into board swap commands.
   ========================================================= */
(function (root, factory) {
  const SwapController = factory();
  if (typeof module === "object" && module.exports) module.exports = SwapController;
  root.SwapController = SwapController;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  class SwapController {
    constructor(scene, boardModel, atomRenderer, callbacks) {
      this.scene = scene;
      this.board = boardModel;
      this.renderer = atomRenderer;
      this.callbacks = callbacks || {};

      this.selected = null;        // {r, c} of first tap
      this.pressPos = null;        // {r, c} of pointer down
      this.dragThreshold = 15;     // px to distinguish tap vs drag (unused legacy)
      this.swipeThreshold = 18;    // game-px of directional movement that triggers a swap
      this.isProcessing = false;   // Block input during animations
    }

    setProcessing(processing) {
      this.isProcessing = processing;
    }

    // Convert pointer to board coordinates
    pointerToCell(pointer) {
      const x = pointer.x - this.renderer.originX;
      const y = pointer.y - this.renderer.originY;
      const c = Math.floor(x / this.renderer.cellSize);
      const r = Math.floor(y / this.renderer.cellSize);

      if (r < 0 || r >= 8 || c < 0 || c >= 8) return null;
      return { r, c };
    }

    // Check if two cells are adjacent (orthogonal)
    areAdjacent(a, b) {
      return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
    }

    // Check if cell can be interacted with (not chained, not stone)
    isCellInteractive(r, c) {
      const obstacle = this.board.getObstacle(r, c);
      const ObstacleTypes = this.scene.ObstacleTypes;
      if (obstacle === ObstacleTypes.OBSTACLE.STONE) return false;
      if (obstacle === ObstacleTypes.OBSTACLE.CHAIN) return false;
      return true;
    }

    // Pointer down - start selection or drag
    onPointerDown(pointer) {
      if (this.isProcessing) return;

      const cell = this.pointerToCell(pointer);
      if (!cell) return;

      if (!this.isCellInteractive(cell.r, cell.c)) return;

      this.pressPos = cell;
      this.pressTime = this.scene.time.now;
      this.pressPointerId = pointer.id;

      // Visual feedback on press
      this.renderer.showSelection(cell, true);
    }

    // Pointer up - complete tap or directional swipe
    onPointerUp(pointer) {
      if (this.isProcessing) return;
      if (!this.pressPos) return;

      // Only handle the pointer that started the press
      if (pointer.id !== this.pressPointerId) return;

      const start = this.pressPos;
      const cell = this.pointerToCell(pointer);
      this.renderer.showSelection(this.pressPos, false);
      this.pressPos = null;

      // Pixel delta in game-space (pointer.downX/downY recorded at press)
      const dx = pointer.x - pointer.downX;
      const dy = pointer.y - pointer.downY;
      const dist = Math.max(Math.abs(dx), Math.abs(dy));

      // Directional swipe: dominant axis decides the neighbor. Does NOT require
      // the pointer to cross into the adjacent cell — fixes short flicks on
      // desktop (large cells) and low-DPI phones.
      if (dist >= this.swipeThreshold) {
        const dir = Math.abs(dx) >= Math.abs(dy)
          ? { r: 0, c: dx > 0 ? 1 : -1 }
          : { r: dy > 0 ? 1 : -1, c: 0 };
        const target = { r: start.r + dir.r, c: start.c + dir.c };

        if (this.board.inBounds(target.r, target.c) && this.isCellInteractive(target.r, target.c)) {
          this.selected = null;
          this.attemptSwap(start, target);
        }
        return;
      }

      if (!cell) return;

      if (start.r !== cell.r || start.c !== cell.c) {
        // Drag that crossed into an adjacent cell (rare here — dist < threshold)
        if (this.areAdjacent(start, cell) && this.isCellInteractive(cell.r, cell.c)) {
          this.selected = null;
          this.attemptSwap(start, cell);
        }
        return;
      }

      // Tap: select / swap with previous selection
      this.handleTap(cell);
    }

    // Pointer move - for drag preview (optional)
    onPointerMove(pointer) {
      if (this.isProcessing || !this.pressPos) return;
      // Could add drag preview here
    }

    // Handle tap selection logic
    handleTap(cell) {
      if (!this.isCellInteractive(cell.r, cell.c)) return;

      if (!this.selected) {
        // First tap - select
        this.selected = cell;
        this.renderer.showSelection(cell, true);
      } else {
        // Second tap
        const prev = this.selected;
        this.renderer.showSelection(prev, false);

        if (prev.r === cell.r && prev.c === cell.c) {
          // Tapped same cell - deselect
          this.selected = null;
        } else if (this.areAdjacent(prev, cell) && this.isCellInteractive(cell.r, cell.c)) {
          // Adjacent - attempt swap
          this.selected = null;
          this.attemptSwap(prev, cell);
        } else {
          // Non-adjacent - move selection
          this.selected = cell;
          this.renderer.showSelection(cell, true);
        }
      }
    }

    // Attempt a swap through the board model
    attemptSwap(a, b) {
      // Check if swap is valid (creates a match)
      const valid = this.board.swapCreatesMatch(a, b);

      if (valid) {
        // Valid swap - execute through callback
        this.isProcessing = true;
        this.callbacks.onValidSwap?.(a, b, () => {
          this.isProcessing = false;
        });
      } else {
        // Invalid swap - animate back
        this.renderer.animateInvalidSwap(a, b, () => {
          this.callbacks.onInvalidSwap?.(a, b);
        });
      }
    }

    // Keyboard support
    onKeyDown(event) {
      if (this.isProcessing) return;

      if (!this.selected) {
        // Arrow keys to move selection from default position
        let r = 0, c = 0;
        switch (event.key) {
          case "ArrowUp": r = 7; break;
          case "ArrowDown": r = 0; break;
          case "ArrowLeft": c = 7; break;
          case "ArrowRight": c = 0; break;
          default: return;
        }
        // Find first interactive cell in that direction
        this.selected = this.findInteractiveFrom(r, c, event.key);
        if (this.selected) this.renderer.showSelection(this.selected, true);
        return;
      }

      // With selection active, arrows swap
      let dr = 0, dc = 0;
      switch (event.key) {
        case "ArrowUp": dr = -1; break;
        case "ArrowDown": dr = 1; break;
        case "ArrowLeft": dc = -1; break;
        case "ArrowRight": dc = 1; break;
        case "Escape":
          this.renderer.showSelection(this.selected, false);
          this.selected = null;
          return;
        default: return;
      }

      const target = { r: this.selected.r + dr, c: this.selected.c + dc };
      if (target.r >= 0 && target.r < 8 && target.c >= 0 && target.c < 8) {
        this.renderer.showSelection(this.selected, false);
        if (this.isCellInteractive(target.r, target.c)) {
          this.attemptSwap(this.selected, target);
        } else {
          this.selected = target;
          this.renderer.showSelection(this.selected, true);
        }
      }
    }

    findInteractiveFrom(r, c, direction) {
      // Search from edge inward for first interactive cell
      switch (direction) {
        case "ArrowUp":
          for (let rr = 7; rr >= 0; rr--) if (this.isCellInteractive(rr, c)) return { r: rr, c };
          break;
        case "ArrowDown":
          for (let rr = 0; rr < 8; rr++) if (this.isCellInteractive(rr, c)) return { r: rr, c };
          break;
        case "ArrowLeft":
          for (let cc = 7; cc >= 0; cc--) if (this.isCellInteractive(r, cc)) return { r, c: cc };
          break;
        case "ArrowRight":
          for (let cc = 0; cc < 8; cc++) if (this.isCellInteractive(r, cc)) return { r, c: cc };
          break;
      }
      return { r: 0, c: 0 }; // fallback
    }

    // Clear selection
    clearSelection() {
      if (this.selected) {
        this.renderer.showSelection(this.selected, false);
        this.selected = null;
      }
    }

    destroy() {
      this.clearSelection();
      this.pressPos = null;
    }
  }

  return SwapController;
});