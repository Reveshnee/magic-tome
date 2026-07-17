'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Play, Music, Camera, Users, Newspaper, ImageIcon, FileText, Globe,
  Search, LogOut, Plus, Sparkles, Clock, Leaf, ChevronRight,
} from 'lucide-react'
import { CATEGORIES, type Cur8Item, type Cur8Folder } from '@/lib/cur8-store'
import { getCur8Data } from '@/app/actions/cur8'
import { authClient } from '@/lib/auth-client'

const ICON_MAP: Record<string, React.ElementType> = {
  play: Play, music: Music, camera: Camera, users: Users,
  newspaper: Newspaper, 'image-icon': ImageIcon, 'file-text': FileText, globe: Globe,
}

/* Per-category koi palette accents */
const TILE_STYLES: Record<string, { accent: string; accentLight: string; image: string }> = {
  YouTube:   { accent: '#d4614a', accentLight: '#faecea', image: '/cur8/tile-ember.png' },
  TikTok:    { accent: '#c97a7a', accentLight: '#f9eded', image: '/cur8/tile-bloom.png' },
  Instagram: { accent: '#c97a7a', accentLight: '#f9eded', image: '/cur8/tile-bloom.png' },
  Facebook:  { accent: '#4a6d78', accentLight: '#e8f0f4', image: '/cur8/tile-tide.png' },
  Articles:  { accent: '#c4922a', accentLight: '#f5ede0', image: '/cur8/tile-archive.png' },
  Images:    { accent: '#5a9e84', accentLight: '#e8f4ef', image: '/cur8/tile-sanctuary.png' },
  Documents: { accent: '#2e6b4f', accentLight: '#e8f4ee', image: '/cur8/tile-grove.png' },
  Web:       { accent: '#1a5c56', accentLight: '#e4f0ee', image: '/cur8/tile-greenhouse.png' },
}

const hour = typeof window !== 'undefined' ? new Date().getHours() : 9
const GREETING = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

