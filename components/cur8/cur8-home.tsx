'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Briefcase, Shirt, Heart, Brain, Clapperboard, FolderOpen, Globe,
  Search, LogOut, Plus, Clock, Leaf, Sparkles, Shuffle, Wind, HelpCircle,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Timer, Calendar, MoreHorizontal,
} from 'lucide-react'
import { useCalmMode } from '@/hooks/use-calm-mode'
import { CATEGORIES, slugFromCategory, type Cur8Item, type Cur8Folder } from '@/lib/cur8-store'
import { useGardenNames } from '@/components/cur8/garden-names-provider'
import { getCur8Data, searchEverything, ensureGuideSaved, type SearchResults } from '@/app/actions/cur8'
import KoiLeap from '@/components/cur8/koi-leap'
import { authClient } from '@/lib/auth-client'
import FloatingParticles from '@/components/cur8/widgets/floating-particles'
import BreathworkWidget from '@/components/cur8/widgets/breathwork-widget'
import FocusTimerWidget from '@/components/cur8/widgets/focus-timer-widget'
import MiniCalendarWidget from '@/components/cur8/widgets/mini-calendar-widget'
import IntentionWidget from '@/components/cur8/widgets/intention-widget'
import { useViewport } from '@/hooks/use-viewport'
import AiHub from '@/components/cur8/ai-hub'
import WordMap from '@/components/cur8/word-map'
import { QuickSave, OneThing } from '@/components/cur8/hub-quick-tools'

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG       = '#0a1e1b'
const SURFACE  = '#0f2722'
const SURFACE2 = '#132e28'
const GOLD     = '#c9a84c'
const GOLD_DIM = 'rgba(201,168,76,0.18)'
const CREAM    = '#f5f0e8'
const MUTED    = 'rgba(245,240,232,0.5)'
const BORDER   = 'rgba(245,240,232,0.08)'
const SAGE     = '#5a9e84'
const CORAL    = '#c85a40'

const KOI: React.CSSProperties = {
  '--c-bg':      BG,
  '--c-surface': SURFACE,
  '--c-gold':    GOLD,
  '--c-cream':   CREAM,
  '--c-muted':   MUTED,
  '--c-border':  BORDER,
  '--c-sage':    SAGE,
  '--c-coral':   CORAL,
} as React.CSSProperties

const ICON_MAP: Record<string, React.ElementType> = {
  'graduation-cap': GraduationCap, briefcase: Briefcase, shirt: Shirt, heart: Heart,
  brain: Brain, sparkles: Sparkles, clapperboard: Clapperboard, 'folder-open': FolderOpen,
}

const TILE_ACCENT: Record<string, string> = {
  YouTube: '#c85a40', TikTok: '#c97a7a', Instagram: '#b06a9c',
  Facebook: '#4a6d78', Articles: '#b8892a', Images: '#5a9e84',
  Documents: '#3a6b8c', Web: '#c9843c',
}

const MOTIVATIONAL = [
  "Still waters hold the deepest thoughts.",
  "Every save is a ripple worth returning to.",
  "Your curiosity is worth curating.",
  "Let your mind settle like a calm pond.",
  "Return to what inspires you.",
  "Small acts of curation, big clarity.",
  "You saved something beautiful today.",
  "Revisit your ideas — let them flow.",
]

