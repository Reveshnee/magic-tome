'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Play, Music, Camera, Users, Newspaper, ImageIcon, FileText, Globe,
  FolderOpen, Clock, Search, Sparkles,
} from 'lucide-react'
import { CATEGORIES, loadItems, loadFolders, type Cur8Item, type Cur8Folder } from '@/lib/cur8-store'

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
  const [items, setItems] = useState<Cur8Item[]>([])
  const [folders, setFolders] = useState<Cur8Folder[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    setItems(loadItems())
    setFolders(loadFolders())
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
    <div className="cur8 min-h-screen" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>

      {/* ── Header ── */}
      <header className="border-b px-5 py-5 sm:px-8" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
                Cur<span style={{ color: 'var(--cur8-teal)' }}>8</span>
              </h1>
              <p className="mt-0.5 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                Your personal content library · {items.length} saved
              </p>
            </div>
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search everything..."
                className="w-56 rounded-xl border py-2 pl-8 pr-3 text-sm outline-none transition focus:ring-2"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}
              />
            </div>
          </div>

          {/* Search results */}
          {filtered.length > 0 && (
            <div className="mt-3 rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}>
              <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>{filtered.length} results</p>
              <div className="space-y-1.5">
                {filtered.map((item) => (
                  <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg p-2 transition hover:bg-white text-sm font-medium"
                    style={{ color: 'var(--foreground)' }}>
                    <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
                      style={{ backgroundColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                      {item.category}
                    </span>
                    {item.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">

        {/* ── Category grid ── */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <FolderOpen size={15} style={{ color: 'var(--cur8-teal)' }} />
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
              Categories
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CATEGORIES.map((cat, i) => {
              const Icon = ICON_MAP[cat.lucideIcon]
              const count = items.filter((item) => item.category === cat.name).length
              const folderCount = folders.filter((f) => f.category === cat.name).length

              return (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/cur8/${cat.name.toLowerCase()}`}>
                    <div className={`group cursor-pointer rounded-2xl border bg-gradient-to-br p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${cat.tileFrom} ${cat.tileTo} ${cat.border}`}>
                      {/* Icon */}
                      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${cat.tileFrom}`}
                        style={{ boxShadow: '0 1px 4px 0 rgba(0,0,0,0.06)' }}>
                        {Icon && <Icon size={18} className={cat.accent} />}
                      </div>

                      <h3 className="font-semibold text-sm leading-tight" style={{ color: 'var(--foreground)' }}>
                        {cat.name}
                      </h3>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {cat.description}
                      </p>

                      {/* Stats row */}
                      <div className="mt-3 flex items-center justify-between">
                        <span className={`text-xs font-semibold ${cat.accent}`}>
                          {count} {count === 1 ? 'item' : 'items'}
                        </span>
                        {folderCount > 0 && (
                          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                            {folderCount} {folderCount === 1 ? 'folder' : 'folders'}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* ── Recently saved ── */}
        {recent.length > 0 && (
          <section className="mt-10">
            <div className="mb-4 flex items-center gap-2">
              <Clock size={15} style={{ color: 'var(--cur8-teal)' }} />
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
                    transition={{ delay: i * 0.04 }}
                    className="group rounded-xl border bg-white p-3 transition hover:shadow-sm hover:-translate-y-0.5"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.title}
                        className="mb-2 h-20 w-full rounded-lg object-cover" />
                    ) : (
                      <div className={`mb-2 flex h-20 w-full items-center justify-center rounded-lg bg-gradient-to-br ${cat?.tileFrom} ${cat?.tileTo}`}>
                        {Icon && <Icon size={22} className={cat?.accent} />}
                      </div>
                    )}
                    <p className="line-clamp-2 text-xs font-medium leading-snug" style={{ color: 'var(--foreground)' }}>
                      {item.title}
                    </p>
                    <span className={`mt-1 block text-xs font-semibold ${cat?.accent}`}>{item.category}</span>
                  </motion.a>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Empty state ── */}
        {items.length === 0 && (
          <section className="mt-16 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: 'var(--muted)' }}>
              <Sparkles size={28} style={{ color: 'var(--cur8-teal)' }} />
            </div>
            <h2 className="mt-4 font-serif text-xl font-bold">Start saving things you love</h2>
            <p className="mt-1.5 max-w-xs text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              Pick a category above, paste a link, and Cur8 pulls the preview for you automatically.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
