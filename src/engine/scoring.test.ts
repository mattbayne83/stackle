import { describe, expect, it } from 'vitest'
import { applyAction, createGame, gravityInterval } from './game'
import { withActive, withBoard } from './helpers'
import type { ActivePiece, GameEvent, GameState } from './types'
import { ROWS } from './types'

function place(piece: ActivePiece, bottomRows: string[] = []): GameState {
  return withBoard(withActive(createGame('classic', 1), piece), bottomRows)
}

function eventsOf(s: GameState, type: GameEvent['type']) {
  return s.events.filter((e) => e.type === type)
}

describe('line clears and scoring', () => {
  it('single: clears the row, scores 100 x level', () => {
    const s = place({ id: 'O', row: 0, col: 4, rot: 0 }, ['XXXX..XXXX'])
    const s2 = applyAction(s, { type: 'hardDrop' })
    const clear = eventsOf(s2, 'lineClear')[0]
    expect(clear).toMatchObject({ count: 1, rows: [ROWS - 1] })
    // 100 (single at level 1) + 2/cell hard drop (20 rows)
    expect(s2.score).toBe(100 + 40)
    expect(s2.lines).toBe(1)
    // The other O cell pair settles into the new bottom row after the shift.
    expect(s2.board[ROWS - 1][4]).toBe('O')
    expect(s2.board[ROWS - 1][3]).toBe(null)
    expect(s2.board[ROWS - 2][4]).toBe(null)
  })

  it('double: 300 x level', () => {
    const s = place({ id: 'O', row: 0, col: 4, rot: 0 }, [
      'XXXX..XXXX',
      'XXXX..XXXX',
    ])
    const s2 = applyAction(s, { type: 'hardDrop' })
    expect(eventsOf(s2, 'lineClear')[0]).toMatchObject({ count: 2 })
    expect(s2.score).toBe(300 + 2 * 20)
    expect(s2.lines).toBe(2)
  })

  it('triple: 500 x level', () => {
    // Vertical I in column 0, three garbage rows missing only col 0.
    const s = place({ id: 'I', row: 0, col: -2, rot: 1 }, [
      '.XXXXXXXXX',
      '.XXXXXXXXX',
      '.XXXXXXXXX',
    ])
    const s2 = applyAction(s, { type: 'hardDrop' })
    expect(eventsOf(s2, 'lineClear')[0]).toMatchObject({ count: 3 })
    expect(s2.score).toBe(500 + 2 * 18)
    // Leftover I cell sits in the new bottom row.
    expect(s2.board[ROWS - 1][0]).toBe('I')
  })

  it('tetris: 800 x level', () => {
    const s = place({ id: 'I', row: 0, col: -2, rot: 1 }, [
      '.XXXXXXXXX',
      '.XXXXXXXXX',
      '.XXXXXXXXX',
      '.XXXXXXXXX',
    ])
    const s2 = applyAction(s, { type: 'hardDrop' })
    expect(eventsOf(s2, 'lineClear')[0]).toMatchObject({
      count: 4,
      rows: [ROWS - 4, ROWS - 3, ROWS - 2, ROWS - 1],
    })
    expect(s2.score).toBe(800 + 2 * 18)
    expect(s2.lines).toBe(4)
  })

  it('clear score scales with level', () => {
    const base = place({ id: 'O', row: 0, col: 4, rot: 0 }, ['XXXX..XXXX'])
    const s = { ...base, level: 3 }
    const s2 = applyAction(s, { type: 'hardDrop' })
    expect(s2.score).toBe(100 * 3 + 40)
  })

  it('levels up every 10 lines and emits levelUp', () => {
    const base = place({ id: 'O', row: 0, col: 4, rot: 0 }, ['XXXX..XXXX'])
    const s = { ...base, lines: 9 }
    const s2 = applyAction(s, { type: 'hardDrop' })
    expect(s2.lines).toBe(10)
    expect(s2.level).toBe(2)
    expect(eventsOf(s2, 'levelUp')[0]).toMatchObject({ level: 2 })
  })

  it('no premature level up', () => {
    const base = place({ id: 'O', row: 0, col: 4, rot: 0 }, ['XXXX..XXXX'])
    const s = { ...base, lines: 5 }
    const s2 = applyAction(s, { type: 'hardDrop' })
    expect(s2.level).toBe(1)
    expect(eventsOf(s2, 'levelUp')).toHaveLength(0)
  })

  it('hard drop scores 2 per cell and emits hardDrop + lock', () => {
    const s = place({ id: 'T', row: 0, col: 3, rot: 0 })
    const s2 = applyAction(s, { type: 'hardDrop' })
    expect(eventsOf(s2, 'hardDrop')[0]).toMatchObject({ fromRow: 0, toRow: 20 })
    expect(s2.score).toBe(2 * 20)
    expect(eventsOf(s2, 'lock')[0]).toMatchObject({
      piece: { id: 'T', row: 20 },
    })
  })

  it('soft drop scores 1 per cell descended', () => {
    let s = createGame('chill', 3)
    s = applyAction(s, { type: 'softDrop', on: true })
    // Chill level 1 gravity 900ms; soft drop interval 45ms.
    s = applyAction(s, { type: 'tick', ms: 90 })
    expect(s.score).toBe(2)
  })
})

describe('difficulty curves', () => {
  it('level 1 starting speeds', () => {
    expect(gravityInterval('chill', 1)).toBe(900)
    expect(gravityInterval('classic', 1)).toBe(700)
    expect(gravityInterval('turbo', 1)).toBe(350)
  })

  it('speeds follow the per-level factor', () => {
    expect(gravityInterval('chill', 2)).toBeCloseTo(900 * 0.92)
    expect(gravityInterval('classic', 3)).toBeCloseTo(700 * 0.85 ** 2)
    expect(gravityInterval('turbo', 4)).toBeCloseTo(350 * 0.82 ** 3)
  })

  it('speeds never go below the floor', () => {
    expect(gravityInterval('chill', 50)).toBe(250)
    expect(gravityInterval('classic', 50)).toBe(80)
    expect(gravityInterval('turbo', 50)).toBe(50)
  })

  it('curves are monotonically non-increasing', () => {
    for (const d of ['chill', 'classic', 'turbo'] as const) {
      for (let lvl = 1; lvl < 40; lvl++) {
        expect(gravityInterval(d, lvl + 1)).toBeLessThanOrEqual(gravityInterval(d, lvl))
      }
    }
  })
})
