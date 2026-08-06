import type { GameAction } from '../engine'
import { ShiftRepeater } from './repeat'
import type { Dir } from './repeat'

interface KeyboardOptions {
  dispatch: (action: GameAction) => void
  /** True while gameplay actions should land (status === 'playing'). */
  isActive: () => boolean
  /** P / Escape — the screen decides what pausing means. */
  onPauseToggle: () => void
}

export interface KeyboardControls {
  /** Call once per frame with the rAF clock so DAS/ARR repeats fire. */
  update(now: number): void
  detach(): void
}

const MOVE: Record<Dir, GameAction> = {
  [-1]: { type: 'moveLeft' },
  [1]: { type: 'moveRight' },
}

export function attachKeyboard(opts: KeyboardOptions): KeyboardControls {
  const repeater = new ShiftRepeater()
  let softDropping = false
  const move = (dir: Dir): void => opts.dispatch(MOVE[dir])

  const setSoftDrop = (on: boolean): void => {
    if (softDropping === on) return
    softDropping = on
    opts.dispatch({ type: 'softDrop', on })
  }

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (!e.repeat) opts.onPauseToggle()
      return
    }
    if (!opts.isActive()) return

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        if (!e.repeat) repeater.press(-1, performance.now(), move)
        break
      case 'ArrowRight':
        e.preventDefault()
        if (!e.repeat) repeater.press(1, performance.now(), move)
        break
      case 'ArrowUp':
      case 'x':
      case 'X':
        e.preventDefault()
        if (!e.repeat) opts.dispatch({ type: 'rotateCW' })
        break
      case 'z':
      case 'Z':
        if (!e.repeat) opts.dispatch({ type: 'rotateCCW' })
        break
      case 'ArrowDown':
        e.preventDefault()
        setSoftDrop(true)
        break
      case ' ':
        e.preventDefault()
        if (!e.repeat) opts.dispatch({ type: 'hardDrop' })
        break
      case 'c':
      case 'C':
        if (!e.repeat) opts.dispatch({ type: 'hold' })
        break
    }
  }

  const onKeyUp = (e: KeyboardEvent): void => {
    switch (e.key) {
      case 'ArrowLeft':
        repeater.release(-1, performance.now())
        break
      case 'ArrowRight':
        repeater.release(1, performance.now())
        break
      case 'ArrowDown':
        setSoftDrop(false)
        break
    }
  }

  // Alt-tab mid-hold: drop everything rather than ghost-repeating.
  const onBlur = (): void => {
    repeater.clear()
    setSoftDrop(false)
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)

  return {
    update(now) {
      if (opts.isActive()) repeater.update(now, move)
    },
    detach() {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    },
  }
}
