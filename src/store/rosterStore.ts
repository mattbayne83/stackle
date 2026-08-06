import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Player } from '../types'
import { newId } from '../utils/player'

interface RosterState {
  players: Player[]
  lastPlayerId: string | null
  addPlayer: (player: Omit<Player, 'id'>) => Player
  updatePlayer: (id: string, patch: Partial<Omit<Player, 'id'>>) => void
  removePlayer: (id: string) => void
  setLastPlayer: (id: string) => void
}

export const useRosterStore = create<RosterState>()(
  persist(
    (set) => ({
      players: [],
      lastPlayerId: null,

      addPlayer: (player) => {
        const created: Player = { ...player, id: newId() }
        set((s) => ({
          players: [...s.players, created],
          lastPlayerId: s.lastPlayerId ?? created.id,
        }))
        return created
      },

      updatePlayer: (id, patch) =>
        set((s) => ({
          players: s.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      removePlayer: (id) =>
        set((s) => ({
          players: s.players.filter((p) => p.id !== id),
          lastPlayerId: s.lastPlayerId === id ? null : s.lastPlayerId,
        })),

      setLastPlayer: (id) => set({ lastPlayerId: id }),
    }),
    { name: 'stackle-roster' },
  ),
)
