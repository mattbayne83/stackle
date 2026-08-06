/**
 * Auto-repeat for horizontal movement, driven by the rAF clock (never the
 * OS key repeat): first move fires instantly, repeats start after DAS and
 * then fire every ARR. Holding both directions: the most recent press wins;
 * releasing it falls back to the older one with a fresh DAS.
 */
export const DAS_MS = 160
export const ARR_MS = 40

export type Dir = -1 | 1

export class ShiftRepeater {
  private held: Dir[] = []
  private nextAt = 0

  press(dir: Dir, now: number, move: (dir: Dir) => void): void {
    if (this.held.includes(dir)) return
    this.held.push(dir)
    move(dir)
    this.nextAt = now + DAS_MS
  }

  release(dir: Dir, now: number): void {
    const i = this.held.indexOf(dir)
    if (i === -1) return
    const wasActive = i === this.held.length - 1
    this.held.splice(i, 1)
    if (wasActive && this.held.length > 0) this.nextAt = now + DAS_MS
  }

  clear(): void {
    this.held.length = 0
  }

  update(now: number, move: (dir: Dir) => void): void {
    if (this.held.length === 0) return
    const dir = this.held[this.held.length - 1]
    // After a long frame or tab wake, resync instead of machine-gunning.
    if (now - this.nextAt > 200) this.nextAt = now
    while (now >= this.nextAt) {
      move(dir)
      this.nextAt += ARR_MS
    }
  }
}
