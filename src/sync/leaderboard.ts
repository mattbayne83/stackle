import { create } from 'zustand'
import { useRosterStore } from '../store/rosterStore'
import { useScoresStore } from '../store/scoresStore'
import type { Difficulty, Player, ScoreRecord } from '../types'

/**
 * Client sync for the shared family leaderboard (tasks/leaderboard-api.md).
 * Server side is last-write-wins KV at family scale; the client treats every
 * failure as "we'll try again later" — nothing here ever throws to the UI.
 */

export interface PlayerRef {
  name: string
  hue: number
  emoji?: string
}

/** A record as the server stores it — no local playerId, just the PlayerRef. */
export interface RemoteRecord {
  id: string
  player: PlayerRef
  difficulty: Difficulty
  score: number
  lines: number
  level: number
  dateISO: string
}

interface SyncState {
  syncing: boolean
  /** True when the most recent push attempt couldn't reach the fridge. */
  lastPushFailed: boolean
  /** Server records, in-memory only — never persisted. */
  remoteRecords: RemoteRecord[]
}

export const useSyncStore = create<SyncState>(() => ({
  syncing: false,
  lastPushFailed: false,
  remoteRecords: [],
}))

const BATCH_SIZE = 20
const HOME_SYNC_COOLDOWN_MS = 4000

export type PushResult = 'nothing' | 'ok' | 'failed'

/** Unsynced records we can actually submit (their player is still on the roster). */
export function unsyncedFor(records: ScoreRecord[], players: Player[]): ScoreRecord[] {
  const roster = new Set(players.map((p) => p.id))
  return records.filter((r) => !r.synced && roster.has(r.playerId))
}

function toSubmit(record: ScoreRecord, player: Player): RemoteRecord {
  const { name, hue, emoji } = player
  return {
    id: record.id,
    player: emoji ? { name, hue, emoji } : { name, hue },
    difficulty: record.difficulty,
    score: record.score,
    lines: record.lines,
    level: record.level,
    dateISO: record.dateISO,
  }
}

const DIFFICULTIES: readonly Difficulty[] = ['chill', 'classic', 'turbo']

function isRemoteRecord(value: unknown): value is RemoteRecord {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  const p = r.player as Record<string, unknown> | null | undefined
  return (
    typeof r.id === 'string' &&
    typeof p === 'object' &&
    p !== null &&
    typeof p.name === 'string' &&
    typeof p.hue === 'number' &&
    DIFFICULTIES.includes(r.difficulty as Difficulty) &&
    typeof r.score === 'number' &&
    typeof r.lines === 'number' &&
    typeof r.level === 'number' &&
    typeof r.dateISO === 'string'
  )
}

let pushInFlight: Promise<PushResult> | null = null
let fetchInFlight: Promise<'ok' | 'failed'> | null = null
let lastHomeSyncAt = 0

/**
 * POST every unsynced local record in batches of ≤20, marking accepted ids
 * as synced. Single-flight; quiet failure (returns 'failed', never throws).
 */
export function pushUnsynced(): Promise<PushResult> {
  pushInFlight ??= doPush().finally(() => {
    pushInFlight = null
  })
  return pushInFlight
}

async function doPush(): Promise<PushResult> {
  const { records, markSynced } = useScoresStore.getState()
  const players = useRosterStore.getState().players
  const byId = new Map(players.map((p) => [p.id, p]))
  const queue = unsyncedFor(records, players)
  if (queue.length === 0) return 'nothing'

  useSyncStore.setState({ syncing: true })
  try {
    for (let i = 0; i < queue.length; i += BATCH_SIZE) {
      const batch = queue
        .slice(i, i + BATCH_SIZE)
        .map((r) => toSubmit(r, byId.get(r.playerId)!))
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ records: batch }),
      })
      if (!res.ok) throw new Error(`POST /api/scores → ${res.status}`)
      const data = (await res.json()) as { accepted?: unknown }
      const accepted = Array.isArray(data.accepted)
        ? data.accepted.filter((x): x is string => typeof x === 'string')
        : []
      if (accepted.length > 0) markSynced(accepted)
    }
    useSyncStore.setState({ syncing: false, lastPushFailed: false })
    return 'ok'
  } catch {
    // Offline or no server (vite dev has no /api) — the queue just waits.
    useSyncStore.setState({ syncing: false, lastPushFailed: true })
    return 'failed'
  }
}

/**
 * GET the shared leaderboard into the in-memory remote set.
 * Single-flight; quiet failure keeps whatever we last saw.
 */
export function fetchRemote(): Promise<'ok' | 'failed'> {
  fetchInFlight ??= doFetch().finally(() => {
    fetchInFlight = null
  })
  return fetchInFlight
}

async function doFetch(): Promise<'ok' | 'failed'> {
  try {
    const res = await fetch('/api/scores')
    if (!res.ok) throw new Error(`GET /api/scores → ${res.status}`)
    const data = (await res.json()) as { records?: unknown }
    const records = Array.isArray(data.records) ? data.records.filter(isRemoteRecord) : []
    useSyncStore.setState({ remoteRecords: records })
    return 'ok'
  } catch {
    return 'failed'
  }
}

/**
 * Home-mount sync: push the queue, then refresh the fridge. Debounced so
 * bouncing between screens doesn't stack requests.
 */
export function syncOnHome(): void {
  const now = Date.now()
  if (now - lastHomeSyncAt < HOME_SYNC_COOLDOWN_MS) return
  lastHomeSyncAt = now
  void pushUnsynced().then(() => fetchRemote())
}
