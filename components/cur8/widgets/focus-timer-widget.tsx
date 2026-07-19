'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const PRESETS = [
  { label: '5 min', seconds: 300, color: '#8ec8b4' },
  { label: '15 min', seconds: 900, color: '#5a9e84' },
  { label: '25 min', seconds: 1500, color: '#c9a84c' },
  { label: '45 min', seconds: 2700, color: '#c85a40' },
]

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

// Soft singing-bowl chime — same as breathwork widget
function playChime() {
  const AC = (window.AudioContext || (window as unknown as Record<string, unknown>).webkitAudioContext) as typeof AudioContext | undefined
  if (!AC) return
  const ctx = new AC()
  const tones = [
    { freq: 528, vol: 0.22, delay: 0 },
    { freq: 792, vol: 0.14, delay: 0.06 },
    { freq: 1056, vol: 0.09, delay: 0.12 },
  ]
  tones.forEach(({ freq, vol, delay }) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, ctx.currentTime + delay)
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.03)
    gain.gain.setTargetAtTime(0, ctx.currentTime + delay + 0.15, 0.8)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime + delay)
    osc.stop(ctx.currentTime + delay + 4.5)
  })
  setTimeout(() => { try { ctx.close() } catch {} }, 6000)
}

export default function FocusTimerWidget() {
  const [presetIdx, setPresetIdx] = useState(2) // default 25 min
  const [remaining, setRemaining] = useState(PRESETS[2].seconds)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const preset = PRESETS[presetIdx]
  const progress = 1 - remaining / preset.seconds
  const circumference = 2 * Math.PI * 36

  function start() {
    setRunning(true)
    setDone(false)
  }
  function pause() { setRunning(false) }
  function reset() {
    setRunning(false)
    setDone(false)
    setRemaining(preset.seconds)
  }
  function selectPreset(i: number) {
    setRunning(false)
    setDone(false)
    setPresetIdx(i)
    setRemaining(PRESETS[i].seconds)
  }

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            setRunning(false)
            setDone(true)
            playChime()
            return 0
          }
          return r - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  // Sync remaining when preset changes
  useEffect(() => {
    if (!running) setRemaining(preset.seconds)
  }, [presetIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ backgroundColor: 'rgba(13,36,32,0.7)', backdropFilter: 'blur(16px)', borderRadius: 20, padding: '18px 20px', border: '1px solid rgba(245,240,232,0.10)', width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)', margin: 0 }}>Focus</p>
        <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 14, fontWeight: 600, color: '#f5f0e8', margin: 0 }}>Flow Timer</p>
      </div>

      {/* Preset row */}
      <div style={{ display: 'flex', gap: 5 }}>
        {PRESETS.map((p, i) => (
          <button key={i} onClick={() => selectPreset(i)}
            style={{ flex: 1, padding: '4px 0', borderRadius: 8, fontSize: 9, fontWeight: 700, border: 'none', cursor: 'pointer', backgroundColor: presetIdx === i ? `${p.color}33` : 'rgba(245,240,232,0.06)', color: presetIdx === i ? p.color : 'rgba(245,240,232,0.4)', transition: 'all 0.2s' }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Ring + time */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', width: 90, height: 90 }}>
          <svg width="90" height="90" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
            <circle cx="45" cy="45" r="36" fill="none" stroke="rgba(245,240,232,0.07)" strokeWidth="3" />
            <motion.circle
              cx="45" cy="45" r="36" fill="none"
              stroke={preset.color} strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: circumference * (1 - progress) }}
              transition={{ duration: 0.5, ease: 'linear' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {done ? (
              <motion.p initial={{ scale: 0.7 }} animate={{ scale: 1 }}
                style={{ fontSize: 11, fontWeight: 700, color: preset.color, margin: 0, textAlign: 'center', lineHeight: 1.2 }}>
                done!
              </motion.p>
            ) : (
              <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 17, fontWeight: 700, color: '#f5f0e8', margin: 0 }}>{fmt(remaining)}</p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8 }}>
          {!running ? (
            <button onClick={start}
              style={{ padding: '5px 18px', borderRadius: 50, fontSize: 10, fontWeight: 700, backgroundColor: preset.color, color: '#0d2420', border: 'none', cursor: 'pointer' }}>
              {remaining === preset.seconds ? 'Start' : 'Resume'}
            </button>
          ) : (
            <button onClick={pause}
              style={{ padding: '5px 18px', borderRadius: 50, fontSize: 10, fontWeight: 700, backgroundColor: 'rgba(245,240,232,0.12)', color: '#f5f0e8', border: 'none', cursor: 'pointer' }}>
              Pause
            </button>
          )}
          <button onClick={reset}
            style={{ padding: '5px 14px', borderRadius: 50, fontSize: 10, fontWeight: 700, backgroundColor: 'rgba(245,240,232,0.06)', color: 'rgba(245,240,232,0.5)', border: 'none', cursor: 'pointer' }}>
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}
