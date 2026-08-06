import type { Player } from '../types'

/** Hue swatches offered when picking a player color. */
export const PLAYER_HUES = [20, 50, 85, 145, 195, 250, 300, 340] as const

export const PLAYER_EMOJI = ['🦖', '🐙', '🦊', '🌵', '⚡️', '🐢', '🚀', '🐝', '🍕', '🎨'] as const

/** Avatar fill — pastel in daylight, deep in lamplight; ink stays readable on both. */
export function avatarBg(hue: number): string {
  return `light-dark(oklch(0.85 0.09 ${hue}), oklch(0.43 0.08 ${hue}))`
}

/** Saturated ring/magnet color for the same player hue. */
export function playerAccent(hue: number): string {
  return `light-dark(oklch(0.64 0.15 ${hue}), oklch(0.72 0.13 ${hue}))`
}

export function playerFace(player: Player): string {
  return player.emoji ?? player.name.trim().charAt(0).toUpperCase()
}

export function newId(): string {
  return crypto.randomUUID()
}
