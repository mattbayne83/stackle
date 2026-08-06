# Stackle

Family Tetris-like browser game for the Bayne family. Solo rounds at three
difficulties (Chill / Classic / Turbo) posting to a shared family leaderboard.
Phone touch + laptop keyboard are both first-class.

**Design contract:** `tasks/design-brief.md` (the /shape brief) and
`.impeccable.md` (design context). Every visual/UX decision traces to these.
Toy-like/tactile, kind competition, both themes via light-dark(), no generic
Tetris-clone look. Fonts: Hepta Slab (display) + Recursive casual (UI) — Inter
is banned here.

## Stack

React 19 + TypeScript (strict) + Vite + Tailwind CSS 4 (tokens in
`src/index.css` @theme) + Zustand 5 (persist) + Vitest. Lint: oxlint.
Deploy target: Cloudflare Pages; leaderboard via Pages Function + KV (Phase 3).

## Architecture

- `src/engine/` — pure TS game core, zero React/DOM imports, fully unit-tested
  (board, 7-bag, SRS rotation, gravity/lock, scoring, difficulty curves)
- `src/render/` — canvas renderer + game loop (the engine draws nothing)
- `src/input/` — keyboard (DAS/ARR) + touch gestures → engine actions
- `src/screens/` — Home, Play, GameOver flows
- `src/store/` — Zustand: roster, settings, local scores (leaderboard sync later)

## Commands

`npm run dev` · `npm run build` · `npm run typecheck` · `npm test` · `npm run lint`

## Rules

- Engine stays pure and deterministic (seedable RNG) — no Date.now()/Math.random() inside step logic; inject them.
- Animate with transform/opacity only; ease-out (no bounce/elastic).
- Respect the impeccable bans: no border-left accent stripes, no gradient text, no pure #000/#fff.
