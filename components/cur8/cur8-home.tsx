'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Music, Camera, Users, Newspaper, ImageIcon, FileText, Globe,
  Search, LogOut, Plus, Clock, ChevronRight, Leaf,
} from 'lucide-react'
import { CATEGORIES, type Cur8Item, type Cur8Folder } from '@/lib/cur8-store'
import { getCur8Data } from '@/app/actions/cur8'
import { authClient } from '@/lib/auth-client'

/* ── Inline CSS variables — bypass the global dark cascade entirely ── */
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
  '--c-forest':    '#2e6b4f',
  '--c-slate':     '#4a6d78',
  '--c-dustyrose': '#c07878',
  '--c-cream':     '#f5f0e8',
  '--c-text':      '#1a2e2b',
  '--c-muted':     '#6b8884',
  '--c-border':    'rgba(13,61,58,0.10)',
} as React.CSSProperties

const ICON_MAP: Record<string, React.ElementType> = {
  play: Play, music: Music, camera: Camera, users: Users,
  newspaper: Newspaper, 'image-icon': ImageIcon, 'file-text': FileText, globe: Globe,
}

type TileStyle = { accent: string; soft: string; image: string; textDark?: boolean }

const TILE_STYLES: Record<string, TileStyle> = {
  YouTube:   { accent: '#c85a40', soft: 'rgba(200,90,64,0.10)',  image: '/cur8/tile-ember.png' },
  TikTok:    { accent: '#c07878', soft: 'rgba(192,120,120,0.10)', image: '/cur8/tile-bloom.png' },
  Instagram: { accent: '#c07878', soft: 'rgba(192,120,120,0.10)', image: '/cur8/tile-bloom.png' },
  Facebook:  { accent: '#4a6d78', soft: 'rgba(74,109,120,0.10)', image: '/cur8/tile-tide.png' },
  Articles:  { accent: '#b8892a', soft: 'rgba(184,137,42,0.10)', image: '/cur8/tile-archive.png' },
  Images:    { accent: '#5a9e84', soft: 'rgba(90,158,132,0.10)', image: '/cur8/tile-sanctuary.png' },
  Documents: { accent: '#2e6b4f', soft: 'rgba(46,107,79,0.10)', image: '/cur8/tile-grove.png' },
  Web:       { accent: '#1a5c56', soft: 'rgba(26,92,86,0.10)',   image: '/cur8/tile-greenhouse.png' },
}

