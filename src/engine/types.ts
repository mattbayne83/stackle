export type PieceId = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z'
export type Difficulty = 'chill' | 'classic' | 'turbo'
export type Rotation = 0 | 1 | 2 | 3

export interface ActivePiece {
  id: PieceId
  row: number
  col: number
  rot: Rotation
}

export type Cell = PieceId | null

export type GameAction =
  | { type: 'tick'; ms: number }
  | { type: 'moveLeft' }
  | { type: 'moveRight' }
  | { type: 'rotateCW' }
  | { type: 'rotateCCW' }
  | { type: 'softDrop'; on: boolean }
  | { type: 'hardDrop' }
  | { type: 'hold' }
  | { type: 'pause' }
  | { type: 'resume' }

export type GameEvent =
  | { type: 'lock'; piece: ActivePiece }
  | { type: 'lineClear'; rows: number[]; count: number }
  | { type: 'levelUp'; level: number }
  | { type: 'hardDrop'; fromRow: number; toRow: number }
  | { type: 'gameOver' }

export interface GameState {
  board: Cell[][]
  active: ActivePiece | null
  hold: PieceId | null
  canHold: boolean
  next: PieceId[]
  score: number
  lines: number
  level: number
  difficulty: Difficulty
  status: 'playing' | 'paused' | 'over'
  events: GameEvent[]
}

export const ROWS = 22
export const COLS = 10
export const HIDDEN_ROWS = 2
