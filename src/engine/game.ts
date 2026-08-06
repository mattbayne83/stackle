import type {
  ActivePiece,
  Cell,
  Difficulty,
  GameAction,
  GameEvent,
  GameState,
  PieceId,
  Rotation,
} from './types'
import { COLS, ROWS } from './types'
import { cellsOf, kicksFor, spawnPiece } from './pieces'
import { nextBag } from './rng'

export const LOCK_DELAY_MS = 500
export const MAX_LOCK_RESETS = 15
export const SOFT_DROP_FACTOR = 20
const CLEAR_SCORES = [0, 100, 300, 500, 800]
const QUEUE_MIN = 5

const CURVES: Record<Difficulty, { start: number; factor: number; floor: number }> = {
  chill: { start: 900, factor: 0.92, floor: 250 },
  classic: { start: 700, factor: 0.85, floor: 80 },
  turbo: { start: 350, factor: 0.82, floor: 50 },
}

// Gravity interval in ms per row for a difficulty at a given level.
export function gravityInterval(difficulty: Difficulty, level: number): number {
  const { start, factor, floor } = CURVES[difficulty]
  return Math.max(floor, start * factor ** (level - 1))
}

// Internal fields ride along on the state object but stay out of the public
// GameState contract. applyAction round-trips them.
interface EngineState extends GameState {
  rngState: number
  gravityMs: number
  lockMs: number
  lockResets: number
  softDropOn: boolean
}

const NO_EVENTS: GameEvent[] = []

function collides(board: Cell[][], piece: ActivePiece): boolean {
  for (const { row, col } of cellsOf(piece)) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true
    if (board[row][col] !== null) return true
  }
  return false
}

function grounded(board: Cell[][], piece: ActivePiece): boolean {
  return collides(board, { ...piece, row: piece.row + 1 })
}

function refillQueue(queue: PieceId[], rngState: number): { queue: PieceId[]; rngState: number } {
  let q = queue
  let s = rngState
  while (q.length < QUEUE_MIN) {
    const { bag, state } = nextBag(s)
    q = q.concat(bag)
    s = state
  }
  return { queue: q, rngState: s }
}

export function createGame(difficulty: Difficulty, seed: number): GameState {
  const board: Cell[][] = Array.from({ length: ROWS }, () =>
    new Array<Cell>(COLS).fill(null),
  )
  const { queue, rngState } = refillQueue([], seed | 0)
  const [first, ...rest] = queue
  const state: EngineState = {
    board,
    active: spawnPiece(first),
    hold: null,
    canHold: true,
    next: rest,
    score: 0,
    lines: 0,
    level: 1,
    difficulty,
    status: 'playing',
    events: NO_EVENTS,
    rngState,
    gravityMs: 0,
    lockMs: 0,
    lockResets: 0,
    softDropOn: false,
  }
  return state
}

// Returns the state unchanged when nothing happened, reusing the reference
// when its event list is already empty.
function unchanged(s: EngineState): EngineState {
  return s.events.length === 0 ? s : { ...s, events: NO_EVENTS }
}

function landingRow(board: Cell[][], piece: ActivePiece): number {
  let row = piece.row
  while (!collides(board, { ...piece, row: row + 1 })) row++
  return row
}

export function ghostRow(state: GameState): number | null {
  if (!state.active) return null
  return landingRow(state.board, state.active)
}

// Successful move/rotate while grounded resets lock delay, up to the cap.
function afterShift(s: EngineState, piece: ActivePiece, events: GameEvent[]): EngineState {
  let { lockMs, lockResets } = s
  if (grounded(s.board, piece)) {
    if (lockResets < MAX_LOCK_RESETS) {
      lockMs = 0
      lockResets++
    }
  } else {
    // Piece can fall again (slid off a ledge / kicked free): lock delay clears.
    lockMs = 0
  }
  return { ...s, active: piece, lockMs, lockResets, events }
}

function tryMove(s: EngineState, dCol: number): EngineState {
  if (!s.active) return unchanged(s)
  const moved = { ...s.active, col: s.active.col + dCol }
  if (collides(s.board, moved)) return unchanged(s)
  return afterShift(s, moved, NO_EVENTS)
}

function tryRotate(s: EngineState, dir: 1 | -1): EngineState {
  if (!s.active) return unchanged(s)
  const piece = s.active
  const to = (((piece.rot + dir) % 4) + 4) % 4 as Rotation
  for (const [x, y] of kicksFor(piece.id, piece.rot, to)) {
    const cand: ActivePiece = { id: piece.id, rot: to, col: piece.col + x, row: piece.row - y }
    if (!collides(s.board, cand)) return afterShift(s, cand, NO_EVENTS)
  }
  return unchanged(s)
}

