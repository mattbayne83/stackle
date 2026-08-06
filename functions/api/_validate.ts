// Pure validation for leaderboard score records. No Workers/DOM imports so it
// can be unit-tested directly with Vitest. Contract: tasks/leaderboard-api.md.

export const DIFFICULTIES = ['chill', 'classic', 'turbo'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export interface PlayerRef {
  name: string
  hue: number
  emoji?: string
}

export interface SubmitRecord {
  id: string
  player: PlayerRef
  difficulty: Difficulty
  score: number
  lines: number
  level: number
  dateISO: string
}

export const MAX_RECORDS_PER_POST = 20
export const MAX_BODY_BYTES = 64 * 1024
export const TOP_N = 50

const MAX_SCORE = 5_000_000
const MAX_LEVEL = 40
const MAX_LINES = 999
const MAX_NAME_LEN = 24
const MAX_FUTURE_MS = 24 * 60 * 60 * 1000

function isNonNegativeInt(v: unknown, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max
}

/**
 * Validate one submitted record. Returns the sanitized record or null.
 * Loose sanity bound only — this is anti-nonsense, not anti-cheat; the
 * audience is a family with the URL, not the open internet.
 */
export function validateRecord(raw: unknown, now: number): SubmitRecord | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>

  if (typeof r.id !== 'string' || r.id.length < 1 || r.id.length > 64) return null

  const p = r.player
  if (typeof p !== 'object' || p === null) return null
  const player = p as Record<string, unknown>
  if (typeof player.name !== 'string') return null
  const name = player.name.trim()
  if (name.length < 1 || name.length > MAX_NAME_LEN) return null
  if (typeof player.hue !== 'number' || !Number.isFinite(player.hue)) return null
  if (player.hue < 0 || player.hue > 360) return null
  if (player.emoji !== undefined && (typeof player.emoji !== 'string' || player.emoji.length > 8)) return null

  if (!DIFFICULTIES.includes(r.difficulty as Difficulty)) return null

  if (!isNonNegativeInt(r.score, MAX_SCORE)) return null
  if (!isNonNegativeInt(r.lines, MAX_LINES)) return null
  if (!isNonNegativeInt(r.level, MAX_LEVEL)) return null

  if (typeof r.dateISO !== 'string') return null
  const t = Date.parse(r.dateISO)
  if (Number.isNaN(t)) return null
  if (t > now + MAX_FUTURE_MS) return null

  // Sanity bound: score can't wildly exceed what the reported lines/level allow.
  if (r.score > (r.lines + 4) * 800 * Math.max(1, r.level)) return null

  const out: SubmitRecord = {
    id: r.id,
    player: { name, hue: player.hue },
    difficulty: r.difficulty as Difficulty,
    score: r.score,
    lines: r.lines,
    level: r.level,
    dateISO: r.dateISO,
  }
  if (typeof player.emoji === 'string') out.player.emoji = player.emoji
  return out
}

/**
 * Merge accepted records into the stored list for one difficulty.
 * Dedupe by id (existing entry wins — idempotent resubmits are no-ops),
 * then keep the top N by score (ties broken by earlier date).
 */
export function mergeTopN(
  existing: SubmitRecord[],
  incoming: SubmitRecord[],
  topN: number = TOP_N,
): SubmitRecord[] {
  const byId = new Map<string, SubmitRecord>()
  for (const rec of existing) byId.set(rec.id, rec)
  for (const rec of incoming) if (!byId.has(rec.id)) byId.set(rec.id, rec)
  return [...byId.values()]
    .sort((a, b) => b.score - a.score || Date.parse(a.dateISO) - Date.parse(b.dateISO))
    .slice(0, topN)
}
