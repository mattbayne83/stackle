import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import type { GameAction, GameState, PieceId } from '../engine'
import { applyAction, cellsOf, createGame } from '../engine'
import type { Difficulty } from '../types'
import { useRosterStore } from '../store/rosterStore'
import { useScoresStore } from '../store/scoresStore'
import { settingsFor, useSettingsStore } from '../store/settingsStore'
import { pushUnsynced, useSyncStore } from '../sync/leaderboard'
import { familyBest, fridgeEntries, personalBestEntry } from '../sync/merge'
import { DIFFICULTY_LABEL } from '../utils/difficulty'
import { Avatar } from '../components/Avatar'
import { Blocks } from '../components/Blocks'
import { BoardRenderer } from '../render/renderer'
import { FxState } from '../render/fx'
import { startLoop } from '../render/loop'
import { launchConfetti } from '../render/confetti'
import { attachKeyboard } from '../input/keyboard'
import { attachTouch } from '../input/touch'
import { TouchButtons } from '../input/TouchButtons'

interface PlayScreenProps {
  playerId: string
  difficulty: Difficulty
  onExit: () => void
}

/** Kind endings — rotated, never "you lose". */
const KIND_LINES = [
  'That was a good pile.',
  'The stack got tall. So did the grin.',
  'Blocks down. Kettle on.',
  'Every stack teaches the next one.',
  'The blocks had fun too.',
]

interface Hud {
  score: number
  lines: number
  level: number
  status: GameState['status']
  hold: PieceId | null
  canHold: boolean
  next: PieceId[]
}

interface EndState {
  score: number
  lines: number
  prevBest: number | null
  newBest: boolean
  family: boolean
  line: string
}

const INITIAL_HUD: Hud = {
  score: 0,
  lines: 0,
  level: 1,
  status: 'playing',
  hold: null,
  canHold: true,
  next: [],
}

/** Normalized [col, row] cells for tray previews, cached per piece. */
const PREVIEW = new Map<PieceId, Array<readonly [number, number]>>()
function previewCells(id: PieceId): Array<readonly [number, number]> {
  let cached = PREVIEW.get(id)
  if (!cached) {
    const cells = cellsOf({ id, row: 0, col: 0, rot: 0 })
    const minRow = Math.min(...cells.map((c) => c.row))
    const minCol = Math.min(...cells.map((c) => c.col))
    cached = cells.map((c) => [c.col - minCol, c.row - minRow] as const)
    PREVIEW.set(id, cached)
  }
  return cached
}

function pieceColor(id: PieceId): string {
  return `var(--color-piece-${id.toLowerCase()})`
}

function Tray({
  label,
  dimmed = false,
  children,
}: {
  label: string
  dimmed?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`tray grid min-h-18 min-w-18 content-start justify-items-center gap-1.5 px-3 py-2 transition-opacity duration-200 ${dimmed ? 'opacity-45' : ''}`}
    >
      <span className="text-[0.65rem] font-semibold tracking-wide text-ink-soft">{label}</span>
      <div className="grid min-h-8 grow place-items-center">{children}</div>
    </div>
  )
}

