import { useState } from 'react'
import type { Player } from '../types'
import { PLAYER_EMOJI, PLAYER_HUES, avatarBg, playerAccent } from '../utils/player'

interface PlayerFormProps {
  initial?: Player
  submitLabel: string
  onSubmit: (values: { name: string; hue: number; emoji?: string }) => void
  onCancel?: () => void
  onRemove?: () => void
}

export function PlayerForm({ initial, submitLabel, onSubmit, onCancel, onRemove }: PlayerFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [hue, setHue] = useState<number>(initial?.hue ?? PLAYER_HUES[4])
  const [emoji, setEmoji] = useState<string | undefined>(initial?.emoji)

  const preview = emoji ?? (name.trim() ? name.trim().charAt(0).toUpperCase() : '?')

  return (
    <form
      className="chunk grid gap-5 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        onSubmit({ name: name.trim(), hue, emoji })
      }}
    >
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="grid size-14 shrink-0 place-items-center rounded-full font-display text-2xl font-extrabold select-none"
          style={{ background: avatarBg(hue), boxShadow: `0 0 0 3px ${playerAccent(hue)}` }}
        >
          {preview}
        </span>
        <label className="grid min-w-0 grow gap-1">
          <span className="text-sm font-medium text-ink-soft">Name</span>
          <input
            autoFocus={initial === undefined}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="Dad"
            className="h-12 min-w-0 rounded-lg border border-line bg-surface-sunken px-3 text-lg"
          />
        </label>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium text-ink-soft">Your color</legend>
        <div className="flex flex-wrap gap-2">
          {PLAYER_HUES.map((h) => (
            <button
              key={h}
              type="button"
              aria-label={`Hue ${h}`}
              aria-pressed={h === hue}
              onClick={() => setHue(h)}
              className="size-12 rounded-full"
              style={{
                background: avatarBg(h),
                boxShadow: h === hue ? `0 0 0 3px ${playerAccent(h)}` : 'none',
              }}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium text-ink-soft">Your face</legend>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={emoji === undefined}
            onClick={() => setEmoji(undefined)}
            className={`grid h-12 place-items-center rounded-lg border px-3 text-sm ${
              emoji === undefined ? 'border-accent bg-surface-sunken' : 'border-line'
            }`}
          >
            my initial
          </button>
          {PLAYER_EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              aria-label={`Emoji ${e}`}
              aria-pressed={e === emoji}
              onClick={() => setEmoji(e)}
              className={`grid size-12 place-items-center rounded-lg border text-2xl ${
                e === emoji ? 'border-accent bg-surface-sunken' : 'border-line'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!name.trim()}
          className="chunk h-12 bg-accent px-5 font-display font-extrabold text-accent-ink disabled:opacity-50"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-12 px-3 text-ink-soft">
            Never mind
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto h-12 px-3 text-sm text-ink-soft underline underline-offset-4"
          >
            Remove player
          </button>
        )}
      </div>
    </form>
  )
}
