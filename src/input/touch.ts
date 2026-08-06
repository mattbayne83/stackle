import type { GameAction } from '../engine'

interface TouchOptions {
  dispatch: (action: GameAction) => void
  isActive: () => boolean
  /** Current rendered cell width in CSS px — one column of drag per cell. */
  colWidth: () => number
}

/** Gesture tuning (CSS px / ms). */
const SLOP = 12 // movement below this is a tap
const DROP_ENGAGE = 18 // downward travel before soft drop kicks in
const TAP_MS = 300
const FLICK_VELOCITY = 1.0 // px/ms downward over the last ~100ms
const FLICK_TRAVEL = 40
const VELOCITY_WINDOW_MS = 100

type Mode = 'idle' | 'pending' | 'shift' | 'drop'

/**
 * One-finger touch on the well: horizontal drag shifts the piece one column
 * per cell-width, tap rotates, dragging down soft-drops while held, a fast
 * downward flick hard-drops. Long-press does nothing on purpose.
 */
export function attachTouch(el: HTMLElement, opts: TouchOptions): () => void {
  let mode: Mode = 'idle'
  let pointerId = -1
  let startX = 0
  let startY = 0
  let startT = 0
  let appliedCols = 0
  let softDropping = false
  // Small ring buffer of recent vertical samples for flick velocity.
  const times = new Float64Array(8)
  const ys = new Float64Array(8)
  let sampleCount = 0

  const setSoftDrop = (on: boolean): void => {
    if (softDropping === on) return
    softDropping = on
    opts.dispatch({ type: 'softDrop', on })
  }

  const reset = (): void => {
    mode = 'idle'
    pointerId = -1
    setSoftDrop(false)
  }

  const onDown = (e: PointerEvent): void => {
    if (!e.isPrimary || mode !== 'idle' || !opts.isActive()) return
    mode = 'pending'
    pointerId = e.pointerId
    startX = e.clientX
    startY = e.clientY
    startT = performance.now()
    appliedCols = 0
    sampleCount = 0
    el.setPointerCapture(e.pointerId)
  }

  const onMove = (e: PointerEvent): void => {
    if (e.pointerId !== pointerId || mode === 'idle') return
    if (!opts.isActive()) return
    const dx = e.clientX - startX
    const dy = e.clientY - startY

    if (mode === 'pending') {
      if (Math.abs(dx) > SLOP && Math.abs(dx) > Math.abs(dy)) {
        mode = 'shift'
      } else if (dy > DROP_ENGAGE && dy > Math.abs(dx)) {
        mode = 'drop'
        setSoftDrop(true)
      }
    }

    if (mode === 'shift') {
      const colW = Math.max(8, opts.colWidth())
      const want = Math.trunc(dx / colW)
      while (appliedCols < want) {
        opts.dispatch({ type: 'moveRight' })
        appliedCols++
      }
      while (appliedCols > want) {
        opts.dispatch({ type: 'moveLeft' })
        appliedCols--
      }
    } else if (mode === 'drop') {
      const i = sampleCount % times.length
      times[i] = performance.now()
      ys[i] = e.clientY
      sampleCount++
    }
  }

  const onUp = (e: PointerEvent): void => {
    if (e.pointerId !== pointerId) return
    const wasMode = mode
    const dy = e.clientY - startY
    const elapsed = performance.now() - startT
    reset()
    if (!opts.isActive()) return

    if (wasMode === 'pending' && elapsed < TAP_MS) {
      opts.dispatch({ type: 'rotateCW' })
      return
    }
    if (wasMode === 'drop' && dy >= FLICK_TRAVEL) {
      // Velocity over the freshest samples inside the window.
      const now = performance.now()
      let oldestT = now
      let oldestY = e.clientY
      const n = Math.min(sampleCount, times.length)
      for (let i = 0; i < n; i++) {
        if (now - times[i] <= VELOCITY_WINDOW_MS && times[i] < oldestT) {
          oldestT = times[i]
          oldestY = ys[i]
        }
      }
      const dt = now - oldestT
      if (dt > 8 && (e.clientY - oldestY) / dt >= FLICK_VELOCITY) {
        opts.dispatch({ type: 'hardDrop' })
      }
    }
  }

  const onCancel = (e: PointerEvent): void => {
    if (e.pointerId === pointerId) reset()
  }

  const onContextMenu = (e: Event): void => e.preventDefault()

  el.addEventListener('pointerdown', onDown)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onCancel)
  el.addEventListener('contextmenu', onContextMenu)

  return () => {
    el.removeEventListener('pointerdown', onDown)
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', onUp)
    el.removeEventListener('pointercancel', onCancel)
    el.removeEventListener('contextmenu', onContextMenu)
    setSoftDrop(false)
  }
}
