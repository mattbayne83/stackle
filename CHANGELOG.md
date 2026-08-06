# Changelog

All notable changes to Stackle. Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Fixed

- Game-over personal/family records now compare against the full fridge
  (local + remote, name-folded) so a device without the current top score
  no longer confetti-celebrates a false family record
- Touch devices always show the on-screen button pad (was gated on a
  settings preference with no UI, so it was unreachable)

### Changed

- App TypeScript config enables `strict` (matches docs and `functions/`)

### Planned

- Sound effects (tasteful, optional, muted by default consideration)
- Signature four-line-clear moment (currently reuses the standard clear animation scaled up)
- Daily seed mode — same piece sequence for the whole family each day
- Settings UI for ghost piece / hide button pad (store already supports it)

## [1.0.0] — 2026-08-06

Initial release, live at [stackle-2mt.pages.dev](https://stackle-2mt.pages.dev).

### Added

- Pure deterministic TypeScript engine: seeded 7-bag, SRS rotation with full
  wall-kick tables, 500ms lock delay (15-reset cap), guideline scoring,
  soft/hard drop, hold, ghost — 52 unit tests
- Three difficulty curves with separate leaderboards: Chill / Classic / Turbo
- Toy-like/tactile design system: OKLCH wood-warm tokens, dual theme via
  `light-dark()`, Hepta Slab + Recursive type pairing, `.chunk` dimensional
  block language
- Home screen: family roster with avatar magnets (name + hue + emoji),
  first-run "Who's in?" flow, difficulty tiles as play buttons
- The fridge door: leaderboard as pinned paper notes with "family best"
  stickers, kind empty state
- Canvas play screen: DPR-aware renderer, rAF loop, line-clear collapse /
  hard-drop thud / lock pulse / level-up glow motion (ease-out only,
  `prefers-reduced-motion` respected)
- Input: keyboard with DAS 160ms / ARR 40ms, touch gestures
  (drag / tap-rotate / flick hard-drop), optional button pad
- Kind game-over flow: personal-best comparison, rotating gentle copy,
  family-record celebration with block confetti in the player's color
- Shared family leaderboard: Cloudflare Pages Function + KV
  (`/api/scores`, top-50 per difficulty, idempotent POST, per-record
  validation with anti-nonsense score bound, 16 tests)
- Offline-first sync: scores queue locally, push on game over and home visit,
  cross-device identity folded by case-insensitive name, single quiet
  "saving later" hint when genuinely stuck
- Cloudflare Pages deployment: Git-connected auto-deploy from `main`,
  `STACKLE_KV` bound via `wrangler.jsonc`

### Fixed

- Well frame drawn at double the letterbox offset (stroke after
  `ctx.restore()` re-applied the translate) — grid, pieces, and frame now
  share one board rect
- Laptop play composition tightened from floating rails to a compact
  three-column object hugging the well
- Duplicate resume affordance while paused (sidebar button now disabled;
  overlay "Keep stacking" is the single path)
- Lockfile regenerated on fresh install so Linux CI `npm ci` succeeds from a
  macOS-authored scaffold
- First Pages deploy failed on the placeholder KV namespace id in
  `wrangler.jsonc` (Pages validates the config when
  `pages_build_output_dir` is set)
