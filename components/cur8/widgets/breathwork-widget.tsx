'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Phase = 'idle' | 'inhale' | 'hold1' | 'exhale' | 'hold2'

const PATTERNS = [
  { name: 'Box Breath', label: '4-4-4-4', inhale: 4, hold1: 4, exhale: 4, hold2: 4, note: 'Calms & resets' },
  { name: '4-7-8', label: '4-7-8', inhale: 4, hold1: 7, exhale: 8, hold2: 0, note: 'Deep calm' },
  { name: 'Quick Reset', label: '4-0-6', inhale: 4, hold1: 0, exhale: 6, hold2: 0, note: 'Fast regulation' },
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
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pattern = PATTERNS[patternIdx]

  function clearTimer() {
    if (intervalRef.current) clearTimeout(intervalRef.current)
  }

  function runPhase(p: Phase, duration: number, next: () => void) {
    setPhase(p)
    setCount(duration)
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
          runPhase('hold2', p.hold2, () => { setCycles((c) => c + 1); startCycle() })
        } else {
          setCycles((c) => c + 1)
          startCycle()
        }
      })
    }
  }

  function toggle() {
    if (active) {
      clearTimer()
      setActive(false)
      setPhase('idle')
      setCount(0)
    } else {
      setActive(true)
      startCycle()
    }
  }

  useEffect(() => () => clearTimer(), [])

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
        {cycles > 0 && active && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 50, backgroundColor: 'rgba(90,158,132,0.2)', color: '#8ec8b4' }}>{cycles} cycles</span>
        )}
      </div>

      {/* Pattern selector */}
      <div style={{ display: 'flex', gap: 5 }}>
        {PATTERNS.map((p, i) => (
          <button key={i} onClick={() => { if (!active) { setPatternIdx(i) } }}
            style={{ flex: 1, padding: '4px 0', borderRadius: 8, fontSize: 9, fontWeight: 700, border: 'none', cursor: active ? 'default' : 'pointer', backgroundColor: patternIdx === i ? 'rgba(90,158,132,0.3)' : 'rgba(245,240,232,0.06)', color: patternIdx === i ? '#8ec8b4' : 'rgba(245,240,232,0.4)', transition: 'all 0.2s' }}>
            {p.label}
          </button>
        ))}
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
