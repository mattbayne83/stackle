/**
 * requestAnimationFrame loop with a clamped delta so a backgrounded tab never
 * teleports the piece when it wakes up. The callback gets (now, dt) in ms.
 */
export const MAX_DT_MS = 250

export function startLoop(fn: (now: number, dt: number) => void): () => void {
  let raf = 0
  let last = performance.now()
  const step = (now: number): void => {
    const dt = Math.min(Math.max(0, now - last), MAX_DT_MS)
    last = now
    fn(now, dt)
    raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}
