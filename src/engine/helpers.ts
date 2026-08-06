// Test-only helpers for building engine states. Not part of the public API.
import type { ActivePiece, Cell, GameState } from './types'
import { COLS, ROWS } from './types'

const CHAR_TO_CELL: Record<string, Cell> = {
  '.': null,
  I: 'I', J: 'J', L: 'L', O: 'O', S: 'S', T: 'T', Z: 'Z',
  X: 'J', // generic garbage
}

// Build a full board from the BOTTOM rows given as strings ('.' empty, 'X' filled).
export function boardFrom(bottomRows: string[]): Cell[][] {
  const board: Cell[][] = Array.from({ length: ROWS }, () =>
    new Array<Cell>(COLS).fill(null),
  )
  bottomRows.forEach((str, i) => {
    const r = ROWS - bottomRows.length + i
    for (let c = 0; c < COLS; c++) board[r][c] = CHAR_TO_CELL[str[c] ?? '.']
  })
  return board
}

export function withBoard(state: GameState, bottomRows: string[]): GameState {
  return { ...state, board: boardFrom(bottomRows) }
}

export function withActive(state: GameState, active: ActivePiece): GameState {
  return { ...state, active }
}
