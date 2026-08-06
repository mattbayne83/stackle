import { describe, expect, it } from 'vitest'
import { applyAction, createGame, ghostRow, LOCK_DELAY_MS, MAX_LOCK_RESETS } from './game'
import { withActive, withBoard } from './helpers'
import type { ActivePiece, GameState } from './types'
import { COLS, HIDDEN_ROWS, ROWS } from './types'

function place(piece: ActivePiece, bottomRows: string[] = []): GameState {
  return withBoard(withActive(createGame('classic', 1), piece), bottomRows)
}

function hasEvent(s: GameState, type: string) {
  return s.events.some((e) => e.type === type)
}

describe('createGame', () => {
  it('builds a 22x10 empty board with an active piece and queue', () => {
    const s = createGame('classic', 1)
    expect(ROWS).toBe(22)
    expect(COLS).toBe(10)
    expect(HIDDEN_ROWS).toBe(2)
    expect(s.board).toHaveLength(ROWS)
    for (const row of s.board) {
      expect(row).toHaveLength(COLS)
      expect(row.every((c) => c === null)).toBe(true)
    }
    expect(s.active).not.toBeNull()
    expect(s.next.length).toBeGreaterThanOrEqual(3)
    expect(s).toMatchObject({
      hold: null,
      canHold: true,
      score: 0,
      lines: 0,
      level: 1,
      difficulty: 'classic',
      status: 'playing',
      events: [],
    })
  })
})

describe('gravity ticks', () => {
  it('moves the piece down one row per gravity interval', () => {
    let s = createGame('classic', 1) // 700ms per row
    const startRow = s.active!.row
    s = applyAction(s, { type: 'tick', ms: 699 })
    expect(s.active!.row).toBe(startRow)
    s = applyAction(s, { type: 'tick', ms: 1 })
    expect(s.active!.row).toBe(startRow + 1)
  })

  it('accumulates multiple rows in one large tick', () => {
    let s = createGame('classic', 1)
    const startRow = s.active!.row
    s = applyAction(s, { type: 'tick', ms: 2100 })
    expect(s.active!.row).toBe(startRow + 3)
  })

  it('does not deep-clone the board on quiet ticks', () => {
    const s = createGame('classic', 1)
    const s2 = applyAction(s, { type: 'tick', ms: 16 })
    expect(s2.board).toBe(s.board)
    expect(s2.active).toBe(s.active)
  })

  it('soft drop runs at 20x gravity', () => {
    let s = createGame('classic', 1)
    const startRow = s.active!.row
    s = applyAction(s, { type: 'softDrop', on: true })
    s = applyAction(s, { type: 'tick', ms: 70 }) // 700/20 = 35ms per row
    expect(s.active!.row).toBe(startRow + 2)
    s = applyAction(s, { type: 'softDrop', on: false })
    s = applyAction(s, { type: 'tick', ms: 70 })
    expect(s.active!.row).toBe(startRow + 2)
  })
})

describe('lock delay', () => {
  it('locks after 500ms grounded', () => {
    let s = place({ id: 'T', row: 20, col: 3, rot: 0 })
    s = applyAction(s, { type: 'tick', ms: LOCK_DELAY_MS - 1 })
    expect(hasEvent(s, 'lock')).toBe(false)
    expect(s.active).toMatchObject({ id: 'T', row: 20 })
    s = applyAction(s, { type: 'tick', ms: 1 })
    expect(hasEvent(s, 'lock')).toBe(true)
    expect(s.board[21][3]).toBe('T')
  })

  it('successful movement resets the lock timer', () => {
    let s = place({ id: 'T', row: 20, col: 3, rot: 0 })
    s = applyAction(s, { type: 'tick', ms: 400 })
    s = applyAction(s, { type: 'moveRight' })
    s = applyAction(s, { type: 'tick', ms: 400 })
    expect(hasEvent(s, 'lock')).toBe(false)
    s = applyAction(s, { type: 'tick', ms: 100 })
    expect(hasEvent(s, 'lock')).toBe(true)
  })

  it('lock resets are capped at 15', () => {
    let s = place({ id: 'T', row: 20, col: 3, rot: 0 })
    for (let i = 0; i < MAX_LOCK_RESETS; i++) {
      s = applyAction(s, { type: 'tick', ms: 400 })
      s = applyAction(s, { type: i % 2 === 0 ? 'moveRight' : 'moveLeft' })
      expect(hasEvent(s, 'lock')).toBe(false)
    }
    // Resets exhausted: the 16th shift no longer clears the timer.
    s = applyAction(s, { type: 'tick', ms: 400 })
    s = applyAction(s, { type: i16Shift(s) })
    s = applyAction(s, { type: 'tick', ms: 100 })
    expect(hasEvent(s, 'lock')).toBe(true)
  })

  it('failed movement does not reset the lock timer', () => {
    // O flush against the left wall on the floor: moveLeft always fails.
    let s = place({ id: 'O', row: 20, col: 0, rot: 0 })
    s = applyAction(s, { type: 'tick', ms: 400 })
    s = applyAction(s, { type: 'moveLeft' })
    s = applyAction(s, { type: 'tick', ms: 100 })
    expect(hasEvent(s, 'lock')).toBe(true)
  })
})

