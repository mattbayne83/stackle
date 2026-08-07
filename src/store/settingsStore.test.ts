import { describe, expect, it } from 'vitest'
import type { PlayerSettings } from '../types'
import { settingsFor } from './settingsStore'

describe('settingsFor', () => {
  it('returns full defaults for an unknown player', () => {
    expect(settingsFor({}, 'p1')).toEqual({ ghost: true, controls: 'buttons', sound: false })
  })

  it('fills settings missing from records persisted before they existed', () => {
    // A pre-sound-era entry has only ghost/controls on disk.
    const legacy = { ghost: false, controls: 'gestures' } as PlayerSettings
    const got = settingsFor({ p1: legacy }, 'p1')
    expect(got.ghost).toBe(false)
    expect(got.controls).toBe('gestures')
    expect(got.sound).toBe(false)
  })

  it('keeps explicit choices over defaults', () => {
    const stored: PlayerSettings = { ghost: true, controls: 'gestures', sound: true }
    expect(settingsFor({ p1: stored }, 'p1')).toEqual(stored)
  })
})