function spawnNext(
  s: EngineState,
  events: GameEvent[],
): Pick<EngineState, 'active' | 'next' | 'rngState' | 'status'> {
  const { queue, rngState } = refillQueue(s.next, s.rngState)
  const [id, ...rest] = queue
  const piece = spawnPiece(id)
  if (collides(s.board, piece)) {
    events.push({ type: 'gameOver' })
    return { active: null, next: rest, rngState, status: 'over' }
  }
  return { active: piece, next: rest, rngState, status: 'playing' }
}

function lockPiece(s: EngineState, piece: ActivePiece, events: GameEvent[]): EngineState {
  events.push({ type: 'lock', piece })
  let board = s.board.map((row) => row.slice())
  for (const { row, col } of cellsOf(piece)) board[row][col] = piece.id

  let { score, lines, level } = s
  const full: number[] = []
  for (let r = 0; r < ROWS; r++) {
    if (board[r].every((c) => c !== null)) full.push(r)
  }
  if (full.length > 0) {
    events.push({ type: 'lineClear', rows: full, count: full.length })
    score += CLEAR_SCORES[full.length] * level
    lines += full.length
    board = board.filter((_, r) => !full.includes(r))
    while (board.length < ROWS) board.unshift(new Array<Cell>(COLS).fill(null))
    const newLevel = Math.floor(lines / 10) + 1
    if (newLevel > level) {
      level = newLevel
      events.push({ type: 'levelUp', level })
    }
  }

  const next = spawnNext({ ...s, board }, events)
  return {
    ...s,
    ...next,
    board,
    score,
    lines,
    level,
    canHold: true,
    gravityMs: 0,
    lockMs: 0,
    lockResets: 0,
    events,
  }
}

function tick(s: EngineState, ms: number): EngineState {
  if (!s.active) return unchanged(s)
  const events: GameEvent[] = []

  if (grounded(s.board, s.active)) {
    const lockMs = s.lockMs + ms
    if (lockMs >= LOCK_DELAY_MS) return lockPiece(s, s.active, events)
    return { ...s, lockMs, gravityMs: 0, events: NO_EVENTS }
  }

  const base = gravityInterval(s.difficulty, s.level)
  const interval = s.softDropOn ? base / SOFT_DROP_FACTOR : base
  let gravityMs = s.gravityMs + ms
  let piece = s.active
  let score = s.score
  while (gravityMs >= interval && !grounded(s.board, piece)) {
    gravityMs -= interval
    piece = { ...piece, row: piece.row + 1 }
    if (s.softDropOn) score += 1
  }
  // Landed this tick: gravity stops, lock delay starts fresh next tick.
  if (grounded(s.board, piece)) gravityMs = 0
  return { ...s, active: piece, gravityMs, score, events: NO_EVENTS }
}

function hardDrop(s: EngineState): EngineState {
  if (!s.active) return unchanged(s)
  const fromRow = s.active.row
  const toRow = landingRow(s.board, s.active)
  const events: GameEvent[] = [{ type: 'hardDrop', fromRow, toRow }]
  const dropped = { ...s.active, row: toRow }
  const scored = { ...s, score: s.score + 2 * (toRow - fromRow) }
  return lockPiece(scored, dropped, events)
}

function hold(s: EngineState): EngineState {
  if (!s.active || !s.canHold) return unchanged(s)
  const held = s.active.id
  const events: GameEvent[] = []
  if (s.hold === null) {
    const next = spawnNext(s, events)
    return {
      ...s,
      ...next,
      hold: held,
      canHold: false,
      gravityMs: 0,
      lockMs: 0,
      lockResets: 0,
      events,
    }
  }
  const piece = spawnPiece(s.hold)
  if (collides(s.board, piece)) {
    events.push({ type: 'gameOver' })
    return { ...s, active: null, hold: held, canHold: false, status: 'over', events }
  }
  return {
    ...s,
    active: piece,
    hold: held,
    canHold: false,
    gravityMs: 0,
    lockMs: 0,
    lockResets: 0,
    events,
  }
}

export function applyAction(state: GameState, action: GameAction): GameState {
  const s = state as EngineState

  if (s.status === 'over') return unchanged(s)

  if (s.status === 'paused') {
    if (action.type === 'resume') return { ...s, status: 'playing', events: NO_EVENTS }
    return unchanged(s)
  }

  switch (action.type) {
    case 'tick':
      return tick(s, action.ms)
    case 'moveLeft':
      return tryMove(s, -1)
    case 'moveRight':
      return tryMove(s, 1)
    case 'rotateCW':
      return tryRotate(s, 1)
    case 'rotateCCW':
      return tryRotate(s, -1)
    case 'softDrop': {
      if (s.softDropOn === action.on) return unchanged(s)
      const out: EngineState = { ...s, softDropOn: action.on, events: NO_EVENTS }
      return out
    }
    case 'hardDrop':
      return hardDrop(s)
    case 'hold':
      return hold(s)
    case 'pause':
      return { ...s, status: 'paused', events: NO_EVENTS }
    case 'resume':
      return unchanged(s)
  }
}
