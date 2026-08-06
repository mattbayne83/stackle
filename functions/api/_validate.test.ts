import { describe, expect, it } from 'vitest'
import { mergeTopN, validateRecord, type SubmitRecord } from './_validate'

const NOW = Date.parse('2026-08-06T12:00:00Z')

function rec(
  overrides: Partial<Omit<SubmitRecord, 'player'>> & { player?: Partial<SubmitRecord['player']> } = {},
): SubmitRecord {
  const { player, ...rest } = overrides
  return {
    id: 'r1',
    player: { name: 'Matt', hue: 210, ...player },
    difficulty: 'classic',
    score: 1200,
    lines: 10,
    level: 2,
    dateISO: '2026-08-05T20:00:00Z',
    ...rest,
  }
}

describe('validateRecord', () => {
  it('accepts a well-formed record and echoes it back', () => {
    const input = rec()
    expect(validateRecord(input, NOW)).toEqual(input)
  })

  it('keeps a valid emoji and drops nothing else', () => {
    const input = rec({ player: { emoji: '🐙' } })
    expect(validateRecord(input, NOW)?.player.emoji).toBe('🐙')
  })

  it('rejects non-objects', () => {
    expect(validateRecord(null, NOW)).toBeNull()
    expect(validateRecord('hi', NOW)).toBeNull()
    expect(validateRecord(42, NOW)).toBeNull()
    expect(validateRecord(undefined, NOW)).toBeNull()
  })

  it('rejects missing or bad id', () => {
    expect(validateRecord(rec({ id: '' }), NOW)).toBeNull()
    expect(validateRecord(rec({ id: 'x'.repeat(65) }), NOW)).toBeNull()
    expect(validateRecord({ ...rec(), id: 7 }, NOW)).toBeNull()
  })

  it('enforces name 1-24 chars (after trim)', () => {
    expect(validateRecord(rec({ player: { name: '' } }), NOW)).toBeNull()
    expect(validateRecord(rec({ player: { name: '   ' } }), NOW)).toBeNull()
    expect(validateRecord(rec({ player: { name: 'x'.repeat(25) } }), NOW)).toBeNull()
    expect(validateRecord(rec({ player: { name: 'x'.repeat(24) } }), NOW)).not.toBeNull()
  })

  it('trims the name it stores', () => {
    expect(validateRecord(rec({ player: { name: '  Lyzah ' } }), NOW)?.player.name).toBe('Lyzah')
  })

  it('enforces hue 0-360', () => {
    expect(validateRecord(rec({ player: { hue: -1 } }), NOW)).toBeNull()
    expect(validateRecord(rec({ player: { hue: 361 } }), NOW)).toBeNull()
    expect(validateRecord(rec({ player: { hue: Number.NaN } }), NOW)).toBeNull()
    expect(validateRecord(rec({ player: { hue: 0 } }), NOW)).not.toBeNull()
    expect(validateRecord(rec({ player: { hue: 360 } }), NOW)).not.toBeNull()
  })

  it('rejects unknown difficulty', () => {
    expect(validateRecord({ ...rec(), difficulty: 'insane' }, NOW)).toBeNull()
  })

  it('rejects non-integer or negative score/lines/level', () => {
    expect(validateRecord(rec({ score: -1 }), NOW)).toBeNull()
    expect(validateRecord(rec({ score: 12.5 }), NOW)).toBeNull()
    expect(validateRecord(rec({ lines: -3 }), NOW)).toBeNull()
    expect(validateRecord(rec({ level: 2.5 }), NOW)).toBeNull()
  })

  it('enforces level <= 40 and lines <= 999', () => {
    expect(validateRecord(rec({ level: 41 }), NOW)).toBeNull()
    expect(validateRecord(rec({ lines: 1000 }), NOW)).toBeNull()
    expect(validateRecord(rec({ score: 100, lines: 999, level: 40 }), NOW)).not.toBeNull()
  })

  it('rejects unparseable dateISO and dates > 24h in the future', () => {
    expect(validateRecord(rec({ dateISO: 'not-a-date' }), NOW)).toBeNull()
    const in25h = new Date(NOW + 25 * 3600_000).toISOString()
    expect(validateRecord(rec({ dateISO: in25h }), NOW)).toBeNull()
    const in23h = new Date(NOW + 23 * 3600_000).toISOString()
    expect(validateRecord(rec({ dateISO: in23h }), NOW)).not.toBeNull()
  })

  it('applies the sanity bound score <= (lines+4)*800*max(1,level)', () => {
    // 10 lines, level 2 → cap = 14 * 800 * 2 = 22_400
    expect(validateRecord(rec({ score: 22_400 }), NOW)).not.toBeNull()
    expect(validateRecord(rec({ score: 22_401 }), NOW)).toBeNull()
    // level 0 uses max(1, level): 0 lines, level 0 → cap = 4 * 800 = 3200
    expect(validateRecord(rec({ score: 3200, lines: 0, level: 0 }), NOW)).not.toBeNull()
    expect(validateRecord(rec({ score: 3201, lines: 0, level: 0 }), NOW)).toBeNull()
  })

  it('caps score at 5,000,000 absolutely', () => {
    expect(validateRecord(rec({ score: 5_000_001, lines: 999, level: 40 }), NOW)).toBeNull()
  })
})

describe('mergeTopN', () => {
  it('dedupes by id with existing winning', () => {
    const existing = [rec({ id: 'a', score: 500 })]
    const incoming = [rec({ id: 'a', score: 999 })]
    const merged = mergeTopN(existing, incoming)
    expect(merged).toHaveLength(1)
    expect(merged[0].score).toBe(500)
  })

  it('sorts by score descending and caps at topN', () => {
    const existing = Array.from({ length: 50 }, (_, i) => rec({ id: `e${i}`, score: (i + 1) * 10 }))
    const incoming = [rec({ id: 'big', score: 22_000 }), rec({ id: 'tiny', score: 1 })]
    const merged = mergeTopN(existing, incoming)
    expect(merged).toHaveLength(50)
    expect(merged[0].id).toBe('big')
    expect(merged.some((r) => r.id === 'tiny')).toBe(false)
  })

  it('breaks score ties by earlier date first', () => {
    const a = rec({ id: 'a', score: 100, dateISO: '2026-08-01T00:00:00Z' })
    const b = rec({ id: 'b', score: 100, dateISO: '2026-08-02T00:00:00Z' })
    expect(mergeTopN([b], [a]).map((r) => r.id)).toEqual(['a', 'b'])
  })
})
