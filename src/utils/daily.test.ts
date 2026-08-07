import { describe, expect, it } from 'vitest'
import { dailySeed } from './daily'

describe('dailySeed', () => {
  it('is stable across a whole local day', () => {
    const morning = new Date(2026, 7, 7, 6, 12)
    const night = new Date(2026, 7, 7, 23, 59)
    expect(dailySeed('classic', morning)).toBe(dailySeed('classic', night))
  })

  it('differs per difficulty on the same day', () => {
    const day = new Date(2026, 7, 7)
    const seeds = [dailySeed('chill', day), dailySeed('classic', day), dailySeed('turbo', day)]
    expect(new Set(seeds).size).toBe(3)
  })

  it('changes when the day rolls over', () => {
    expect(dailySeed('turbo', new Date(2026, 7, 7))).not.toBe(
      dailySeed('turbo', new Date(2026, 7, 8)),
    )
  })

  it('produces an int32 the engine rng accepts as-is', () => {
    const seed = dailySeed('chill', new Date(2026, 11, 31))
    expect(Number.isInteger(seed)).toBe(true)
    expect(seed | 0).toBe(seed)
  })
})
