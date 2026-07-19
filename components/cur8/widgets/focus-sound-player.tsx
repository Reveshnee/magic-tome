'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Headphones, Play, Pause, Volume2, VolumeX, X, Waves, Radio, Zap, CloudRain, Droplets, Wind, Music } from 'lucide-react'

type SoundId = 'rain' | 'ocean' | 'brown' | 'pond' | 'hz432' | 'binaural18' | 'binaural40' | 'binaural2'

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
  { id: 'brown',      label: 'Brown noise',    hint: 'Deep calming rumble',           icon: Wind,      color: '#c85a40' },
  { id: 'pond',       label: 'Pond drips',     hint: 'Water drops on still water',    icon: Droplets,  color: '#8ec8b4' },
  { id: 'hz432',      label: '432 Hz',         hint: 'Healing tone · calming',        icon: Music,     color: '#b89fd8' },
  { id: 'binaural2',  label: '2Hz delta',      hint: 'Deep rest beat · headphones',   icon: Radio,     color: '#7b9fd4' },
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
    const channels = type === 'ocean' ? 2 : 1
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

      } else if (type === 'brown') {
        // Brown (red) noise — deep low-frequency rumble
        let last = 0
        for (let i = 0; i < length; i++) {
          const w = Math.random() * 2 - 1
          last = (last + 0.02 * w) / 1.02
          data[i] = last * 3.5
        }

      } else if (type === 'pond') {
        // Sparse ambient — very quiet low rumble; actual drops scheduled via schedulePondDrops
        let last = 0
        for (let i = 0; i < length; i++) {
          const w = Math.random() * 2 - 1; last = (last + 0.01 * w) / 1.01; data[i] = last * 0.8
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
    if (type === 'brown') {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700
      return [lp]
    }
    if (type === 'pond') {
      // Gentle lowpass on the ambient rumble layer
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380
      return [lp]
    }
    return []
  }

  // Schedule resonant water-drop plonks for the pond sound
  function schedulePondDrops(ctx: AudioContext, dest: AudioNode, duration: number): AudioBufferSourceNode[] {
    const nodes: AudioBufferSourceNode[] = []
    const sr = ctx.sampleRate
    let t = ctx.currentTime + 0.4
    while (t < ctx.currentTime + duration) {
      const gap = 0.5 + Math.random() * 2.8   // sparse: 0.5–3.3s between drops
      t += gap
      const dropBuf = ctx.createBuffer(1, Math.floor(sr * 0.07), sr)
      const d = dropBuf.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.013))
      const src = ctx.createBufferSource(); src.buffer = dropBuf
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900 + Math.random() * 1400; bp.Q.value = 20
      const g = ctx.createGain(); g.gain.value = 0.28 + Math.random() * 0.22
      src.connect(bp); bp.connect(g); g.connect(dest)
      src.start(t)
      nodes.push(src)
      // Optional small ripple echo ~70ms later
      if (Math.random() < 0.35) {
        const src2 = ctx.createBufferSource(); src2.buffer = dropBuf
        const bp2 = ctx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = bp.frequency.value * 0.75; bp2.Q.value = 16
        const g2 = ctx.createGain(); g2.gain.value = 0.12
        src2.connect(bp2); bp2.connect(g2); g2.connect(dest)
        src2.start(t + 0.065 + Math.random() * 0.05)
        nodes.push(src2)
      }
    }
    return nodes
  }

  // Tear down all currently playing nodes
  const stopNodes = useCallback(() => {
    // Clear any rolling scheduler interval
    if (ctxRef.current) {
      const id = (ctxRef.current as unknown as Record<string,unknown>).__soundInterval
      if (id) { clearInterval(id as ReturnType<typeof setInterval>); delete (ctxRef.current as unknown as Record<string,unknown>).__soundInterval }
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

    if (id === 'binaural18' || id === 'binaural40' || id === 'binaural2') {
      // Binaural beat — L/R pure tones separated by the beat frequency
      const carrier = 200
      const beat = id === 'binaural40' ? 40 : id === 'binaural18' ? 18 : 2
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

    } else if (id === 'hz432') {
      // 432 Hz healing tone — root + perfect fifth (648 Hz) as soft sustained sine waves
      const toneGain = ctx.createGain(); toneGain.gain.value = 0.18
      toneGain.connect(masterRef.current)
      const freqs = [432, 648, 864]  // root, fifth, octave
      const vols  = [1.0, 0.55, 0.28]
      const oscs: OscillatorNode[] = freqs.map((freq, i) => {
        const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq
        const g = ctx.createGain(); g.gain.value = vols[i]
        // Slow tremolo on each harmonic for warmth
        const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.12 + i * 0.07
        const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.04
        lfo.connect(lfoGain); lfoGain.connect(g.gain)
        osc.connect(g); g.connect(toneGain)
        osc.start(); lfo.start()
        return osc
      })
      nodesRef.current = [...oscs, toneGain]

    } else if (id === 'pond') {
      // Ambient rumble + scheduled water drop plonks
      const src = ctx.createBufferSource()
      src.buffer = makeNoiseBuffer(ctx, id)
      src.loop = true
      const filters = buildFilters(ctx, id)
      let tail: AudioNode = src
      const all: AudioNode[] = [src]
      filters.forEach((f) => { tail.connect(f); tail = f; all.push(f) })
      tail.connect(masterRef.current)
      src.start()
      // Schedule pond drops in rolling 30s windows
      const drops = schedulePondDrops(ctx, masterRef.current, 30)
      all.push(...drops)
      const soundInterval = setInterval(() => {
        if (ctx.state === 'closed') { clearInterval(soundInterval); return }
        const more = schedulePondDrops(ctx, masterRef.current!, 30)
        nodesRef.current.push(...more)
      }, 27000)
      ;(ctx as unknown as Record<string,unknown>).__soundInterval = soundInterval
      nodesRef.current = all

    } else {
      // Noise-based sounds: rain, ocean, brown
      const src = ctx.createBufferSource()
      src.buffer = makeNoiseBuffer(ctx, id)
      src.loop = true
      const filters = buildFilters(ctx, id)
      let tail: AudioNode = src
      const all: AudioNode[] = [src]
      filters.forEach((f) => { tail.connect(f); tail = f; all.push(f) })
      tail.connect(masterRef.current)
      src.start()
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
