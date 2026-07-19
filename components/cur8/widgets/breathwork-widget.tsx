'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, VolumeX } from 'lucide-react'
import { useBreathVoice } from '@/hooks/use-speech'

type Phase = 'idle' | 'inhale' | 'hold1' | 'exhale' | 'hold2'

const PATTERNS = [
  {
    name: 'Box Breath', label: '4-4-4-4', inhale: 4, hold1: 4, exhale: 4, hold2: 4,
    note: 'Calms & resets',
    intention: 'Choose this when you feel scattered, anxious, or need to reset before something important.',
  },
  {
    name: '4-7-8', label: '4-7-8', inhale: 4, hold1: 7, exhale: 8, hold2: 0,
    note: 'Deep calm',
    intention: 'Choose this when you need to wind down, release tension, or prepare for sleep.',
  },
  {
    name: 'Quick Reset', label: '4-0-6', inhale: 4, hold1: 0, exhale: 6, hold2: 0,
    note: 'Fast regulation',
    intention: 'Choose this when you are overwhelmed in the moment and need fast relief — no holds required.',
  },
]

const PHASE_LABELS: Record<Phase, string> = {
  idle: 'tap to begin',
  inhale: 'breathe in',
  hold1: 'hold',
  exhale: 'breathe out',
  hold2: 'hold',
}

