import type { Difficulty, Player, ScoreRecord } from '../types'
import type { RemoteRecord } from './leaderboard'

/**
 * Union of local and remote records for the fridge door.
 *
 * Local records win on id collisions. Remote records from a player whose name
 * matches someone on the local roster (each device has its own roster, so the
 * same person carries different playerIds) fold into that player's line;
 * remote-only players get a synthesized Player from their PlayerRef.
 */

export interface FridgeEntry {
  id: string
  /** Groups records that belong to the same person across devices. */
  playerKey: string
  /** Missing only for orphaned local records (player removed from roster). */
  player: Player | undefined
  difficulty: Difficulty
  score: number
  lines: number
  level: number
  dateISO: string
}

function nameKey(name: string): string {
  return name.trim().toLowerCase()
}

export function fridgeEntries(
  local: ScoreRecord[],
  remote: RemoteRecord[],
  players: Player[],
): FridgeEntry[] {
  const byId = new Map(players.map((p) => [p.id, p]))
  const byName = new Map(players.map((p) => [nameKey(p.name), p]))
  const seen = new Set<string>()
  const entries: FridgeEntry[] = []

  for (const r of local) {
    seen.add(r.id)
    entries.push({
      id: r.id,
      playerKey: r.playerId,
      player: byId.get(r.playerId),
      difficulty: r.difficulty,
      score: r.score,
      lines: r.lines,
      level: r.level,
      dateISO: r.dateISO,
    })
  }

  for (const r of remote) {
    if (seen.has(r.id)) continue
    seen.add(r.id)
    const localMatch = byName.get(nameKey(r.player.name))
    const playerKey = localMatch?.id ?? `remote:${nameKey(r.player.name)}`
    entries.push({
      id: r.id,
      playerKey,
      player: localMatch ?? { id: playerKey, ...r.player },
      difficulty: r.difficulty,
      score: r.score,
      lines: r.lines,
      level: r.level,
      dateISO: r.dateISO,
    })
  }

  return entries
}

/** Best entry per person for one difficulty, highest score first. */
export function bestPerEntry(entries: FridgeEntry[], difficulty: Difficulty): FridgeEntry[] {
  const best = new Map<string, FridgeEntry>()
  for (const e of entries) {
    if (e.difficulty !== difficulty) continue
    const current = best.get(e.playerKey)
    if (!current || e.score > current.score) best.set(e.playerKey, e)
  }
  return [...best.values()].sort((a, b) => b.score - a.score)
}

/** Top score on a difficulty across the full fridge (local + remote). */
export function familyBest(
  entries: FridgeEntry[],
  difficulty: Difficulty,
): FridgeEntry | undefined {
  return bestPerEntry(entries, difficulty)[0]
}

/**
 * Personal best for one roster player on a difficulty. Uses playerKey so
 * remote scores folded by name count as the same person.
 */
export function personalBestEntry(
  entries: FridgeEntry[],
  playerId: string,
  difficulty: Difficulty,
): FridgeEntry | undefined {
  return bestPerEntry(entries, difficulty).find((e) => e.playerKey === playerId)
}
