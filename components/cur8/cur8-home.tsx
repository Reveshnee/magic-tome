'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Music, Camera, Users, Newspaper, ImageIcon, FileText, Globe,
  Search, LogOut, Plus, Clock, ChevronRight, Leaf, Sparkles, TrendingUp,
} from 'lucide-react'
import { CATEGORIES, type Cur8Item, type Cur8Folder } from '@/lib/cur8-store'
import { getCur8Data } from '@/app/actions/cur8'
import { authClient } from '@/lib/auth-client'

const KOI: React.CSSProperties = {
  '--c-bg':        '#f2f5f2',
  '--c-surface':   '#ffffff',
  '--c-surface2':  '#eef2ee',
  '--c-teal':      '#0d3d3a',
  '--c-midteal':   '#1a5c56',
  '--c-sage':      '#5a9e84',
  '--c-seafoam':   '#8ec8b4',
  '--c-coral':     '#c85a40',
  '--c-gold':      '#b8892a',
  '--c-text':      '#1a2e2b',
  '--c-muted':     '#6b8884',
  '--c-border':    'rgba(13,61,58,0.10)',
} as React.CSSProperties

const ICON_MAP: Record<string, React.ElementType> = {
  play: Play, music: Music, camera: Camera, users: Users,
  newspaper: Newspaper, 'image-icon': ImageIcon, 'file-text': FileText, globe: Globe,
}

