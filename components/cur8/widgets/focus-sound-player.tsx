'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Headphones, Play, Pause, Volume2, VolumeX, X, Waves, Radio, Zap, CloudRain, TreePine } from 'lucide-react'

type SoundId = 'rain' | 'ocean' | 'forest' | 'binaural18' | 'binaural40'

interface SoundDef {
  id: SoundId
  label: string
  hint: string
  icon: React.ElementType
  color: string
}

const SOUNDS: SoundDef[] = [
  { id: 'rain',       label: 'Rain',           hint: 'Drops on a surface',            icon: CloudRain, color: '#6bb7dd' },
  { id: 'ocean',      label: 'Ocean',          hint: 'Waves building and crashing',   icon: Waves,     color: '#5a9e84' },
  { id: 'forest',     label: 'Forest',         hint: 'Wind, leaves & crickets',       icon: TreePine,  color: '#7ab87a' },
  { id: 'binaural18', label: '18Hz beta',      hint: 'Focus beat · headphones',       icon: Radio,     color: '#c9a84c' },
  { id: 'binaural40', label: '40Hz gamma',     hint: 'Clarity beat · headphones',     icon: Zap,       color: '#e6a94f' },
]

export default function FocusSoundPlayer() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [active, setActive] = useState<SoundId>('rain')
  const [volume, setVolume] = useState(0.5)

  // Allow other components (e.g. HomeQuickActions) to open the panel via a custom event
  useEffect(() => {
    function handleOpenEvent() { setOpen(true) }
    window.addEventListener('cur8:openFocusSounds', handleOpenEvent)
    return () => window.removeEventListener('cur8:openFocusSounds', handleOpenEvent)
  }, [])

  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const nodesRef = useRef<AudioNode[]>([])

  // ── Audio engine helpers ──
  function getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctxRef.current = new AC()
      const master = ctxRef.current.createGain()
      master.gain.value = volume
      master.connect(ctxRef.current.destination)
      masterRef.current = master
    }
    return ctxRef.current
  }

  // Build a looping noise buffer shaped for each nature sound
  function makeNoiseBuffer(ctx: AudioContext, type: SoundId): AudioBuffer {
    const seconds = type === 'ocean' ? 12 : 6   // ocean needs longer loop for wave cycle
    const length = ctx.sampleRate * seconds
    const channels = (type === 'ocean' || type === 'forest') ? 2 : 1
    const buffer = ctx.createBuffer(channels, length, ctx.sampleRate)
    const sr = ctx.sampleRate

    for (let ch = 0; ch < channels; ch++) {
      const data = buffer.getChannelData(ch)

      if (type === 'rain') {
        // White noise base with rapid amplitude patter — simulates individual drop impacts
        for (let i = 0; i < length; i++) {
          const patter = 0.55 + 0.45 * Math.abs(Math.sin(i * 0.0031) * Math.sin(i * 0.0071))
          data[i] = (Math.random() * 2 - 1) * patter
        }

      } else if (type === 'ocean') {
        // Brown noise with a dramatic slow LFO swell — wave rises then crashes every ~6s
        let last = 0
        const waveHz = 0.16  // ~one wave every 6.2s
        for (let i = 0; i < length; i++) {
          const w = Math.random() * 2 - 1
          last = (last + 0.022 * w) / 1.022
          // Use pow(sin,2) for sharper crests (more crash-like peak)
          const raw = Math.sin((i / sr) * 2 * Math.PI * waveHz)
          const lfo = 0.15 + 0.85 * Math.max(0, raw * raw)
          data[i] = last * 5.5 * lfo * (ch === 1 ? 0.88 + Math.sin(i * 0.00005) * 0.12 : 1)
        }

      } else if (type === 'forest') {
        // Pink noise body (wind in trees)
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
        for (let i = 0; i < length; i++) {
          const w = Math.random() * 2 - 1
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759
          b2 = 0.969   * b2 + w * 0.153852;  b3 = 0.8665  * b3 + w * 0.3104856
          b4 = 0.55    * b4 + w * 0.5329522; b5 = -0.7616  * b5 - w * 0.016898
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
          b6 = w * 0.115926
        }

      }
    }
    return buffer
  }

  // Build filter chain + extra oscillator nodes for insects (forest only)
  // Returns [filterNodes] — insect oscillators are scheduled separately via scheduleInsects()
  function buildFilters(ctx: AudioContext, type: SoundId): BiquadFilterNode[] {
    if (type === 'rain') {
      // High bandpass + slight high-shelf cut: makes it sound like drops hitting a surface not just hiss
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800; hp.Q.value = 0.5
      const peak = ctx.createBiquadFilter(); peak.type = 'peaking'; peak.frequency.value = 4500; peak.gain.value = 7; peak.Q.value = 0.8
      const hs = ctx.createBiquadFilter(); hs.type = 'highshelf'; hs.frequency.value = 9000; hs.gain.value = -8
      return [hp, peak, hs]
    }
    if (type === 'ocean') {
      // Low-pass keeps rumble; slight boost at 200Hz for the deep crash thud
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.5
      const boom = ctx.createBiquadFilter(); boom.type = 'peaking'; boom.frequency.value = 180; boom.gain.value = 8; boom.Q.value = 1.2
      return [lp, boom]
    }
    if (type === 'forest') {
      // Mid-range peak for rustling leaves
      const peak = ctx.createBiquadFilter(); peak.type = 'peaking'; peak.frequency.value = 2200; peak.gain.value = 5; peak.Q.value = 1.0
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6000
      return [peak, lp]
    }
    return []
  }

  // Schedule cricket/insect chirps — dense overlapping bursts to sound like a real forest
  function scheduleInsects(ctx: AudioContext, dest: AudioNode, duration: number): OscillatorNode[] {
    const oscs: OscillatorNode[] = []
    // Layer 1: rapid cricket trills (short repeated bursts at ~4-5kHz)
    let t = ctx.currentTime + 0.2
    while (t < ctx.currentTime + duration) {
      const gap = 0.08 + Math.random() * 0.55   // much denser: 80–630ms gaps
      t += gap
      const freq = 3600 + Math.random() * 1200   // 3.6–4.8kHz — classic cricket
      const dur  = 0.06 + Math.random() * 0.18
      const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = freq
      const env = ctx.createGain(); env.gain.value = 0
      osc.connect(env); env.connect(dest)
      osc.start(t)
      env.gain.setValueAtTime(0, t)
      env.gain.linearRampToValueAtTime(0.18 + Math.random() * 0.14, t + 0.008) // much louder: 0.18–0.32
      env.gain.setTargetAtTime(0, t + dur * 0.5, 0.018)
      osc.stop(t + dur + 0.06)
      oscs.push(osc)
    }
    // Layer 2: lower cicada drone (~1.8–2.4kHz) — continuous background hum
    let t2 = ctx.currentTime + 0.1
    while (t2 < ctx.currentTime + duration) {
      const gap2 = 0.6 + Math.random() * 1.4
      t2 += gap2
      const freq2 = 1800 + Math.random() * 600
      const dur2  = 0.3 + Math.random() * 0.8
      const osc2 = ctx.createOscillator(); osc2.type = 'sawtooth'; osc2.frequency.value = freq2
      const env2 = ctx.createGain(); env2.gain.value = 0
      osc2.connect(env2); env2.connect(dest)
      osc2.start(t2)
      env2.gain.setValueAtTime(0, t2)
      env2.gain.linearRampToValueAtTime(0.10 + Math.random() * 0.08, t2 + 0.05)
      env2.gain.setTargetAtTime(0, t2 + dur2 * 0.7, 0.06)
      osc2.stop(t2 + dur2 + 0.12)
      oscs.push(osc2)
    }
    return oscs
  }

  // Tear down all currently playing nodes
  const stopNodes = useCallback(() => {
    // Clear insect interval if forest was playing
    if (ctxRef.current) {
      const id = (ctxRef.current as unknown as Record<string,unknown>).__insectInterval
      if (id) { clearInterval(id as ReturnType<typeof setInterval>); delete (ctxRef.current as unknown as Record<string,unknown>).__insectInterval }
    }
    nodesRef.current.forEach((n) => {
      try {
        if ('stop' in n && typeof (n as OscillatorNode).stop === 'function') (n as OscillatorNode).stop()
        n.disconnect()
      } catch {}
    })
    nodesRef.current = []
  }, [])

  // Start a given sound
  const startSound = useCallback((id: SoundId) => {
    const ctx = getCtx()
    if (!ctx || !masterRef.current) return
    if (ctx.state === 'suspended') ctx.resume()
    stopNodes()

    if (id === 'binaural18' || id === 'binaural40') {
      const carrier = 200
      const beat = id === 'binaural40' ? 40 : 18
      const oscL = ctx.createOscillator(); oscL.type = 'sine'; oscL.frequency.value = carrier
      const oscR = ctx.createOscillator(); oscR.type = 'sine'; oscR.frequency.value = carrier + beat
      const panL = ctx.createStereoPanner(); panL.pan.value = -1
      const panR = ctx.createStereoPanner(); panR.pan.value = 1
      const toneGain = ctx.createGain(); toneGain.gain.value = 0.32
      oscL.connect(panL).connect(toneGain)
      oscR.connect(panR).connect(toneGain)
      toneGain.connect(masterRef.current)
      oscL.start(); oscR.start()
      nodesRef.current = [oscL, oscR, panL, panR, toneGain]
    } else {
      const src = ctx.createBufferSource()
      src.buffer = makeNoiseBuffer(ctx, id)
      src.loop = true
      const filters = buildFilters(ctx, id)
      let tail: AudioNode = src
      const all: AudioNode[] = [src]
      filters.forEach((f) => { tail.connect(f); tail = f; all.push(f) })
      tail.connect(masterRef.current)
      src.start()
      // Forest: add insect chirps on top (schedule 60s, rolling)
      if (id === 'forest') {
        const insects = scheduleInsects(ctx, masterRef.current, 60)
        all.push(...insects)
        // Re-schedule every 55s
        const insectInterval = setInterval(() => {
          if (ctx.state === 'closed') { clearInterval(insectInterval); return }
          const more = scheduleInsects(ctx, masterRef.current!, 60)
          nodesRef.current.push(...more)
        }, 55000)
        ;(ctx as unknown as Record<string,unknown>).__insectInterval = insectInterval
      }
      nodesRef.current = all
    }
  }, [stopNodes, volume])

  // React to play/pause + active sound changes
  useEffect(() => {
    if (playing) startSound(active)
    else stopNodes()
  }, [playing, active, startSound, stopNodes])

  // Volume changes
  useEffect(() => {
    if (masterRef.current && ctxRef.current) {
      masterRef.current.gain.setTargetAtTime(volume, ctxRef.current.currentTime, 0.05)
    }
  }, [volume])

  // Cleanup on unmount
  useEffect(() => () => {
    stopNodes()
    if (ctxRef.current) ctxRef.current.close().catch(() => {})
  }, [stopNodes])

  // Hide on auth screens
  if (pathname?.includes('/sign-in') || pathname?.includes('/sign-up')) return null

  // On haven category pages, the toolbar at the top handles opening focus sounds
  // via the cur8:openFocusSounds event — we still render the panel + audio, just
  // not the floating pill button.
  const isHavenPage = !!pathname && pathname.startsWith('/cur8/') && pathname !== '/cur8/'
  const activeDef = SOUNDS.find((s) => s.id === active)!

  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 60, fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif' }}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            style={{ width: 260, marginBottom: 10, borderRadius: 20, backgroundColor: 'rgba(10,30,27,0.96)', backdropFilter: 'blur(20px)', border: '1px solid rgba(245,240,232,0.12)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', padding: 16, color: '#f5f0e8' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Headphones size={14} color="#c9a84c" />
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>Focus sounds</span>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.5)', display: 'flex', padding: 2 }}>
                <X size={14} />
              </button>
            </div>

            {/* Sound choices */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
              {SOUNDS.map((s) => {
                const SIcon = s.icon
                const isActive = active === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => { setActive(s.id); if (!playing) setPlaying(true) }}
                    title={s.hint}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3, padding: '8px 9px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', border: isActive ? `1px solid ${s.color}` : '1px solid rgba(245,240,232,0.1)', backgroundColor: isActive ? `${s.color}22` : 'rgba(245,240,232,0.04)', transition: 'all 0.12s' }}
                  >
                    <SIcon size={13} color={s.color} />
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: '#f5f0e8', lineHeight: 1.2 }}>{s.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Transport + volume */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? 'Pause' : 'Play'}
                style={{ flexShrink: 0, width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: activeDef.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
              >
                {playing ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
              </button>
              <button onClick={() => setVolume((v) => (v > 0 ? 0 : 0.5))} aria-label="Mute" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.6)', display: 'flex', flexShrink: 0 }}>
                {volume > 0 ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                aria-label="Volume"
                style={{ flex: 1, accentColor: activeDef.color, cursor: 'pointer' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating toggle button — hidden on haven pages (toolbar handles it there) */}
      {!isHavenPage && <motion.button
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.92 }}
        aria-label="Focus sounds"
        style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 50, cursor: 'pointer',
          border: playing ? 'none' : '1px solid rgba(201,168,76,0.35)',
          backgroundColor: playing ? activeDef.color : 'rgba(10,30,27,0.96)',
          backdropFilter: 'blur(20px)',
          boxShadow: playing ? '0 6px 24px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.45)',
          color: '#f5f0e8', float: 'right',
        }}
      >
        {playing ? (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ height: ['5px', '15px', '8px', '13px', '5px'] }}
                  transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15, ease: 'easeInOut' }}
                  style={{ width: 3, borderRadius: 2, backgroundColor: '#fff' }}
                />
              ))}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{activeDef.label}</span>
          </>
        ) : (
          <>
            <Headphones size={17} color="#c9a84c" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#c9a84c', whiteSpace: 'nowrap' }}>Focus sounds</span>
          </>
        )}
      </motion.button>}
    </div>
  )
}
