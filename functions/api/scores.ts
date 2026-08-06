// GET/POST /api/scores — shared family leaderboard (contract: tasks/leaderboard-api.md).
//
// Storage: one KV key per difficulty (scores:chill | scores:classic |
// scores:turbo), each a JSON array of records capped at the top 50 by score.
//
// Concurrency: KV read-modify-write here is last-write-wins. At family scale
// (a handful of players, low write volume) a lost concurrent write is
// acceptable — the client re-POSTs unsynced records on next load, so records
// converge. No lock/CAS needed.

import {
  DIFFICULTIES,
  MAX_BODY_BYTES,
  MAX_RECORDS_PER_POST,
  mergeTopN,
  validateRecord,
  type Difficulty,
  type SubmitRecord,
} from './_validate'

interface Env {
  STACKLE_KV: KVNamespace
}

const keyFor = (d: Difficulty) => `scores:${d}` as const

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  })
}

async function readList(kv: KVNamespace, difficulty: Difficulty): Promise<SubmitRecord[]> {
  const stored = await kv.get<SubmitRecord[]>(keyFor(difficulty), 'json')
  return Array.isArray(stored) ? stored : []
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const lists = await Promise.all(DIFFICULTIES.map((d) => readList(env.STACKLE_KV, d)))
  return json({ records: lists.flat() }, 200, { 'cache-control': 'no-store' })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > MAX_BODY_BYTES) return json({ error: 'payload too large' }, 413)

  const text = await request.text()
  if (text.length > MAX_BODY_BYTES) return json({ error: 'payload too large' }, 413)

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return json({ error: 'invalid JSON' }, 400)
  }

  const records = (body as { records?: unknown })?.records
  if (!Array.isArray(records)) return json({ error: 'expected { records: [] }' }, 400)
  if (records.length > MAX_RECORDS_PER_POST) {
    return json({ error: `max ${MAX_RECORDS_PER_POST} records per request` }, 400)
  }

  // Record-by-record: bad ones just aren't accepted, good ones still land.
  const now = Date.now()
  const valid: SubmitRecord[] = []
  for (const raw of records) {
    const rec = validateRecord(raw, now)
    if (rec) valid.push(rec)
  }

  const accepted: string[] = []
  for (const difficulty of DIFFICULTIES) {
    const batch = valid.filter((r) => r.difficulty === difficulty)
    if (batch.length === 0) continue

    const existing = await readList(env.STACKLE_KV, difficulty)
    const merged = mergeTopN(existing, batch)
    await env.STACKLE_KV.put(keyFor(difficulty), JSON.stringify(merged))

    // Already-present ids count as accepted (idempotent POST) — and so do
    // valid records that merged but fell below the top-50 cut: the client
    // just needs to know it can stop retrying them.
    accepted.push(...batch.map((r) => r.id))
  }

  return json({ accepted }, 200, { 'cache-control': 'no-store' })
}
