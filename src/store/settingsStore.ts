import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ControlPreference, PlayerSettings } from '../types'

/** Pad defaults to shown on touch devices; sound stays muted until asked for. */
const DEFAULT_SETTINGS: PlayerSettings = { ghost: true, controls: 'buttons', sound: false }

interface SettingsState {
  byPlayer: Record<string, PlayerSettings>
  setGhost: (playerId: string, ghost: boolean) => void
  setControls: (playerId: string, controls: ControlPreference) => void
  setSound: (playerId: string, sound: boolean) => void
}

/** Spread defaults under stored values so entries persisted before a
    setting existed pick up its default instead of `undefined`. */
const patch = (
  byPlayer: Record<string, PlayerSettings>,
  playerId: string,
  change: Partial<PlayerSettings>,
): Record<string, PlayerSettings> => ({
  ...byPlayer,
  [playerId]: { ...DEFAULT_SETTINGS, ...byPlayer[playerId], ...change },
})

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      byPlayer: {},

      setGhost: (playerId, ghost) =>
        set((s) => ({ byPlayer: patch(s.byPlayer, playerId, { ghost }) })),

      setControls: (playerId, controls) =>
        set((s) => ({ byPlayer: patch(s.byPlayer, playerId, { controls }) })),

      setSound: (playerId, sound) =>
        set((s) => ({ byPlayer: patch(s.byPlayer, playerId, { sound }) })),
    }),
    { name: 'stackle-settings' },
  ),
)

export function settingsFor(
  byPlayer: Record<string, PlayerSettings>,
  playerId: string,
): PlayerSettings {
  const stored = byPlayer[playerId]
  return stored ? { ...DEFAULT_SETTINGS, ...stored } : DEFAULT_SETTINGS
}