const TILE_STYLES: Record<string, { accent: string; soft: string; image: string }> = {
  YouTube:   { accent: '#c85a40', soft: 'rgba(200,90,64,0.12)',  image: '/cur8/tile-ember.png' },
  TikTok:    { accent: '#c07878', soft: 'rgba(192,120,120,0.12)', image: '/cur8/tile-bloom.png' },
  Instagram: { accent: '#c07878', soft: 'rgba(192,120,120,0.12)', image: '/cur8/tile-bloom.png' },
  Facebook:  { accent: '#4a6d78', soft: 'rgba(74,109,120,0.12)', image: '/cur8/tile-tide.png' },
  Articles:  { accent: '#b8892a', soft: 'rgba(184,137,42,0.12)', image: '/cur8/tile-archive.png' },
  Images:    { accent: '#5a9e84', soft: 'rgba(90,158,132,0.12)', image: '/cur8/tile-sanctuary.png' },
  Documents: { accent: '#2e6b4f', soft: 'rgba(46,107,79,0.12)', image: '/cur8/tile-grove.png' },
  Web:       { accent: '#1a5c56', soft: 'rgba(26,92,86,0.12)',   image: '/cur8/tile-greenhouse.png' },
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
  const [items, setItems] = useState<Cur8Item[]>([])
  const [folders, setFolders] = useState<Cur8Folder[]>([])
  const [search, setSearch] = useState('')
  const [mounted, setMounted] = useState(false)
  const [greeting, setGreeting] = useState('Good morning')
  const [quote, setQuote] = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
    // Pick a daily quote based on day of year
    const day = Math.floor((Date.now() / 86400000)) % MOTIVATIONAL.length
    setQuote(MOTIVATIONAL[day])
    getCur8Data()
      .then((data) => {
        setItems(data.items as Cur8Item[])
        setFolders(data.folders as Cur8Folder[])
      })
      .catch(() => {})
      .finally(() => setMounted(true))
  }, [])

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/cur8/sign-in')
    router.refresh()
  }

  const recent = [...items]
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
    .slice(0, 8)

  const filtered = search.trim()
    ? items.filter((i) =>
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        i.category.toLowerCase().includes(search.toLowerCase())
      )
    : []

  const todayCount = items.filter((i) => {
    const saved = new Date(i.savedAt)
    const today = new Date()
    return saved.toDateString() === today.toDateString()
  }).length

  return (
    <div style={{ ...KOI, backgroundColor: 'var(--c-bg)', color: 'var(--c-text)', height: '100vh', display: 'flex', overflow: 'hidden', fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif' }}>

      {/* ── LEFT SIDEBAR ── */}
      <aside style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--c-border)', backgroundColor: '#f7faf7', overflow: 'hidden' }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--c-border)' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: 'var(--c-coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Leaf size={13} color="#fff" />
          </div>
          <span style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 17, fontWeight: 700, color: 'var(--c-teal)' }}>cur8</span>
        </div>

        {/* Gardens label */}
        <div style={{ padding: '14px 16px 6px' }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--c-muted)' }}>Your Gardens</p>
        </div>

        {/* Garden nav tiles */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }}>
          {CATEGORIES.map((cat) => {
            const ts = TILE_STYLES[cat.name]
            const Icon = ICON_MAP[cat.lucideIcon]
            const count = items.filter((i) => i.category === cat.name).length
            return (
              <Link key={cat.name} href={`/cur8/${cat.name.toLowerCase()}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, marginBottom: 2, cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'white')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: ts.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {Icon && <Icon size={13} style={{ color: ts.accent }} />}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.displayName}</span>
                  {count > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--c-muted)', fontWeight: 600 }}>{count}</span>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--c-border)' }}>
          <button
            onClick={handleSignOut}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 10, cursor: 'pointer', backgroundColor: 'transparent', border: 'none', color: 'var(--c-muted)', fontSize: 12, fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'white')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Hero — koi pond */}
        <div style={{ position: 'relative', height: 240, flexShrink: 0, overflow: 'hidden' }}>
          <Image src="/cur8/koi-pond.jpg" alt="Phoenix's garden" fill className="object-cover object-center" priority sizes="100vw" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,61,58,0.1) 0%, rgba(242,245,242,0) 40%, rgba(242,245,242,1) 100%)' }} />
          {/* Search bar floating at top */}
          <div style={{ position: 'absolute', top: 16, left: 16, right: 16 }}>
            <div style={{ position: 'relative', maxWidth: 440 }}>
              <Search size={13} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.7)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your garden..."
                style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9, borderRadius: 50, border: '1px solid rgba(255,255,255,0.3)', backgroundColor: 'rgba(13,61,58,0.4)', backdropFilter: 'blur(12px)', color: '#f5f0e8', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          {/* Greeting */}
          <div style={{ position: 'absolute', bottom: 16, left: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--c-teal)', marginBottom: 2 }}>{greeting}, Reveshnee</p>
            <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 26, fontWeight: 700, color: 'var(--c-teal)', lineHeight: 1.1 }}>{"Reveshnee's Garden"}</h1>
          </div>
        </div>

        {/* Scrollable content area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 40px' }}>

          {/* Search results dropdown */}
          <AnimatePresence>
            {filtered.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ backgroundColor: 'white', border: '1.5px solid var(--c-border)', borderRadius: 16, padding: 12, marginBottom: 16, boxShadow: '0 4px 20px rgba(13,61,58,0.10)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-muted)', marginBottom: 8 }}>{filtered.length} results</p>
                {filtered.slice(0, 6).map((item) => (
                  <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 9, textDecoration: 'none', color: 'var(--c-text)' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 50, backgroundColor: TILE_STYLES[item.category]?.soft, color: TILE_STYLES[item.category]?.accent }}>{item.category}</span>
                    <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                  </a>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recently tended */}
          {recent.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Clock size={13} style={{ color: 'var(--c-sage)' }} />
                <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 16, fontWeight: 600, color: 'var(--c-text)' }}>Recently tended</h2>
              </div>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                {recent.map((item, i) => {
                  const ts = TILE_STYLES[item.category]
                  return (
                    <motion.a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      style={{ flexShrink: 0, width: 110, height: 75, borderRadius: 12, overflow: 'hidden', position: 'relative', textDecoration: 'none', display: 'block', border: '1.5px solid var(--c-border)' }}>
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Image src={ts?.image ?? '/cur8/tile-grove.png'} alt={item.title} fill style={{ objectFit: 'cover' }} sizes="110px" />
                      )}
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,61,58,0.85) 0%, transparent 55%)' }} />
                      <p style={{ position: 'absolute', bottom: 5, left: 6, right: 6, fontSize: 9, fontWeight: 600, color: '#f5f0e8', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.title}</p>
                      <div style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: '50%', backgroundColor: ts?.accent ?? '#5a9e84' }} />
                    </motion.a>
                  )
                })}
              </div>
            </section>
          )}

          {/* Gardens grid */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 16, fontWeight: 600, color: 'var(--c-text)' }}>Your gardens</h2>
            <span style={{ fontSize: 11, color: 'var(--c-muted)' }}>{items.length} saved total</span>
          </div>

          {/* 2 featured tall + 6 small — responsive grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {CATEGORIES.slice(0, 2).map((cat) => {
              const ts = TILE_STYLES[cat.name]
              const Icon = ICON_MAP[cat.lucideIcon]
              const count = items.filter((i) => i.category === cat.name).length
              return (
                <Link key={cat.name} href={`/cur8/${cat.name.toLowerCase()}`} style={{ textDecoration: 'none' }}>
                  <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}
                    style={{ position: 'relative', height: 180, borderRadius: 20, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 4px 20px rgba(13,61,58,0.10)', border: '1.5px solid var(--c-border)' }}>
                    <Image src={ts.image} alt={cat.name} fill style={{ objectFit: 'cover' }} sizes="300px" />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(165deg, rgba(255,255,255,0.06) 0%, rgba(13,61,58,0.55) 100%)' }} />
                    <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 50, backgroundColor: ts.accent }}>
                      {Icon && <Icon size={9} color="#fff" />}
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>{count} saved</span>
                    </div>
                    <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
                      <h3 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 19, fontWeight: 700, color: '#f5f0e8', textShadow: '0 2px 6px rgba(0,0,0,0.3)', marginBottom: 6 }}>{cat.displayName}</h3>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}>
                        <span style={{ fontSize: 9, color: '#f5f0e8', fontWeight: 500 }}>Open</span>
                        <ChevronRight size={8} color="#f5f0e8" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {CATEGORIES.slice(2).map((cat) => {
              const ts = TILE_STYLES[cat.name]
              const Icon = ICON_MAP[cat.lucideIcon]
              const count = items.filter((i) => i.category === cat.name).length
              return (
                <Link key={cat.name} href={`/cur8/${cat.name.toLowerCase()}`} style={{ textDecoration: 'none' }}>
                  <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}
                    style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', backgroundColor: 'white', border: '1.5px solid var(--c-border)', boxShadow: '0 2px 8px rgba(13,61,58,0.06)' }}>
                    <div style={{ position: 'relative', height: 60, overflow: 'hidden' }}>
                      <Image src={ts.image} alt={cat.name} fill style={{ objectFit: 'cover' }} sizes="160px" />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 20%, rgba(255,255,255,0.97) 100%)' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px 10px' }}>
                      <div>
                        <h3 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 12, fontWeight: 700, color: 'var(--c-text)', marginBottom: 1 }}>{cat.displayName}</h3>
                        <p style={{ fontSize: 10, color: 'var(--c-muted)' }}>{count} saved</p>
                      </div>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: ts.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {Icon && <Icon size={11} style={{ color: ts.accent }} />}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </div>

          {/* Empty state */}
          {mounted && items.length === 0 && (
            <div style={{ marginTop: 40, textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: 'var(--c-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Plus size={22} color="#fff" />
              </div>
              <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 19, fontWeight: 700, color: 'var(--c-text)', marginBottom: 6 }}>Your garden awaits</h2>
              <p style={{ fontSize: 13, color: 'var(--c-muted)', lineHeight: 1.6 }}>Pick a garden and paste your first link.</p>
            </div>
          )}
        </div>
      </main>

      {/* ── RIGHT WIDGETS PANEL ── */}
      <aside style={{ width: 230, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, borderLeft: '1px solid var(--c-border)', backgroundColor: '#f7faf7', padding: '18px 14px', overflowY: 'auto' }}>

        {/* Daily quote widget */}
        <div style={{ borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
          <Image src="/cur8/koi-pond.jpg" alt="" fill style={{ objectFit: 'cover' }} sizes="230px" />
          <div style={{ position: 'relative', padding: '14px 13px', background: 'linear-gradient(135deg, rgba(13,61,58,0.82) 0%, rgba(26,92,86,0.75) 100%)', backdropFilter: 'blur(2px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              <Sparkles size={11} color="#8ec8b4" />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8ec8b4' }}>Today&apos;s intention</span>
            </div>
            <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 13, fontWeight: 600, color: '#f5f0e8', lineHeight: 1.55 }}>&quot;{quote}&quot;</p>
          </div>
        </div>

        {/* Stats widget */}
        <div style={{ backgroundColor: 'white', borderRadius: 16, padding: '13px 14px', border: '1.5px solid var(--c-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
            <TrendingUp size={12} style={{ color: 'var(--c-sage)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--c-muted)' }}>Garden stats</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ backgroundColor: 'var(--c-bg)', borderRadius: 12, padding: '10px 10px' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-teal)', fontFamily: 'var(--font-playfair), Georgia, serif' }}>{items.length}</p>
              <p style={{ fontSize: 10, color: 'var(--c-muted)', marginTop: 1 }}>Total saved</p>
            </div>
            <div style={{ backgroundColor: 'var(--c-bg)', borderRadius: 12, padding: '10px 10px' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-coral)', fontFamily: 'var(--font-playfair), Georgia, serif' }}>{todayCount}</p>
              <p style={{ fontSize: 10, color: 'var(--c-muted)', marginTop: 1 }}>Today</p>
            </div>
          </div>
        </div>

        {/* Quick nav to all 8 */}
        <div style={{ backgroundColor: 'white', borderRadius: 16, padding: '13px 14px', border: '1.5px solid var(--c-border)' }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--c-muted)', marginBottom: 10 }}>Quick access</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
            {CATEGORIES.map((cat) => {
              const ts = TILE_STYLES[cat.name]
              const Icon = ICON_MAP[cat.lucideIcon]
              return (
                <Link key={cat.name} href={`/cur8/${cat.name.toLowerCase()}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: ts.soft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {Icon && <Icon size={14} style={{ color: ts.accent }} />}
                    </div>
                    <span style={{ fontSize: 8, fontWeight: 600, color: 'var(--c-muted)', textAlign: 'center', lineHeight: 1.2 }}>{cat.displayName.replace('The ', '')}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Most active garden */}
        {mounted && items.length > 0 && (() => {
          const counts = CATEGORIES.map((c) => ({ cat: c, count: items.filter((i) => i.category === c.name).length }))
          const top = counts.sort((a, b) => b.count - a.count)[0]
          const ts = TILE_STYLES[top.cat.name]
          if (top.count === 0) return null
          return (
            <Link href={`/cur8/${top.cat.name.toLowerCase()}`} style={{ textDecoration: 'none' }}>
              <div style={{ borderRadius: 16, overflow: 'hidden', position: 'relative', height: 80 }}>
                <Image src={ts.image} alt={top.cat.displayName} fill style={{ objectFit: 'cover' }} sizes="230px" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(13,61,58,0.7) 0%, rgba(13,61,58,0.3) 100%)' }} />
                <div style={{ position: 'relative', padding: '10px 12px' }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#8ec8b4', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Most visited</p>
                  <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 15, fontWeight: 700, color: '#f5f0e8', marginTop: 2 }}>{top.cat.displayName}</p>
                  <p style={{ fontSize: 10, color: 'rgba(245,240,232,0.7)', marginTop: 1 }}>{top.count} saves</p>
                </div>
              </div>
            </Link>
          )
        })()}
      </aside>

    </div>
  )
}
