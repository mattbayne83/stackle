import { describe, expect, it } from 'vitest'
import { applyAction, createGame } from './game'
import { cellsOf, spawnPiece, SHAPES } from './pieces'
import { withActive, withBoard } from './helpers'
import type { ActivePiece, PieceId } from './types'

function place(piece: ActivePiece, bottomRows: string[] = []) {
  return withBoard(withActive(createGame('classic', 1), piece), bottomRows)
}

describe('piece shapes', () => {
  it('every rotation of every piece has exactly 4 cells', () => {
    for (const id of Object.keys(SHAPES) as PieceId[]) {
      for (let rot = 0; rot < 4; rot++) {
        expect(SHAPES[id][rot]).toHaveLength(4)
      }
    }
  })

  it('cellsOf returns absolute coordinates', () => {
    const t: ActivePiece = { id: 'T', row: 5, col: 3, rot: 0 }
    expect(cellsOf(t).sort((a, b) => a.row - b.row || a.col - b.col)).toEqual([
      { row: 5, col: 4 },
      { row: 6, col: 3 },
      { row: 6, col: 4 },
      { row: 6, col: 5 },
    ])
  })

  it('spawn pieces sit in the hidden rows, centered', () => {
    for (const id of ['I', 'J', 'L', 'O', 'S', 'T', 'Z'] as PieceId[]) {
      const cells = cellsOf(spawnPiece(id))
      for (const { row, col } of cells) {
        expect(row).toBeLessThan(2)
        expect(col).toBeGreaterThanOrEqual(3)
        expect(col).toBeLessThanOrEqual(6)
      }
    }
  })

  it('four CW rotations return to the original shape', () => {
    for (const id of Object.keys(SHAPES) as PieceId[]) {
      let s = place({ id, row: 10, col: 4, rot: 0 })
      for (let i = 0; i < 4; i++) s = applyAction(s, { type: 'rotateCW' })
      expect(s.active?.rot).toBe(0)
    }
  })
})

describe('SRS rotation and wall kicks', () => {
  it('free rotation in open space uses the (0,0) kick', () => {
    let s = place({ id: 'T', row: 10, col: 4, rot: 0 })
    s = applyAction(s, { type: 'rotateCW' })
    expect(s.active).toMatchObject({ rot: 1, row: 10, col: 4 })
    s = applyAction(s, { type: 'rotateCCW' })
    expect(s.active).toMatchObject({ rot: 0, row: 10, col: 4 })
  })

  it('T against the left wall kicks right on 1->2', () => {
    // T rot 1 hugging the wall: cells in cols 0/1. Plain rotation to rot 2
    // would poke through the wall; SRS kick (+1, 0) shifts it in.
    let s = place({ id: 'T', row: 10, col: -1, rot: 1 })
    s = applyAction(s, { type: 'rotateCW' })
    expect(s.active).toMatchObject({ rot: 2, row: 10, col: 0 })
  })

  it('grounded T 0->1 uses the (-1,+1) kick', () => {
    // T rot 0 resting on the floor (rows 20-21). Rot 1 needs three rows, so
    // the first two kicks fail and (-1,+1) lifts it up-left.
    let s = place({ id: 'T', row: 20, col: 4, rot: 0 })
    s = applyAction(s, { type: 'rotateCW' })
    expect(s.active).toMatchObject({ rot: 1, row: 19, col: 3 })
  })

  it('vertical I against the left wall kicks out with (+2, 0) on 1->2', () => {
    // I rot 1 occupies column col+2; col -2 puts it flush in column 0.
    let s = place({ id: 'I', row: 10, col: -2, rot: 1 })
    s = applyAction(s, { type: 'rotateCW' })
    expect(s.active).toMatchObject({ rot: 2, row: 10, col: 0 })
  })

  it('I 0->1 in open space rotates in place', () => {
    let s = place({ id: 'I', row: 10, col: 3, rot: 0 })
    s = applyAction(s, { type: 'rotateCW' })
    expect(s.active).toMatchObject({ rot: 1, row: 10, col: 3 })
  })

  it('fully blocked rotation is a no-op returning the same reference', () => {
    // Box the T in completely so no kick can succeed.
    const rows = [
      'XXXXXXXXXX',
      'XXXX.XXXXX',
      'XXX...XXXX',
      'XXXXXXXXXX',
      'XXXXXXXXXX',
    ]
    const s = place({ id: 'T', row: 18, col: 3, rot: 0 }, rows)
    const s2 = applyAction(s, { type: 'rotateCW' })
    expect(s2).toBe(s)
  })

  it('O rotation never moves the piece', () => {
    let s = place({ id: 'O', row: 10, col: 4, rot: 0 })
    const before = cellsOf(s.active as ActivePiece)
    s = applyAction(s, { type: 'rotateCW' })
    expect(cellsOf(s.active as ActivePiece).sort((a, b) => a.row - b.row || a.col - b.col))
      .toEqual(before.sort((a, b) => a.row - b.row || a.col - b.col))
  })
})

describe('movement', () => {
  it('moveLeft/moveRight shift one column and stop at walls', () => {
    let s = place({ id: 'O', row: 10, col: 0, rot: 0 })
    const blocked = applyAction(s, { type: 'moveLeft' })
    expect(blocked).toBe(s)
    s = applyAction(s, { type: 'moveRight' })
    expect(s.active?.col).toBe(1)
  })

  it('movement is blocked by stack cells', () => {
    const rows = ['....X.....']
    // O at cols 2-3 on the floor row; garbage at col 4 blocks moveRight.
    const s = place({ id: 'O', row: 20, col: 2, rot: 0 }, rows)
    expect(applyAction(s, { type: 'moveRight' })).toBe(s)
    expect(applyAction(s, { type: 'moveLeft' }).active?.col).toBe(1)
  })
})
