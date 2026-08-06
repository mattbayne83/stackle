/**
 * Confetti of blocks for a new family record — little rounded squares in the
 * player's color tumbling down with real gravity. No library, no bounce.
 */

interface Flake {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rot: number
  vr: number
  color: string
}

export function launchConfetti(canvas: HTMLCanvasElement, colors: string[]): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  const rect = canvas.getBoundingClientRect()
  const w = rect.width
  const h = rect.height
  canvas.width = Math.max(1, Math.round(w * dpr))
  canvas.height = Math.max(1, Math.round(h * dpr))

  const flakes: Flake[] = []
  for (let i = 0; i < 56; i++) {
    const fromLeft = i % 2 === 0
    flakes.push({
      x: fromLeft ? w * 0.18 : w * 0.82,
      y: h * 0.62,
      vx: (fromLeft ? 1 : -1) * (0.04 + Math.random() * 0.22),
      vy: -(0.35 + Math.random() * 0.4),
      size: 7 + Math.random() * 9,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.012,
      color: colors[i % colors.length],
    })
  }

  let raf = 0
  let last = performance.now()
  const GRAVITY = 0.0011

  const step = (now: number): void => {
    const dt = Math.min(now - last, 64)
    last = now
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    let alive = 0
    for (const f of flakes) {
      f.vy += GRAVITY * dt
      f.x += f.vx * dt
      f.y += f.vy * dt
      f.rot += f.vr * dt
      if (f.y > h + 20) continue
      alive++
      ctx.save()
      ctx.translate(f.x, f.y)
      ctx.rotate(f.rot)
      ctx.fillStyle = f.color
      ctx.beginPath()
      ctx.roundRect(-f.size / 2, -f.size / 2, f.size, f.size, f.size * 0.25)
      ctx.fill()
      // The same lit-from-above edge the game blocks wear.
      ctx.fillStyle = 'oklch(0.99 0.01 90 / 0.35)'
      ctx.fillRect(-f.size / 2, -f.size / 2, f.size, f.size * 0.22)
      ctx.restore()
    }
    if (alive > 0) raf = requestAnimationFrame(step)
    else ctx.clearRect(0, 0, w, h)
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}
