'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  Play, Music, Camera, Users, Newspaper, ImageIcon, FileText, Globe,
  ArrowLeft, Plus, X, Loader2, ExternalLink, Trash2, FolderPlus,
  Folder, FolderOpen, Check, MoreVertical, Copy, FolderInput, Leaf,
} from 'lucide-react'
import {
  CATEGORIES,
  type Cur8Item, type Cur8Folder, type Category,
} from '@/lib/cur8-store'
import {
  getCur8Data,
  createItem as createItemAction,
  moveItem as moveItemAction,
  duplicateItem as duplicateItemAction,
  deleteItem as deleteItemAction,
  createFolder as createFolderAction,
  deleteFolder as deleteFolderAction,
} from '@/app/actions/cur8'

const ICON_MAP: Record<string, React.ElementType> = {
  play: Play, music: Music, camera: Camera, users: Users,
  newspaper: Newspaper, 'image-icon': ImageIcon, 'file-text': FileText, globe: Globe,
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.includes('/shorts/')) return u.pathname.split('/shorts/')[1]?.split('?')[0] ?? null
      return u.searchParams.get('v')
    }
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0]
  } catch {}
  return null
}

// Derive a thumbnail from the URL when none is stored
function getThumbnailFromUrl(url: string, stored: string | undefined): string {
  if (stored) return stored
  try {
    const u = new URL(url)
    // YouTube
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return `https://img.youtube.com/vi/${v}/hqdefault.jpg`
    }
    if (u.hostname === 'youtu.be') {
      const v = u.pathname.slice(1).split('?')[0]
      if (v) return `https://img.youtube.com/vi/${v}/hqdefault.jpg`
    }
    if (u.hostname.includes('youtube.com') && u.pathname.includes('/shorts/')) {
      const v = u.pathname.split('/shorts/')[1]?.split('?')[0]
      if (v) return `https://img.youtube.com/vi/${v}/hqdefault.jpg`
    }
  } catch {}
  return ''
}

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

interface Props { category: Category }

