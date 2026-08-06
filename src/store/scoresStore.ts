import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Difficulty, ScoreRecord } from '../types'
import { newId } from '../utils/player'

interface ScoresState {
  records: ScoreRecord[]
  addScore: (record: Omit<ScoreRecord, 'id' | 'synced'>) => ScoreRecord
  /** Hook for the future sync layer: flip records to synced once posted. */
  markSynced: (ids: string[]) => void
}

export const useScoresStore = create<ScoresState>()(
  persist(
    (set) => ({
      records: [],

      addScore: (record) => {
        const created: ScoreRecord = { ...record, id: newId(), synced: false }
        set((s) => ({ records: [...s.records, created] }))
        return created
      },

      markSynced: (ids) =>
        set((s) => ({
          records: s.records.map((r) => (ids.includes(r.id) ? { ...r, synced: true } : r)),
        })),
    }),
    { name: 'stackle-scores' },
  ),
)

/** Best record per player for one difficulty, highest score first. */
export function bestPerPlayer(records: ScoreRecord[], difficulty: Difficulty): ScoreRecord[] {
  const best = new Map<string, ScoreRecord>()
  for (const r of records) {
    if (r.difficulty !== difficulty) continue
    const current = best.get(r.playerId)
    if (!current || r.score > current.score) best.set(r.playerId, r)
  }
  return [...best.values()].sort((a, b) => b.score - a.score)
}

/** The family record for one difficulty, if anyone has played it. */
export function familyRecord(records: ScoreRecord[], difficulty: Difficulty): ScoreRecord | undefined {
  return bestPerPlayer(records, difficulty)[0]
}

export function personalBest(
  records: ScoreRecord[],
  playerId: string,
  difficulty: Difficulty,
): ScoreRecord | undefined {
  return bestPerPlayer(records, difficulty).find((r) => r.playerId === playerId)
}
