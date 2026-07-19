'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Briefcase, Shirt, Heart, Brain, Clapperboard, FolderOpen, Globe,
  Search, LogOut, Plus, Clock, Leaf, Sparkles, Shuffle, Wind, HelpCircle,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
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
import HomeQuickActions from '@/components/cur8/widgets/home-quick-actions'
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
function SectionLabel({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
      <div style={{ width: 2, height: 20, backgroundColor: GOLD, borderRadius: 2, flexShrink: 0, alignSelf: 'center' }} />
      <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 20, fontWeight: 700, color: CREAM, margin: 0, letterSpacing: '-0.01em' }}>
        {children}
      </h2>
      {sub && <span style={{ fontSize: 11, color: MUTED, letterSpacing: '0.04em' }}>{sub}</span>}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Cur8Home() {
  const router = useRouter()
  const { isMobile, isTablet } = useViewport()
  const pad = isMobile ? 20 : isTablet ? 32 : 48
  const bentoCols = isMobile ? '1fr' : '1fr 1fr'
  const smallCols = isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)'

  const [items, setItems] = useState<Cur8Item[]>([])
  const [folders, setFolders] = useState<Cur8Folder[]>([])
  const [search, setSearch] = useState('')
  const [mounted, setMounted] = useState(false)
  const [greeting, setGreeting] = useState('Good morning')
  const [quote, setQuote] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [results, setResults] = useState<SearchResults | null>(null)
  const [searching, setSearching] = useState(false)
  const [calm, setCalm] = useCalmMode()
  const [activeWord, setActiveWord] = useState<string | null>(null)
  const [wordMapOpen, setWordMapOpen] = useState(false)
  const { displayName } = useGardenNames()

  // Haven tab bar scroll arrows
  const tabScrollRef = useRef<HTMLDivElement>(null)
  const [tabScroll, setTabScroll] = useState({ left: false, right: false })
  function updateTabArrows() {
    const el = tabScrollRef.current
    if (!el) return
    setTabScroll({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
  }
  useEffect(() => {
    updateTabArrows()
    window.addEventListener('resize', updateTabArrows)
    return () => window.removeEventListener('resize', updateTabArrows)
  }, [])
  function scrollTabs(dir: 1 | -1) {
    tabScrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' })
  }

  // Koi leap animation
  const [leap, setLeap] = useState<{ href: string; x: number; y: number } | null>(null)
  function handleHavenClick(e: React.MouseEvent, href: string) {
    if (calm) return
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    setLeap({ href, x: e.clientX, y: e.clientY })
  }

  // Search
  useEffect(() => {
    const q = search.trim()
    if (!q) { setResults(null); setSearching(false); return }
    setSearching(true)
    const t = setTimeout(() => {
      searchEverything(q).then(setResults).catch(() => {}).finally(() => setSearching(false))
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  function surpriseMe() {
    if (items.length === 0) return
    const pick = items[Math.floor(Math.random() * items.length)]
    window.open(pick.url, '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Ease into the day' : h < 17 ? 'Take a breath' : 'Unwind a little')
    const day = Math.floor(Date.now() / 86400000) % MOTIVATIONAL.length
    setQuote(MOTIVATIONAL[day])
    ensureGuideSaved()
      .catch(() => {})
      .finally(() => {
        getCur8Data()
          .then((data) => { setItems(data.items as Cur8Item[]); setFolders(data.folders as Cur8Folder[]) })
          .catch(() => {})
          .finally(() => setMounted(true))
      })
  }, [])

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/cur8/sign-in')
    router.refresh()
  }

  const recent = [...items]
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
    .slice(0, 10)

  const todayCount = items.filter((i) => new Date(i.savedAt).toDateString() === new Date().toDateString()).length

  return (
    <div style={{ ...KOI, backgroundColor: BG, color: CREAM, minHeight: '100vh', fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif', overflowX: 'hidden' }}>

      {/* ══════════════════════════════════════════════════════════════════════
          HERO — full-bleed koi pond image with refined text hierarchy
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
        <Image src="/cur8/koi-pond.jpg" alt="Reveshnee's haven" fill className="object-cover object-center" priority sizes="100vw" />

        {/* Layered overlay — darker vignette at top and bottom, lighter through the middle */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,30,27,0.72) 0%, rgba(10,30,27,0.08) 35%, rgba(10,30,27,0.08) 55%, rgba(10,30,27,0.82) 82%, rgba(10,30,27,0.97) 100%)' }} />

        <FloatingParticles disabled={calm} />

        {/* ── TOP NAV BAR ── */}
        <header style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: isMobile ? '18px 20px' : '22px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo + wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
              <Image src="/cur8/logo-v2/icon-pair.png" alt="Cur8 koi logo" width={34} height={34} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 20, fontWeight: 700, color: CREAM, letterSpacing: '0.03em' }}>cur8</span>
          </div>

          {/* Nav actions */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10 }}>
            {/* Search */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '7px 10px' : '8px 16px', borderRadius: 50, fontSize: 12, fontWeight: 500, color: CREAM, background: 'rgba(245,240,232,0.10)', border: '1px solid rgba(245,240,232,0.16)', backdropFilter: 'blur(12px)', cursor: 'pointer' }}
            >
              <Search size={13} />
              {!isMobile && 'Search'}
            </button>

            {/* Calm mode */}
            <button
              onClick={() => setCalm(!calm)}
              aria-pressed={calm}
              title={calm ? 'Calm mode on' : 'Turn on calm mode'}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '7px 10px' : '8px 14px', borderRadius: 50, fontSize: 12, fontWeight: 500, color: calm ? BG : CREAM, background: calm ? SAGE : 'rgba(245,240,232,0.10)', border: `1px solid ${calm ? SAGE : 'rgba(245,240,232,0.16)'}`, backdropFilter: 'blur(12px)', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <Wind size={13} />
              {!isMobile && (calm ? 'Calm on' : 'Calm')}
            </button>

            {/* Guide */}
            <Link
              href="/cur8/guide"
              title="How to use Cur8"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '7px 10px' : '8px 14px', borderRadius: 50, fontSize: 12, fontWeight: 500, color: CREAM, background: 'rgba(245,240,232,0.10)', border: '1px solid rgba(245,240,232,0.16)', textDecoration: 'none', backdropFilter: 'blur(12px)' }}
            >
              <HelpCircle size={13} />
              {!isMobile && 'Guide'}
            </Link>

            {/* Sign out */}
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
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: isMobile ? '0 20px 80px' : `0 ${pad}px 90px` }}>
          {/* Eyebrow */}
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD }}>{greeting}, Reveshnee</p>

          {/* Name headline */}
          <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 'clamp(40px, 5.5vw, 76px)', fontWeight: 700, color: CREAM, lineHeight: 1.0, margin: '0 0 14px', letterSpacing: '-0.02em' }}>
            {"Reveshnee's"}<br />
            <em style={{ fontStyle: 'italic', color: GOLD }}>Haven</em>
          </h1>

          {/* Quote */}
          <p style={{ margin: '0 0 28px', fontSize: 13, color: 'rgba(245,240,232,0.6)', lineHeight: 1.7, maxWidth: 380 }}>
            &ldquo;{quote}&rdquo;
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 18 : 28, flexWrap: 'wrap' }}>
            {[
              { value: items.length, label: 'saved', color: CREAM },
              { value: todayCount, label: 'today', color: CORAL },
              { value: 8, label: 'havens', color: SAGE },
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
          HAVEN TAB BAR — sticky, frosted, refined
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
          BODY — calmer, sectioned layout
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ backgroundColor: BG }}>

        {/* ── QUICK ACTIONS ── thin row just below the tab bar */}
        <div style={{ padding: isMobile ? '20px 20px 0' : `24px ${pad}px 0`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', borderBottom: `1px solid ${BORDER}` }}>
          <HomeQuickActions />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 20 }}>
            <QuickSave onSaved={(item) => setItems((prev) => [item, ...prev])} />
            <OneThing items={items} />
          </div>
        </div>

        {/* ── RITUALS (widgets) ── collapsed, refined header */}
        <div style={{ padding: isMobile ? '32px 20px 0' : `36px ${pad}px 0` }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : isTablet ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? 10 : 14 }}>
            <IntentionWidget />
            <BreathworkWidget />
            <FocusTimerWidget />
            <MiniCalendarWidget />
          </div>
        </div>

        {/* ── RECENTLY TENDED ── */}
        {recent.length > 0 && (
          <section style={{ padding: isMobile ? '40px 0 0' : `48px 0 0` }}>
            <div style={{ padding: isMobile ? '0 20px' : `0 ${pad}px` }}>
              <SectionLabel sub={`${recent.length} items`}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={14} color={SAGE} /> Recently tended
                </span>
              </SectionLabel>
            </div>
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

                    {/* Icon */}
                    <div style={{ position: 'absolute', top: 16, left: 16, width: 40, height: 40, borderRadius: 12, backgroundColor: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                      {Icon && <Icon size={18} color="#fff" />}
                    </div>

                    {/* Count pill */}
                    <div style={{ position: 'absolute', top: 20, right: 16, fontSize: 10, fontWeight: 700, backgroundColor: 'rgba(10,30,27,0.72)', backdropFilter: 'blur(6px)', color: CREAM, borderRadius: 50, padding: '3px 10px', border: `1px solid ${BORDER}` }}>{count} saved</div>

                    {/* Text block */}
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

                    {/* Accent bar */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: accent }} />

                    {/* Icon */}
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

        {/* ── KNOW YOURSELF ── AI insights */}
        <section style={{ padding: isMobile ? '48px 20px 0' : `56px ${pad}px 0` }}>
          <AiHub items={items} />
        </section>

        {/* ── WORD MAP ── collapsible to keep the page calm */}
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
                        Saves containing &ldquo;{activeWord}&rdquo; — {items.filter(it => `${it.title ?? ''} ${it.description ?? ''}`.toLowerCase().includes(activeWord)).length} items
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {items
                          .filter(it => `${it.title ?? ''} ${it.description ?? ''}`.toLowerCase().includes(activeWord))
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
              <Sparkles size={26} color={SAGE} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 26, fontWeight: 700, color: CREAM, marginBottom: 10 }}>Your haven awaits</h2>
            <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, maxWidth: 340, margin: '0 auto 28px' }}>Pick a haven above and paste your first link — YouTube, articles, docs, anything.</p>
            <Link href="/cur8/youtube" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 50, backgroundColor: CORAL, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <Plus size={14} /> Start with The Grove
              </div>
            </Link>
          </motion.div>
        )}

        {/* Bottom spacer */}
        <div style={{ height: 80 }} />
      </div>

      {/* Koi leap animation */}
      <KoiLeap
        active={!!leap}
        origin={leap}
        onComplete={() => { if (leap) router.push(leap.href) }}
      />
    </div>
  )
}
