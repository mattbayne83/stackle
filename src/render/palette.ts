import type { PieceId } from '../engine'

/**
 * Canvas can't parse `light-dark()` / `var()` strings, so we resolve the CSS
 * tokens through a live element: set its `color` to the token, read the
 * computed (theme-resolved) value back. index.css stays the single source of
 * truth for every color the renderer paints.
 */

const PIECE_TOKEN: Record<PieceId, string> = {
  I: '--color-piece-i',
  J: '--color-piece-j',
  L: '--color-piece-l',
  O: '--color-piece-o',
  S: '--color-piece-s',
  T: '--color-piece-t',
  Z: '--color-piece-z',
}

export interface Palette {
  piece: Record<PieceId, string>
  well: string
  line: string
  ink: string
  accent: string
  surface: string
}

export function resolvePalette(el: HTMLElement): Palette {
  const probe = (token: string): string => {
    el.style.color = `var(${token})`
    return getComputedStyle(el).color
  }
  const piece = {} as Record<PieceId, string>
  for (const id of Object.keys(PIECE_TOKEN) as PieceId[]) {
    piece[id] = probe(PIECE_TOKEN[id])
  }
  const palette: Palette = {
    piece,
    well: probe('--color-well'),
    line: probe('--color-line'),
    ink: probe('--color-ink'),
    accent: probe('--color-accent'),
    surface: probe('--color-surface'),
  }
  el.style.color = ''
  return palette
}
