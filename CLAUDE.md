# Stackle

Family Tetris-like browser game for the Bayne family. Solo rounds at three
difficulties (Chill / Classic / Turbo) posting to a shared family leaderboard.
Phone touch + laptop keyboard are both first-class.
**Live:** stackle-2mt.pages.dev (Git-connected Cloudflare Pages — push to
`main` auto-deploys).

**Design contract:** `tasks/design-brief.md` (the /shape brief) and
`.impeccable.md` (design context). Every visual/UX decision traces to these.
Toy-like/tactile, kind competition, both themes via light-dark(), no generic
Tetris-clone look. Fonts: Hepta Slab (display) + Recursive casual (UI) — Inter
is banned here.

## Stack

React 19 + TypeScript (strict — both app and functions) + Vite + Tailwind CSS 4
(tokens in `src/index.css` @theme) + Zustand 5 (persist) + Vitest. Lint: oxlint.
Leaderboard: Cloudflare Pages Function + KV (`STACKLE_KV`), contract pinned in
`tasks/leaderboard-api.md`. **80 tests** (engine + validate + fridge merge +
daily seed + settings).

## Architecture

- `src/engine/` — pure TS game core, zero React/DOM imports, 52 tests
  (board, 7-bag, SRS rotation, gravity/lock, scoring, difficulty curves).
  Internal fields (rng, accumulators) ride along on the state object: always
  thread the exact object returned by `createGame`/`applyAction` back in.
- `src/render/` — canvas renderer + rAF loop (engine draws nothing); resolves
  CSS `light-dark()` tokens at runtime via computed-style probe; fx overlays
  (clear/lock/drop/level + the "Stackle!" four-line burst) live in `fx.ts`,
  disabled under reduced motion.
- `src/input/` — keyboard (DAS 160 / ARR 40, self-implemented repeat) + touch
  gestures (drag/tap/flick) + on-screen button pad on coarse pointers
  (gestures stay available; pad always shown on touch).
- `src/screens/` — HomeScreen (roster, difficulty tiles, "Today's stack"
  daily-seed toggle, fridge door),
  PlayScreen (loop host, pause, kind game-over; engine state in a ref, HUD
  numbers mirrored into React at low frequency). Game-over personal/family
  bests use the full fridge union (`fridgeEntries`), not local-only scores.
- `src/store/` — Zustand persist: roster, settings (ghost/controls/sound,
  per player, edited from the pause overlay; defaults spread under stored
  entries so old records pick up new fields), local scores (`synced` flag
  per record).
- `src/audio/` — `SfxPlayer`: synthesized WebAudio kit (no asset files),
  fed the engine event batch from PlayScreen's dispatch; lazy AudioContext
  so it only starts after a user gesture. Muted by default.
- `src/sync/` — leaderboard client: push-unsynced / fetch-remote (single-flight
  with 4s cooldown); `merge.ts` unions local + remote by id, folds cross-device
  players by case-insensitive name (`familyBest` / `personalBestEntry` for
  celebrations); `remoteRecords` is in-memory only. 5 merge tests.
- `functions/api/` — Pages Function `/api/scores` (GET/POST), KV key per
  difficulty, top-50, idempotent POST, validation in `_validate.ts` (16 tests).

## Commands

`npm run dev` (game only; no /api — sync quiet by design) · `npm run build` ·
`npm run dev:cf` (wrangler serves dist/ + functions with local KV) ·
`npm run typecheck` · `npm test` · `npm run lint`

## Rules

- Engine stays pure and deterministic (seedable RNG) — no Date.now()/Math.random() inside step logic; inject them.
- Animate with transform/opacity only; ease-out (no bounce/elastic).
- Respect the impeccable bans: no border-left accent stripes, no gradient text, no pure #000/#fff.
- Kind competition applies to copy everywhere — no shaming, no "you lose."
- Server validation is anti-nonsense, not anti-cheat (family trust model).
- Celebrations and fridge UI share one merge path — never compare bests against local scores alone.

## Gotchas

- Pages validates `wrangler.jsonc` when `pages_build_output_dir` is set — a
  bogus KV namespace id fails the whole deploy.
- Records for roster players deleted locally render as "Someone" and are not
  pushed (can't shape a SubmitRecord without a player).
- Settings live in the pause overlay, not a screen: ghost toggle hidden on
  Chill (always on there), pad toggle only on coarse pointers, sound
  always offered (muted default). `controls` defaults to `'buttons'` —
  pad shown on touch unless turned off.
- Empty fridge on a difficulty still celebrates the first score as family
  best (correct); false positives from other devices were the bug, not this.
- "Today's stack" is session-only React state (reload resets to free play)
  and hashes the *local* calendar date — one household, one timezone, by
  design. Scores post to the normal per-difficulty leaderboards.

## Roadmap

Backlog clear as of 2026-08-07 — CHANGELOG.md [Unreleased] lists what
shipped (settings UI, the Stackle moment, daily seed, SFX).
