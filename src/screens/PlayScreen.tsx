// Placeholder — the Play-screen agent replaces this file wholesale.
interface PlayScreenProps {
  playerId: string
  difficulty: 'chill' | 'classic' | 'turbo'
  onExit: () => void
}

export function PlayScreen({ playerId, difficulty, onExit }: PlayScreenProps) {
  return (
    <main className="grid min-h-dvh place-items-center gap-4 p-6">
      <div className="grid gap-4">
        <p className="text-ink-soft">
          game goes here — {difficulty} · player {playerId.slice(0, 4)}
        </p>
        <button onClick={onExit} className="chunk h-12 justify-self-start px-5 font-semibold">
          Back home
        </button>
      </div>
    </main>
  )
}