export default function Cur8Category({ category }: Props) {
  const cat = CATEGORIES.find((c) => c.name === category)!
  const Icon = ICON_MAP[cat.lucideIcon]
  const tileStyle = TILE_STYLES[category] ?? { accent: '#5a9e84', accentLight: '#e8f4ef', image: '/cur8/tile-grove.png' }

  const [allItems, setAllItems] = useState<Cur8Item[]>([])
  const [folders, setFolders] = useState<Cur8Folder[]>([])
  const [activeFolder, setActiveFolder] = useState<string | null>(null) // null = All
  const [showAdd, setShowAdd] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [selectedFolderForItem, setSelectedFolderForItem] = useState<string | undefined>(undefined)

  // Context menu state
  const [menuItemId, setMenuItemId] = useState<string | null>(null)
  const [moveItemId, setMoveItemId] = useState<string | null>(null)

  // Add modal state
  const [url, setUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [preview, setPreview] = useState<Partial<Cur8Item> | null>(null)
  const [multiPreviews, setMultiPreviews] = useState<(Partial<Cur8Item> & { selected: boolean })[]>([])
  const [selectedItem, setSelectedItem] = useState<Cur8Item | null>(null)
  const [fetchError, setFetchError] = useState('')

  function refresh() {
    return getCur8Data().then((data) => {
      setAllItems(data.items as Cur8Item[])
      setFolders((data.folders as Cur8Folder[]).filter((f) => f.category === category))
    })
  }

  useEffect(() => {
    refresh().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  useEffect(() => {
    if (!menuItemId) return
    function handleOutside() { setMenuItemId(null); setMoveItemId(null) }
    document.addEventListener('click', handleOutside)
    return () => document.removeEventListener('click', handleOutside)
  }, [menuItemId])

  const catItems = allItems.filter((i) => i.category === category)
  const visibleItems = activeFolder === null
    ? catItems
    : catItems.filter((i) => i.folderId === activeFolder)

  // ── Folder actions ──
  async function createFolder() {
    if (!newFolderName.trim()) return
    const folder = await createFolderAction(category, newFolderName.trim())
    setFolders((prev) => [folder as Cur8Folder, ...prev])
    setNewFolderName('')
    setShowNewFolder(false)
    setActiveFolder(folder.id)
  }

  async function deleteFolder(id: string) {
    await deleteFolderAction(id)
    if (activeFolder === id) setActiveFolder(null)
    await refresh()
  }

  // ── Multi-link fetch & save ──
  function normaliseUrl(raw: string) {
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  }

  // Extract all URLs from a pasted block of text (one per line, or space-separated)
  function extractUrls(text: string): string[] {
    return text
      .split(/[\n\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map(normaliseUrl)
  }

  async function handleFetch() {
    if (!url.trim()) return
    const urls = extractUrls(url)
    if (urls.length === 0) return

    setFetching(true)
    setFetchError('')
    setMultiPreviews([])
    setPreview(null)

    if (urls.length === 1) {
      // Single URL — existing behaviour
      const normalised = urls[0]
      setUrl(normalised)
      try {
        const res = await fetch(`/api/cur8/fetch-meta?url=${encodeURIComponent(normalised)}`)
        if (!res.ok) throw new Error('fetch failed')
        const data = await res.json()
        setPreview({ url: normalised, ...data })
      } catch {
        setFetchError('Could not auto-fetch — you can still save manually.')
        setPreview({ url: normalised, title: normalised, description: '', thumbnail: '' })
      } finally {
        setFetching(false)
      }
    } else {
      // Multiple URLs — fetch all in parallel
      setUrl(`${urls.length} links detected`)
      const results = await Promise.all(
        urls.map(async (u) => {
          try {
            const res = await fetch(`/api/cur8/fetch-meta?url=${encodeURIComponent(u)}`)
            if (!res.ok) throw new Error('fetch failed')
            const data = await res.json()
            return { url: u, ...data, selected: true }
          } catch {
            return { url: u, title: u, description: '', thumbnail: '', favicon: '', selected: true }
          }
        })
      )
      setMultiPreviews(results)
      setFetching(false)
    }
  }

  async function handleSave() {
    // Multi-link save
    if (multiPreviews.length > 0) {
      const toSave = multiPreviews.filter((p) => p.selected)
      const created = await Promise.all(
        toSave.map((p) =>
          createItemAction({
            category,
            folderId: selectedFolderForItem,
            url: p.url ?? '',
            title: p.title || p.url || '',
            description: p.description || undefined,
            thumbnail: p.thumbnail || undefined,
            favicon: p.favicon || undefined,
          })
        )
      )
      setAllItems((prev) => [...(created.filter(Boolean) as Cur8Item[]), ...prev])
      closeModal()
      return
    }
    // Single-link save
    if (!preview) return
    const created = await createItemAction({
      category,
      folderId: selectedFolderForItem,
      url: preview.url!,
      title: preview.title || preview.url!,
      description: preview.description || undefined,
      thumbnail: preview.thumbnail || undefined,
      favicon: preview.favicon || undefined,
    })
    setAllItems((prev) => [created as Cur8Item, ...prev])
    closeModal()
  }

  async function handleDelete(id: string) {
    setAllItems((prev) => prev.filter((i) => i.id !== id))
    await deleteItemAction(id)
  }

  async function handleDuplicate(id: string) {
    setMenuItemId(null)
    const copy = await duplicateItemAction(id)
    if (copy) setAllItems((prev) => [copy as Cur8Item, ...prev])
  }

  async function handleMoveToFolder(itemId: string, folderId: string | undefined) {
    setAllItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, folderId } : i))
    )
    setMoveItemId(null)
    setMenuItemId(null)
    await moveItemAction(itemId, folderId)
  }

  function closeModal() {
    setShowAdd(false)
    setUrl('')
    setPreview(null)
    setMultiPreviews([])
    setFetchError('')
    setSelectedFolderForItem(undefined)
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ backgroundColor: '#f2f5f2', color: '#1a2e2b', fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif' }}>

      {/* ── Category banner ── */}
      <div className="relative overflow-hidden" style={{ height: '160px' }}>
        <Image
          src={tileStyle.image}
          alt={category}
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(13,61,58,0.15) 0%, rgba(242,245,242,0) 40%, rgba(242,245,242,1) 100%)' }}
        />

        {/* Nav inside banner */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-4">
          <Link
            href="/cur8"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
            style={{ backgroundColor: 'rgba(13,61,58,0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.22)', color: '#f5f0e8' }}
          >
            <ArrowLeft size={11} /> Garden
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(13,61,58,0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.22)' }}>
              <Leaf size={12} color="#f5f0e8" />
            </div>
          </div>
        </div>

        {/* Title over banner */}
        <div className="absolute bottom-4 left-5 flex items-end justify-between right-5">
          <div>
            <h1 className="font-serif text-2xl font-bold" style={{ color: '#1a2e2b' }}>{cat.displayName}</h1>
            <p className="text-xs" style={{ color: '#3d5552' }}>{cat.description} · {catItems.length} saved</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 active:scale-95"
            style={{ backgroundColor: tileStyle.accent, boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}
          >
            <Plus size={13} /> Save link
          </button>
        </div>
      </div>

      {/* ── Three-panel body ── */}
      <div className="flex h-[calc(100vh-160px)] overflow-hidden">

        {/* Panel 1: Folders + saved items list */}
        <div className="flex w-64 shrink-0 flex-col border-r overflow-hidden" style={{ borderColor: 'rgba(13,61,58,0.08)', backgroundColor: '#f7faf7' }}>

        {/* Folders header */}
        <div className="px-3 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6b8884' }}>
                Folders
              </span>
              <button
                onClick={() => setShowNewFolder(true)}
                className="rounded-lg p-1 transition hover:opacity-70"
                title="New folder"
                style={{ color: '#0d3d3a' }}
              >
                <FolderPlus size={15} />
              </button>
            </div>

            {/* New folder input */}
            <AnimatePresence>
              {showNewFolder && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-2 overflow-hidden"
                >
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) createFolder()
                        if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName('') }
                      }}
                      placeholder="Folder name"
                      className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-xs outline-none focus:ring-1"
                      style={{ borderColor: 'rgba(13,61,58,0.12)' }}
                      autoFocus
                    />
                    <button onClick={createFolder} className="rounded-lg p-1.5 text-white"
                      style={{ backgroundColor: '#0d3d3a' }}>
                      <Check size={12} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Folder list */}
            <nav className="space-y-0.5">
              {/* All */}
              <button
                onClick={() => setActiveFolder(null)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition ${activeFolder === null ? 'font-semibold text-white' : 'hover:bg-white'}`}
                style={activeFolder === null ? { backgroundColor: '#0d3d3a', color: '#fff' } : { color: '#1a2e2b' }}
              >
                <FolderOpen size={14} />
                <span>All</span>
                <span className="ml-auto text-xs opacity-70">{catItems.length}</span>
              </button>

              {folders.map((folder) => {
                const count = catItems.filter((i) => i.folderId === folder.id).length
                const isActive = activeFolder === folder.id
                return (
                  <div key={folder.id} className="group relative">
                    <button
                      onClick={() => setActiveFolder(folder.id)}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition ${isActive ? 'font-semibold text-white' : 'hover:bg-white'}`}
                      style={isActive ? { backgroundColor: '#5a9e84', color: '#fff' } : { color: '#1a2e2b' }}
                    >
                      <Folder size={14} />
                      <span className="truncate">{folder.name}</span>
                      <span className="ml-auto text-xs opacity-70">{count}</span>
                    </button>
                    <button
                      onClick={() => deleteFolder(folder.id)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 hidden rounded p-0.5 text-red-400 group-hover:flex"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )
              })}

              {folders.length === 0 && (
                <p className="px-3 py-2 text-xs italic" style={{ color: '#6b8884' }}>
                  No folders yet
                </p>
              )}
            </nav>
        </div>{/* end folders header */}

        {/* Scrollable items list inside panel 1 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-2">
              <p className="font-serif text-sm font-semibold">Nothing here yet</p>
              <p className="mt-1 text-xs" style={{ color: '#6b8884' }}>Save a link to get started</p>
              <button onClick={() => setShowAdd(true)} className="mt-3 rounded-xl px-4 py-2 text-xs font-semibold text-white" style={{ backgroundColor: '#0d3d3a' }}>
                Save link
              </button>
            </div>
          ) : visibleItems.map((item) => {
            const thumb = getThumbnailFromUrl(item.url, item.thumbnail)
            const isActive = selectedItem?.id === item.id
            return (
              <button
                key={item.id}
                onClick={() => setSelectedItem(isActive ? null : item)}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-white"
                style={{ backgroundColor: isActive ? 'white' : 'transparent', boxShadow: isActive ? '0 1px 6px rgba(13,61,58,0.08)' : 'none' }}
              >
                {thumb ? (
                  <img src={thumb} alt="" className="h-9 w-14 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className={`flex h-9 w-14 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${cat.tileFrom} ${cat.tileTo}`}>
                    {Icon && <Icon size={14} className={cat.accent} />}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-xs font-semibold" style={{ color: '#1a2e2b' }}>{item.title}</p>
                  <p className="truncate text-xs" style={{ color: '#6b8884' }}>
                    {(() => { try { return new URL(item.url).hostname.replace('www.', '') } catch { return item.url } })()}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        </div>{/* end panel 1 */}

        {/* Panel 2: Centre — media preview */}
        <div className="flex flex-1 flex-col overflow-hidden" style={{ backgroundColor: '#f2f5f2' }}>
          {selectedItem ? (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Embed or thumbnail */}
              <div className="relative w-full" style={{ paddingTop: '56.25%', backgroundColor: '#0d3d3a' }}>
                {(() => {
                  const ytId = extractYouTubeId(selectedItem.url)
                  if (ytId) {
                    return (
                      <iframe
                        className="absolute inset-0 h-full w-full"
                        src={`https://www.youtube.com/embed/${ytId}?autoplay=0`}
                        title={selectedItem.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    )
                  }
                  const thumb = getThumbnailFromUrl(selectedItem.url, selectedItem.thumbnail)
                  return thumb ? (
                    <img src={thumb} alt={selectedItem.title} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {Icon && <Icon size={40} className={cat.accent} />}
                    </div>
                  )
                })()}
              </div>
              {/* Item details */}
              <div className="flex-1 overflow-y-auto p-5">
                <h2 className="font-serif text-xl font-bold leading-snug" style={{ color: '#1a2e2b' }}>{selectedItem.title}</h2>
                {selectedItem.description && (
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: '#6b8884' }}>{selectedItem.description}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={selectedItem.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white"
                    style={{ backgroundColor: tileStyle.accent }}
                  >
                    <ExternalLink size={12} /> Open original
                  </a>
                  <button
                    onClick={() => { setMenuItemId(selectedItem.id); setSelectedItem(null) }}
                    className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold"
                    style={{ backgroundColor: '#eef2ee', color: '#1a2e2b' }}
                  >
                    <MoreVertical size={12} /> More
                  </button>
                </div>
                <p className="mt-3 text-xs" style={{ color: '#6b8884' }}>
                  {(() => { try { return new URL(selectedItem.url).hostname.replace('www.', '') } catch { return selectedItem.url } })()}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-8">
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${cat.tileFrom} ${cat.tileTo}`}>
                {Icon && <Icon size={28} className={cat.accent} />}
              </div>
              <p className="font-serif text-lg font-semibold" style={{ color: '#1a2e2b' }}>Select something to preview</p>
              <p className="text-sm" style={{ color: '#6b8884' }}>Tap any saved item on the left to play or read it here</p>
            </div>
          )}
        </div>{/* end panel 2 */}

        {/* Panel 3: Right — thumbnail grid */}
        <div className="w-56 shrink-0 overflow-y-auto border-l p-3" style={{ borderColor: 'rgba(13,61,58,0.08)', backgroundColor: '#f7faf7' }}>
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-widest" style={{ color: '#6b8884' }}>All saved</p>
          {visibleItems.length === 0 ? (
            <p className="px-1 text-xs italic" style={{ color: '#6b8884' }}>Nothing yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {visibleItems.map((item) => {
                const thumb = getThumbnailFromUrl(item.url, item.thumbnail)
                const isActive = selectedItem?.id === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(isActive ? null : item)}
                    className="group relative overflow-hidden rounded-xl transition"
                    style={{ outline: isActive ? `2px solid ${tileStyle.accent}` : 'none', outlineOffset: 2 }}
                    title={item.title}
                  >
                    {thumb ? (
                      <img src={thumb} alt={item.title} className="h-16 w-full object-cover" />
                    ) : (
                      <div className={`flex h-16 w-full items-center justify-center bg-gradient-to-br ${cat.tileFrom} ${cat.tileTo}`}>
                        {Icon && <Icon size={18} className={cat.accent} />}
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-1.5">
                      <p className="line-clamp-1 text-xs font-semibold text-white">{item.title}</p>
                    </div>
                    {/* Three-dot menu trigger */}
                    <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuItemId(menuItemId === item.id ? null : item.id); setMoveItemId(null) }}
                        className="flex h-5 w-5 items-center justify-center rounded-md bg-white/80"
                      >
                        <MoreVertical size={10} className="text-slate-600" />
                      </button>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>{/* end panel 3 */}

      </div>{/* end three-panel body */}

      {/* ── Hidden: keep context menus working ── */}
      <div className="hidden">
        {visibleItems.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ delay: i * 0.04 }}
            className="group relative overflow-hidden rounded-2xl border bg-white"
            style={{ borderColor: 'rgba(13,61,58,0.10)' }}
          >
            <div className="p-4">
              <p className="line-clamp-2 text-sm font-semibold" style={{ color: '#1a2e2b' }}>{item.title}</p>
            </div>

                    {/* Three-dot context menu */}
                    <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuItemId(menuItemId === item.id ? null : item.id); setMoveItemId(null) }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm"
                      >
                        <MoreVertical size={13} className="text-slate-500" />
                      </button>

                      <AnimatePresence>
                        {menuItemId === item.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            className="absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-xl border bg-white shadow-lg"
                            style={{ borderColor: 'rgba(13,61,58,0.10)' }}
                          >
                            {/* Move to folder */}
                            {moveItemId === item.id ? (
                              <div className="p-2">
                                <p className="mb-1.5 px-1 text-xs font-bold" style={{ color: '#6b8884' }}>Move to folder</p>
                                <button
                                  onClick={() => handleMoveToFolder(item.id, undefined)}
                                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50"
                                  style={{ color: item.folderId === undefined ? '#0d3d3a' : '#1a2e2b' }}
                                >
                                  <FolderOpen size={11} /> No folder {item.folderId === undefined && <Check size={10} className="ml-auto" />}
                                </button>
                                {folders.map((f) => (
                                  <button
                                    key={f.id}
                                    onClick={() => handleMoveToFolder(item.id, f.id)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50"
                                    style={{ color: item.folderId === f.id ? '#0d3d3a' : '#1a2e2b' }}
                                  >
                                    <Folder size={11} /> <span className="truncate">{f.name}</span>
                                    {item.folderId === f.id && <Check size={10} className="ml-auto shrink-0" />}
                                  </button>
                                ))}
                                <button
                                  onClick={() => setMoveItemId(null)}
                                  className="mt-1 w-full rounded-lg px-2 py-1 text-xs font-medium hover:bg-slate-50"
                                  style={{ color: '#6b8884' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <a
                                  href={item.url} target="_blank" rel="noopener noreferrer"
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium hover:bg-slate-50"
                                  style={{ color: '#1a2e2b' }}
                                >
                                  <ExternalLink size={12} /> Open link
                                </a>
                                <button
                                  onClick={() => setMoveItemId(item.id)}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium hover:bg-slate-50"
                                  style={{ color: '#1a2e2b' }}
                                >
                                  <FolderInput size={12} /> Move to folder
                                </button>
                                <button
                                  onClick={() => handleDuplicate(item.id)}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium hover:bg-slate-50"
                                  style={{ color: '#1a2e2b' }}
                                >
                                  <Copy size={12} /> Duplicate
                                </button>
                                <div className="border-t" style={{ borderColor: 'rgba(13,61,58,0.10)' }} />
                                <button
                                  onClick={() => { handleDelete(item.id); setMenuItemId(null) }}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50"
                                >
                                  <Trash2 size={12} /> Delete
                                </button>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
          </motion.div>
        ))}
      </div>

      {/* ── Add link modal ── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 pb-4 sm:items-center"
            onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
          >
            <motion.div
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 32, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-serif text-xl font-bold">Save to {category}</h2>
                <button onClick={closeModal}>
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              {/* URL input + fetch */}
              <div className="flex gap-2">
                <textarea
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && !e.shiftKey) { e.preventDefault(); handleFetch() } }}
                  placeholder={`Paste one link, or multiple links — one per line`}
                  rows={2}
                  className="min-w-0 flex-1 resize-none rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2"
                  style={{ borderColor: 'rgba(13,61,58,0.12)' }}
                  autoFocus
                />
                <button
                  onClick={handleFetch}
                  disabled={fetching || !url.trim()}
                  className="flex shrink-0 items-center gap-1.5 self-stretch rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: '#0d3d3a' }}
                >
                  {fetching ? <Loader2 size={14} className="animate-spin" /> : 'Fetch'}
                </button>
              </div>
              <p className="mt-1 text-xs" style={{ color: '#6b8884' }}>Tip: paste multiple links on separate lines to save them all at once</p>

              {fetchError && <p className="mt-2 text-xs text-amber-600">{fetchError}</p>}

              {/* Folder picker */}
              {folders.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-semibold" style={{ color: '#6b8884' }}>
                    Save to folder (optional)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setSelectedFolderForItem(undefined)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition ${selectedFolderForItem === undefined ? 'text-white' : 'hover:opacity-80'}`}
                      style={selectedFolderForItem === undefined
                        ? { backgroundColor: '#0d3d3a' }
                        : { backgroundColor: '#eef2ee', color: '#6b8884' }}
                    >
                      No folder
                    </button>
                    {folders.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFolderForItem(f.id)}
                        className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium transition ${selectedFolderForItem === f.id ? 'text-white' : 'hover:opacity-80'}`}
                        style={selectedFolderForItem === f.id
                          ? { backgroundColor: '#5a9e84' }
                          : { backgroundColor: '#eef2ee', color: '#6b8884' }}
                      >
                        <Folder size={10} /> {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Multi-link preview list */}
              {multiPreviews.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold" style={{ color: '#6b8884' }}>
                    {multiPreviews.filter(p => p.selected).length} of {multiPreviews.length} links selected — tap to deselect
                  </p>
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {multiPreviews.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => setMultiPreviews(prev => prev.map((x, j) => j === i ? { ...x, selected: !x.selected } : x))}
                        className="flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition"
                        style={{
                          borderColor: p.selected ? '#5a9e84' : 'rgba(13,61,58,0.10)',
                          backgroundColor: p.selected ? '#f0f7f4' : '#fafafa',
                          opacity: p.selected ? 1 : 0.5,
                        }}
                      >
                        {p.thumbnail ? (
                          <img src={p.thumbnail} alt="" className="h-10 w-16 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: '#eef2ee' }}>
                            <Globe size={14} color="#5a9e84" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold" style={{ color: '#1a2e2b' }}>{p.title || p.url}</p>
                          <p className="truncate text-xs" style={{ color: '#6b8884' }}>{String(p.url ?? '').replace(/^https?:\/\//, '')}</p>
                        </div>
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: p.selected ? '#5a9e84' : '#e0e0e0' }}>
                          <Check size={11} color="white" />
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleSave}
                    className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: '#0d3d3a' }}
                  >
                    Save {multiPreviews.filter(p => p.selected).length} links to {cat.displayName}
                  </button>
                </div>
              )}

              {/* Single preview card */}
              {preview && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 overflow-hidden rounded-xl border"
                  style={{ borderColor: 'rgba(13,61,58,0.10)' }}
                >
                  {preview.thumbnail && (
                    <img src={preview.thumbnail} alt="" className="h-32 w-full object-cover" />
                  )}
                  <div className="p-3" style={{ backgroundColor: '#eef2ee' }}>
                    <input
                      className="w-full bg-transparent text-sm font-semibold outline-none"
                      style={{ color: '#1a2e2b' }}
                      value={preview.title || ''}
                      onChange={(e) => setPreview({ ...preview, title: e.target.value })}
                      placeholder="Title"
                    />
                    <input
                      className="mt-1 w-full bg-transparent text-xs outline-none"
                      style={{ color: '#6b8884' }}
                      value={preview.description || ''}
                      onChange={(e) => setPreview({ ...preview, description: e.target.value })}
                      placeholder="Description (optional)"
                    />
                  </div>
                </motion.div>
              )}

              {preview && (
                <button
                  onClick={handleSave}
                  className="mt-4 w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: '#0d3d3a' }}
                >
                  Save to {category}{selectedFolderForItem ? ` · ${folders.find((f) => f.id === selectedFolderForItem)?.name}` : ''}
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
