'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { CATEGORIES, SEED_ITEMS, type Cur8Item, type Category } from '@/lib/cur8-store'
import { X, Plus, ExternalLink, Trash2, ArrowLeft, Loader2 } from 'lucide-react'

interface Props {
  category: Category
}

function getItems(): Cur8Item[] {
  if (typeof window === 'undefined') return SEED_ITEMS
  try {
    const stored = localStorage.getItem('cur8_items')
    return stored ? JSON.parse(stored) : SEED_ITEMS
  } catch {
    return SEED_ITEMS
  }
}

function saveItems(items: Cur8Item[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem('cur8_items', JSON.stringify(items))
}

export default function Cur8Category({ category }: Props) {
  const cat = CATEGORIES.find((c) => c.name === category)!
  const [items, setItems] = useState<Cur8Item[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [url, setUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [preview, setPreview] = useState<Partial<Cur8Item> | null>(null)
  const [fetchError, setFetchError] = useState('')

  useEffect(() => {
    setItems(getItems().filter((i) => i.category === category))
  }, [category])

  const allItems = getItems()
  const categoryItems = allItems.filter((i) => i.category === category)

  async function handleFetch() {
    if (!url.trim()) return
    setFetching(true)
    setFetchError('')
    setPreview(null)
    try {
      const res = await fetch(`/api/cur8/fetch-meta?url=${encodeURIComponent(url.trim())}`)
      if (!res.ok) throw new Error('Could not fetch')
      const data = await res.json()
      setPreview({ url: url.trim(), ...data })
    } catch {
      setFetchError('Could not fetch a preview — you can still save the link manually.')
      setPreview({ url: url.trim(), title: url.trim(), description: '', thumbnail: '' })
    } finally {
      setFetching(false)
    }
  }

  function handleSave() {
    if (!preview) return
    const newItem: Cur8Item = {
      id: Date.now().toString(),
      category,
      url: preview.url!,
      title: preview.title || preview.url!,
      description: preview.description || '',
      thumbnail: preview.thumbnail || '',
      favicon: preview.favicon || '',
      savedAt: new Date().toISOString(),
    }
    const updated = [newItem, ...allItems]
    saveItems(updated)
    setItems(updated.filter((i) => i.category === category))
    setShowAdd(false)
    setUrl('')
    setPreview(null)
  }

  function handleDelete(id: string) {
    const updated = allItems.filter((i) => i.id !== id)
    saveItems(updated)
    setItems(updated.filter((i) => i.category === category))
  }

  return (
    <div className="cur8 min-h-screen" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Header */}
      <header className="border-b px-6 py-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
        <div className="mx-auto max-w-6xl">
          <Link href="/cur8" className="mb-3 flex items-center gap-1.5 text-xs font-medium transition hover:opacity-70" style={{ color: 'var(--muted-foreground)' }}>
            <ArrowLeft size={12} /> Back to Cur8
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-3xl ${cat.color}`}>{cat.icon}</span>
              <div>
                <h1 className="font-serif text-3xl font-bold">{category}</h1>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{cat.description} · {categoryItems.length} saved</p>
              </div>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              <Plus size={15} /> Save link
            </button>
          </div>
        </div>
      </header>

      {/* Content grid */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {categoryItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className={`text-5xl ${cat.color}`}>{cat.icon}</span>
            <p className="mt-4 font-serif text-xl font-semibold">Nothing saved yet</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Paste a link and hit Save — the preview fetches automatically.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-6 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              Save your first {category} link
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence>
              {categoryItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  className="group relative rounded-2xl border bg-white overflow-hidden transition hover:shadow-md"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {/* Thumbnail */}
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className={`flex h-40 w-full items-center justify-center text-4xl ${cat.bg}`}>
                      <span className={cat.color}>{cat.icon}</span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug" style={{ color: 'var(--foreground)' }}>
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                        {item.description}
                      </p>
                    )}
                    <p className="mt-2 truncate text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {new URL(item.url).hostname.replace('www.', '')}
                    </p>
                  </div>

                  {/* Hover actions */}
                  <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow"
                    >
                      <ExternalLink size={13} className="text-slate-600" />
                    </a>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow"
                    >
                      <Trash2 size={13} className="text-red-500" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Add link modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 pb-4 sm:items-center"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowAdd(false); setPreview(null); setUrl('') } }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-serif text-xl font-bold">Save to {category}</h2>
                <button onClick={() => { setShowAdd(false); setPreview(null); setUrl('') }}>
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              {/* URL input */}
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleFetch() }}
                  placeholder="Paste a link here..."
                  className="flex-1 rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2"
                  style={{ borderColor: 'var(--border)' }}
                  autoFocus
                />
                <button
                  onClick={handleFetch}
                  disabled={fetching || !url.trim()}
                  className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {fetching ? <Loader2 size={14} className="animate-spin" /> : 'Fetch'}
                </button>
              </div>

              {fetchError && (
                <p className="mt-2 text-xs text-amber-600">{fetchError}</p>
              )}

              {/* Preview card */}
              {preview && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-xl border p-4"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}
                >
                  <div className="flex gap-3">
                    {preview.thumbnail ? (
                      <img src={preview.thumbnail} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className={`flex h-16 w-24 shrink-0 items-center justify-center rounded-lg text-2xl ${cat.bg}`}>
                        <span className={cat.color}>{cat.icon}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <input
                        className="w-full bg-transparent text-sm font-semibold outline-none"
                        value={preview.title || ''}
                        onChange={(e) => setPreview({ ...preview, title: e.target.value })}
                        placeholder="Title"
                      />
                      <input
                        className="mt-1 w-full bg-transparent text-xs outline-none"
                        style={{ color: 'var(--muted-foreground)' }}
                        value={preview.description || ''}
                        onChange={(e) => setPreview({ ...preview, description: e.target.value })}
                        placeholder="Description (optional)"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSave}
                    className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-white"
                    style={{ backgroundColor: 'var(--primary)' }}
                  >
                    Save to {category}
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
