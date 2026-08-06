import type { PieceId } from './types'

// Deterministic, functional mulberry32. State is a 32-bit integer; each call
// advances it by a fixed odd constant and hashes it into a float in [0, 1).
export function nextRandom(state: number): { value: number; state: number } {
  const next = (state + 0x6d2b79f5) | 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return { value, state: next }
}

const ALL_PIECES: readonly PieceId[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z']

// Fisher-Yates shuffle of the 7 pieces, driven by the seeded PRNG.
export function nextBag(state: number): { bag: PieceId[]; state: number } {
  const bag = ALL_PIECES.slice()
  let s = state
  for (let i = bag.length - 1; i > 0; i--) {
    const r = nextRandom(s)
    s = r.state
    const j = Math.floor(r.value * (i + 1))
    const tmp = bag[i]
    bag[i] = bag[j]
    bag[j] = tmp
  }
  return { bag, state: s }
}
