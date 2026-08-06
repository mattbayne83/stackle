import type { Difficulty } from '../types'

interface DifficultyMeta {
  id: Difficulty
  name: string
  tagline: string
  /** Which tetromino sits on the tile — each pace gets its own toy. */
  piece: 'o' | 't' | 'i'
  /** Cells as [col, row] on a small grid, for the block glyph. */
  cells: ReadonlyArray<readonly [number, number]>
}

export const DIFFICULTIES: readonly DifficultyMeta[] = [
  {
    id: 'chill',
    name: 'Chill',
    tagline: 'Take your time',
    piece: 'o',
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
  },
  {
    id: 'classic',
    name: 'Classic',
    tagline: 'The real deal',
    piece: 't',
    cells: [
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 0],
    ],
  },
  {
    id: 'turbo',
    name: 'Turbo',
    tagline: 'Hold on tight',
    piece: 'i',
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ],
  },
]

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  chill: 'Chill',
  classic: 'Classic',
  turbo: 'Turbo',
}
