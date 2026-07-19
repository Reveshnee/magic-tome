'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Briefcase, Shirt, Heart, Brain, Clapperboard, FolderOpen, Globe,
  Search, LogOut, Plus, Clock, Leaf, Sparkles, Shuffle, Wind, HelpCircle,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Timer, Calendar, X,
} from 'lucide-react'
import { useCalmMode } from '@/hooks/use-calm-mode'
import { CATEGORIES, type Cur8Item, type Cur8Folder } from '@/lib/cur8-store'
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
  "Tend your garden, tend your mind.",
  "Every link saved is a seed planted.",
  "Your curiosity is worth curating.",
  "A tended garden never runs dry.",
  "Return to what inspires you.",
  "Small acts of curation, big clarity.",
  "You saved something beautiful today.",
  "Water your ideas — revisit them often.",
]

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionLabel({ children, sub, prominent }: { children: React.ReactNode; sub?: string; prominent?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: prominent ? 10 : 20 }}>
      <div style={{ width: 2, height: prominent ? 26 : 20, backgroundColor: GOLD, borderRadius: 2, flexShrink: 0, alignSelf: 'center' }} />
      <h2 style={{
        fontFamily: 'var(--font-playfair), Georgia, serif',
        fontSize: prominent ? 26 : 20,
        fontWeight: 700, color: CREAM, margin: 0, letterSpacing: '-0.01em',
      }}>{children}</h2>
      {sub && <span style={{ fontSize: 11, color: MUTED, letterSpacing: '0.04em', marginLeft: 2 }}>{sub}</span>}
    </div>
  )
}

// ─── Koi Pond widget launcher ─────────────────────────────────────────────────
// Four widget orbs float in an oval "pond". Tapping one leaps a koi and opens
// the widget. Only one widget is ever open at a time — calm and focused.
type PondWidget = 'intention' | 'breathwork' | 'timer' | 'calendar' | null

const POND_ITEMS: { id: PondWidget & string; label: string; icon: React.ElementType; color: string; ripple: string }[] = [
  { id: 'intention', label: 'Intention',  icon: Brain,    color: '#c9a84c', ripple: 'rgba(201,168,76,0.25)' },
  { id: 'breathwork',label: 'Breathwork', icon: Wind,     color: '#5a9e84', ripple: 'rgba(90,158,132,0.25)' },
  { id: 'timer',     label: 'Focus',      icon: Timer,    color: '#c85a40', ripple: 'rgba(200,90,64,0.25)'  },
  { id: 'calendar',  label: 'Calendar',   icon: Calendar, color: '#3a6b8c', ripple: 'rgba(58,107,140,0.25)' },
]