export default function Cur8Home() {
  const router = useRouter()
  const [items, setItems] = useState<Cur8Item[]>([])
  const [folders, setFolders] = useState<Cur8Folder[]>([])
  const [search, setSearch] = useState('')
  const [mounted, setMounted] = useState(false)
  const [greeting, setGreeting] = useState('Good morning')

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
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
    .slice(0, 6)

  const filtered = search.trim()
    ? items.filter((i) =>
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        i.category.toLowerCase().includes(search.toLowerCase())
      )
    : []

  const featured = CATEGORIES.slice(0, 2)
  const rest = CATEGORIES.slice(2)

  return (
    <div style={{ ...KOI, backgroundColor: 'var(--c-bg)', color: 'var(--c-text)', minHeight: '100vh', fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif' }}>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', height: '300px', overflow: 'hidden' }}>
        <Image
          src="/cur8/koi-pond.jpg"
          alt="Phoenix's garden"
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        {/* gradient fade to body */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,61,58,0.15) 0%, rgba(13,61,58,0.0) 45%, rgba(242,245,242,1) 100%)' }} />

        {/* top nav */}
        <nav style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--c-coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(200,90,64,0.4)' }}>
              <Leaf size={15} color="#fff" />
            </div>
            <span style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 18, fontWeight: 700, color: '#f5f0e8', textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>
              cur8
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: 'rgba(13,61,58,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <LogOut size={14} color="#f5f0e8" />
            </button>
          </div>
        </nav>

        {/* greeting */}
        <div style={{ position: 'absolute', bottom: 18, left: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-teal)', marginBottom: 2 }}>{greeting}, Phoenix</p>
          <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 28, fontWeight: 700, color: 'var(--c-teal)', lineHeight: 1.1 }}>
            {"Phoenix's Garden"}
          </h1>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px 80px' }}>

        {/* Search bar */}
        <div style={{ position: 'relative', marginTop: 16, marginBottom: 20 }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your garden..."
            style={{ width: '100%', paddingLeft: 38, paddingRight: 16, paddingTop: 11, paddingBottom: 11, borderRadius: 50, border: '1.5px solid var(--c-border)', backgroundColor: 'var(--c-surface)', color: 'var(--c-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box', boxShadow: '0 1px 4px rgba(13,61,58,0.06)' }}
          />
        </div>

        {/* Search results */}
        <AnimatePresence>
          {filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              style={{ backgroundColor: 'var(--c-surface)', border: '1.5px solid var(--c-border)', borderRadius: 16, padding: 12, marginBottom: 16, boxShadow: '0 4px 16px rgba(13,61,58,0.08)' }}
            >
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-muted)', marginBottom: 8 }}>{filtered.length} results</p>
              {filtered.map((item) => (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 10, textDecoration: 'none', color: 'var(--c-text)' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 50, backgroundColor: TILE_STYLES[item.category]?.soft, color: TILE_STYLES[item.category]?.accent }}>{item.category}</span>
                  <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                </a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick save row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 24 }}>
          {CATEGORIES.slice(0, 4).map((cat) => {
            const ts = TILE_STYLES[cat.name]
            const Icon = ICON_MAP[cat.lucideIcon]
            return (
              <Link key={cat.name} href={`/cur8/${cat.name.toLowerCase()}`} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 6px', borderRadius: 16, backgroundColor: 'var(--c-surface)', border: '1.5px solid var(--c-border)', cursor: 'pointer' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: ts.soft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {Icon && <Icon size={15} style={{ color: ts.accent }} />}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--c-text)', textAlign: 'center' }}>{cat.name}</span>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Recently tended */}
        {recent.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} style={{ color: 'var(--c-sage)' }} />
                <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 17, fontWeight: 600, color: 'var(--c-text)' }}>
                  Recently tended
                </h2>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              {recent.map((item, i) => {
                const ts = TILE_STYLES[item.category]
                return (
                  <motion.a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{ flexShrink: 0, width: 120, height: 80, borderRadius: 14, overflow: 'hidden', position: 'relative', textDecoration: 'none', display: 'block', border: '1.5px solid var(--c-border)' }}
                  >
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Image src={ts?.image ?? '/cur8/tile-grove.png'} alt={item.title} fill style={{ objectFit: 'cover' }} sizes="120px" />
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,61,58,0.85) 0%, transparent 55%)' }} />
                    <div style={{ position: 'absolute', bottom: 6, left: 7, right: 7 }}>
                      <p style={{ fontSize: 9, fontWeight: 600, color: '#f5f0e8', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.title}</p>
                    </div>
                    <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', backgroundColor: ts?.accent ?? '#5a9e84' }} />
                  </motion.a>
                )
              })}
            </div>
          </section>
        )}

        {/* Your Gardens */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 17, fontWeight: 600, color: 'var(--c-text)' }}>
            Your gardens
          </h2>
          <span style={{ fontSize: 11, color: 'var(--c-muted)' }}>{CATEGORIES.length} areas</span>
        </div>

        {/* Featured tiles — 2 tall side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {featured.map((cat) => {
            const ts = TILE_STYLES[cat.name]
            const Icon = ICON_MAP[cat.lucideIcon]
            const count = items.filter((i) => i.category === cat.name).length
            return (
              <Link key={cat.name} href={`/cur8/${cat.name.toLowerCase()}`} style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  style={{ position: 'relative', height: 200, borderRadius: 22, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 4px 20px rgba(13,61,58,0.10)', border: '1.5px solid var(--c-border)' }}
                >
                  <Image src={ts.image} alt={cat.name} fill style={{ objectFit: 'cover' }} sizes="200px" />
                  {/* gentle overlay */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(165deg, rgba(255,255,255,0.08) 0%, rgba(13,61,58,0.55) 100%)' }} />
                  {/* count chip */}
                  <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 50, backgroundColor: ts.accent }}>
                    {Icon && <Icon size={10} color="#fff" />}
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{count} saved</span>
                  </div>
                  <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14 }}>
                    <h3 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 20, fontWeight: 700, color: '#f5f0e8', textShadow: '0 2px 6px rgba(0,0,0,0.3)', marginBottom: 4 }}>{cat.name}</h3>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}>
                      <span style={{ fontSize: 10, color: '#f5f0e8', fontWeight: 500 }}>Open</span>
                      <ChevronRight size={9} color="#f5f0e8" />
                    </div>
                  </div>
                </motion.div>
              </Link>
            )
          })}
        </div>

        {/* Rest — 2-column grid of medium cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {rest.map((cat) => {
            const ts = TILE_STYLES[cat.name]
            const Icon = ICON_MAP[cat.lucideIcon]
            const count = items.filter((i) => i.category === cat.name).length
            return (
              <Link key={cat.name} href={`/cur8/${cat.name.toLowerCase()}`} style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', cursor: 'pointer', backgroundColor: 'var(--c-surface)', border: '1.5px solid var(--c-border)', boxShadow: '0 2px 10px rgba(13,61,58,0.06)' }}
                >
                  {/* image strip — top 75px */}
                  <div style={{ position: 'relative', height: 75, overflow: 'hidden' }}>
                    <Image src={ts.image} alt={cat.name} fill style={{ objectFit: 'cover' }} sizes="160px" />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(255,255,255,0.96) 100%)' }} />
                  </div>
                  {/* label row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px 10px' }}>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 13, fontWeight: 700, color: 'var(--c-text)', marginBottom: 1 }}>{cat.name}</h3>
                      <p style={{ fontSize: 10, color: 'var(--c-muted)' }}>{count} saved</p>
                    </div>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: ts.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {Icon && <Icon size={12} style={{ color: ts.accent }} />}
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
            <div style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: 'var(--c-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Plus size={24} color="#fff" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 20, fontWeight: 700, color: 'var(--c-text)', marginBottom: 6 }}>Your garden awaits</h2>
            <p style={{ fontSize: 13, color: 'var(--c-muted)', lineHeight: 1.6, maxWidth: 260, margin: '0 auto' }}>
              Pick a garden above and paste a link — Cur8 tends the rest.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
