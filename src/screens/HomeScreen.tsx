import { useState } from 'react'
import type { Difficulty, Player } from '../types'
import { useRosterStore } from '../store/rosterStore'
import { useScoresStore } from '../store/scoresStore'
import { DIFFICULTIES } from '../utils/difficulty'
import { playerAccent } from '../utils/player'
import { Avatar } from '../components/Avatar'
import { Blocks } from '../components/Blocks'
import { FridgeDoor } from '../components/FridgeDoor'
import { PlayerForm } from '../components/PlayerForm'
import { Wordmark } from '../components/Wordmark'

const PIECE_COLOR: Record<'o' | 't' | 'i', string> = {
  o: 'var(--color-piece-s)',
  t: 'var(--color-piece-t)',
  i: 'var(--color-piece-z)',
}

interface HomeScreenProps {
  onPlay: (playerId: string, difficulty: Difficulty) => void
}

export function HomeScreen({ onPlay }: HomeScreenProps) {
  const { players, lastPlayerId, addPlayer, updatePlayer, removePlayer, setLastPlayer } =
    useRosterStore()
  const records = useScoresStore((s) => s.records)

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Player | null>(null)
  const [editMode, setEditMode] = useState(false)

  const selectedId =
    players.find((p) => p.id === lastPlayerId)?.id ?? players[0]?.id ?? null
  const selected = players.find((p) => p.id === selectedId)

  // First run: no roster yet — the add-family flow IS the home screen.
  if (players.length === 0) {
    return (
      <main className="mx-auto grid max-w-lg gap-8 px-5 py-10">
        <Wordmark />
        <div>
          <h2 className="font-display text-2xl font-extrabold">Who&rsquo;s in?</h2>
          <p className="mt-1 text-ink-soft">
            Add yourself first. Everyone else can pile on after.
          </p>
        </div>
        <PlayerForm submitLabel="Put me in" onSubmit={(v) => addPlayer(v)} />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 lg:py-12">
      <Wordmark />

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-14">
        <div className="grid content-start gap-10">
          {/* Player picker */}
          <section aria-label="Players">
            <div className="mb-4 flex items-baseline gap-4">
              <h2 className="font-display text-2xl font-extrabold">Who&rsquo;s playing?</h2>
              <button
                onClick={() => {
                  setEditMode((m) => !m)
                  setEditing(null)
                  setAdding(false)
                }}
                className="text-sm text-ink-soft underline underline-offset-4"
              >
                {editMode ? 'done' : 'edit'}
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              {players.map((p) => {
                const isSelected = !editMode && p.id === selectedId
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (editMode) {
                        setEditing(p)
                        setAdding(false)
                      } else {
                        setLastPlayer(p.id)
                      }
                    }}
                    aria-pressed={isSelected}
                    className="chunk flex min-h-14 max-w-full items-center gap-3 py-2 pr-5 pl-3"
                    style={
                      isSelected
                        ? { boxShadow: `var(--shadow-chunk), 0 0 0 3px ${playerAccent(p.hue)}` }
                        : undefined
                    }
                  >
                    <Avatar player={p} size={38} />
                    <span className="single-line text-lg font-semibold">{p.name}</span>
                    {editMode && <span className="text-sm text-ink-soft">edit</span>}
                  </button>
                )
              })}

              <button
                onClick={() => {
                  setAdding(true)
                  setEditing(null)
                  setEditMode(false)
                }}
                className="chunk flex min-h-14 items-center gap-2 px-5 text-ink-soft"
              >
                <span aria-hidden className="font-display text-xl font-extrabold">
                  +
                </span>
                add family
              </button>
            </div>

            {adding && (
              <div className="mt-5">
                <PlayerForm
                  submitLabel="Add to the family"
                  onSubmit={(v) => {
                    const created = addPlayer(v)
                    setLastPlayer(created.id)
                    setAdding(false)
                  }}
                  onCancel={() => setAdding(false)}
                />
              </div>
            )}

            {editing && (
              <div className="mt-5">
                <PlayerForm
                  initial={editing}
                  submitLabel="Save changes"
                  onSubmit={(v) => {
                    updatePlayer(editing.id, v)
                    setEditing(null)
                    setEditMode(false)
                  }}
                  onCancel={() => setEditing(null)}
                  onRemove={() => {
                    removePlayer(editing.id)
                    setEditing(null)
                    setEditMode(false)
                  }}
                />
              </div>
            )}
          </section>

          {/* Difficulty tiles */}
          <section aria-label="Difficulty">
            <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 className="font-display text-2xl font-extrabold">Pick your pace</h2>
              {selected && <p className="text-sm text-ink-soft">stacking as {selected.name}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  disabled={!selectedId}
                  onClick={() => {
                    if (!selectedId) return
                    setLastPlayer(selectedId)
                    onPlay(selectedId, d.id)
                  }}
                  className="chunk grid min-h-32 content-between gap-4 p-5"
                >
                  <Blocks cells={d.cells} color={PIECE_COLOR[d.piece]} size={13} />
                  <span className="grid gap-0.5">
                    <span className="font-display text-xl font-extrabold">{d.name}</span>
                    <span className="text-sm text-ink-soft">{d.tagline}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <FridgeDoor players={players} records={records} />
      </div>
    </main>
  )
}
