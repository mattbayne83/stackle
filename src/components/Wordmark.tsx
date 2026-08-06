import { Blocks } from './Blocks'

const STACK_CELLS = [
  // O piece resting on the flat of an L piece — a settled mini-stack.
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
  [0, 2],
  [1, 2],
  [2, 2],
  [2, 1],
] as const

const STACK_COLORS = [
  'var(--color-piece-o)',
  'var(--color-piece-o)',
  'var(--color-piece-o)',
  'var(--color-piece-o)',
  'var(--color-piece-l)',
  'var(--color-piece-l)',
  'var(--color-piece-l)',
  'var(--color-piece-t)',
]

/** Title lockup: a settled block stack leaning against the name. */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-end gap-3">
      <Blocks cells={STACK_CELLS} color={STACK_COLORS} size={compact ? 10 : 15} className="mb-1.5" />
      <div>
        <h1
          className={`font-display font-black leading-none tracking-tight ${compact ? 'text-2xl' : 'text-[2.6rem]'}`}
        >
          Stackle
        </h1>
        {!compact && (
          <p
            className="mt-1 text-sm text-ink-soft"
            style={{ fontVariationSettings: '"CASL" 1' }}
          >
            the Baynes&rsquo; block game
          </p>
        )}
      </div>
    </div>
  )
}
