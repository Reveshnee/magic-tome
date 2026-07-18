'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Briefcase, Shirt, Heart, Brain, Clapperboard, FolderOpen, Globe,
  Search, LogOut, Plus, Clock, Leaf, Sparkles, Shuffle, Wind, HelpCircle,
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
import HomeQuickActions from '@/components/cur8/widgets/home-quick-actions'
import { QuickSave, OneThing } from '@/components/cur8/hub-quick-tools'

const KOI: React.CSSProperties = {
  '--c-bg':       '#0d2420',
  '--c-surface':  '#122e29',
  '--c-teal':     '#0d3d3a',
  '--c-midteal':  '#1a5c56',
  '--c-sage':     '#5a9e84',
  '--c-seafoam':  '#8ec8b4',
  '--c-coral':    '#c85a40',
  '--c-gold':     '#c9a84c',
  '--c-cream':    '#f5f0e8',
  '--c-text':     '#f5f0e8',
  '--c-muted':    'rgba(245,240,232,0.55)',
  '--c-border':   'rgba(245,240,232,0.10)',
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

export default function Cur8Home() {
  const router = useRouter()
  const { isMobile, isTablet } = useViewport()
  // Responsive helpers
  const pad = isMobile ? 20 : 40
  const widgetCols = isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'
  const bentoCols = isMobile ? '1fr' : '1fr 1fr'
  const smallCols = isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'
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
  const { displayName } = useGardenNames()
  // Koi leap: when a haven is chosen, an orange koi leaps into it (splash), then
  // we navigate. Skipped when calm mode is on (respects reduced-motion intent).
  const [leap, setLeap] = useState<{ href: string; x: number; y: number } | null>(null)

  function handleHavenClick(e: React.MouseEvent, href: string) {
    if (calm) return // let the Link navigate normally
    // Only intercept plain left-clicks (allow new-tab / modified clicks through)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    setLeap({ href, x: e.clientX, y: e.clientY })
  }

  // Debounced cross-everything search (items, notes, reflections)
  useEffect(() => {
    const q = search.trim()
    if (!q) { setResults(null); setSearching(false); return }
    setSearching(true)
    const t = setTimeout(() => {
      searchEverything(q)
        .then(setResults)
        .catch(() => {})
        .finally(() => setSearching(false))
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  // Surprise me — open a random saved item (reduces decision paralysis)
  function surpriseMe() {
    if (items.length === 0) return
    const pick = items[Math.floor(Math.random() * items.length)]
    window.open(pick.url, '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    const h = new Date().getHours()
    // Softer, calming, ADHD-friendly greeting that shifts with the day.
    setGreeting(h < 12 ? 'Ease into the day' : h < 17 ? 'Take a breath' : 'Unwind a little')
    const day = Math.floor(Date.now() / 86400000) % MOTIVATIONAL.length
    setQuote(MOTIVATIONAL[day])
    // Make sure the guide is filed into The Tide once, then load everything (so
    // the guide appears in the list on this very visit).
    ensureGuideSaved()
      .catch(() => {})
      .finally(() => {
        getCur8Data()
          .then((data) => {
            setItems(data.items as Cur8Item[])
            setFolders(data.folders as Cur8Folder[])
          })
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
    .slice(0, 8)

  const todayCount = items.filter((i) => {
    const saved = new Date(i.savedAt)
    return saved.toDateString() === new Date().toDateString()
  }).length

  return (
    <div style={{ ...KOI, backgroundColor: 'var(--c-bg)', color: 'var(--c-text)', minHeight: '100vh', fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif', overflowX: 'hidden' }}>

      {/* ── FULL-BLEED HERO ── */}
      <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
        <Image
          src="/cur8/koi-pond.jpg"
          alt="Reveshnee's haven"
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        {/* Deep dark overlay — bottom half darker so text reads well */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,36,32,0.25) 0%, rgba(13,36,32,0.15) 40%, rgba(13,36,32,0.75) 80%, rgba(13,36,32,0.95) 100%)' }} />

        {/* Floating leaves + water drop particles */}
        <FloatingParticles disabled={calm} />

        {/* Top bar — logo + sign out */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '16px 20px' : '20px 32px', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.35)', flexShrink: 0 }}>
              <Image src="/cur8/logo-v2/icon-pair.png" alt="Cur8 koi logo" width={32} height={32} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 18, fontWeight: 700, color: 'var(--c-cream)', letterSpacing: '0.02em' }}>cur8</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              style={{ background: 'rgba(245,240,232,0.12)', border: '1px solid rgba(245,240,232,0.2)', borderRadius: 50, padding: '7px 14px', color: 'var(--c-cream)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(10px)' }}
            >
              <Search size={12} /> Search
            </button>
            <button
              onClick={() => setCalm(!calm)}
              aria-pressed={calm}
              title={calm ? 'Calm mode on — animations reduced' : 'Turn on calm mode'}
              style={{ background: calm ? 'var(--c-sage)' : 'rgba(245,240,232,0.12)', border: `1px solid ${calm ? 'var(--c-sage)' : 'rgba(245,240,232,0.2)'}`, borderRadius: 50, padding: '7px 12px', color: 'var(--c-cream)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(10px)' }}
            >
              <Wind size={12} /> {!isMobile && (calm ? 'Calm on' : 'Calm')}
            </button>
            <Link
              href="/cur8/guide"
              title="How to use Cur8"
              style={{ background: 'rgba(245,240,232,0.12)', border: '1px solid rgba(245,240,232,0.2)', borderRadius: 50, padding: '7px 12px', color: 'var(--c-cream)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', backdropFilter: 'blur(10px)' }}
            >
              <HelpCircle size={13} /> {!isMobile && 'Guide'}
            </Link>
            <button
              onClick={handleSignOut}
              style={{ background: 'none', border: 'none', color: 'rgba(245,240,232,0.6)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>

        {/* Search bar drop-down */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ position: 'absolute', top: 68, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 520, zIndex: 20 }}
            >
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search everything — saved items, notes, reflections…"
                autoFocus
                style={{ width: '100%', padding: '13px 20px', borderRadius: 50, border: '1.5px solid rgba(245,240,232,0.25)', backgroundColor: 'rgba(13,36,32,0.7)', backdropFilter: 'blur(20px)', color: '#f5f0e8', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
              {/* Grouped cross-everything results */}
              {search.trim() && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ marginTop: 8, maxHeight: '60vh', overflowY: 'auto', backgroundColor: 'rgba(13,36,32,0.94)', backdropFilter: 'blur(20px)', borderRadius: 18, border: '1px solid rgba(245,240,232,0.12)' }}
                >
                  {searching && (!results || (results.items.length + results.notes.length + results.reflections.length === 0)) ? (
                    <p style={{ fontSize: 12.5, color: 'rgba(245,240,232,0.5)', textAlign: 'center', padding: 18, margin: 0 }}>Searching…</p>
                  ) : results && (results.items.length + results.notes.length + results.reflections.length) === 0 ? (
                    <p style={{ fontSize: 12.5, color: 'rgba(245,240,232,0.5)', textAlign: 'center', padding: 18, margin: 0 }}>Nothing found for &ldquo;{search.trim()}&rdquo;.</p>
                  ) : results && (
                    <>
                      {results.items.length > 0 && (
                        <div>
                          <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)', padding: '10px 16px 4px', margin: 0 }}>Saved items</p>
                          {results.items.slice(0, 8).map((item) => (
                            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', textDecoration: 'none', color: '#f5f0e8' }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 50, backgroundColor: 'rgba(245,240,232,0.1)', color: 'rgba(245,240,232,0.6)', flexShrink: 0 }}>{displayName(item.category)}</span>
                              <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                            </a>
                          ))}
                        </div>
                      )}
                      {results.notes.length > 0 && (
                        <div style={{ borderTop: '1px solid rgba(245,240,232,0.06)' }}>
                          <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)', padding: '10px 16px 4px', margin: 0 }}>Brain dump notes</p>
                          {results.notes.slice(0, 5).map((n) => (
                            <button key={n.id} onClick={() => { setSearchOpen(false); window.dispatchEvent(new Event('cur8:openBrainDump')) }}
                              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', padding: '9px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: '#f5f0e8' }}>
                              <Brain size={14} color="var(--c-gold)" style={{ flexShrink: 0, marginTop: 1 }} />
                              <span style={{ fontSize: 12.5, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {results.reflections.length > 0 && (
                        <div style={{ borderTop: '1px solid rgba(245,240,232,0.06)' }}>
                          <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)', padding: '10px 16px 4px', margin: 0 }}>Reflections</p>
                          {results.reflections.slice(0, 5).map((r) => (
                            <Link key={r.id} href={`/cur8/${r.category.toLowerCase()}`} onClick={() => setSearchOpen(false)}
                              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 16px', textDecoration: 'none', color: '#f5f0e8' }}>
                              <Leaf size={14} color="var(--c-sage)" style={{ flexShrink: 0, marginTop: 1 }} />
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

        {/* Hero text — bottom of viewport. Extra bottom padding reserves a clear
            zone so the floating Brain-dump / Focus-sounds pills never overlap the
            stats row or the Surprise-me button. */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: isMobile ? '0 20px 84px' : '0 40px 88px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--c-gold)', marginBottom: 10 }}>{greeting}, Reveshnee</p>
          <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 'clamp(44px, 6vw, 80px)', fontWeight: 700, color: 'var(--c-cream)', lineHeight: 1.0, margin: 0, marginBottom: 12, letterSpacing: '-0.01em' }}>
            {"Reveshnee's"}<br />
            <em style={{ fontStyle: 'italic', color: 'var(--c-gold)' }}>Haven</em>
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.65)', marginBottom: 20, maxWidth: 400, lineHeight: 1.6 }}>&ldquo;{quote}&rdquo;</p>
          {/* Stats row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 16 : 24, flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--c-cream)', fontFamily: 'var(--font-playfair), Georgia, serif' }}>{items.length}</span>
              <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.5)', marginLeft: 6 }}>saved</span>
            </div>
            <div style={{ width: 1, height: 28, backgroundColor: 'rgba(245,240,232,0.15)' }} />
            <div>
              <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--c-coral)', fontFamily: 'var(--font-playfair), Georgia, serif' }}>{todayCount}</span>
              <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.5)', marginLeft: 6 }}>today</span>
            </div>
            <div style={{ width: 1, height: 28, backgroundColor: 'rgba(245,240,232,0.15)' }} />
            <div>
              <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--c-sage)', fontFamily: 'var(--font-playfair), Georgia, serif' }}>8</span>
              <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.5)', marginLeft: 6 }}>havens</span>
            </div>
            {items.length > 0 && (
              <>
                <div style={{ width: 1, height: 28, backgroundColor: 'rgba(245,240,232,0.15)' }} />
                <motion.button
                  onClick={surpriseMe}
                  whileHover={calm ? undefined : { scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Open a random saved item"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 50, border: '1px solid var(--c-gold)', backgroundColor: 'rgba(201,168,76,0.15)', color: 'var(--c-gold)', fontSize: 12, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(10px)' }}
                >
                  <Shuffle size={13} /> Surprise me
                </motion.button>
              </>
            )}
          </div>
        </div>

        {/* Scroll nudge */}
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ repeat: Infinity, duration: 2.2 }}
          style={{ position: 'absolute', bottom: 12, right: isMobile ? 20 : 40, fontSize: 10, color: 'rgba(245,240,232,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          scroll
        </motion.div>
      </div>

      {/* ── STICKY GARDEN TAB BAR ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: 'rgba(13,36,32,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(245,240,232,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 24px' }}>
          {CATEGORIES.map((cat) => {
            const Icon = ICON_MAP[cat.lucideIcon]
            const count = items.filter((i) => i.category === cat.name).length
            const accent = TILE_ACCENT[cat.name] ?? '#5a9e84'
            return (
              <Link key={cat.name} href={`/cur8/${cat.name.toLowerCase()}`} onClick={(e) => handleHavenClick(e, `/cur8/${cat.name.toLowerCase()}`)} style={{ textDecoration: 'none', flexShrink: 0 }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '14px 16px', borderBottom: '2px solid transparent', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderBottomColor = accent; e.currentTarget.style.color = '#f5f0e8' }}
                  onMouseLeave={e => { e.currentTarget.style.borderBottomColor = 'transparent'; e.currentTarget.style.color = 'rgba(245,240,232,0.5)' }}
                >
                  {Icon && <Icon size={12} color={accent} />}
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(245,240,232,0.6)', whiteSpace: 'nowrap' }}>{displayName(cat.name)}</span>
                  {count > 0 && (
                    <span style={{ fontSize: 9, fontWeight: 700, backgroundColor: accent, color: '#fff', borderRadius: 50, padding: '1px 5px', minWidth: 14, textAlign: 'center' }}>{count}</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── WELLNESS WIDGET ROW ── */}
      <div style={{ backgroundColor: '#0d2420', padding: isMobile ? '24px 20px 0' : '32px 40px 0', display: 'grid', gridTemplateColumns: widgetCols, gap: isMobile ? 10 : 14 }}>
        <IntentionWidget />
        <BreathworkWidget />
        <FocusTimerWidget />
        <MiniCalendarWidget />
      </div>

      {/* ── CONTENT BELOW ── */}
      <div style={{ backgroundColor: '#0d2420', padding: isMobile ? '36px 20px 64px' : '48px 40px 80px' }}>

        {/* Recently tended */}
        {recent.length > 0 && (
          <section style={{ marginBottom: 60 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 20 }}>
              <Clock size={13} color="var(--c-sage)" />
              <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 22, fontWeight: 600, color: 'var(--c-cream)' }}>Recently tended</h2>
              <span style={{ fontSize: 11, color: 'var(--c-muted)' }}>{recent.length} items</span>
            </div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
              {recent.map((item, i) => {
                const accent = TILE_ACCENT[item.category] ?? '#5a9e84'
                return (
                  <motion.a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -3 }}
                    style={{ flexShrink: 0, width: 160, height: 110, borderRadius: 14, overflow: 'hidden', position: 'relative', textDecoration: 'none', display: 'block', border: '1px solid rgba(245,240,232,0.08)' }}
                  >
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--c-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Globe size={24} color={accent} />
                      </div>
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,36,32,0.92) 0%, transparent 55%)' }} />
                    <div style={{ position: 'absolute', top: 7, left: 7, width: 6, height: 6, borderRadius: '50%', backgroundColor: accent }} />
                    <p style={{ position: 'absolute', bottom: 7, left: 8, right: 8, fontSize: 10, fontWeight: 600, color: '#f5f0e8', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.title}</p>
                  </motion.a>
                )
              })}
            </div>
          </section>
        )}

        {/* Quick Actions — Brain Dump, Reflect, Focus Sounds */}
        <section style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 22, fontWeight: 600, color: 'var(--c-cream)' }}>Quick actions</h2>
              <span style={{ fontSize: 11, color: 'var(--c-muted)' }}>capture, reflect, focus</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <QuickSave onSaved={(item) => setItems((prev) => [item, ...prev])} />
              <OneThing items={items} />
            </div>
          </div>
          <HomeQuickActions />
        </section>

        {/* AI Insights Hub */}
        <section style={{ marginBottom: 28 }}>
          <AiHub />
        </section>

        {/* Gardens grid — editorial bento style */}
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 22, fontWeight: 600, color: 'var(--c-cream)' }}>Your havens</h2>
            <span style={{ fontSize: 11, color: 'var(--c-muted)', letterSpacing: '0.05em' }}>8 spaces to curate</span>
          </div>

          {/* Bento: 2 large + 6 small */}
          <div style={{ display: 'grid', gridTemplateColumns: bentoCols, gap: 14, marginBottom: 14 }}>
            {CATEGORIES.slice(0, 2).map((cat) => {
              const Icon = ICON_MAP[cat.lucideIcon]
              const count = items.filter((item) => item.category === cat.name).length
              const accent = TILE_ACCENT[cat.name]
              return (
                <Link key={cat.name} href={`/cur8/${cat.name.toLowerCase()}`} onClick={(e) => handleHavenClick(e, `/cur8/${cat.name.toLowerCase()}`)} style={{ textDecoration: 'none' }}>
                  <motion.div
                    whileHover={{ scale: 1.015 }}
                    transition={{ type: 'spring', stiffness: 280 }}
                    style={{ position: 'relative', height: 220, borderRadius: 20, overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(245,240,232,0.08)' }}
                  >
                    <Image src={cat.tileImage} alt={displayName(cat.name)} fill style={{ objectFit: 'cover' }} sizes="600px" />
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, transparent 20%, rgba(13,36,32,0.88) 100%)` }} />
                    {/* Icon box */}
                    <div style={{ position: 'absolute', top: 14, left: 14, width: 38, height: 38, borderRadius: 12, backgroundColor: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {Icon && <Icon size={19} color="#fff" />}
                    </div>
                    {/* Count badge */}
                    <div style={{ position: 'absolute', top: 18, right: 14, fontSize: 10, fontWeight: 700, backgroundColor: 'rgba(13,36,32,0.7)', backdropFilter: 'blur(4px)', color: '#f5f0e8', borderRadius: 50, padding: '3px 10px' }}>{count} saved</div>
                    <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, textAlign: 'center' }}>
                      <h3 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 30, fontWeight: 700, color: '#f5f0e8', margin: '0 0 3px', lineHeight: 1.1, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{displayName(cat.name)}</h3>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: accent, margin: '0 0 6px' }}>{cat.area}</p>
                      <p style={{ fontSize: 9.5, color: 'rgba(245,240,232,0.55)', margin: 0, letterSpacing: '0.02em' }}>{cat.description}</p>
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: smallCols, gap: 10 }}>
            {CATEGORIES.slice(2).map((cat) => {
              const Icon = ICON_MAP[cat.lucideIcon]
              const count = items.filter((item) => item.category === cat.name).length
              const accent = TILE_ACCENT[cat.name] ?? '#5a9e84'
              return (
                <Link key={cat.name} href={`/cur8/${cat.name.toLowerCase()}`} onClick={(e) => handleHavenClick(e, `/cur8/${cat.name.toLowerCase()}`)} style={{ textDecoration: 'none' }}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 280 }}
                    style={{ position: 'relative', height: 132, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(245,240,232,0.08)', backgroundColor: 'var(--c-surface)' }}
                  >
                    <Image src={cat.tileImage} alt={displayName(cat.name)} fill style={{ objectFit: 'cover' }} sizes="240px" />
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, rgba(13,36,32,0.15) 0%, rgba(13,36,32,0.92) 100%)` }} />
                    {/* Left accent bar */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: accent }} />
                    <div style={{ position: 'absolute', top: 12, left: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {Icon && <Icon size={13} color="#fff" />}
                      </div>
                    </div>
                    {count > 0 && (
                      <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 9, fontWeight: 700, backgroundColor: 'rgba(13,36,32,0.7)', backdropFilter: 'blur(4px)', color: '#f5f0e8', borderRadius: 50, padding: '2px 8px' }}>{count}</div>
                    )}
                    <div style={{ position: 'absolute', bottom: 10, left: 14, right: 10 }}>
                      <h3 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 14, fontWeight: 700, color: 'var(--c-cream)', margin: '0 0 1px', lineHeight: 1.2, textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>{displayName(cat.name)}</h3>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: accent, margin: '0 0 3px' }}>{cat.area}</p>
                      <p style={{ fontSize: 8.5, color: 'rgba(245,240,232,0.5)', margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.description}</p>
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Empty state */}
        {mounted && items.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ marginTop: 60, textAlign: 'center' }}
          >
            <div style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: 'rgba(90,158,132,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Sparkles size={24} color="var(--c-sage)" />
            </div>
          <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 24, fontWeight: 700, color: 'var(--c-cream)', marginBottom: 8 }}>Your haven awaits</h2>
          <p style={{ fontSize: 14, color: 'var(--c-muted)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto 24px' }}>Pick a haven above and paste your first link — YouTube, articles, docs, anything.</p>
            <Link href="/cur8/youtube" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 22px', borderRadius: 50, backgroundColor: 'var(--c-coral)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <Plus size={13} /> Start with The Grove
              </div>
            </Link>
          </motion.div>
        )}
      </div>

      {/* Orange koi leaps into the chosen haven, then we navigate */}
      <KoiLeap
        active={!!leap}
        origin={leap}
        onComplete={() => {
          if (leap) router.push(leap.href)
        }}
      />
    </div>
  )
}
