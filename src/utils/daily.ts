import type { Difficulty } from '../types'

/**
 * Seed for "Today's stack": everyone who starts a run on the same local
 * calendar day at the same difficulty gets the identical piece sequence.
 * FNV-1a over "YYYY-M-D:difficulty", truncated to int32 for the engine.
 * Local date on purpose — "today" should match the kitchen calendar, and
 * the family shares a timezone.
 */
export function dailySeed(difficulty: Difficulty, date: Date): number {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}:${difficulty}`
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h | 0
}
