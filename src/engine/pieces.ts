import type { ActivePiece, PieceId, Rotation } from './types'
import { COLS } from './types'

type Offset = readonly [row: number, col: number]

// Base (rotation 0) cell offsets within each piece's SRS bounding box.
const BASE: Record<PieceId, { box: number; cells: Offset[] }> = {
  I: { box: 4, cells: [[1, 0], [1, 1], [1, 2], [1, 3]] },
  J: { box: 3, cells: [[0, 0], [1, 0], [1, 1], [1, 2]] },
  L: { box: 3, cells: [[0, 2], [1, 0], [1, 1], [1, 2]] },
  O: { box: 2, cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  S: { box: 3, cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
  T: { box: 3, cells: [[0, 1], [1, 0], [1, 1], [1, 2]] },
  Z: { box: 3, cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
}

function rotateCW(cells: Offset[], box: number): Offset[] {
  return cells.map(([r, c]) => [c, box - 1 - r] as const)
}

function buildShapes(): Record<PieceId, Offset[][]> {
  const out = {} as Record<PieceId, Offset[][]>
  for (const id of Object.keys(BASE) as PieceId[]) {
    const { box, cells } = BASE[id]
    const rots: Offset[][] = [cells]
    for (let i = 1; i < 4; i++) rots.push(rotateCW(rots[i - 1], box))
    out[id] = rots
  }
  return out
}

// SHAPES[id][rot] = 4 cell offsets relative to the piece's (row, col).
export const SHAPES: Record<PieceId, Offset[][]> = buildShapes()

export function cellsOf(piece: ActivePiece): Array<{ row: number; col: number }> {
  return SHAPES[piece.id][piece.rot].map(([r, c]) => ({
    row: piece.row + r,
    col: piece.col + c,
  }))
}

// SRS wall-kick tables. Entries are [x, y] with y pointing UP (guideline
// convention): apply as col += x, row -= y. Keyed by `${from}${to}`.
type KickTable = Record<string, ReadonlyArray<readonly [number, number]>>

export const KICKS_JLSTZ: KickTable = {
  '01': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '10': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '12': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '21': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '23': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '32': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '30': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '03': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
}

export const KICKS_I: KickTable = {
  '01': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '10': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '12': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '21': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '23': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '32': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '30': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '03': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
}

export function kicksFor(id: PieceId, from: Rotation, to: Rotation) {
  const table = id === 'I' ? KICKS_I : KICKS_JLSTZ
  return table[`${from}${to}`]
}

// Spawn in the hidden rows, horizontally centered per SRS.
export function spawnPiece(id: PieceId): ActivePiece {
  const box = BASE[id].box
  const col = Math.floor((COLS - box) / 2)
  return { id, row: 0, col, rot: 0 }
}
