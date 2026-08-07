import type { GameEvent } from '../engine'

/**
 * Tiny synthesized sound kit — no asset files, WebAudio only. Toy-box
 * timbres: short triangle tones with fast ease-out envelopes, tuned to a
 * warm pentatonic so nothing ever clashes. Muted unless the player flips
 * the Sound switch (per player, in the pause overlay).
 *
 * The AudioContext is created/resumed lazily so it only ever starts after
 * a user gesture (the toggle tap, or the input that caused the event).
 */
export class SfxPlayer {
  enabled = false
  private ctx: AudioContext | null = null
  private master: GainNode | null = null

  setEnabled(on: boolean): void {
    this.enabled = on
    if (on) this.wake()
  }

  destroy(): void {
    void this.ctx?.close()
    this.ctx = null
    this.master = null
  }

  private wake(): AudioContext | null {
    if (!this.ctx) {
      if (typeof AudioContext === 'undefined') return null
      this.ctx = new AudioContext()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.35
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  /** One sound per engine batch — the biggest moment owns it. */
  onEvents(events: GameEvent[]): void {
    if (!this.enabled) return
    const ctx = this.wake()
    if (!ctx || !this.master) return

    let clear = 0
    let hadDrop = false
    let hadLock = false
    let levelUp = false
    let over = false
    for (const ev of events) {
      if (ev.type === 'lineClear') clear = ev.count
      else if (ev.type === 'hardDrop') hadDrop = true
      else if (ev.type === 'lock') hadLock = true
      else if (ev.type === 'levelUp') levelUp = true
      else if (ev.type === 'gameOver') over = true
    }

    const t = ctx.currentTime
    if (clear === 4) this.stackle(t)
    else if (clear > 0) this.pop(t, clear)
    else if (hadDrop) this.thud(t)
    else if (hadLock) this.thock(t)
    if (levelUp && clear !== 4) this.rise(t + 0.06)
    if (over) this.rest(t + 0.15)
  }

  /** One enveloped note: quick attack, exponential ease-out, optional glide. */
  private tone(
    at: number,
    freq: number,
    dur: number,
    peak: number,
    type: OscillatorType = 'triangle',
    glideTo?: number,
  ): void {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, at)
    if (glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(glideTo, at + dur)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.linearRampToValueAtTime(peak, at + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start(at)
    osc.stop(at + dur + 0.02)
  }

  /** Soft lock — a block set down on the table. */
  private thock(t: number): void {
    this.tone(t, 200, 0.08, 0.4, 'triangle', 150)
  }

  /** Hard drop — the same gesture, more weight. */
  private thud(t: number): void {
    this.tone(t, 130, 0.11, 0.55, 'triangle', 82)
    this.tone(t, 62, 0.1, 0.3, 'sine')
  }

  /** Line clear — one warm note per line, quick pentatonic steps up. */
  private pop(t: number, count: number): void {
    const NOTES = [330, 392, 440] // E4 G4 A4
    for (let i = 0; i < Math.min(count, 3); i++) {
      this.tone(t + i * 0.07, NOTES[i], 0.14, 0.35)
    }
  }

  /** The Stackle — a little ascending arpeggio with a sparkle on top. */
  private stackle(t: number): void {
    const NOTES = [330, 415, 494, 659] // E4 Ab4 B4 E5
    for (let i = 0; i < NOTES.length; i++) {
      this.tone(t + i * 0.08, NOTES[i], 0.18, 0.4)
    }
    this.tone(t + 0.32, 1319, 0.22, 0.12, 'sine') // E6, quiet shimmer
  }

  /** Level up — two small steps forward. */
  private rise(t: number): void {
    this.tone(t, 392, 0.1, 0.22)
    this.tone(t + 0.09, 523, 0.16, 0.22)
  }

  /** Game over — a kind coming-to-rest, never a sad horn. */
  private rest(t: number): void {
    this.tone(t, 330, 0.3, 0.25, 'triangle', 262)
    this.tone(t + 0.26, 196, 0.42, 0.2, 'triangle')
  }
}
