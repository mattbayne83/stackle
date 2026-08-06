# Stackle — Design Brief

Produced by /shape (2026-08-06). The contract for all implementation work.

## 1. Feature Summary

Stackle is a browser Tetris-like for the Bayne family: solo rounds at a chosen difficulty (Chill / Classic / Turbo), scored onto a shared family leaderboard. Phone-touch and laptop-keyboard first-class. It should feel like a warm, tactile toy the family keeps coming back to — unmistakably theirs.

## 2. Primary User Action

Pick your name, pick your difficulty, drop blocks. Everything else (leaderboard, celebration, stats) supports the loop of "one more go."

## 3. Design Direction

Toy-like / tactile per `.impeccable.md`. The tetrominoes are the brand: chunky, dimensional, physically satisfying. Light theme = blond wood and daylight; dark theme = evening lamplight; both via `light-dark()` following system preference. Deeply personal: family roster with avatars/colors, per-person celebration lines, hand-drawn touches welcome. Kind competition throughout — no panic states, no shaming.

**Typography voice words: tactile, warm, mischievous.** Font selection happens at build time via the impeccable font-selection procedure (reflex fonts banned). Expect a chunky, characterful display face for title/numbers paired with a friendly readable body face.

**Color:** OKLCH throughout. Warm-tinted neutrals (toward the brand's wood/amber hue). Seven distinct tetromino colors that survive both themes and are distinguishable with color-vision deficiency — pieces also differ by shape, but shading/pattern should not rely on hue alone for adjacent-piece readability.

## 4. Layout Strategy

- **Play screen (the 90% screen):** The well (board) is the hero — centered on phone, generous on laptop. HUD is quiet and peripheral: score + level top, next-piece and hold as small tactile trays. Nothing competes with the falling piece. Portrait-first on phone; laptop gets side trays.
- **Home screen:** Player picker (family roster, big friendly tappable identities) → difficulty picker (three toy-like tiles with personality, not a settings dropdown) → Play. Leaderboard visible beneath or one tap away, framed as the family fridge door, not an arcade rank screen.
- **Leaderboard:** Grouped by difficulty. Family names, avatars, records. Celebrates the current holder without belittling others.
- Asymmetry and rhythm over centered-everything; the well is the one deliberately centered element.

## 5. Key States

- **First run:** No roster yet → warm invitation to add family members (name, avatar/color). Teaches by doing, not a tutorial modal.
- **Home / default:** Roster, difficulty tiles, leaderboard peek.
- **Playing:** Board, HUD, touch controls (phone). Pause available, low-drama.
- **Line clear:** The core delight moment — satisfying pop/settle animation; bigger clears earn bigger (still smooth, non-bouncy) celebration. Tetris clear = signature moment.
- **Level up:** Gentle acknowledgment, subtle speed shift — never a panic flash.
- **Game over:** Kind framing: score, personal-best comparison, one-tap "one more go." If it's a family record → the big celebration with the player's personal line.
- **New family record:** Full celebratory moment, personal in-joke line, updates leaderboard.
- **Leaderboard empty:** Playful empty state that invites the first game ("This fridge has no drawings yet").
- **Offline / KV unreachable:** Play works fully offline; scores queue locally and sync when back. Quiet indicator, never an error wall.
- **Pause / resume:** Board blurred or covered (no cheating by studying the stack), friendly resume.

## 6. Interaction Model

- **Keyboard:** ←/→ move (DAS/ARR tuned), ↑ or X rotate CW, Z rotate CCW, ↓ soft drop, Space hard drop, C hold, P/Esc pause.
- **Touch:** drag horizontally to move (grid-snapped), tap to rotate, swipe down for soft drop, flick down for hard drop, tap hold-tray to hold. Fallback visible buttons in a bottom control zone for anyone who prefers them. Targets ≥ 48px.
- **Feedback:** every action has tactile response — pieces settle with weight (transform/opacity only, exponential ease-out, no bounce/elastic), lock flash is soft, hard drop has a satisfying thunk (visual; optional subtle sound later).
- **Ghost piece** always on (Chill), toggleable per player.
- **Flow:** Home → (pick player if not remembered) → difficulty → play → game over → one-tap replay or home. localStorage remembers the last player per device.
- **Optimistic leaderboard:** score posts in background; UI updates immediately.

## 7. Content Requirements

- Difficulty names + one-line personalities: **Chill** ("Take your time"), **Classic** ("The real deal"), **Turbo** ("Hold on tight") — final copy at build.
- Per-player celebration lines (deeply personal — **needs family input**, see Open Questions; ship with warm defaults).
- Kind game-over lines (rotating small pool, never "You lose").
- Empty states: leaderboard, first-run roster.
- Offline sync copy: quiet, factual ("Saving when we're back online").
- Microcopy budget: every word earns its place; no instructions restating what's visible.

## 8. Recommended References

- motion-design.md — line clears, drops, celebrations are the product
- interaction-design.md — touch scheme, feedback, optimistic UI
- color-and-contrast.md — dual-theme OKLCH palette, CVD-safe piece colors
- spatial-design.md + typography.md — always
- responsive-design.md — phone portrait vs laptop are different layouts, not scaled ones

## 9. Resolved Decisions (2026-08-06)

1. **Family roster:** added in-app via a warm first-run "add your family" flow (name + avatar/color). Celebration lines ship as warm defaults, editable later.
2. **Sound:** silent v1; tasteful optional SFX as a fast-follow.
3. **Art:** CSS/SVG craft only; design so hand-drawn assets could layer in later without rework.
4. **Daily seed mode:** deferred past v1 per "one great mode."

## Non-goals (locked)

Real-time versus; accounts/auth; achievements/shop/settings sprawl; panic-inducing visuals; preschool aesthetics; looking like any other browser Tetris clone.