function i16Shift(s: GameState): 'moveLeft' | 'moveRight' {
  return (s.active?.col ?? 0) > 3 ? 'moveLeft' : 'moveRight'
}

describe('hold', () => {
  it('first hold stashes the active piece and pulls from the queue', () => {
    const s = createGame('classic', 9)
    const activeId = s.active!.id
    const nextId = s.next[0]
    const s2 = applyAction(s, { type: 'hold' })
    expect(s2.hold).toBe(activeId)
    expect(s2.active!.id).toBe(nextId)
    expect(s2.canHold).toBe(false)
  })

  it('second hold before locking is a no-op', () => {
    let s = createGame('classic', 9)
    s = applyAction(s, { type: 'hold' })
    const s2 = applyAction(s, { type: 'hold' })
    expect(s2).toBe(s)
  })

  it('canHold resets after lock, and hold swaps back', () => {
    let s = createGame('classic', 9)
    s = applyAction(s, { type: 'hold' })
    const heldId = s.hold!
    const droppedId = s.active!.id
    s = applyAction(s, { type: 'hardDrop' })
    expect(s.canHold).toBe(true)
    const beforeSwap = s.active!.id
    s = applyAction(s, { type: 'hold' })
    expect(s.active!.id).toBe(heldId)
    expect(s.hold).toBe(beforeSwap)
    // The dropped piece is on the board, not in the hold slot.
    expect(s.board.flat().filter((c) => c !== null)).toHaveLength(4)
    expect(s.board.flat()).toContain(droppedId)
  })
})

describe('ghost', () => {
  it('reports the landing row on an empty board', () => {
    const s = place({ id: 'T', row: 0, col: 3, rot: 0 })
    expect(ghostRow(s)).toBe(20)
  })

  it('accounts for the stack', () => {
    const s = place({ id: 'T', row: 0, col: 3, rot: 0 }, [
      'XXXXXXXXX.',
      'XXXXXXXXX.',
    ])
    // Stack occupies rows 20-21 under the piece; T rests on top of it.
    expect(ghostRow(s)).toBe(18)
  })

  it('equals the current row when grounded, null when no active piece', () => {
    const s = place({ id: 'T', row: 20, col: 3, rot: 0 })
    expect(ghostRow(s)).toBe(20)
    expect(ghostRow({ ...s, active: null })).toBe(null)
  })
})

describe('pause / resume / game over', () => {
  it('pause freezes ticks and inputs; resume restores play', () => {
    let s = createGame('classic', 1)
    s = applyAction(s, { type: 'pause' })
    expect(s.status).toBe('paused')
    const frozen = applyAction(s, { type: 'tick', ms: 5000 })
    expect(frozen).toBe(s)
    expect(applyAction(s, { type: 'moveLeft' })).toBe(s)
    expect(applyAction(s, { type: 'hardDrop' })).toBe(s)
    s = applyAction(s, { type: 'resume' })
    expect(s.status).toBe('playing')
  })

  it('tops out when the spawn is blocked', () => {
    let s = createGame('turbo', 13)
    let sawGameOver = false
    for (let i = 0; i < 300 && s.status !== 'over'; i++) {
      s = applyAction(s, { type: 'hardDrop' })
      if (hasEvent(s, 'gameOver')) sawGameOver = true
    }
    expect(s.status).toBe('over')
    expect(sawGameOver).toBe(true)
    expect(s.active).toBe(null)
  })

  it('a finished game ignores all actions', () => {
    let s = createGame('turbo', 13)
    for (let i = 0; i < 300 && s.status !== 'over'; i++) {
      s = applyAction(s, { type: 'hardDrop' })
    }
    const over = applyAction(s, { type: 'tick', ms: 1000 })
    expect(over.status).toBe('over')
    expect(applyAction(over, { type: 'hardDrop' })).toBe(over)
    expect(applyAction(over, { type: 'resume' })).toBe(over)
  })
})

describe('events lifecycle', () => {
  it('events are replaced on every apply', () => {
    let s = place({ id: 'T', row: 0, col: 3, rot: 0 })
    s = applyAction(s, { type: 'hardDrop' })
    expect(s.events.length).toBeGreaterThan(0)
    s = applyAction(s, { type: 'moveLeft' })
    expect(s.events).toEqual([])
  })
})