export default function Cur8Home() {
  const router = useRouter()
  const [items, setItems] = useState<Cur8Item[]>([])
  const [folders, setFolders] = useState<Cur8Folder[]>([])
  const [search, setSearch] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
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
    .slice(0, 5)

  const filtered = search.trim()
    ? items.filter((i) =>
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        i.category.toLowerCase().includes(search.toLowerCase())
      )
    : []

  /* Split categories: first two are featured (large tiles), rest are small */
  const featured = CATEGORIES.slice(0, 2)
  const small = CATEGORIES.slice(2)

  return (
    <div className="cur8 min-h-screen" style={{ backgroundColor: 'var(--cur8-body)', color: 'var(--foreground)' }}>

      {/* ── Hero — full-bleed koi pond ── */}
      <div className="relative overflow-hidden" style={{ height: '280px' }}>
        <Image
          src="/cur8/koi-pond.jpg"
          alt="Phoenix's garden"
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        {/* fade to body at bottom */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(13,61,58,0.2) 0%, rgba(238,242,238,0) 50%, rgba(238,242,238,1) 100%)' }}
        />

        {/* Nav bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--cur8-coral)' }}>
              <Leaf size={14} color="#fff" />
            </div>
            <span className="font-serif text-base font-bold" style={{ color: '#f5f0e8', textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}>
              cur8
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Search pill */}
            <div
              className="hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5"
              style={{ backgroundColor: 'rgba(13,61,58,0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.22)', width: '175px' }}
            >
              <Search size={12} style={{ color: 'rgba(245,240,232,0.75)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your garden..."
                className="bg-transparent outline-none text-xs w-full"
                style={{ color: '#f5f0e8' }}
              />
            </div>
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(13,61,58,0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.22)' }}
            >
              <LogOut size={14} style={{ color: '#f5f0e8' }} />
            </button>
          </div>
        </div>

        {/* Greeting — sits over the fade */}
        <div className="absolute bottom-5 left-5">
          <p className="text-sm font-medium" style={{ color: '#1a2e2b' }}>{GREETING}, Phoenix</p>
          <h1 className="font-serif text-3xl font-bold leading-tight" style={{ color: '#1a2e2b' }}>
            {"Phoenix's Garden"}
          </h1>
        </div>
      </div>

      {/* Search results overlay */}
      <AnimatePresence>
        {filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mx-4 mt-2 rounded-2xl border p-3"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--cur8-card)', boxShadow: '0 4px 16px rgba(13,61,58,0.1)' }}
          >
            <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              {filtered.length} results
            </p>
            <div className="space-y-1">
              {filtered.map((item) => (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-xl p-2 text-sm font-medium transition hover:bg-white"
                  style={{ color: 'var(--foreground)' }}>
                  <span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                    {item.category}
                  </span>
                  <span className="truncate">{item.title}</span>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-2xl px-4 pb-16">

        {/* Stats + quick add */}
        <div className="mt-4 mb-5 flex items-center gap-3">
          {mounted && items.length > 0 && (
            <>
              <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {items.length} things tended
              </span>
              <span style={{ color: 'var(--muted-foreground)' }}>·</span>
              <div className="flex items-center gap-1">
                <Sparkles size={12} style={{ color: 'var(--cur8-gold)' }} />
                <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  {CATEGORIES.length} gardens
                </span>
              </div>
            </>
          )}
        </div>

        {/* Quick add pill */}
        <Link href={`/cur8/${CATEGORIES[0].name.toLowerCase()}`}>
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-7 cursor-pointer transition hover:shadow-md"
            style={{ backgroundColor: 'var(--cur8-card)', border: '1.5px solid rgba(13,61,58,0.1)', boxShadow: '0 2px 12px rgba(13,61,58,0.06)' }}
          >
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--cur8-coral)' }}>
              <Plus size={14} color="#fff" />
            </div>
            <span className="flex-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Paste a link to tend your garden...
            </span>
            <div className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--cur8-teal)', color: 'var(--cur8-cream)' }}>
              Add
            </div>
          </div>
        </Link>

        {/* Recently tended */}
        {recent.length > 0 && (
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={13} style={{ color: 'var(--cur8-sage)' }} />
                <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                  Recently tended
                </h2>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {recent.map((item, i) => {
                const style = TILE_STYLES[item.category]
                return (
                  <motion.a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative flex-none overflow-hidden rounded-2xl cursor-pointer"
                    style={{ width: '130px', height: '84px', border: '1.5px solid rgba(13,61,58,0.07)', boxShadow: '0 2px 8px rgba(13,61,58,0.08)' }}
                  >
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <Image src={style?.image ?? '/cur8/tile-grove.png'} alt={item.title} fill className="object-cover" sizes="130px" />
                    )}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(13,61,58,0.82) 0%, transparent 55%)' }} />
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="line-clamp-2 font-medium leading-tight" style={{ color: '#f5f0e8', fontSize: '9px' }}>{item.title}</p>
                    </div>
                    <div className="absolute top-2 right-2 h-2 w-2 rounded-full" style={{ backgroundColor: style?.accent ?? '#5a9e84' }} />
                  </motion.a>
                )
              })}
            </div>
          </section>
        )}

        {/* Your Gardens header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Your gardens
          </h2>
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {CATEGORIES.length} areas
          </span>
        </div>

        {/* Bento grid */}
        <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>

          {/* Row 1: featured left (tall), two small stacked right */}
          <div style={{ gridRow: 'span 2' }}>
            <FeaturedTile cat={featured[0]} count={items.filter(i => i.category === featured[0].name).length} />
          </div>
          <SmallTile cat={small[0]} count={items.filter(i => i.category === small[0].name).length} />
          <SmallTile cat={small[1]} count={items.filter(i => i.category === small[1].name).length} />

          {/* Row 2: two small left, featured right */}
          <SmallTile cat={small[2]} count={items.filter(i => i.category === small[2].name).length} />
          <div style={{ gridRow: 'span 2' }}>
            <FeaturedTile cat={featured[1]} count={items.filter(i => i.category === featured[1].name).length} />
          </div>

          {/* Row 3 */}
          <SmallTile cat={small[3]} count={items.filter(i => i.category === small[3].name).length} />

          {/* Row 4: remaining two */}
          <SmallTile cat={small[4]} count={items.filter(i => i.category === small[4].name).length} />
          <SmallTile cat={small[5]} count={items.filter(i => i.category === small[5].name).length} />
        </div>

        {/* Empty state */}
        {mounted && items.length === 0 && (
          <div className="mt-12 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl" style={{ backgroundColor: 'var(--cur8-sage)' }}>
              <Sparkles size={28} color="#fff" />
            </div>
            <h2 className="mt-4 font-serif text-xl font-bold">Your garden awaits</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              Pick a category and paste a link — Cur8 tends the rest.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Featured tile (tall) ──────────────────────────────────────────── */
function FeaturedTile({ cat, count }: { cat: typeof CATEGORIES[0]; count: number }) {
  const Icon = ICON_MAP[cat.lucideIcon]
  const style = TILE_STYLES[cat.name]
  return (
    <Link href={`/cur8/${cat.name.toLowerCase()}`}>
      <div
        className="group relative cursor-pointer overflow-hidden"
        style={{ borderRadius: '24px', height: '280px', boxShadow: '0 4px 20px rgba(13,61,58,0.12)', border: `1.5px solid ${style.accentLight}` }}
      >
        <Image src={style.image} alt={cat.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="200px" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(170deg, rgba(0,0,0,0.04) 0%, rgba(13,61,58,0.70) 100%)' }} />
        <div className="absolute inset-0 flex flex-col justify-between p-5">
          <div
            className="inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1"
            style={{ backgroundColor: style.accent }}
          >
            {Icon && <Icon size={11} color="#fff" />}
            <span className="text-xs font-semibold text-white">{count} saved</span>
          </div>
          <div>
            <h3 className="font-serif text-2xl font-bold leading-tight" style={{ color: '#f5f0e8', textShadow: '0 2px 8px rgba(0,0,0,0.35)' }}>
              {cat.name}
            </h3>
            <p className="mt-1 text-sm" style={{ color: 'rgba(245,240,232,0.72)' }}>{cat.description}</p>
            <div
              className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)', color: '#f5f0e8', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              Open garden <ChevronRight size={11} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

/* ── Small tile ────────────────────────────────────────────────────── */
function SmallTile({ cat, count }: { cat: typeof CATEGORIES[0]; count: number }) {
  const Icon = ICON_MAP[cat.lucideIcon]
  const style = TILE_STYLES[cat.name]
  return (
    <Link href={`/cur8/${cat.name.toLowerCase()}`}>
      <div
        className="group relative cursor-pointer overflow-hidden flex flex-col"
        style={{ borderRadius: '20px', height: '128px', backgroundColor: 'var(--cur8-card)', boxShadow: '0 2px 10px rgba(13,61,58,0.07)', border: `1.5px solid ${style.accentLight}` }}
      >
        {/* image strip */}
        <div className="relative flex-1 overflow-hidden" style={{ borderRadius: '18px 18px 0 0' }}>
          <Image src={style.image} alt={cat.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="160px" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(247,249,247,0.92) 100%)' }} />
        </div>
        {/* label row */}
        <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: 'var(--cur8-card)' }}>
          <div>
            <h3 className="font-serif text-sm font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>{cat.name}</h3>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{count} saved</p>
          </div>
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: style.accentLight }}>
            {Icon && <Icon size={13} style={{ color: style.accent }} />}
          </div>
        </div>
      </div>
    </Link>
  )
}
