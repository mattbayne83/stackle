export type Difficulty = 'chill' | 'classic' | 'turbo'

export interface Player {
  id: string
  name: string
  /** OKLCH hue (0-360) — the player's color across avatars, magnets, celebrations. */
  hue: number
  /** Optional emoji face; falls back to the first letter of the name. */
  emoji?: string
}

export interface ScoreRecord {
  id: string
  playerId: string
  difficulty: Difficulty
  score: number
  lines: number
  level: number
  dateISO: string
  /** False until a future sync layer posts it to the shared leaderboard. */
  synced: boolean
}

export type ControlPreference = 'gestures' | 'buttons'

export interface PlayerSettings {
  ghost: boolean
  controls: ControlPreference
}