function KoiPond({ calm }: { calm: boolean }) {
  const [active, setActive] = useState<PondWidget>(null)
  const [leaping, setLeaping] = useState<PondWidget>(null)

  function handleOrb(id: PondWidget) {
    if (active === id) { setActive(null); return }
    setLeaping(id)
    setTimeout(() => { setLeaping(null); setActive(id) }, 420)
  }

  return (
    <div>
      {/* Pond — oval water surface */}
      <div style={{
        position: 'relative',
        width: '100%',
        background: 'radial-gradient(ellipse 80% 100% at 50% 60%, #0d3530 0%, #091e1a 60%, #0a1e1b 100%)',
        borderRadius: '50% 50% 46% 46% / 34% 34% 66% 66%',
        border: `1px solid rgba(90,158,132,0.18)`,
        boxShadow: 'inset 0 -8px 32px rgba(0,0,0,0.4), 0 2px 0 rgba(90,158,132,0.12)',
        padding: '28px 16px 36px',
        overflow: 'hidden',
      }}>
        {/* Water shimmer */}
        {!calm && (
          <motion.div
            animate={{ opacity: [0.06, 0.14, 0.06] }}
            transition={{ repeat: Infinity, duration: 3.5 }}
            style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(90,200,160,0.15) 0%, transparent 70%)', pointerEvents: 'none' }}
          />
        )}

        {/* The 4 orbs */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
          {POND_ITEMS.map((item, i) => {
            const Icon = item.icon
            const isActive = active === item.id
            const isLeaping = leaping === item.id

            return (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                {/* Ripple ring */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!calm && !isActive && (
                    <motion.div
                      animate={{ scale: [1, 1.55, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ repeat: Infinity, duration: 2.4 + i * 0.4, delay: i * 0.6 }}
                      style={{ position: 'absolute', width: 58, height: 58, borderRadius: '50%', border: `1.5px solid ${item.ripple}`, pointerEvents: 'none' }}
                    />
                  )}
                  {/* Orb */}
                  <motion.button
                    onClick={() => handleOrb(item.id)}
                    animate={calm ? undefined : isLeaping ? { y: [-60, 0], scale: [0.7, 1.1, 1] } : isActive ? { scale: 1.12 } : { y: [0, -5, 0] }}
                    transition={isLeaping
                      ? { duration: 0.42, ease: 'easeOut' }
                      : isActive ? { type: 'spring', stiffness: 300 }
                      : { repeat: Infinity, duration: 2.8 + i * 0.35, ease: 'easeInOut' }}
                    style={{
                      position: 'relative', zIndex: 3,
                      width: 56, height: 56, borderRadius: '50%',
                      backgroundColor: isActive ? item.color : `${item.color}22`,
                      border: `2px solid ${isActive ? item.color : `${item.color}44`}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', boxShadow: isActive ? `0 0 20px ${item.color}55` : `0 2px 12px rgba(0,0,0,0.4)`,
                      transition: 'background-color 0.25s, border-color 0.25s, box-shadow 0.25s',
                    }}
                  >
                    <Icon size={22} color={isActive ? '#0d2420' : item.color} />
                  </motion.button>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? item.color : MUTED, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{item.label}</span>
              </div>
            )
          })}
        </div>

        {/* Pond edge label */}
        <p style={{ textAlign: 'center', margin: '16px 0 0', fontSize: 10, color: `rgba(90,158,132,0.5)`, letterSpacing: '0.1em', textTransform: 'uppercase', position: 'relative', zIndex: 2 }}>
          tap a ritual to begin
        </p>
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
            style={{ overflow: 'hidden', marginTop: 10 }}
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

// ─── Main hub component ───────────────────────────────────────────────────────
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
  const [wordMapOpen, setWordMapOpen] = useState(false)
  const [activeWord,  setActiveWord]  = useState<string | null>(null)
  const [recentOpen,  setRecentOpen]  = useState(true)
  const [leap,        setLeap]        = useState<{ href: string; origin: DOMRect } | null>(null)
  const [tabScroll,   setTabScroll]   = useState({ left: false, right: false })
  const tabScrollRef = useRef<HTMLDivElement>(null)

  const pad    = isTablet ? 32 : 60
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
      <div style={{ position: 'relative', height: '100svh', minHeight: 520, overflow: 'hidden' }}>
        {/* Background image */}
        <Image src="/cur8/pond-hero.jpg" alt="" fill priority style={{ objectFit: 'cover', objectPosition: 'center 40%' }} sizes="100vw" />
        {/* Layered dark overlay — richer depth */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(6,18,16,0.55) 0%, rgba(6,18,16,0.35) 40%, rgba(6,18,16,0.82) 80%, rgba(10,30,27,1) 100%)' }} />

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
          <nav style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10 }}>
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '7px 10px' : '8px 16px', borderRadius: 50, fontSize: 12, fontWeight: 500, color: CREAM, background: 'rgba(245,240,232,0.10)', border: '1px solid rgba(245,240,232,0.16)', backdropFilter: 'blur(12px)', cursor: 'pointer' }}
            >
              <Search size={13} />
              {!isMobile && 'Search'}
            </button>

            <button
              onClick={() => setCalm(!calm)}
              aria-pressed={calm}
              title={calm ? 'Calm mode on' : 'Turn on calm mode'}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '7px 10px' : '8px 14px', borderRadius: 50, fontSize: 12, fontWeight: 500, color: calm ? BG : CREAM, background: calm ? SAGE : 'rgba(245,240,232,0.10)', border: `1px solid ${calm ? SAGE : 'rgba(245,240,232,0.16)'}`, backdropFilter: 'blur(12px)', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <Wind size={13} />
              {!isMobile && (calm ? 'Calm on' : 'Calm')}
            </button>

            <Link
              href="/cur8/guide"
              title="How to use Cur8"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '7px 10px' : '8px 14px', borderRadius: 50, fontSize: 12, fontWeight: 500, color: CREAM, background: 'rgba(245,240,232,0.10)', border: '1px solid rgba(245,240,232,0.16)', textDecoration: 'none', backdropFilter: 'blur(12px)' }}
            >
              <HelpCircle size={13} />
              {!isMobile && 'Guide'}
            </Link>

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
                            <Link key={r.id} href={`/cur8/${r.category.toLowerCase()}`} onClick={() => setSearchOpen(false)}
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
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD }}>{greeting}, Reveshnee</p>
          <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 'clamp(40px, 5.5vw, 76px)', fontWeight: 700, color: CREAM, lineHeight: 1.0, margin: '0 0 14px', letterSpacing: '-0.02em' }}>
            {"Reveshnee's"}<br />
            <em style={{ fontStyle: 'italic', color: GOLD }}>Haven</em>
          </h1>
          <p style={{ margin: '0 0 28px', fontSize: 13, color: 'rgba(245,240,232,0.6)', lineHeight: 1.7, maxWidth: 380 }}>
            &ldquo;{quote}&rdquo;
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 18 : 28, flexWrap: 'wrap' }}>
            {[
              { value: items.length, label: 'saved',  color: CREAM },
              { value: todayCount,   label: 'today',  color: CORAL },
              { value: 8,            label: 'havens', color: SAGE  },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 30, fontWeight: 800, color: s.color, fontFamily: 'var(--font-playfair), Georgia, serif', lineHeight: 1 }}>{s.value}</span>
                <span style={{ fontSize: 11, color: MUTED }}>{s.label}</span>
                {i < 2 && <span style={{ marginLeft: isMobile ? 6 : 10, width: 1, height: 22, backgroundColor: 'rgba(245,240,232,0.15)', display: 'inline-block', alignSelf: 'center' }} />}
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
                <Link key={cat.name} href={`/cur8/${cat.name.toLowerCase()}`}
                  onClick={(e) => handleHavenClick(e, `/cur8/${cat.name.toLowerCase()}`)}
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
        <section style={{ padding: isMobile ? '44px 20px 0' : `52px ${pad}px 0` }}>
          <div style={{ marginBottom: 8 }}>
            <SectionLabel prominent>Know Yourself</SectionLabel>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: MUTED, lineHeight: 1.7, maxWidth: 540 }}>
              Your AI companion reads everything you have saved and helps you see patterns, ask questions, and deepen understanding — across your whole library.
            </p>
          </div>
          <AiHub items={items} />
        </section>

        {/* ── THE POND — rituals ── */}
        <section style={{ padding: isMobile ? '48px 20px 0' : `52px ${pad}px 0` }}>
          <SectionLabel sub="your daily rituals">The Pond</SectionLabel>
          <KoiPond calm={calm} />
        </section>

        {/* ── RECENTLY VISITED ── collapsible */}
        {recent.length > 0 && (
          <section style={{ padding: isMobile ? '44px 0 0' : `48px 0 0` }}>
            <div style={{ padding: isMobile ? '0 20px' : `0 ${pad}px`, marginBottom: recentOpen ? 0 : 0 }}>
              <button
                onClick={() => setRecentOpen((o) => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 20px', width: '100%', textAlign: 'left' }}
              >
                <div style={{ width: 2, height: 20, backgroundColor: recentOpen ? GOLD : 'rgba(245,240,232,0.2)', borderRadius: 2, flexShrink: 0 }} />
                <Clock size={14} color={recentOpen ? SAGE : MUTED} style={{ flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 20, fontWeight: 700, color: recentOpen ? CREAM : MUTED, transition: 'color 0.2s' }}>
                  Recently visited
                </span>
                <span style={{ fontSize: 11, color: MUTED, letterSpacing: '0.04em', flex: 1 }}>{recent.length} items</span>
                {recentOpen ? <ChevronUp size={15} color={MUTED} /> : <ChevronDown size={15} color={MUTED} />}
              </button>
            </div>

            <AnimatePresence>
              {recentOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
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
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* ── YOUR HAVENS ── bento grid */}
        <section style={{ padding: isMobile ? '44px 20px 0' : `52px ${pad}px 0` }}>
          <SectionLabel sub="8 spaces to curate">Your havens</SectionLabel>

          {/* 2 large tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: bentoCols, gap: isMobile ? 12 : 16, marginBottom: isMobile ? 12 : 16 }}>
            {CATEGORIES.slice(0, 2).map((cat) => {
              const Icon = ICON_MAP[cat.lucideIcon]
              const count = items.filter((item) => item.category === cat.name).length
              const accent = TILE_ACCENT[cat.name] ?? SAGE
              return (
                <Link key={cat.name} href={`/cur8/${cat.name.toLowerCase()}`} onClick={(e) => handleHavenClick(e, `/cur8/${cat.name.toLowerCase()}`)} style={{ textDecoration: 'none' }}>
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
                <Link key={cat.name} href={`/cur8/${cat.name.toLowerCase()}`} onClick={(e) => handleHavenClick(e, `/cur8/${cat.name.toLowerCase()}`)} style={{ textDecoration: 'none' }}>
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
        </section>

        {/* ── WORD MAP ── collapsible */}
        {items.length >= 3 && (
          <section style={{ padding: isMobile ? '44px 20px 0' : `48px ${pad}px 0` }}>
            <button
              onClick={() => setWordMapOpen((o) => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 20px', width: '100%', textAlign: 'left' }}
            >
              <div style={{ width: 2, height: 20, backgroundColor: wordMapOpen ? GOLD : 'rgba(245,240,232,0.2)', borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 20, fontWeight: 700, color: wordMapOpen ? CREAM : MUTED, transition: 'color 0.2s' }}>Word map</span>
              <span style={{ fontSize: 11, color: MUTED, letterSpacing: '0.04em', flex: 1 }}>tap a word to filter across all havens</span>
              {wordMapOpen ? <ChevronUp size={15} color={MUTED} /> : <ChevronDown size={15} color={MUTED} />}
            </button>
            <AnimatePresence>
              {wordMapOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
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
                </motion.div>
              )}
            </AnimatePresence>
          </section>
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