// ─── Collapsible section wrapper ──────────────────────────────────────────────
// Uniform expand/collapse behaviour for every home section, matching the look
// of the header used across the hub.
function CollapsibleSection({
  title, meta, description, icon: Icon, prominent, defaultOpen = true,
  padX, bleed, children,
}: {
  title: string
  meta?: string
  description?: string
  icon?: React.ElementType
  prominent?: boolean
  defaultOpen?: boolean
  padX: number
  bleed?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section style={{ padding: `${prominent ? 48 : 42}px 0 0` }}>
      <div style={{ padding: `0 ${padX}px` }}>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 4px', width: '100%', textAlign: 'left' }}
        >
          <div style={{ width: 2, height: prominent ? 26 : 20, backgroundColor: open ? GOLD : 'rgba(245,240,232,0.2)', borderRadius: 2, flexShrink: 0, transition: 'background-color 0.2s' }} />
          {Icon && <Icon size={prominent ? 16 : 14} color={open ? SAGE : MUTED} style={{ flexShrink: 0 }} />}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: prominent ? 26 : 20, fontWeight: 700, color: open ? CREAM : MUTED, margin: 0, letterSpacing: '-0.01em', transition: 'color 0.2s', lineHeight: 1.1 }}>{title}</h2>
            {meta && <span style={{ fontSize: 10, color: MUTED, letterSpacing: '0.04em', lineHeight: 1.2 }}>{meta}</span>}
          </div>
          {open ? <ChevronUp size={16} color={MUTED} style={{ flexShrink: 0 }} /> : <ChevronDown size={16} color={MUTED} style={{ flexShrink: 0 }} />}
        </button>
        {description && open && (
          <p style={{ margin: '6px 0 0', paddingLeft: 13, fontSize: 13, color: MUTED, lineHeight: 1.7, maxWidth: 560 }}>{description}</p>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: bleed ? '18px 0 0' : `18px ${padX}px 0` }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

// ─── Koi Pond widget launcher ─────────────────────────────────────────────────
// Widget orbs rest on a real pond surface. Tapping one sends a koi (coloured to
// match that ritual) leaping out of the water, then the widget opens below.
// Only one widget is ever open at a time — calm and focused.
type PondWidget = 'intention' | 'breathwork' | 'timer' | 'calendar' | null

type PondItem = {
  id: PondWidget & string
  label: string
  icon?: React.ElementType
  image?: string
  color: string
  ripple: string
}

const POND_ITEMS: PondItem[] = [
  { id: 'intention', label: 'Intention',  image: '/cur8/lotus-icon.png', color: '#e29ec4', ripple: 'rgba(226,158,196,0.32)' },
  { id: 'breathwork',label: 'Breathwork', icon: Wind,     color: '#6fc3a2', ripple: 'rgba(111,195,162,0.32)' },
  { id: 'timer',     label: 'Focus',      icon: Timer,    color: '#e6a94f', ripple: 'rgba(230,169,79,0.32)'  },
  { id: 'calendar',  label: 'Calendar',   icon: Calendar, color: '#6bb7dd', ripple: 'rgba(107,183,221,0.32)' },
]

// A small stylised top-down koi that can be tinted any colour.
function PondFish({ color }: { color: string }) {
  return (
    <svg width="46" height="46" viewBox="0 0 64 64" fill="none" aria-hidden>
      {/* body */}
      <path d="M32 5 C41 14, 45 25, 41 41 C39 49, 35 55, 32 59 C29 55, 25 49, 23 41 C19 25, 23 14, 32 5 Z" fill={color} />
      {/* tail fins */}
      <path d="M32 50 C28 57, 23 60, 18 62 C22 55, 25 53, 28 48 Z" fill={color} opacity="0.75" />
      <path d="M32 50 C36 57, 41 60, 46 62 C42 55, 39 53, 36 48 Z" fill={color} opacity="0.75" />
      {/* side fins */}
      <ellipse cx="19" cy="30" rx="6.5" ry="3" fill={color} opacity="0.7" transform="rotate(-28 19 30)" />
      <ellipse cx="45" cy="30" rx="6.5" ry="3" fill={color} opacity="0.7" transform="rotate(28 45 30)" />
      {/* pale marking */}
      <ellipse cx="32" cy="24" rx="4" ry="7" fill="#fff" opacity="0.45" />
      {/* eyes */}
      <circle cx="28.5" cy="14" r="1.7" fill="#0a1e1b" />
      <circle cx="35.5" cy="14" r="1.7" fill="#0a1e1b" />
    </svg>
  )
}

const POND_H_MOBILE = 168
const POND_H_DESKTOP = 190

function KoiPond({ calm, isMobile }: { calm: boolean; isMobile: boolean }) {
  const [active, setActive] = useState<PondWidget>(null)
  const [fish, setFish] = useState<{ id: string; color: string; x: number } | null>(null)
  const pondRef = useRef<HTMLDivElement>(null)
  const pondH = isMobile ? POND_H_MOBILE : POND_H_DESKTOP

  function handleOrb(item: PondItem, buttonEl: HTMLElement) {
    if (active === item.id) { setActive(null); return }
    if (calm) { setActive(item.id); return }
    const pondRect = pondRef.current?.getBoundingClientRect()
    const orbRect = buttonEl.getBoundingClientRect()
    const x = pondRect ? orbRect.left + orbRect.width / 2 - pondRect.left : orbRect.width / 2
    setFish({ id: item.id, color: item.color, x })
    setTimeout(() => { setFish(null); setActive(item.id) }, 680)
  }

  return (
    <div>
      {/* Pond — realistic water surface with floating orbs */}
      <div ref={pondRef} style={{ position: 'relative', width: '100%', height: pondH }}>
        {/* Clipped water image */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 24, overflow: 'hidden', border: `1px solid rgba(111,195,162,0.18)`, boxShadow: 'inset 0 2px 30px rgba(0,0,0,0.35), 0 6px 24px rgba(0,0,0,0.35)' }}>
          <Image src="/cur8/pond-surface.jpg" alt="" fill priority style={{ objectFit: 'cover' }} sizes="900px" />
          {/* Depth + readability overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,40,42,0.42) 0%, rgba(8,32,34,0.58) 100%)' }} />
          {/* Gentle surface shimmer */}
          {!calm && (
            <motion.div
              animate={{ opacity: [0.04, 0.12, 0.04], x: [-10, 10, -10] }}
              transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
              style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 45% at 50% 30%, rgba(150,220,235,0.16) 0%, transparent 70%)', pointerEvents: 'none' }}
            />
          )}
        </div>

        {/* Splash where the fish breaks the surface */}
        <AnimatePresence>
          {fish && !calm && (
            <motion.span
              key={`splash-${fish.id}`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 0.7, 0], scale: [0, 1.5] }}
              transition={{ duration: 0.5, delay: 0.18 }}
              style={{ position: 'absolute', left: fish.x, top: pondH * 0.5, width: 44, height: 15, transform: 'translate(-50%, -50%)', borderRadius: '50%', border: '2px solid rgba(200,235,240,0.75)', zIndex: 3, pointerEvents: 'none' }}
            />
          )}
        </AnimatePresence>

        {/* Leaping koi (coloured to the chosen ritual) */}
        <AnimatePresence>
          {fish && !calm && (
            <motion.div
              key={`fish-${fish.id}`}
              initial={{ y: pondH * 0.52, opacity: 0, scale: 0.5, rotate: 0 }}
              animate={{
                y:       [pondH * 0.52, -52, pondH + 20],
                opacity: [0, 1, 1, 0],
                scale:   [0.5, 1.05, 0.85],
                // 0° = nose up (correct launch). Hold through ascent, tip forward on descent only.
                rotate:  [0, 0, 12, 55],
              }}
              transition={{
                duration: 0.72,
                ease: [0.35, 0, 0.45, 1],
                times: [0, 0.42, 1],
                opacity: { duration: 0.72, times: [0, 0.1, 0.72, 1] },
                rotate:  { duration: 0.72, ease: 'easeIn', times: [0, 0.42, 0.6, 1] },
              }}
              transformTemplate={(_, generated) => `translateX(-50%) scaleY(-1) ${generated}`}
              style={{ position: 'absolute', left: fish.x, top: 0, zIndex: 4, pointerEvents: 'none', willChange: 'transform', filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.4))' }}
            >
              <PondFish color={fish.color} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Orbs overlay (not clipped, so the fish can leap past the edge) */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 8px', gap: isMobile ? 10 : 16 }}>
          {/* "Tap a ritual" — rotated label to the left of the orb grid */}
          <p style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: 0, fontSize: 8.5, color: 'rgba(230,245,248,0.65)', letterSpacing: '0.16em', textTransform: 'uppercase', textShadow: '0 1px 4px rgba(0,0,0,0.6)', flexShrink: 0, userSelect: 'none' }}>
            tap a ritual to begin
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: isMobile ? '10px 14px' : '12px 22px', width: '100%', maxWidth: isMobile ? 240 : 300 }}>
            {POND_ITEMS.map((item, i) => {
              const Icon = item.icon
              const isActive = active === item.id
              const isHidden = fish?.id === item.id // hide the orb while its fish is leaping
              return (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {!calm && !isActive && (
                      <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.45, 0, 0.45] }}
                        transition={{ repeat: Infinity, duration: 2.6 + i * 0.4, delay: i * 0.6 }}
                        style={{ position: 'absolute', width: 56, height: 56, borderRadius: '50%', border: `1.5px solid ${item.ripple}`, pointerEvents: 'none' }}
                      />
                    )}
                    <motion.button
                      onPointerDown={(e) => handleOrb(item, e.currentTarget as HTMLElement)}
                      animate={calm ? undefined : isActive ? { scale: 1.1 } : { y: [0, -4, 0] }}
                      transition={isActive ? { type: 'spring', stiffness: 300 } : { repeat: Infinity, duration: 3 + i * 0.35, ease: 'easeInOut' }}
                      style={{
                        position: 'relative', zIndex: 3,
                        width: 54, height: 54, borderRadius: '50%',
                        backgroundColor: isActive ? item.color : 'rgba(10,32,34,0.55)',
                        border: `2px solid ${isActive ? item.color : `${item.color}88`}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', backdropFilter: 'blur(3px)',
                        boxShadow: isActive ? `0 0 22px ${item.color}66` : `0 3px 12px rgba(0,0,0,0.45)`,
                        opacity: isHidden ? 0 : 1,
                        transition: 'background-color 0.25s, border-color 0.25s, box-shadow 0.25s, opacity 0.15s',
                      }}
                    >
                      {item.image ? (
                        <img src={item.image} alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} />
                      ) : Icon ? (
                        <Icon size={22} color={isActive ? '#0d2420' : '#f5f0e8'} />
                      ) : null}
                    </motion.button>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? item.color : CREAM, letterSpacing: '0.06em', textTransform: 'uppercase', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{item.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Open widget — slides in below the pond */}
      <AnimatePresence>
        {active && (
          <motion.div
            key={active}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            style={{ overflow: 'hidden', marginTop: 12 }}
          >
            <div style={{ borderRadius: 18, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
              {active === 'intention'  && <IntentionWidget />}
              {active === 'breathwork' && <BreathworkWidget />}
              {active === 'timer'      && <FocusTimerWidget />}
              {active === 'calendar'   && <MiniCalendarWidget />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main hub component ───────────────────────────────────��─────��─────�����───────
export default function Cur8Home() {
  const router = useRouter()
  const { isMobile, isTablet } = useViewport()
  const [calm, setCalm] = useCalmMode()
  const { displayName } = useGardenNames()

  const [items,       setItems]       = useState<Cur8Item[]>([])
  const [mounted,     setMounted]     = useState(false)
  const [search,      setSearch]      = useState('')
  const [searching,   setSearching]   = useState(false)
  const [results,     setResults]     = useState<SearchResults | null>(null)
  const [searchOpen,  setSearchOpen]  = useState(false)
  const [activeWord,  setActiveWord]  = useState<string | null>(null)
  const [leap,        setLeap]        = useState<{ href: string; origin: DOMRect } | null>(null)
  const [tabScroll,     setTabScroll]     = useState({ left: false, right: false })
  const [moreOpen,      setMoreOpen]      = useState(false)
  const tabScrollRef  = useRef<HTMLDivElement>(null)

  const pad    = isMobile ? 16 : isTablet ? 32 : 60
  const bentoCols  = isMobile ? '1fr' : '1fr 1fr'
  const smallCols  = isMobile ? 'repeat(2,1fr)' : isTablet ? 'repeat(3,1fr)' : 'repeat(4,1fr)'

  const quote  = MOTIVATIONAL[new Date().getDay() % MOTIVATIONAL.length]
  const hour   = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const recent     = items.filter((i) => i.thumbnail).slice(0, 12)
  const todayCount = items.filter((i) => {
    const d = new Date(i.savedAt); const t = new Date()
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
  }).length

  // Load data
  useEffect(() => {
    setMounted(true)
    ensureGuideSaved().catch(() => {})
    getCur8Data().then((d) => setItems((d.items ?? []) as Cur8Item[])).catch(() => {})
  }, [])

  // Search
  useEffect(() => {
    if (!search.trim()) { setResults(null); return }
    const id = setTimeout(async () => {
      setSearching(true)
      try { setResults(await searchEverything(search.trim())) } catch { setResults(null) }
      finally { setSearching(false) }
    }, 280)
    return () => clearTimeout(id)
  }, [search])

  // Close search on outside click
  useEffect(() => {
    if (!searchOpen) return
    const fn = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!t.closest('[data-search-box]')) setSearchOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [searchOpen])

  function updateTabArrows() {
    const el = tabScrollRef.current
    if (!el) return
    setTabScroll({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
  }
  useEffect(() => { setTimeout(updateTabArrows, 120) }, [mounted])

  function scrollTabs(dir: 1 | -1) {
    tabScrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' })
  }

  function surpriseMe() {
    if (!items.length) return
    const it = items[Math.floor(Math.random() * items.length)]
    window.open(it.url, '_blank', 'noopener,noreferrer')
  }

  function handleHavenClick(e: React.MouseEvent, href: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    if (calm) return
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setLeap({ href, origin: rect })
  }

  // ── Hero pond ripples ──────────────────────────────────────────────────────
  type PondRipple = { id: number; x: number; y: number }
  const [pondRipples, setPondRipples] = useState<PondRipple[]>([])
  const rippleIdRef = useRef(0)

  // ── Hero pond tap — ripple visual + one-shot 5s water sound ───────────────
  function playHeroTap(e: React.PointerEvent<HTMLDivElement>) {
    // Don't intercept clicks on nav buttons, links, or any interactive element
    if ((e.target as HTMLElement).closest('button, a, input, [role="button"]')) return
    // Ripple at tap position
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = ++rippleIdRef.current
    setPondRipples(r => [...r, { id, x, y }])
    // Remove after animation completes (1.8s)
    setTimeout(() => setPondRipples(r => r.filter(rp => rp.id !== id)), 1800)

    // Sound
    const AC = (window.AudioContext || (window as unknown as Record<string, unknown>).webkitAudioContext) as typeof AudioContext | undefined
    if (!AC) return
    const ctx = new AC()
    const sr = ctx.sampleRate
    const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination)
    master.gain.setTargetAtTime(0.32, ctx.currentTime, 0.18)
    master.gain.setTargetAtTime(0, ctx.currentTime + 3.8, 0.55)
    const ambBuf = ctx.createBuffer(1, sr * 3, sr)
    const amb = ambBuf.getChannelData(0); let lv = 0
    for (let i = 0; i < amb.length; i++) { const w = Math.random() * 2 - 1; lv = (lv + 0.01 * w) / 1.01; amb[i] = lv * 1.0 }
    const ambSrc = ctx.createBufferSource(); ambSrc.buffer = ambBuf; ambSrc.loop = true
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 350
    const ag = ctx.createGain(); ag.gain.value = 0.12
    ambSrc.connect(lp); lp.connect(ag); ag.connect(master); ambSrc.start()
    const count = 3 + Math.floor(Math.random() * 3)
    for (let d = 0; d < count; d++) {
      const when = ctx.currentTime + 0.2 + d * (3.5 / count) + Math.random() * 0.4
      const freq = 900 + Math.random() * 1200
      const dropBuf = ctx.createBuffer(1, Math.floor(sr * 0.065), sr)
      const dd = dropBuf.getChannelData(0)
      for (let i = 0; i < dd.length; i++) dd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.013))
      const dSrc = ctx.createBufferSource(); dSrc.buffer = dropBuf
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 18
      const dg = ctx.createGain(); dg.gain.value = 0.32 + Math.random() * 0.2
      dSrc.connect(bp); bp.connect(dg); dg.connect(master); dSrc.start(when)
    }
    setTimeout(() => { try { ambSrc.stop(); ctx.close() } catch {} }, 6200)
  }

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/cur8/sign-in')
  }

  return (
    <div style={{ ...KOI, minHeight: '100vh', backgroundColor: BG, color: CREAM, fontFamily: 'var(--font-sans)', position: 'relative', overflowX: 'hidden' }}>
      <FloatingParticles />
      {leap && (
        <KoiLeap
          active={!!leap}
          origin={leap.origin}
          onComplete={() => { const h = leap.href; setLeap(null); router.push(h) }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          HERO — full-viewport koi pond image
      ══════════════════════════════════════════════════════════════════════ */}
      {/* Ripple keyframe — injected once */}
      <style>{`
        @keyframes pondRipple {
          0%   { transform: translate(-50%,-50%) scale(0);   opacity: 0.55; }
          60%  { opacity: 0.22; }
          100% { transform: translate(-50%,-50%) scale(4.5); opacity: 0; }
        }
        @keyframes pondRipple2 {
          0%   { transform: translate(-50%,-50%) scale(0);   opacity: 0.32; }
          100% { transform: translate(-50%,-50%) scale(3);   opacity: 0; }
        }
      `}</style>

      {/* Tap anywhere on the hero pond image to hear a brief water sound */}
      <div onPointerDown={playHeroTap} style={{ position: 'relative', height: '100svh', minHeight: 520, overflow: 'hidden', cursor: 'default' }}>
        {/* Ripple circles rendered at tap position */}
        {pondRipples.map(rp => (
          <div key={rp.id} style={{ position: 'absolute', left: rp.x, top: rp.y, pointerEvents: 'none', zIndex: 10 }}>
            {/* Outer ring — slow wide expand */}
            <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', border: '1.5px solid rgba(180,240,220,0.7)', animation: 'pondRipple 1.6s ease-out forwards' }} />
            {/* Middle ring — slightly delayed */}
            <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', border: '1px solid rgba(160,230,210,0.55)', animation: 'pondRipple 1.3s ease-out 0.12s forwards' }} />
            {/* Inner ring — fast tight */}
            <div style={{ position: 'absolute', width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(200,248,236,0.8)', animation: 'pondRipple2 0.8s ease-out forwards' }} />
          </div>
        ))}
        {/* Background image */}
          <Image src="/cur8/koi-pond.jpg" alt="" fill priority style={{ objectFit: 'cover', objectPosition: 'center 40%' }} sizes="100vw" />
        {/* Layered dark overlay — richer depth */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(6,18,16,0.55) 0%, rgba(6,18,16,0.35) 40%, rgba(6,18,16,0.82) 80%, rgba(10,30,27,1) 100%)' }} />

        {/* Water movement — light bands drifting across the pond surface */}
        {!calm && (
          <>
            {/* Wide slow band — upper water */}
            <motion.div
              animate={{ x: ['-110%', '140%'] }}
              transition={{ repeat: Infinity, duration: 14, ease: 'linear', delay: 0 }}
              style={{ position: 'absolute', top: '33%', left: 0, width: '45%', height: 6, background: 'linear-gradient(to right, transparent, rgba(180,240,220,0.38), transparent)', filter: 'blur(3px)', pointerEvents: 'none', zIndex: 2 }}
            />
            {/* Narrow faster band — mid water */}
            <motion.div
              animate={{ x: ['-110%', '140%'] }}
              transition={{ repeat: Infinity, duration: 9, ease: 'linear', delay: 3 }}
              style={{ position: 'absolute', top: '47%', left: 0, width: '28%', height: 3, background: 'linear-gradient(to right, transparent, rgba(160,230,210,0.45), transparent)', filter: 'blur(2px)', pointerEvents: 'none', zIndex: 2 }}
            />
            {/* Counter-direction band — lower water */}
            <motion.div
              animate={{ x: ['140%', '-110%'] }}
              transition={{ repeat: Infinity, duration: 18, ease: 'linear', delay: 6 }}
              style={{ position: 'absolute', top: '58%', left: 0, width: '35%', height: 4, background: 'linear-gradient(to right, transparent, rgba(200,245,230,0.30), transparent)', filter: 'blur(2px)', pointerEvents: 'none', zIndex: 2 }}
            />
            {/* Bright glint — small sparkle crossing fast */}
            <motion.div
              animate={{ x: ['-110%', '140%'] }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 1 }}
              style={{ position: 'absolute', top: '41%', left: 0, width: '12%', height: 2, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.55), transparent)', filter: 'blur(1px)', pointerEvents: 'none', zIndex: 2 }}
            />
          </>
        )}

        {/* ── NAV BAR ── */}
        <header style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '18px 20px' : '20px 36px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative', width: 36, height: 36 }}>
              <Image src="/cur8/logo-v2/icon-pair.png" alt="Cur8 logo" fill style={{ objectFit: 'contain' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 20, fontWeight: 700, color: CREAM, letterSpacing: '0.03em' }}>cur8</span>
          </div>

          {/* Nav actions */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, position: 'relative' }}>
            {/* Search — always visible */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '7px 10px' : '8px 16px', borderRadius: 50, fontSize: 12, fontWeight: 500, color: CREAM, background: 'rgba(245,240,232,0.10)', border: '1px solid rgba(245,240,232,0.16)', backdropFilter: 'blur(12px)', cursor: 'pointer' }}
            >
              <Search size={13} />
              {!isMobile && 'Search'}
            </button>

            {/* Desktop: Calm, Nature, Guide inline */}
            {!isMobile && (
              <>
                <button
                  onClick={() => setCalm(!calm)}
                  aria-pressed={calm}
                  title={calm ? 'Calm mode on' : 'Turn on calm mode'}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 50, fontSize: 12, fontWeight: 500, color: calm ? BG : CREAM, background: calm ? SAGE : 'rgba(245,240,232,0.10)', border: `1px solid ${calm ? SAGE : 'rgba(245,240,232,0.16)'}`, backdropFilter: 'blur(12px)', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <Wind size={13} />
                  {calm ? 'Calm on' : 'Calm'}
                </button>

                <Link
                  href="/cur8/guide"
                  title="How to use Cur8"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 50, fontSize: 12, fontWeight: 500, color: CREAM, background: 'rgba(245,240,232,0.10)', border: '1px solid rgba(245,240,232,0.16)', textDecoration: 'none', backdropFilter: 'blur(12px)' }}
                >
                  <HelpCircle size={13} />
                  Guide
                </Link>
              </>
            )}

            {/* Mobile: "..." overflow button for Calm, Sounds, Guide */}
            {isMobile && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-label="More options"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: moreOpen ? SAGE : 'rgba(245,240,232,0.10)', border: `1px solid ${moreOpen ? SAGE : 'rgba(245,240,232,0.18)'}`, backdropFilter: 'blur(12px)', cursor: 'pointer', color: moreOpen ? BG : CREAM }}
                >
                  <MoreHorizontal size={15} />
                </button>

                <AnimatePresence>
                  {moreOpen && (
                    <>
                      {/* Backdrop to close */}
                      <div onClick={() => setMoreOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: -6 }}
                        style={{ position: 'absolute', top: 44, right: 0, zIndex: 50, minWidth: 180, backgroundColor: 'rgba(10,28,24,0.97)', backdropFilter: 'blur(20px)', borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                      >
                        <button
                          onClick={() => { setCalm(!calm); setMoreOpen(false) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', color: calm ? SAGE : CREAM, fontSize: 13, fontWeight: 500, textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}
                        >
                          <Wind size={14} />
                          {calm ? 'Calm mode: on' : 'Calm mode'}
                          {calm && <span style={{ marginLeft: 'auto', fontSize: 10, color: SAGE, fontWeight: 700 }}>ON</span>}
                        </button>
                        <Link
                          href="/cur8/guide"
                          onClick={() => setMoreOpen(false)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '13px 16px', textDecoration: 'none', color: CREAM, fontSize: 13, fontWeight: 500 }}
                        >
                          <HelpCircle size={14} />
                          How to use Cur8
                        </Link>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Sign out — always visible */}
            <button
              onClick={handleSignOut}
              title="Sign out"
              style={{ display: 'flex', alignItems: 'center', padding: '8px', borderRadius: 50, fontSize: 12, color: 'rgba(245,240,232,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <LogOut size={14} />
            </button>
          </nav>
        </header>

        {/* Search dropdown */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              data-search-box
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transformTemplate={(_, generated) => `translateX(-50%) ${generated}`}
              style={{ position: 'absolute', top: 72, left: '50%', width: '92%', maxWidth: 540, zIndex: 20 }}
            >
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search everything — items, notes, reflections…"
                autoFocus
                style={{ width: '100%', padding: '14px 22px', borderRadius: 50, border: `1.5px solid ${BORDER}`, backgroundColor: 'rgba(10,30,27,0.82)', backdropFilter: 'blur(20px)', color: CREAM, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
              {search.trim() && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ marginTop: 8, maxHeight: '60vh', overflowY: 'auto', backgroundColor: 'rgba(10,30,27,0.95)', backdropFilter: 'blur(20px)', borderRadius: 18, border: `1px solid ${BORDER}` }}
                >
                  {searching && (!results || (results.items.length + results.notes.length + results.reflections.length) === 0) ? (
                    <p style={{ fontSize: 12.5, color: MUTED, textAlign: 'center', padding: 18, margin: 0 }}>Searching…</p>
                  ) : results && (results.items.length + results.notes.length + results.reflections.length) === 0 ? (
                    <p style={{ fontSize: 12.5, color: MUTED, textAlign: 'center', padding: 18, margin: 0 }}>Nothing found for &ldquo;{search.trim()}&rdquo;.</p>
                  ) : results && (
                    <>
                      {results.items.length > 0 && (
                        <div>
                          <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, padding: '10px 18px 4px', margin: 0 }}>Saved items</p>
                          {results.items.slice(0, 8).map((item) => (
                            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', textDecoration: 'none', color: CREAM }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 50, backgroundColor: 'rgba(245,240,232,0.1)', color: MUTED, flexShrink: 0 }}>{displayName(item.category)}</span>
                              <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                            </a>
                          ))}
                        </div>
                      )}
                      {results.notes.length > 0 && (
                        <div style={{ borderTop: `1px solid ${BORDER}` }}>
                          <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, padding: '10px 18px 4px', margin: 0 }}>Brain dump notes</p>
                          {results.notes.slice(0, 5).map((n) => (
                            <button key={n.id} onClick={() => { setSearchOpen(false); window.dispatchEvent(new Event('cur8:openBrainDump')) }}
                              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', padding: '9px 18px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: CREAM }}>
                              <Brain size={14} color={GOLD} style={{ flexShrink: 0, marginTop: 1 }} />
                              <span style={{ fontSize: 12.5, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {results.reflections.length > 0 && (
                        <div style={{ borderTop: `1px solid ${BORDER}` }}>
                          <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, padding: '10px 18px 4px', margin: 0 }}>Reflections</p>
                          {results.reflections.slice(0, 5).map((r) => (
                            <Link key={r.id} href={`/cur8/${slugFromCategory(r.category)}`} onClick={() => setSearchOpen(false)}
                              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 18px', textDecoration: 'none', color: CREAM }}>
                              <Leaf size={14} color={SAGE} style={{ flexShrink: 0, marginTop: 1 }} />
                              <span style={{ fontSize: 12.5, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.body}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── HERO TEXT BLOCK ── */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: isMobile ? '0 20px 84px' : `0 ${pad}px 92px` }}>
          <p style={{ margin: '0 0 6px', fontSize: isMobile ? 10 : 11, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD }}>{greeting}, Reveshnee</p>
          <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: isMobile ? 'clamp(28px, 9vw, 40px)' : 'clamp(44px, 5.5vw, 76px)', fontWeight: 700, color: CREAM, lineHeight: 1.05, margin: isMobile ? '0 0 10px' : '0 0 14px', letterSpacing: '-0.02em' }}>
            {"Reveshnee's"}<br />
            <em style={{ fontStyle: 'italic', color: GOLD }}>Haven</em>
          </h1>
          {!isMobile && (
            <p style={{ margin: '0 0 28px', fontSize: 13, color: 'rgba(245,240,232,0.6)', lineHeight: 1.7, maxWidth: 380 }}>
              &ldquo;{quote}&rdquo;
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 14 : 28, flexWrap: 'wrap', marginBottom: isMobile ? 0 : 0 }}>
            {[
              { value: items.length, label: 'saved',  color: CREAM },
              { value: todayCount,   label: 'today',  color: CORAL },
              { value: 8,            label: 'havens', color: SAGE  },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontSize: isMobile ? 22 : 30, fontWeight: 800, color: s.color, fontFamily: 'var(--font-playfair), Georgia, serif', lineHeight: 1 }}>{s.value}</span>
                <span style={{ fontSize: 10, color: MUTED }}>{s.label}</span>
                {i < 2 && <span style={{ marginLeft: isMobile ? 4 : 10, width: 1, height: 18, backgroundColor: 'rgba(245,240,232,0.15)', display: 'inline-block', alignSelf: 'center' }} />}
              </div>
            ))}
            {items.length > 0 && (
              <motion.button
                onClick={surpriseMe}
                whileHover={calm ? undefined : { scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Open a random saved item"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 50, border: `1px solid ${GOLD}`, backgroundColor: GOLD_DIM, color: GOLD, fontSize: 12, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(10px)' }}
              >
                <Shuffle size={13} /> Surprise me
              </motion.button>
            )}
          </div>
        </div>

        {/* Scroll nudge */}
        <motion.div
          animate={calm ? undefined : { y: [0, 7, 0] }}
          transition={{ repeat: Infinity, duration: 2.2 }}
          style={{ position: 'absolute', bottom: 14, right: isMobile ? 20 : pad, display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(245,240,232,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}
        >
          Scroll down <ChevronDown size={13} />
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          HAVEN TAB BAR — sticky
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: 'rgba(10,28,24,0.96)', backdropFilter: 'blur(24px)', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ position: 'relative' }}>
          <AnimatePresence>
            {tabScroll.left && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => scrollTabs(-1)} aria-label="Scroll havens left"
                style={{ position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 3, width: 44, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: 8, border: 'none', cursor: 'pointer', color: CREAM, background: 'linear-gradient(to right, rgba(10,28,24,0.99) 50%, transparent)' }}
              ><ChevronLeft size={18} /></motion.button>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {tabScroll.right && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => scrollTabs(1)} aria-label="Scroll havens right"
                style={{ position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 3, width: 52, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, border: 'none', cursor: 'pointer', color: GOLD, background: 'linear-gradient(to left, rgba(10,28,24,0.99) 50%, transparent)' }}
              >
                <motion.span animate={calm ? undefined : { x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.4 }} style={{ display: 'flex' }}>
                  <ChevronRight size={20} />
                </motion.span>
              </motion.button>
            )}
          </AnimatePresence>
          <div ref={tabScrollRef} onScroll={updateTabArrows}
            style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 20px' }}>
            {CATEGORIES.map((cat) => {
              const Icon = ICON_MAP[cat.lucideIcon]
              const count = items.filter((i) => i.category === cat.name).length
              const accent = TILE_ACCENT[cat.name] ?? SAGE
              return (
                <Link key={cat.name} href={`/cur8/${cat.slug}`}
                  onClick={(e) => handleHavenClick(e, `/cur8/${cat.slug}`)}
                  style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '13px 15px', borderBottom: '2px solid transparent', cursor: 'pointer', transition: 'all 0.15s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.borderBottomColor = accent }}
                    onMouseLeave={e => { e.currentTarget.style.borderBottomColor = 'transparent' }}
                  >
                    {Icon && <Icon size={11} color={accent} />}
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(245,240,232,0.6)', whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>{displayName(cat.name)}</span>
                    {count > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 700, backgroundColor: `${accent}22`, color: accent, borderRadius: 50, padding: '1px 6px', minWidth: 16, textAlign: 'center' }}>{count}</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BODY
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ backgroundColor: BG }}>

        {/* ── QUICK SAVE + ONE THING ── thin row */}
        <div style={{ padding: isMobile ? '20px 20px 0' : `24px ${pad}px 0`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, borderBottom: `1px solid ${BORDER}`, paddingBottom: 20 }}>
          <QuickSave onSaved={(item) => setItems((prev) => [item, ...prev])} />
          <OneThing items={items} />
        </div>

        {/* ── KNOW YOURSELF — AI insights (most prominent section) ── */}
        <CollapsibleSection
          title="Know Yourself"
          icon={Sparkles}
          prominent
          meta="AI across your whole library"
          description="Your AI companion reads everything you have saved and helps you see patterns, ask questions, and deepen understanding — across your whole library."
          padX={pad}
        >
          <AiHub items={items} hideHeader />
        </CollapsibleSection>

        {/* ── THE POND — rituals ── */}
        <CollapsibleSection title="The Pond" icon={Leaf} meta="your daily rituals" padX={pad}>
          <KoiPond calm={calm} isMobile={isMobile} />
        </CollapsibleSection>

        {/* ── RECENTLY VISITED ── */}
        {recent.length > 0 && (
          <CollapsibleSection title="Recently visited" icon={Clock} meta={`${recent.length} items`} padX={pad} bleed>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', paddingLeft: pad, paddingRight: pad }}>
              {recent.map((item, i) => {
                const accent = TILE_ACCENT[item.category] ?? SAGE
                return (
                  <motion.a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={calm ? undefined : { y: -4, scale: 1.02 }}
                    style={{ flexShrink: 0, width: isMobile ? 148 : 172, height: 118, borderRadius: 14, overflow: 'hidden', position: 'relative', textDecoration: 'none', display: 'block', border: `1px solid ${BORDER}` }}
                  >
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', backgroundColor: SURFACE2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Globe size={22} color={accent} />
                      </div>
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,30,27,0.95) 0%, transparent 52%)' }} />
                    <div style={{ position: 'absolute', top: 8, left: 8, width: 5, height: 5, borderRadius: '50%', backgroundColor: accent }} />
                    <p style={{ position: 'absolute', bottom: 8, left: 9, right: 9, fontSize: 10, fontWeight: 600, color: CREAM, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.title}</p>
                  </motion.a>
                )
              })}
            </div>
          </CollapsibleSection>
        )}

        {/* ── YOUR HAVENS ── bento grid */}
        <CollapsibleSection title="Your havens" icon={FolderOpen} meta="8 spaces to curate" padX={pad}>

          {/* 2 large tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: bentoCols, gap: isMobile ? 12 : 16, marginBottom: isMobile ? 12 : 16 }}>
            {CATEGORIES.slice(0, 2).map((cat) => {
              const Icon = ICON_MAP[cat.lucideIcon]
              const count = items.filter((item) => item.category === cat.name).length
              const accent = TILE_ACCENT[cat.name] ?? SAGE
              return (
                <Link key={cat.name} href={`/cur8/${cat.slug}`} onClick={(e) => handleHavenClick(e, `/cur8/${cat.slug}`)} style={{ textDecoration: 'none' }}>
                  <motion.div
                    whileHover={calm ? undefined : { scale: 1.012, y: -2 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    style={{ position: 'relative', height: isMobile ? 200 : 230, borderRadius: 20, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${BORDER}` }}
                  >
                    <Image src={cat.tileImage} alt={displayName(cat.name)} fill style={{ objectFit: 'cover' }} sizes="600px" />
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, rgba(10,30,27,0.1) 0%, rgba(10,30,27,0.90) 100%)` }} />
                    <div style={{ position: 'absolute', top: 16, left: 16, width: 40, height: 40, borderRadius: 12, backgroundColor: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                      {Icon && <Icon size={18} color="#fff" />}
                    </div>
                    <div style={{ position: 'absolute', top: 20, right: 16, fontSize: 10, fontWeight: 700, backgroundColor: 'rgba(10,30,27,0.72)', backdropFilter: 'blur(6px)', color: CREAM, borderRadius: 50, padding: '3px 10px', border: `1px solid ${BORDER}` }}>{count} saved</div>
                    <div style={{ position: 'absolute', bottom: 18, left: 18, right: 18, textAlign: 'center' }}>
                      <h3 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 28, fontWeight: 700, color: CREAM, margin: '0 0 3px', lineHeight: 1.1, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{displayName(cat.name)}</h3>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: accent, margin: '0 0 5px' }}>{cat.area}</p>
                      <p style={{ fontSize: 9.5, color: 'rgba(245,240,232,0.5)', margin: 0 }}>{cat.description}</p>
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </div>

          {/* 6 small tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: smallCols, gap: isMobile ? 10 : 12 }}>
            {CATEGORIES.slice(2).map((cat) => {
              const Icon = ICON_MAP[cat.lucideIcon]
              const count = items.filter((item) => item.category === cat.name).length
              const accent = TILE_ACCENT[cat.name] ?? SAGE
              return (
                <Link key={cat.name} href={`/cur8/${cat.slug}`} onClick={(e) => handleHavenClick(e, `/cur8/${cat.slug}`)} style={{ textDecoration: 'none' }}>
                  <motion.div
                    whileHover={calm ? undefined : { scale: 1.02, y: -2 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    style={{ position: 'relative', height: 140, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${BORDER}`, backgroundColor: SURFACE }}
                  >
                    <Image src={cat.tileImage} alt={displayName(cat.name)} fill style={{ objectFit: 'cover' }} sizes="240px" />
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(150deg, rgba(10,30,27,0.12) 0%, rgba(10,30,27,0.94) 100%)` }} />
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: accent }} />
                    <div style={{ position: 'absolute', top: 13, left: 13, width: 30, height: 30, borderRadius: 9, backgroundColor: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {Icon && <Icon size={13} color="#fff" />}
                    </div>
                    {count > 0 && (
                      <div style={{ position: 'absolute', top: 13, right: 12, fontSize: 9, fontWeight: 700, backgroundColor: `${accent}22`, color: accent, borderRadius: 50, padding: '2px 8px' }}>{count}</div>
                    )}
                    <div style={{ position: 'absolute', bottom: 12, left: 15, right: 10 }}>
                      <h3 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 14, fontWeight: 700, color: CREAM, margin: '0 0 1px', lineHeight: 1.2, textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>{displayName(cat.name)}</h3>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: accent, margin: '0 0 2px' }}>{cat.area}</p>
                      <p style={{ fontSize: 8.5, color: 'rgba(245,240,232,0.45)', margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.description}</p>
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </CollapsibleSection>

        {/* ── WORD MAP ── collapsible */}
        {items.length >= 3 && (
          <CollapsibleSection title="Word map" meta="tap a word to filter across all havens" padX={pad} defaultOpen={false}>
            <WordMap items={items} onFilter={setActiveWord} activeWord={activeWord} />
            {activeWord && (
              <div style={{ marginTop: 14 }}>
                <p style={{ margin: '0 0 8px', fontSize: 11, color: MUTED, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
                  Saves containing &ldquo;{activeWord}&rdquo; — {items.filter(it => `${it.title ?? ''} ${it.description ?? ''}`.toLowerCase().includes(activeWord!)).length} items
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items
                    .filter(it => `${it.title ?? ''} ${it.description ?? ''}`.toLowerCase().includes(activeWord!))
                    .slice(0, 8)
                    .map(it => (
                      <a key={it.id} href={it.url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 12, backgroundColor: GOLD_DIM, border: `1px solid rgba(201,168,76,0.18)`, textDecoration: 'none' }}>
                        <span style={{ flex: 1, fontSize: 12.5, color: CREAM, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
                        <span style={{ flexShrink: 0, fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{it.category}</span>
                      </a>
                    ))}
                </div>
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* ── EMPTY STATE ── */}
        {mounted && items.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ textAlign: 'center', padding: isMobile ? '60px 20px 80px' : `80px ${pad}px 100px` }}
          >
            <div style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: `${SAGE}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: `1px solid ${SAGE}33` }}>
              <Plus size={26} color={SAGE} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 26, fontWeight: 700, color: CREAM, margin: '0 0 10px' }}>Your haven is empty</h2>
            <p style={{ fontSize: 14, color: MUTED, margin: '0 0 28px', lineHeight: 1.6, maxWidth: 340, marginInline: 'auto' }}>
              Open any haven from the tabs above to start saving videos, articles, documents, and more.
            </p>
            <Link href="/cur8/youtube" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 50, backgroundColor: SAGE, color: BG, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
              <Plus size={15} /> Add your first save
            </Link>
          </motion.div>
        )}

        {/* Bottom spacing */}
        <div style={{ height: isMobile ? 60 : 80 }} />
      </div>
    </div>
  )
}
