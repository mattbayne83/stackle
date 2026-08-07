import type { Cell, GameState } from '../engine'
import { COLS, HIDDEN_ROWS, ROWS, cellsOf } from '../engine'

/** Durations (ms) — decorative overlays only; engine state is already final. */
export const CLEAR_FLASH_MS = 80
export const CLEAR_MS = 250
export const LOCK_MS = 150
export const SQUASH_MS = 120
export const SHAKE_MS = 120
export const GLOW_MS = 600
export const STACKLE_MS = 950

export interface ClearFx {
  start: number
  /** Snapshot of the cleared rows (pre-clear coords + colors). */
  rows: Array<{ y: number; cells: Cell[] }>
  /** Per post-clear row index: how many cells that row just fell. */
  drop: number[]
}

/** One cleared cell turned loose toy block. Cell units, so resizes are safe. */
export interface StackleParticle {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  id: NonNullable<Cell>
}

/** The signature four-line moment: the cleared band bursts into blocks. */
export interface StackleFx {
  start: number
  /** Visible-row center of the cleared band — where the word stamps. */
  centerY: number
  particles: StackleParticle[]
}

export interface LockFx {
  start: number
  cells: Array<{ row: number; col: number }>
  /** row*COLS+col keys, so the board pass can skip these cells. */
  keys: Set<number>
  bottomRow: number
  squash: boolean
}

/**
 * Collects decorative animation state from engine events. The engine has
 * already applied the change; everything here is a short-lived overlay drawn
 * on top of the real state, then discarded.
 */
export class FxState {
  enabled: boolean
  clear: ClearFx | null = null
  stackle: StackleFx | null = null
  lock: LockFx | null = null
  shakeStart = -1
  shakeAmp = 2
  glowStart = -1

  constructor(enabled: boolean) {
    this.enabled = enabled
  }

  reset(): void {
    this.clear = null
    this.stackle = null
    this.lock = null
    this.shakeStart = -1
    this.shakeAmp = 2
    this.glowStart = -1
  }

  onEvents(prev: GameState, next: GameState, now: number): void {
    if (!this.enabled) return
    const events = next.events
    let lockedCells: Array<{ row: number; col: number }> | null = null
    let lockedId: Cell = null
    let hadHardDrop = false
    let hadClear = false

    for (const ev of events) {
      if (ev.type === 'hardDrop') {
        hadHardDrop = true
        this.shakeStart = now
        this.shakeAmp = 2
      } else if (ev.type === 'lock') {
        lockedCells = cellsOf(ev.piece)
        lockedId = ev.piece.id
      } else if (ev.type === 'levelUp') {
        this.glowStart = now
      } else if (ev.type === 'lineClear') {
        hadClear = true
        const cleared = new Set(ev.rows)
        const rows = ev.rows.map((y) => {
          const cells = prev.board[y].slice()
          if (lockedCells) {
            for (const c of lockedCells) if (c.row === y) cells[c.col] = lockedId
          }
          return { y, cells }
        })
        // Surviving pre-clear rows land at indices count..ROWS-1 in order;
        // the difference is how far each row visually falls.
        const drop = new Array<number>(ROWS).fill(0)
        let newIdx = ev.count
        for (let r = 0; r < ROWS; r++) {
          if (cleared.has(r)) continue
          drop[newIdx] = newIdx - r
          newIdx++
        }
        this.clear = { start: now, rows, drop }

        // The signature Stackle: four lines burst into loose toy blocks
        // instead of scaling away, with the deep thud + glow to match.
        if (ev.count === 4) {
          const particles: StackleParticle[] = []
          for (const snap of rows) {
            for (let c = 0; c < COLS; c++) {
              const id = snap.cells[c]
              if (id === null) continue
              particles.push({
                x: c + 0.5,
                y: snap.y - HIDDEN_ROWS + 0.5,
                vx: (Math.random() - 0.5) * 0.009,
                vy: -(0.006 + Math.random() * 0.007),
                rot: (Math.random() - 0.5) * 0.4,
                vr: (Math.random() - 0.5) * 0.008,
                id,
              })
            }
          }
          const centerY =
            rows.reduce((sum, r) => sum + r.y - HIDDEN_ROWS + 0.5, 0) / rows.length
          this.stackle = { start: now, centerY, particles }
          this.shakeStart = now
          this.shakeAmp = 3.5
          this.glowStart = now
        }
      }
    }

    // The clear animation is the moment — a lock pulse under it is noise.
    if (lockedCells && !hadClear) {
      const keys = new Set<number>()
      let bottomRow = 0
      for (const c of lockedCells) {
        keys.add(c.row * COLS + c.col)
        if (c.row > bottomRow) bottomRow = c.row
      }
      this.lock = { start: now, cells: lockedCells, keys, bottomRow, squash: hadHardDrop }
    }
  }

  /** Drop expired overlays so the renderer's hot path stays branch-cheap. */
  prune(now: number): void {
    if (this.clear && now - this.clear.start > CLEAR_MS) this.clear = null
    if (this.stackle && now - this.stackle.start > STACKLE_MS) this.stackle = null
    if (this.lock && now - this.lock.start > Math.max(LOCK_MS, SQUASH_MS)) this.lock = null
    if (this.shakeStart >= 0 && now - this.shakeStart > SHAKE_MS) this.shakeStart = -1
    if (this.glowStart >= 0 && now - this.glowStart > GLOW_MS) this.glowStart = -1
  }
}
