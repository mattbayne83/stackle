import { describe, expect, it } from 'vitest'
import {
  bestPerEntry,
  familyBest,
  fridgeEntries,
  personalBestEntry,
  type FridgeEntry,
} from './merge'
import type { RemoteRecord } from './leaderboard'
import type { Player, ScoreRecord } from '../types'

const matt: Player = { id: 'local-matt', name: 'Matt', hue: 40 }
const kids: Player = { id: 'local-kids', name: 'Kids', hue: 200 }

function local(
  partial: Partial<ScoreRecord> & Pick<ScoreRecord, 'id' | 'playerId' | 'score'>,
): ScoreRecord {
  return {
    difficulty: 'classic',
    lines: 10,
    level: 2,
    dateISO: '2026-08-01T12:00:00.000Z',
    synced: true,
    ...partial,
  }
}

function remote(
  partial: Partial<RemoteRecord> & Pick<RemoteRecord, 'id' | 'player' | 'score'>,
): RemoteRecord {
  return {
    difficulty: 'classic',
    lines: 10,
    level: 2,
    dateISO: '2026-08-01T12:00:00.000Z',
    ...partial,
  }
}

describe('fridgeEntries', () => {
  it('keeps local records and folds remote by case-insensitive name', () => {
    const entries = fridgeEntries(
      [local({ id: 'a', playerId: matt.id, score: 1000 })],
      [
        remote({
          id: 'b',
          player: { name: 'MATT', hue: 40 },
          score: 5000,
        }),
        remote({
          id: 'c',
          player: { name: 'Guest', hue: 90, emoji: '🙂' },
          score: 200,
        }),
      ],
      [matt],
    )

    expect(entries).toHaveLength(3)
    const folded = entries.find((e) => e.id === 'b')
    expect(folded?.playerKey).toBe(matt.id)
    expect(folded?.player?.id).toBe(matt.id)

    const guest = entries.find((e) => e.id === 'c')
    expect(guest?.playerKey).toBe('remote:guest')
    expect(guest?.player?.name).toBe('Guest')
  })

  it('dedupes remote rows that already exist locally by id', () => {
    const entries = fridgeEntries(
      [local({ id: 'same', playerId: matt.id, score: 100 })],
      [remote({ id: 'same', player: { name: 'Matt', hue: 40 }, score: 9999 })],
      [matt],
    )
    expect(entries).toHaveLength(1)
    expect(entries[0].score).toBe(100)
  })
})

describe('familyBest / personalBestEntry', () => {
  const fridge: FridgeEntry[] = fridgeEntries(
    [
      local({ id: 'l1', playerId: matt.id, score: 3000 }),
      local({ id: 'l2', playerId: kids.id, score: 1000 }),
    ],
    [
      remote({
        id: 'r1',
        player: { name: 'Matt', hue: 40 },
        score: 8000, // higher on another device
      }),
      remote({
        id: 'r2',
        player: { name: 'Auntie', hue: 10 },
        score: 9000, // true family top
      }),
    ],
    [matt, kids],
  )

  it('familyBest uses the full fridge, not local-only', () => {
    const fam = familyBest(fridge, 'classic')
    expect(fam?.score).toBe(9000)
    expect(fam?.player?.name).toBe('Auntie')
  })

  it('personalBestEntry folds remote scores under the local player key', () => {
    const pb = personalBestEntry(fridge, matt.id, 'classic')
    expect(pb?.score).toBe(8000)
    expect(pb?.playerKey).toBe(matt.id)
  })

  it('bestPerEntry ranks one line per person', () => {
    const bests = bestPerEntry(fridge, 'classic')
    expect(bests.map((b) => b.score)).toEqual([9000, 8000, 1000])
  })
})
