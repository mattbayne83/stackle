import { useEffect, useRef } from 'react'
import { ArrowDownToLine, ArrowLeft, ArrowRight, Repeat2, RotateCw } from 'lucide-react'
import type { GameAction } from '../engine'
import { ARR_MS, DAS_MS } from './repeat'
import type { Dir } from './repeat'

interface TouchButtonsProps {
  send: (action: GameAction) => void
  canHold: boolean
}

/**
 * Visible fallback controls for players who prefer buttons over gestures.
 * Left/right repeat with the same DAS/ARR feel as the keyboard.
 */
export function TouchButtons({ send, canHold }: TouchButtonsProps) {
  const heldRef = useRef<{ dir: Dir; nextAt: number } | null>(null)
  const rafRef = useRef(0)

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const step = (now: number): void => {
    const held = heldRef.current
    if (!held) return
    while (now >= held.nextAt) {
      send(held.dir === -1 ? { type: 'moveLeft' } : { type: 'moveRight' })
      held.nextAt += ARR_MS
    }
    rafRef.current = requestAnimationFrame(step)
  }

  const pressMove = (dir: Dir): void => {
    send(dir === -1 ? { type: 'moveLeft' } : { type: 'moveRight' })
    heldRef.current = { dir, nextAt: performance.now() + DAS_MS }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(step)
  }

  const releaseMove = (): void => {
    heldRef.current = null
    cancelAnimationFrame(rafRef.current)
  }

  const pad = 'chunk grid size-14 shrink-0 touch-none place-items-center select-none'

  return (
    <div className="flex items-center justify-center gap-3 pt-3 pb-1">
      <button
        aria-label="Hold piece"
        disabled={!canHold}
        className={`${pad} ${canHold ? '' : 'opacity-40'}`}
        onPointerDown={(e) => {
          e.preventDefault()
          send({ type: 'hold' })
        }}
      >
        <Repeat2 aria-hidden size={22} />
      </button>
      <button
        aria-label="Move left"
        className={pad}
        onPointerDown={(e) => {
          e.preventDefault()
          pressMove(-1)
        }}
        onPointerUp={releaseMove}
        onPointerCancel={releaseMove}
        onPointerLeave={releaseMove}
      >
        <ArrowLeft aria-hidden size={24} />
      </button>
      <button
        aria-label="Move right"
        className={pad}
        onPointerDown={(e) => {
          e.preventDefault()
          pressMove(1)
        }}
        onPointerUp={releaseMove}
        onPointerCancel={releaseMove}
        onPointerLeave={releaseMove}
      >
        <ArrowRight aria-hidden size={24} />
      </button>
      <button
        aria-label="Rotate"
        className={pad}
        onPointerDown={(e) => {
          e.preventDefault()
          send({ type: 'rotateCW' })
        }}
      >
        <RotateCw aria-hidden size={24} />
      </button>
      <button
        aria-label="Drop"
        className={pad}
        onPointerDown={(e) => {
          e.preventDefault()
          send({ type: 'hardDrop' })
        }}
      >
        <ArrowDownToLine aria-hidden size={24} />
      </button>
    </div>
  )
}
