# Stackle Shared Leaderboard — API Contract (pinned)

Family-scale (a handful of players, low write volume). No accounts — trust
model is "people we invited have the URL." Kind competition rules apply to
copy and behavior.

## Storage

Cloudflare Pages Functions + KV. Binding name: `STACKLE_KV`.
One key per difficulty: `scores:chill` | `scores:classic` | `scores:turbo`,
each holding a JSON array of SyncedRecord, capped at the top 50 by score.
Last-write-wins is acceptable at this scale (document it in code).

## Shapes (JSON)

```ts
interface PlayerRef { name: string; hue: number; emoji?: string }

interface SubmitRecord {
  id: string            // client uuid — idempotency key, dedupe on merge
  player: PlayerRef
  difficulty: 'chill' | 'classic' | 'turbo'
  score: number; lines: number; level: number
  dateISO: string
}

type SyncedRecord = SubmitRecord   // server stores what it accepted
```

## Endpoints

- `GET /api/scores` → `200 { records: SyncedRecord[] }` (all difficulties,
  merged; client groups)
- `POST /api/scores` body `{ records: SubmitRecord[] }` →
  `200 { accepted: string[] }` (ids stored or already present — already-present
  counts as accepted so the client can mark synced)

## Validation (server, reject record-by-record — bad ones just aren't accepted)

- Field types/ranges: name 1–24 chars, hue 0–360, difficulty enum,
  score/lines/level non-negative integers, level ≤ 40, lines ≤ 999,
  dateISO parseable and not > 24h in the future.
- Sanity bound (loose, anti-nonsense not anti-cheat):
  `score ≤ (lines + 4) * 800 * max(1, level)` and `score ≤ 5_000_000`.
- Max 20 records per POST; payload ≤ 64KB.

## Client behavior

- Play is fully offline-capable. `scoresStore` records with `synced: false`
  are the queue; on app load + after each game over, POST unsynced, then
  `markSynced(accepted)`.
- GET on home mount (and after a successful POST); merge server records into
  fridge display by id (server union local, dedupe by id). Remote-only players
  appear on the fridge via their PlayerRef.
- Failures are silent-quiet: fridge shows local data + small "saving later"
  hint only when there are unsynced records AND the last sync attempt failed.
  Never an error wall.
