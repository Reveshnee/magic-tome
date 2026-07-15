// Lightweight Web Audio helpers using oscillators only (no audio files).

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new AC()
    } catch {
      return null
    }
  }
  // Some browsers suspend the context until a user gesture.
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

type Wave = OscillatorType

function playNote(
  frequency: number,
  startAt: number,
  duration: number,
  peak: number,
  type: Wave = 'sine',
) {
  const audio = getCtx()
  if (!audio) return
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, startAt)

  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)

  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(startAt)
  osc.stop(startAt + duration + 0.05)
}

// Soft chime when a task is completed.
export function playTaskChime() {
  const audio = getCtx()
  if (!audio) return
  const t = audio.currentTime
  playNote(659.25, t, 0.9, 0.12, 'sine') // E5
  playNote(987.77, t + 0.06, 0.9, 0.07, 'sine') // B5
}

// Distinct sparkle for discovering a hidden secret.
export function playSecretChime() {
  const audio = getCtx()
  if (!audio) return
  const t = audio.currentTime
  playNote(1174.66, t, 0.5, 0.09, 'triangle') // D6
  playNote(1567.98, t + 0.08, 0.45, 0.06, 'triangle') // G6
}

// Fuller multi-note flourish for the final reveal.
export function playFinale() {
  const audio = getCtx()
  if (!audio) return
  const t = audio.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51] // C E G C E
  notes.forEach((f, i) => {
    playNote(f, t + i * 0.13, 1.6, 0.11, i % 2 === 0 ? 'sine' : 'triangle')
  })
  // low warm pad underneath
  playNote(130.81, t, 2.2, 0.06, 'sine')
}
