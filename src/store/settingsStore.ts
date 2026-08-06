import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ControlPreference, PlayerSettings } from '../types'

const DEFAULT_SETTINGS: PlayerSettings = { ghost: true, controls: 'gestures' }

interface SettingsState {
  byPlayer: Record<string, PlayerSettings>
  setGhost: (playerId: string, ghost: boolean) => void
  setControls: (playerId: string, controls: ControlPreference) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      byPlayer: {},

      setGhost: (playerId, ghost) =>
        set((s) => ({
          byPlayer: {
            ...s.byPlayer,
            [playerId]: { ...(s.byPlayer[playerId] ?? DEFAULT_SETTINGS), ghost },
          },
        })),

      setControls: (playerId, controls) =>
        set((s) => ({
          byPlayer: {
            ...s.byPlayer,
            [playerId]: { ...(s.byPlayer[playerId] ?? DEFAULT_SETTINGS), controls },
          },
        })),
    }),
    { name: 'stackle-settings' },
  ),
)

export function settingsFor(byPlayer: Record<string, PlayerSettings>, playerId: string): PlayerSettings {
  return byPlayer[playerId] ?? DEFAULT_SETTINGS
}
