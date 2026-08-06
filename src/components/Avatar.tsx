import type { Player } from '../types'
import { avatarBg, playerAccent, playerFace } from '../utils/player'

interface AvatarProps {
  player: Player
  /** Diameter in px. */
  size?: number
  className?: string
}

export function Avatar({ player, size = 48, className }: AvatarProps) {
  const emoji = player.emoji !== undefined
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-display font-extrabold select-none ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        fontSize: size * (emoji ? 0.5 : 0.44),
        background: avatarBg(player.hue),
        boxShadow: `0 0 0 3px ${playerAccent(player.hue)}, 0 2px 0 3px light-dark(oklch(0.5 0.1 ${player.hue} / 0.4), oklch(0.14 0.03 ${player.hue} / 0.7))`,
      }}
    >
      {playerFace(player)}
    </span>
  )
}
