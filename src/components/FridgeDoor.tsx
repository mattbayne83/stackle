import { Blocks } from './Blocks'
import { Avatar } from './Avatar'
import { DIFFICULTIES } from '../utils/difficulty'
import { bestPerPlayer } from '../store/scoresStore'
import type { Player, ScoreRecord } from '../types'

const PIECE_COLOR: Record<'o' | 't' | 'i', string> = {
  o: 'var(--color-piece-o)',
  t: 'var(--color-piece-t)',
  i: 'var(--color-piece-i)',
}

const TILTS = ['-1.6deg', '1.1deg', '-0.6deg', '1.4deg']

function noteDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface FridgeDoorProps {
  players: Player[]
  records: ScoreRecord[]
}

/** The family leaderboard, hung on the fridge like kids' drawings. */
export function FridgeDoor({ players, records }: FridgeDoorProps) {
  const byId = new Map(players.map((p) => [p.id, p]))
  const hasAny = records.length > 0

  return (
    <section aria-label="Family records" className="chunk relative rounded-3xl p-5 pt-8 sm:p-6 sm:pt-9">
      {/* Door handle */}
      <div
        aria-hidden
        className="absolute top-3 left-6 h-2.5 w-2/5 max-w-40 rounded-full"
        style={{
          background: 'light-dark(oklch(0.84 0.02 80), oklch(0.36 0.02 72))',
          boxShadow:
            'inset 0 1px 0 light-dark(oklch(0.97 0.01 85), oklch(0.46 0.02 75)), 0 1px 2px light-dark(oklch(0.4 0.04 70 / 0.3), oklch(0.08 0.02 68 / 0.6))',
        }}
      />

      <header className="mb-5">
        <h2 className="font-display text-2xl font-extrabold">The fridge door</h2>
        <p className="mt-1 text-sm text-ink-soft">Family bests hang here.</p>
      </header>

      {!hasAny ? (
        <div
          className="grid place-items-start gap-2 rounded-lg border-2 border-dashed border-line p-5"
          style={{ transform: 'rotate(-0.8deg)' }}
        >
          <p className="font-medium">Nothing on the fridge yet.</p>
          <p className="text-sm text-ink-soft">The first game hangs the first drawing.</p>
        </div>
      ) : (
        <div className="grid gap-7">
          {DIFFICULTIES.map((d) => {
            const bests = bestPerPlayer(records, d.id)
            return (
              <div key={d.id}>
                <div className="mb-3 flex items-center gap-2">
                  <Blocks cells={d.cells} color={PIECE_COLOR[d.piece]} size={7} />
                  <h3 className="font-display font-bold">{d.name}</h3>
                </div>

                {bests.length === 0 ? (
                  <p className="text-sm text-ink-soft" style={{ transform: 'rotate(-0.5deg)' }}>
                    No {d.name} runs yet — room on the door.
                  </p>
                ) : (
                  <ul className="grid gap-4">
                    {bests.map((r, i) => {
                      const player = byId.get(r.playerId)
                      const holder = i === 0
                      return (
                        <li
                          key={r.id}
                          className="paper relative flex items-center gap-3 p-3 pl-4"
                          style={{ transform: `rotate(${TILTS[i % TILTS.length]})` }}
                        >
                          {player && <Avatar player={player} size={holder ? 44 : 34} />}
                          <div className="min-w-0 grow">
                            <p className="single-line font-medium">
                              {player?.name ?? 'Someone'}
                              <span className="ml-2 text-xs text-ink-soft">{noteDate(r.dateISO)}</span>
                            </p>
                            <p className="text-xs text-ink-soft">{r.lines} lines</p>
                          </div>
                          <p
                            className={`font-display font-extrabold tabular-nums ${holder ? 'text-2xl' : 'text-lg text-ink-soft'}`}
                          >
                            {r.score.toLocaleString()}
                          </p>
                          {holder && (
                            <span
                              className="absolute -top-2.5 left-6 rounded-sm bg-accent px-2 py-0.5 text-[0.7rem] font-bold text-accent-ink"
                              style={{ transform: 'rotate(-2deg)' }}
                            >
                              family best
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
