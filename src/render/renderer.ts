import type { ActivePiece, GameState } from '../engine'
import { COLS, HIDDEN_ROWS, ROWS, cellsOf, ghostRow } from '../engine'
import type { Palette } from './palette'
import { resolvePalette } from './palette'
import type { FxState } from './fx'
import { CLEAR_FLASH_MS, CLEAR_MS, GLOW_MS, LOCK_MS, SHAKE_MS, SQUASH_MS, STACKLE_MS } from './fx'

const VISIBLE_ROWS = ROWS - HIDDEN_ROWS

function easeOutQuint(t: number): number {
  const u = 1 - Math.min(1, Math.max(0, t))
  return 1 - u * u * u * u * u
}

/**
 * Crisp DPR-aware canvas renderer for the well. Owns its own sizing
 * (ResizeObserver on the parent) and theme watching; call draw() every frame
 * with the current engine state — it letterboxes the 10x20 board inside
 * whatever box the layout gives it.
 */
export class BoardRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private palette: Palette
  private observer: ResizeObserver
  private darkQuery: MediaQueryList
  private onTheme: () => void

  // CSS-pixel metrics, recomputed on resize.
  private cssW = 0
  private cssH = 0
  private dpr = 1
  cell = 0
  private ox = 0
  private oy = 0
  private boardW = 0
  private boardH = 0

  // Per-piece cell cache: quiet ticks reuse the same piece reference, so
  // cellsOf only runs when the piece actually moved.
  private lastPiece: ActivePiece | null = null
  private lastCells: Array<{ row: number; col: number }> = []
  private lastGhostBoard: unknown = null
  private lastGhostPiece: ActivePiece | null = null
  private lastGhostRow: number | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas 2d context unavailable')
    this.ctx = ctx
    this.palette = resolvePalette(canvas)

    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(canvas.parentElement ?? canvas)
    this.resize()

    this.darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
    this.onTheme = () => {
      this.palette = resolvePalette(this.canvas)
    }
    this.darkQuery.addEventListener('change', this.onTheme)
  }

  destroy(): void {
    this.observer.disconnect()
    this.darkQuery.removeEventListener('change', this.onTheme)
  }

  /**
   * One boardRect for everything: integer cell size, board = cell*10 x
   * cell*20, centered in the canvas with integer offsets. Every draw pass
   * (well, grid, cells, ghost, fx, frame) is expressed in coordinates
   * relative to this rect's origin — nothing else measures the canvas.
   */
  private resize(): void {
    const host = this.canvas.parentElement ?? this.canvas
    const rect = host.getBoundingClientRect()
    this.cssW = rect.width
    this.cssH = rect.height
    this.dpr = Math.min(window.devicePixelRatio || 1, 3)
    this.canvas.width = Math.max(1, Math.round(this.cssW * this.dpr))
    this.canvas.height = Math.max(1, Math.round(this.cssH * this.dpr))
    this.cell = Math.max(4, Math.floor(Math.min(this.cssW / COLS, this.cssH / VISIBLE_ROWS)))
    this.boardW = this.cell * COLS
    this.boardH = this.cell * VISIBLE_ROWS
    this.ox = Math.floor((this.cssW - this.boardW) / 2)
    this.oy = Math.floor((this.cssH - this.boardH) / 2)
  }

  draw(state: GameState, fx: FxState, now: number, ghostOn: boolean): void {
    const { ctx, cell, palette } = this
    fx.prune(now)

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, this.cssW, this.cssH)

    // Hard-drop thud: the whole well dips — a touch deeper for a Stackle.
    let shakeY = 0
    if (fx.shakeStart >= 0) {
      shakeY = fx.shakeAmp * (1 - easeOutQuint((now - fx.shakeStart) / SHAKE_MS))
    }
    ctx.translate(this.ox, this.oy + shakeY)

    // The well itself — a sunken tray the blocks live in.
    const wellR = Math.max(8, cell * 0.35)
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(0, 0, this.boardW, this.boardH, wellR)
    ctx.fillStyle = palette.well
    ctx.fill()
    ctx.clip()

    // Subtle grid so the empty well still reads as a place for blocks.
    ctx.globalAlpha = 0.4
    ctx.strokeStyle = palette.line
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let c = 1; c < COLS; c++) {
      const x = c * cell + 0.5
      ctx.moveTo(x, 0)
      ctx.lineTo(x, this.boardH)
    }
    for (let r = 1; r < VISIBLE_ROWS; r++) {
      const y = r * cell + 0.5
      ctx.moveTo(0, y)
      ctx.lineTo(this.boardW, y)
    }
    ctx.stroke()
    ctx.globalAlpha = 1

    // Locked cells — rows above a fresh clear settle down into place.
    const clear = fx.clear
    const clearT = clear ? now - clear.start : 0
    const settle = clear
      ? clearT <= CLEAR_FLASH_MS
        ? 0
        : easeOutQuint((clearT - CLEAR_FLASH_MS) / (CLEAR_MS - CLEAR_FLASH_MS))
      : 1
    const lock = fx.lock
    const board = state.board
    for (let r = HIDDEN_ROWS; r < ROWS; r++) {
      const row = board[r]
      const lift = clear ? clear.drop[r] * cell * (1 - settle) : 0
      const y = (r - HIDDEN_ROWS) * cell - lift
      for (let c = 0; c < COLS; c++) {
        const id = row[c]
        if (id === null) continue
        if (lock && lock.keys.has(r * COLS + c)) continue
        this.drawCell(c * cell, y, palette.piece[id])
      }
    }

    // Cleared-row snapshot: bright flash, then the rows pop out while the
    // stack above collapses into the gap. On a Stackle the burst particles
    // take over after the flash, so the scale-out is skipped.
    if (clear && !(fx.stackle && clearT > CLEAR_FLASH_MS)) {
      const fading = clearT > CLEAR_FLASH_MS
      const p = fading ? (clearT - CLEAR_FLASH_MS) / (CLEAR_MS - CLEAR_FLASH_MS) : 0
      const alpha = fading ? 1 - p : 1
      const scaleY = fading ? 1 - easeOutQuint(p) * 0.9 : 1
      for (const snap of clear.rows) {
        const y = (snap.y - HIDDEN_ROWS) * cell
        const cy = y + cell / 2
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.translate(0, cy)
        ctx.scale(1, scaleY)
        ctx.translate(0, -cy)
        for (let c = 0; c < COLS; c++) {
          const id = snap.cells[c]
          if (id === null) continue
          this.drawCell(c * cell, y, palette.piece[id])
        }
        if (!fading) {
          // The flash: one bright breath over the whole row.
          ctx.globalAlpha = 0.65
          ctx.fillStyle = 'oklch(0.99 0.02 90)'
          ctx.fillRect(0, y, this.boardW, cell)
        }
        ctx.restore()
      }
    }

    // Fresh-locked piece: soft pulse; hard drops land with a 1-2 frame squash.
    if (lock) {
      const t = now - lock.start
      const squash = lock.squash ? 0.85 + 0.15 * easeOutQuint(t / SQUASH_MS) : 1
      const pulse = Math.max(0, 1 - t / LOCK_MS)
      const bottomY = (lock.bottomRow + 1 - HIDDEN_ROWS) * cell
      for (const c of lock.cells) {
        const id = board[c.row][c.col]
        if (id === null) continue
        const y0 = (c.row - HIDDEN_ROWS) * cell
        const y = bottomY - (bottomY - y0) * squash
        this.drawCell(c.col * cell, y, palette.piece[id], squash)
        if (pulse > 0) {
          ctx.globalAlpha = 0.3 * pulse
          ctx.fillStyle = 'oklch(0.99 0.02 90)'
          ctx.beginPath()
          ctx.roundRect(c.col * cell + 1, y + 1, cell - 2, cell * squash - 2, cell * 0.2)
          ctx.fill()
          ctx.globalAlpha = 1
        }
      }
    }

    // Active piece + ghost.
    const active = state.active
    if (active) {
      if (active !== this.lastPiece) {
        this.lastPiece = active
        this.lastCells = cellsOf(active)
      }
      if (ghostOn) {
        if (active !== this.lastGhostPiece || board !== this.lastGhostBoard) {
          this.lastGhostPiece = active
          this.lastGhostBoard = board
          this.lastGhostRow = ghostRow(state)
        }
        const gRow = this.lastGhostRow
        if (gRow !== null && gRow !== active.row) {
          const dy = (gRow - active.row) * cell
          const color = palette.piece[active.id]
          ctx.lineWidth = Math.max(1.5, cell * 0.07)
          ctx.strokeStyle = color
          ctx.fillStyle = color
          for (const c of this.lastCells) {
            const x = c.col * cell
            const y = (c.row - HIDDEN_ROWS) * cell + dy
            ctx.globalAlpha = 0.12
            ctx.beginPath()
            ctx.roundRect(x + 2, y + 2, cell - 4, cell - 4, cell * 0.2)
            ctx.fill()
            ctx.globalAlpha = 0.45
            ctx.stroke()
          }
          ctx.globalAlpha = 1
        }
      }
      for (const c of this.lastCells) {
        this.drawCell(c.col * cell, (c.row - HIDDEN_ROWS) * cell, palette.piece[active.id])
      }
    }

    // The Stackle moment: cleared cells tumble as loose toy blocks while
    // the game's own name stamps across the band. Same physics language as
    // the family-record confetti — gravity and ease-out, never bounce.
    const stackle = fx.stackle
    if (stackle) {
      const t = now - stackle.start - CLEAR_FLASH_MS
      if (t > 0) {
        const life = Math.min(1, t / (STACKLE_MS - CLEAR_FLASH_MS))
        const fade = life > 0.72 ? Math.max(0, 1 - (life - 0.72) / 0.28) : 1
        const size = cell * 0.82
        const gravity = 0.000042 // cells per ms², tuned to clear the well by the end
        for (const p of stackle.particles) {
          const x = (p.x + p.vx * t) * cell
          const y = (p.y + p.vy * t + gravity * t * t * 0.5) * cell
          if (y > this.boardH + size) continue
          ctx.save()
          ctx.globalAlpha = fade
          ctx.translate(x, y)
          ctx.rotate(p.rot + p.vr * t)
          ctx.fillStyle = palette.piece[p.id]
          ctx.beginPath()
          ctx.roundRect(-size / 2, -size / 2, size, size, size * 0.22)
          ctx.fill()
          ctx.fillStyle = 'oklch(0.99 0.01 90 / 0.35)'
          ctx.fillRect(-size / 2, -size / 2, size, size * 0.2)
          ctx.restore()
        }

        ctx.save()
        ctx.globalAlpha = Math.min(1, t / 140) * fade
        let px = cell * 1.35
        ctx.font = `800 ${px}px "Hepta Slab", serif`
        const wordW = ctx.measureText('Stackle!').width
        const maxW = this.boardW * 0.88
        if (wordW > maxW) {
          px *= maxW / wordW
          ctx.font = `800 ${px}px "Hepta Slab", serif`
        }
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.translate(this.boardW / 2, stackle.centerY * cell - 10 * easeOutQuint(life))
        ctx.rotate(-0.045)
        ctx.fillStyle = palette.ink
        ctx.fillText('Stackle!', 0, 0)
        ctx.restore()
        ctx.globalAlpha = 1
      }
    }

    // Level up: a gentle glow breath around the well edge — never a flash.
    if (fx.glowStart >= 0) {
      const t = (now - fx.glowStart) / GLOW_MS
      ctx.globalAlpha = 0.3 * (1 - easeOutQuint(t))
      ctx.strokeStyle = palette.accent
      ctx.lineWidth = 6 + 10 * easeOutQuint(t)
      ctx.beginPath()
      ctx.roundRect(2, 2, this.boardW - 4, this.boardH - 4, wellR)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    ctx.restore()

    // A quiet inner edge so the well reads sunken, matching the .tray look.
    // restore() re-applied the boardRect translate from the save() above, so
    // this stroke is in board coordinates — same origin as the well and grid.
    ctx.globalAlpha = 0.5
    ctx.strokeStyle = palette.line
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(0.5, 0.5, this.boardW - 1, this.boardH - 1, wellR)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  /**
   * One chunky block cell, lit from above like .block-cell: top highlight
   * band, bottom shade band, small radius, hairline gap all around.
   */
  private drawCell(x: number, y: number, color: string, scaleY = 1): void {
    const { ctx, cell } = this
    const pad = Math.max(1, cell * 0.05)
    const w = cell - pad * 2
    const h = cell * scaleY - pad * 2
    if (h <= 0) return
    const r = Math.max(2, cell * 0.18)
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x + pad, y + pad, w, h, r)
    ctx.fillStyle = color
    ctx.fill()
    ctx.clip()
    // Lit top edge.
    ctx.fillStyle = 'oklch(0.99 0.01 90 / 0.38)'
    ctx.fillRect(x + pad, y + pad, w, Math.max(1.5, h * 0.14))
    // Grounded bottom edge.
    ctx.fillStyle = 'oklch(0.22 0.04 60 / 0.26)'
    ctx.fillRect(x + pad, y + pad + h - Math.max(1.5, h * 0.16), w, Math.max(1.5, h * 0.16))
    ctx.restore()
  }
}
