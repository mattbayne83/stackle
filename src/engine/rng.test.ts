import { describe, expect, it } from 'vitest'
import { nextBag, nextRandom } from './rng'
import { createGame, applyAction } from './game'
import type { GameAction, PieceId } from './types'

const ALL: PieceId[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z']

describe('seeded PRNG', () => {
  it('is deterministic for a given state', () => {
    const a = nextRandom(12345)
    const b = nextRandom(12345)
    expect(a.value).toBe(b.value)
    expect(a.state).toBe(b.state)
  })

  it('produces values in [0, 1) and advances state', () => {
    let s = 42
    for (let i = 0; i < 1000; i++) {
      const r = nextRandom(s)
      expect(r.value).toBeGreaterThanOrEqual(0)
      expect(r.value).toBeLessThan(1)
      expect(r.state).not.toBe(s)
      s = r.state
    }
  })
})

describe('7-bag randomizer', () => {
  it('every bag is a permutation of all 7 pieces', () => {
    let s = 7
    for (let i = 0; i < 20; i++) {
      const r = nextBag(s)
      expect([...r.bag].sort()).toEqual([...ALL].sort())
      s = r.state
    }
  })

  it('yields exactly 10 of each piece over 10 bags', () => {
    const counts = new Map<PieceId, number>()
    let s = 99
    for (let i = 0; i < 10; i++) {
      const r = nextBag(s)
      for (const p of r.bag) counts.set(p, (counts.get(p) ?? 0) + 1)
      s = r.state
    }
    for (const p of ALL) expect(counts.get(p)).toBe(10)
  })

  it('different seeds give different bag orders', () => {
    const a = nextBag(1)
    const b = nextBag(2)
    // Two independent shuffles agreeing entirely is astronomically unlikely
    // combined with the next bag too.
    const a2 = nextBag(a.state)
    const b2 = nextBag(b.state)
    expect([...a.bag, ...a2.bag].join('')).not.toBe([...b.bag, ...b2.bag].join(''))
  })
})

describe('determinism', () => {
  it('same seed + same actions => identical states', () => {
    const script: GameAction[] = []
    for (let i = 0; i < 40; i++) {
      script.push({ type: 'moveLeft' })
      script.push({ type: 'tick', ms: 50 })
      script.push({ type: 'rotateCW' })
      script.push({ type: 'tick', ms: 700 })
      script.push({ type: 'hardDrop' })
    }
    const run = () => {
      let s = createGame('classic', 2026)
      const pieces: string[] = []
      for (const a of script) {
        s = applyAction(s, a)
        if (s.active) pieces.push(s.active.id)
      }
      return { pieces, score: s.score, lines: s.lines, board: s.board }
    }
    const a = run()
    const b = run()
    expect(a.pieces).toEqual(b.pieces)
    expect(a.score).toBe(b.score)
    expect(a.lines).toBe(b.lines)
    expect(a.board).toEqual(b.board)
  })

  it('same seed => same piece sequence from createGame', () => {
    const a = createGame('chill', 555)
    const b = createGame('chill', 555)
    expect(a.active?.id).toBe(b.active?.id)
    expect(a.next).toEqual(b.next)
  })
})