export function PlayScreen({ playerId, difficulty, onExit }: PlayScreenProps) {
  const player = useRosterStore((s) => s.players.find((p) => p.id === playerId))
  const ghostSetting = useSettingsStore((s) => settingsFor(s.byPlayer, playerId).ghost)

  const [hud, setHud] = useState<Hud>(INITIAL_HUD)
  const [ended, setEnded] = useState<EndState | null>(null)
  const [runId, setRunId] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const confettiRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<GameState | null>(null)
  const dispatchRef = useRef<(action: GameAction) => void>(() => {})
  const ghostRef = useRef(true)

  // Touch devices always get the button pad; gestures stay available too.
  // (settingsStore.controls has no UI writer yet — was an unreachable default.)
  const coarse = useMemo(() => window.matchMedia('(pointer: coarse)').matches, [])
  const showButtons = coarse

  useEffect(() => {
    // Chill always gets the ghost; elsewhere it's the player's call.
    ghostRef.current = difficulty === 'chill' ? true : ghostSetting
  }, [difficulty, ghostSetting])

  // The whole run lives in this effect: engine state stays in a ref (never
  // React state per-frame); only HUD-visible numbers mirror into React, and
  // only when they actually change.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const renderer = new BoardRenderer(canvas)
    const fx = new FxState(!reduced)
    let saved = false
    stateRef.current = createGame(difficulty, Date.now())

    let hudKey = ''
    const syncHud = (s: GameState): void => {
      const key = `${s.score}|${s.lines}|${s.level}|${s.status}|${s.hold ?? ''}|${s.canHold}|${s.next[0]}${s.next[1]}${s.next[2]}`
      if (key === hudKey) return
      hudKey = key
      setHud({
        score: s.score,
        lines: s.lines,
        level: s.level,
        status: s.status,
        hold: s.hold,
        canHold: s.canHold,
        next: s.next.slice(0, 3),
      })
    }
    syncHud(stateRef.current)

    const finish = (s: GameState): void => {
      if (saved) return
      saved = true
      const store = useScoresStore.getState()
      const players = useRosterStore.getState().players
      const remote = useSyncStore.getState().remoteRecords
      // Fridge union (local + remote, name-folded) so celebrations match the door.
      const fridge = fridgeEntries(store.records, remote, players)
      const pb = personalBestEntry(fridge, playerId, difficulty)
      const fam = familyBest(fridge, difficulty)
      const rotation = store.records.length
      store.addScore({
        playerId,
        difficulty,
        score: s.score,
        lines: s.lines,
        level: s.level,
        dateISO: new Date().toISOString(),
      })
      void pushUnsynced() // fire-and-forget; quiet on failure
      setEnded({
        score: s.score,
        lines: s.lines,
        prevBest: pb?.score ?? null,
        newBest: s.score > 0 && (!pb || s.score > pb.score),
        family: s.score > 0 && (!fam || s.score > fam.score),
        line: KIND_LINES[rotation % KIND_LINES.length],
      })
    }

    const dispatch = (action: GameAction): void => {
      const prev = stateRef.current
      if (!prev) return
      const next = applyAction(prev, action)
      if (next === prev) return
      stateRef.current = next
      if (next.events.length > 0) {
        fx.onEvents(prev, next, performance.now())
        for (const ev of next.events) {
          if (ev.type === 'gameOver') finish(next)
        }
      }
      syncHud(next)
    }
    dispatchRef.current = dispatch

    const isActive = (): boolean => stateRef.current?.status === 'playing'
    const keyboard = attachKeyboard({
      dispatch,
      isActive,
      onPauseToggle: () => {
        const s = stateRef.current
        if (s?.status === 'playing') dispatch({ type: 'pause' })
        else if (s?.status === 'paused') dispatch({ type: 'resume' })
      },
    })
    const detachTouch = attachTouch(canvas, {
      dispatch,
      isActive,
      colWidth: () => renderer.cell,
    })

    const onVisibility = (): void => {
      if (document.hidden && stateRef.current?.status === 'playing') {
        dispatch({ type: 'pause' })
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    const stop = startLoop((now, dt) => {
      keyboard.update(now)
      const s = stateRef.current
      if (!s) return
      if (s.status === 'playing') dispatch({ type: 'tick', ms: dt })
      renderer.draw(stateRef.current ?? s, fx, now, ghostRef.current)
    })

    return () => {
      stop()
      keyboard.detach()
      detachTouch()
      document.removeEventListener('visibilitychange', onVisibility)
      renderer.destroy()
      dispatchRef.current = () => {}
    }
  }, [runId, difficulty, playerId])

  // Family-record celebration: block confetti in the player's color.
  useEffect(() => {
    if (!ended?.family || !player) return
    const canvas = confettiRef.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const hue = player.hue
    return launchConfetti(canvas, [
      `oklch(0.68 0.15 ${hue})`,
      `oklch(0.78 0.11 ${hue})`,
      `oklch(0.58 0.13 ${hue})`,
      'oklch(0.8 0.12 85)',
    ])
  }, [ended, player])

  const send = useCallback((action: GameAction) => dispatchRef.current(action), [])

  const togglePause = (): void => {
    const s = stateRef.current
    if (s?.status === 'playing') send({ type: 'pause' })
    else if (s?.status === 'paused') send({ type: 'resume' })
  }

  const replay = (): void => {
    setEnded(null)
    setHud(INITIAL_HUD)
    setRunId((r) => r + 1)
  }

  const paused = hud.status === 'paused' && !ended

  const holdTray = (
    <Tray label="hold" dimmed={hud.hold !== null && !hud.canHold}>
      {hud.hold ? (
        <Blocks cells={previewCells(hud.hold)} color={pieceColor(hud.hold)} size={9} />
      ) : (
        <span aria-hidden className="text-xs text-ink-soft">
          &mdash;
        </span>
      )}
    </Tray>
  )

  const endSub = ended
    ? [
        `${ended.lines} ${ended.lines === 1 ? 'line' : 'lines'}`,
        ended.family && player
          ? `${player.name} takes the fridge.`
          : ended.prevBest !== null
            ? `${ended.newBest ? 'past best' : 'best'} ${ended.prevBest.toLocaleString()}`
            : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  return (
    <main className="mx-auto flex h-dvh w-full flex-col overflow-hidden px-4 pt-3 pb-2 lg:grid lg:grid-cols-[10rem_auto_11rem] lg:content-center lg:items-start lg:justify-center lg:gap-5 lg:px-6 lg:py-6">
      {/* Phone HUD — quiet top strip */}
      <header className="flex items-end justify-between gap-4 lg:hidden">
        <div>
          <p className="font-display text-4xl leading-none font-extrabold tabular-nums">
            {hud.score.toLocaleString()}
          </p>
          <p className="mt-1.5 text-xs text-ink-soft">
            {hud.lines} lines · level {hud.level}
          </p>
        </div>
        <button
          aria-label={paused ? 'Resume' : 'Pause'}
          onClick={togglePause}
          className="chunk grid size-12 place-items-center"
        >
          {paused ? <Play aria-hidden size={20} /> : <Pause aria-hidden size={20} />}
        </button>
      </header>

      {/* Phone trays */}
      <div className="mt-2.5 flex items-stretch justify-between gap-3 lg:hidden">
        {holdTray}
        <Tray label="next">
          <div className="flex items-center gap-3">
            {hud.next.map((id, i) => (
              <div key={i} className={i === 0 ? '' : 'opacity-60'}>
                <Blocks cells={previewCells(id)} color={pieceColor(id)} size={i === 0 ? 9 : 7} />
              </div>
            ))}
          </div>
        </Tray>
      </div>

      {/* Laptop left rail — who's stacking + hold */}
      <aside className="hidden content-start gap-5 lg:grid">
        {player && (
          <div className="flex items-center gap-3">
            <Avatar player={player} size={42} />
            <div className="min-w-0">
              <p className="single-line font-semibold">{player.name}</p>
              <p className="text-xs text-ink-soft">{DIFFICULTY_LABEL[difficulty]}</p>
            </div>
          </div>
        )}
        {holdTray}
        {/* The pause overlay owns resuming — this button goes quiet while paused. */}
        <button
          aria-label="Pause"
          onClick={togglePause}
          disabled={paused}
          className="chunk flex h-12 items-center gap-2.5 px-4 font-semibold transition-opacity duration-200 disabled:pointer-events-none disabled:opacity-40"
        >
          <Pause aria-hidden size={18} />
          Pause
        </button>
      </aside>

      {/* The well — hero on both layouts. On laptop the container takes the
          board's exact 1:2 aspect so the canvas is the well (no empty frame). */}
      <div className="relative mt-2.5 min-h-0 flex-1 lg:mt-0 lg:aspect-[1/2] lg:h-[min(86dvh,50rem)] lg:w-auto lg:flex-none">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none select-none" />

        {paused && (
          <div className="overlay-frost absolute inset-0 z-10 grid place-items-center rounded-2xl">
            <div className="rise-in grid justify-items-center gap-1.5 p-6 text-center">
              <p className="font-display text-2xl font-extrabold">Paused</p>
              <p className="text-sm text-ink-soft">The stack will wait.</p>
              <div className="mt-4 grid justify-items-stretch gap-3">
                <button
                  autoFocus
                  onClick={togglePause}
                  className="chunk h-12 bg-accent px-6 text-center font-semibold text-accent-ink"
                >
                  Keep stacking
                </button>
                <button onClick={onExit} className="chunk h-12 px-6 text-center font-semibold">
                  Back home
                </button>
              </div>
            </div>
          </div>
        )}

        {ended && (
          <div className="overlay-frost absolute inset-0 z-10 grid place-items-center overflow-hidden rounded-2xl">
            {ended.family && (
              <canvas
                ref={confettiRef}
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
            )}
            <div className="rise-in relative grid justify-items-center gap-1 p-6 text-center">
              {player && <Avatar player={player} size={ended.family ? 56 : 44} />}
              <p className="mt-3 font-display font-bold">
                {ended.family
                  ? 'New family record'
                  : ended.newBest
                    ? 'New personal best'
                    : ended.line}
              </p>
              <p
                className={`font-display font-extrabold tabular-nums ${ended.family ? 'text-6xl' : 'text-5xl'}`}
              >
                {ended.score.toLocaleString()}
              </p>
              {endSub && <p className="text-sm text-ink-soft">{endSub}</p>}
              <div className="mt-5 grid justify-items-stretch gap-3">
                <button
                  autoFocus
                  onClick={replay}
                  className="chunk h-12 bg-accent px-6 text-center font-semibold text-accent-ink"
                >
                  One more go
                </button>
                <button onClick={onExit} className="chunk h-12 px-6 text-center font-semibold">
                  Home
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Laptop right rail — score column + next */}
      <aside className="hidden content-start gap-6 lg:grid">
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink-soft">score</p>
          <p className="mt-1 font-display text-4xl leading-none font-extrabold tabular-nums">
            {hud.score.toLocaleString()}
          </p>
          <p className="mt-2.5 text-sm text-ink-soft">
            {hud.lines} lines · level {hud.level}
          </p>
        </div>
        <Tray label="next">
          <div className="grid justify-items-center gap-3.5 py-1">
            {hud.next.map((id, i) => (
              <div key={i} className={i === 0 ? '' : 'opacity-60'}>
                <Blocks cells={previewCells(id)} color={pieceColor(id)} size={i === 0 ? 11 : 9} />
              </div>
            ))}
          </div>
        </Tray>
      </aside>

      {showButtons && (
        <div className="lg:hidden">
          <TouchButtons send={send} canHold={hud.canHold && hud.status === 'playing'} />
        </div>
      )}
    </main>
  )
}