export default function BreathworkWidget() {
  const [active, setActive] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [count, setCount] = useState(0)
  const [cycles, setCycles] = useState(0)
  const [patternIdx, setPatternIdx] = useState(0)
  const [soundOn, setSoundOn] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { cue, silence, supported: voiceSupported } = useBreathVoice()

  const pattern = PATTERNS[patternIdx]

  function clearTimer() {
    if (intervalRef.current) clearTimeout(intervalRef.current)
  }

  // Soft singing-bowl chime — 3 harmonically related sine tones that decay gently
  function playChime(type: 'cycle' | 'done') {
    const AC = (window.AudioContext || (window as unknown as Record<string, unknown>).webkitAudioContext) as typeof AudioContext | undefined
    if (!AC) return
    const ctx = new AC()
    // done = three tones (root + fifth + octave), cycle = just the root gently
    const tones = type === 'done'
      ? [{ freq: 528, vol: 0.22, delay: 0 }, { freq: 792, vol: 0.14, delay: 0.06 }, { freq: 1056, vol: 0.09, delay: 0.12 }]
      : [{ freq: 528, vol: 0.12, delay: 0 }]
    tones.forEach(({ freq, vol, delay }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, ctx.currentTime + delay)
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.03)
      gain.gain.setTargetAtTime(0, ctx.currentTime + delay + 0.15, type === 'done' ? 0.8 : 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + (type === 'done' ? 4.5 : 2.5))
    })
    // Close context once tones have fully decayed
    setTimeout(() => { try { ctx.close() } catch {} }, type === 'done' ? 6000 : 3500)
  }

  // Spoken guidance for each phase
  const PHASE_CUES: Record<Phase, string> = {
    idle: '',
    inhale: 'Breathe in',
    hold1: 'Hold',
    exhale: 'Breathe out',
    hold2: 'Hold',
  }

  function speakPhase(p: Phase) {
    if (!soundOn || !voiceSupported) return
    const text = PHASE_CUES[p]
    if (text) cue(text)
  }

  function runPhase(p: Phase, duration: number, next: () => void) {
    setPhase(p)
    setCount(duration)
    speakPhase(p)
    let remaining = duration
    const tick = () => {
      remaining--
      if (remaining <= 0) {
        next()
      } else {
        setCount(remaining)
        intervalRef.current = setTimeout(tick, 1000)
      }
    }
    intervalRef.current = setTimeout(tick, 1000)
  }

  function startCycle() {
    const p = PATTERNS[patternIdx]
    runPhase('inhale', p.inhale, () => {
      if (p.hold1 > 0) {
        runPhase('hold1', p.hold1, () => runExhale())
      } else {
        runExhale()
      }
    })

    function runExhale() {
      runPhase('exhale', p.exhale, () => {
        if (p.hold2 > 0) {
          runPhase('hold2', p.hold2, () => {
            setCycles((c) => c + 1)
            if (soundOn) playChime('cycle')
            startCycle()
          })
        } else {
          setCycles((c) => c + 1)
          if (soundOn) playChime('cycle')
          startCycle()
        }
      })
    }
  }

  function toggle() {
    if (active) {
      clearTimer()
      silence()
      setActive(false)
      setPhase('idle')
      setCount(0)
      // Play completion chime if at least one cycle finished
      if (soundOn && cycles > 0) playChime('done')
    } else {
      setActive(true)
      startCycle()
    }
  }

  // Silence any spoken cue immediately when the user mutes mid-session
  useEffect(() => {
    if (!soundOn) silence()
  }, [soundOn, silence])

  useEffect(() => () => {
    clearTimer()
    silence()
  }, [silence])

  // Circle scale & colour per phase
  const circleScale = phase === 'inhale' ? 1.28 : phase === 'exhale' ? 0.78 : 1.05
  const phaseDuration = phase === 'inhale' ? pattern.inhale : phase === 'exhale' ? pattern.exhale : phase === 'hold1' ? pattern.hold1 : phase === 'hold2' ? pattern.hold2 : 0.3
  const circleColor = phase === 'inhale' ? '#5a9e84' : phase === 'exhale' ? '#c9a84c' : '#8ec8b4'

  return (
    <div style={{ backgroundColor: 'rgba(13,36,32,0.7)', backdropFilter: 'blur(16px)', borderRadius: 20, padding: '18px 20px', border: '1px solid rgba(245,240,232,0.10)', width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)', margin: 0 }}>Nervous system</p>
          <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 14, fontWeight: 600, color: '#f5f0e8', margin: 0 }}>Breathwork</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {cycles > 0 && active && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 50, backgroundColor: 'rgba(90,158,132,0.2)', color: '#8ec8b4' }}>{cycles} cycles</span>
          )}
          <button
            onClick={() => setSoundOn((s) => !s)}
            aria-label={soundOn ? 'Mute breathing sounds' : 'Unmute breathing sounds'}
            title={soundOn ? 'Sound on' : 'Sound off'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: soundOn ? '#8ec8b4' : 'rgba(245,240,232,0.35)', display: 'flex', alignItems: 'center', padding: 2 }}
          >
            {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
        </div>
      </div>

      {/* Pattern selector — numbered cards */}
      <div style={{ display: 'flex', gap: 6 }}>
        {PATTERNS.map((p, i) => {
          const selected = patternIdx === i
          return (
            <button key={i} onClick={() => { if (!active) setPatternIdx(i) }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '7px 4px 8px', borderRadius: 10, border: `1px solid ${selected ? 'rgba(90,158,132,0.55)' : 'rgba(245,240,232,0.08)'}`,
                backgroundColor: selected ? 'rgba(90,158,132,0.18)' : 'rgba(245,240,232,0.04)',
                cursor: active ? 'default' : 'pointer', transition: 'all 0.2s', textAlign: 'center',
              }}>
              {/* Number badge */}
              <span style={{
                width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 800, lineHeight: 1,
                backgroundColor: selected ? '#5a9e84' : 'rgba(245,240,232,0.12)',
                color: selected ? '#f5f0e8' : 'rgba(245,240,232,0.45)',
                flexShrink: 0,
              }}>{i + 1}</span>
              {/* Timing label */}
              <span style={{ fontSize: 9, fontWeight: 700, color: selected ? '#8ec8b4' : 'rgba(245,240,232,0.5)', letterSpacing: '0.04em' }}>{p.label}</span>
              {/* Intention */}
              <span style={{ fontSize: 8, color: selected ? 'rgba(245,240,232,0.72)' : 'rgba(245,240,232,0.3)', lineHeight: 1.35, marginTop: 1 }}>
                {p.intention}
              </span>
            </button>
          )
        })}
      </div>

      {/* Breathing circle */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', width: 90, height: 90, cursor: 'pointer' }} onClick={toggle}>
          {/* Outer glow ring */}
          <motion.div
            animate={{ scale: active ? circleScale : 1, opacity: active ? 0.35 : 0.15 }}
            transition={{ duration: phaseDuration, ease: active ? (phase === 'inhale' ? 'easeIn' : 'easeOut') : 'easeInOut' }}
            style={{ position: 'absolute', inset: -10, borderRadius: '50%', backgroundColor: circleColor, filter: 'blur(16px)' }}
          />
          {/* Main circle */}
          <motion.div
            animate={{ scale: active ? circleScale : 1 }}
            transition={{ duration: phaseDuration, ease: active ? (phase === 'inhale' ? 'easeIn' : 'easeOut') : 'easeInOut' }}
            style={{ position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: 'rgba(13,36,32,0.8)', border: `2px solid ${circleColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0 }}
          >
            <AnimatePresence mode="wait">
              <motion.p key={phase}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                style={{ fontSize: 9, fontWeight: 700, color: 'rgba(245,240,232,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                {PHASE_LABELS[phase]}
              </motion.p>
            </AnimatePresence>
            {active && count > 0 && (
              <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 22, fontWeight: 700, color: '#f5f0e8', margin: 0, lineHeight: 1 }}>{count}</p>
            )}
          </motion.div>
        </div>

        <p style={{ fontSize: 10, color: 'rgba(245,240,232,0.45)', margin: 0, textAlign: 'center' }}>
          {active ? pattern.name : `${pattern.name} · ${pattern.note}`}
        </p>
      </div>
    </div>
  )
}
