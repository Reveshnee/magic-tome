'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Play, Music, Camera, Users, Newspaper, ImageIcon, FileText, Globe,
  Clock, Search, Sparkles, ChevronRight, LogOut,
} from 'lucide-react'
import { CATEGORIES, type Cur8Item, type Cur8Folder } from '@/lib/cur8-store'
import { getCur8Data } from '@/app/actions/cur8'
import { authClient } from '@/lib/auth-client'

const MOOD_IMAGES = [
  { src: '/cur8/mood-cozy.jpg', label: 'Still moments' },
  { src: '/cur8/mood-coast.png', label: 'Dreaming of elsewhere' },
]

const ICON_MAP: Record<string, React.ElementType> = {
  play: Play,
  music: Music,
  camera: Camera,
  users: Users,
  newspaper: Newspaper,
  'image-icon': ImageIcon,
  'file-text': FileText,
  globe: Globe,
}

export default function Cur8Home() {
  const router = useRouter()
  const [items, setItems] = useState<Cur8Item[]>([])
  const [folders, setFolders] = useState<Cur8Folder[]>([])
  const [search, setSearch] = useState('')
  const [mounted, setMounted] = useState(false)
  const [moodIndex, setMoodIndex] = useState(0)

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

  useEffect(() => {
    const timer = setInterval(() => {
      setMoodIndex((prev) => (prev + 1) % MOOD_IMAGES.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const recent = [...items]
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
    .slice(0, 6)

  const filtered = search.trim()
    ? items.filter((i) =>
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        i.category.toLowerCase().includes(search.toLowerCase())
      )
    : []

  return (
    <div className="cur8 relative min-h-screen overflow-x-hidden"
      style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>

      {/* Ambient orbs — purely decorative, pointer-events-none */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #c4a0e8, transparent 70%)' }} />
        <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f0a0bf, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #a0c8f0, transparent 70%)' }} />
      </div>

      {/* ── Header ── */}
      <header className="relative border-b px-5 py-6 sm:px-10"
        style={{ borderColor: 'var(--border)', backgroundColor: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(12px)' }}>
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-4">

            {/* Brand */}
            <div>
              <div className="flex items-baseline gap-1">
                <h1 className="font-serif text-4xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
                  Cur
                </h1>
                <span className="font-serif text-4xl font-bold"
                  style={{ background: 'linear-gradient(135deg, var(--cur8-lilac), var(--cur8-rose))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  8
                </span>
              </div>
              <p className="mt-0.5 text-xs font-medium tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                {mounted ? `${items.length} things saved` : 'Your personal sanctuary'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative flex-1 max-w-xs hidden sm:block">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--muted-foreground)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your collection..."
                  className="w-full rounded-full border py-2 pl-8 pr-4 text-sm outline-none transition focus:ring-2"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--muted)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                aria-label="Sign out"
                className="flex h-9 w-9 items-center justify-center rounded-full border transition hover:bg-white"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}
              >
                <LogOut size={15} style={{ color: 'var(--muted-foreground)' }} />
              </button>
            </div>
          </div>

          {/* Search results */}
          <AnimatePresence>
            {filtered.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-3 rounded-2xl border p-3"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
              >
                <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                  {filtered.length} results
                </p>
                <div className="space-y-1">
                  {filtered.map((item) => (
                    <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2.5 rounded-xl p-2 text-sm font-medium transition hover:bg-violet-50"
                      style={{ color: 'var(--foreground)' }}>
                      <span className="rounded-full px-2 py-0.5 text-xs"
                        style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                        {item.category}
                      </span>
                      <span className="truncate">{item.title}</span>
                    </a>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-5 py-10 sm:px-10">

        {/* ── Welcome line ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="font-serif text-2xl font-medium leading-snug" style={{ color: 'var(--foreground)' }}>
            Welcome back, Reveshnee.
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Everything you love, in one beautiful place.
          </p>
        </motion.div>

        {/* ── Mood banner ── */}
        <div className="relative mb-10 overflow-hidden rounded-3xl" style={{ height: '220px' }}>
          <AnimatePresence mode="wait">
            {MOOD_IMAGES.map((img, i) =>
              i === moodIndex ? (
                <motion.div
                  key={img.src}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={img.src}
                    alt={img.label}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 768px) 100vw, 960px"
                    priority={i === 0}
                  />
                  {/* overlay */}
                  <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(42,26,53,0.55) 0%, transparent 55%)' }} />
                  {/* label */}
                  <div className="absolute bottom-4 left-5">
                    <p className="font-serif text-sm italic text-white/90">{img.label}</p>
                  </div>
                  {/* dot indicators */}
                  <div className="absolute bottom-4 right-5 flex gap-1.5">
                    {MOOD_IMAGES.map((_, j) => (
                      <button
                        key={j}
                        onClick={() => setMoodIndex(j)}
                        aria-label={`Show image ${j + 1}`}
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: j === moodIndex ? '20px' : '6px',
                          backgroundColor: j === moodIndex ? 'white' : 'rgba(255,255,255,0.45)',
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : null
            )}
          </AnimatePresence>

          {/* Frosted glass quote */}
          <div className="absolute left-5 top-5 rounded-2xl px-4 py-2.5"
            style={{ backgroundColor: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)' }}>
            <p className="font-serif text-sm font-medium text-white">
              {mounted ? `${items.length} things saved` : 'Your sanctuary'}
            </p>
          </div>
        </div>

        {/* ── Category grid ── */}
        <section className="mb-12">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
              Your categories
            </h2>
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {folders.length} folders total
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CATEGORIES.map((cat, i) => {
              const Icon = ICON_MAP[cat.lucideIcon]
              const count = items.filter((item) => item.category === cat.name).length
              const folderCount = folders.filter((f) => f.category === cat.name).length

              return (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, type: 'spring', stiffness: 260, damping: 22 }}
                >
                  <Link href={`/cur8/${cat.name.toLowerCase()}`}>
                    <div className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-gradient-to-br p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${cat.tileFrom} ${cat.tileTo} ${cat.border}`}>

                      {/* shimmer on hover */}
                      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, transparent 60%)' }} />

                      {/* Icon circle */}
                      <div className={`relative mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 shadow-sm`}>
                        {Icon && <Icon size={19} className={cat.accent} />}
                      </div>

                      <h3 className="relative text-sm font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
                        {cat.name}
                      </h3>
                      <p className="relative mt-0.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {cat.description}
                      </p>

                      {/* Footer row */}
                      <div className="relative mt-3 flex items-center justify-between">
                        <span className={`text-xs font-semibold ${cat.accent}`}>
                          {count} {count === 1 ? 'item' : 'items'}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Open</span>
                          <ChevronRight size={11} style={{ color: 'var(--muted-foreground)' }} />
                        </div>
                      </div>

                      {folderCount > 0 && (
                        <div className="relative mt-1.5">
                          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                            {folderCount} {folderCount === 1 ? 'folder' : 'folders'}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* ── Recently saved ── */}
        {recent.length > 0 && (
          <section>
            <div className="mb-5 flex items-center gap-2">
              <Clock size={14} style={{ color: 'var(--cur8-lilac)' }} />
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
                Recently saved
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {recent.map((item, i) => {
                const cat = CATEGORIES.find((c) => c.name === item.category)
                const Icon = cat ? ICON_MAP[cat.lucideIcon] : null
                return (
                  <motion.a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group relative overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {/* shimmer */}
                    <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-10"
                      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%)' }} />

                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.title}
                        className="h-24 w-full object-cover" />
                    ) : (
                      <div className={`flex h-24 w-full items-center justify-center bg-gradient-to-br ${cat?.tileFrom} ${cat?.tileTo}`}>
                        {Icon && <Icon size={22} className={cat?.accent} />}
                      </div>
                    )}
                    <div className="p-2.5">
                      <p className="line-clamp-2 text-xs font-semibold leading-snug" style={{ color: 'var(--foreground)' }}>
                        {item.title}
                      </p>
                      <span className={`mt-1 block text-xs font-medium ${cat?.accent ?? ''}`}>
                        {item.category}
                      </span>
                    </div>
                  </motion.a>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Empty state ── */}
        {items.length === 0 && (
          <section className="mt-16 flex flex-col items-center text-center">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl"
              style={{ background: 'linear-gradient(135deg, var(--cur8-lilac), var(--cur8-rose))' }}>
              <Sparkles size={32} className="text-white" />
            </div>
            <h2 className="mt-5 font-serif text-2xl font-bold">Your space awaits</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              Pick a category, paste a link — Cur8 takes care of the rest.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
