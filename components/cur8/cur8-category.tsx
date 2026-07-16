'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Play, Music, Camera, Users, Newspaper, ImageIcon, FileText, Globe,
  ArrowLeft, Plus, X, Loader2, ExternalLink, Trash2, FolderPlus,
  Folder, FolderOpen, Check, MoreVertical, Copy, FolderInput,
} from 'lucide-react'
import {
  CATEGORIES,
  loadItems, saveItems,
  loadFolders, saveFolders,
  type Cur8Item, type Cur8Folder, type Category,
} from '@/lib/cur8-store'

const ICON_MAP: Record<string, React.ElementType> = {
  play: Play, music: Music, camera: Camera, users: Users,
  newspaper: Newspaper, 'image-icon': ImageIcon, 'file-text': FileText, globe: Globe,
}

interface Props { category: Category }

export default function Cur8Category({ category }: Props) {
  const cat = CATEGORIES.find((c) => c.name === category)!
  const Icon = ICON_MAP[cat.lucideIcon]

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
  const [fetchError, setFetchError] = useState('')

  useEffect(() => {
    setAllItems(loadItems())
    setFolders(loadFolders().filter((f) => f.category === category))
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
  function createFolder() {
    if (!newFolderName.trim()) return
    const folder: Cur8Folder = {
      id: Date.now().toString(),
      category,
      name: newFolderName.trim(),
      createdAt: new Date().toISOString(),
    }
    const allFolders = [...loadFolders(), folder]
    saveFolders(allFolders)
    setFolders(allFolders.filter((f) => f.category === category))
    setNewFolderName('')
    setShowNewFolder(false)
    setActiveFolder(folder.id)
  }

  function deleteFolder(id: string) {
    // Unassign items from this folder
    const updated = loadItems().map((i) =>
      i.folderId === id ? { ...i, folderId: undefined } : i
    )
    saveItems(updated)
    setAllItems(updated)
    const allFolders = loadFolders().filter((f) => f.id !== id)
    saveFolders(allFolders)
    setFolders(allFolders.filter((f) => f.category === category))
    if (activeFolder === id) setActiveFolder(null)
  }

  // ── Link fetch & save ──
  async function handleFetch() {
    if (!url.trim()) return
    setFetching(true)
    setFetchError('')
    setPreview(null)
    try {
      const res = await fetch(`/api/cur8/fetch-meta?url=${encodeURIComponent(url.trim())}`)
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      setPreview({ url: url.trim(), ...data })
    } catch {
      setFetchError('Could not auto-fetch — you can still save manually.')
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
      folderId: selectedFolderForItem,
      url: preview.url!,
      title: preview.title || preview.url!,
      description: preview.description || '',
      thumbnail: preview.thumbnail || '',
      favicon: preview.favicon || '',
      savedAt: new Date().toISOString(),
    }
    const updated = [newItem, ...loadItems()]
    saveItems(updated)
    setAllItems(updated)
    setShowAdd(false)
    setUrl('')
    setPreview(null)
    setSelectedFolderForItem(undefined)
  }

  function handleDelete(id: string) {
    const updated = loadItems().filter((i) => i.id !== id)
    saveItems(updated)
    setAllItems(updated)
  }

  function handleDuplicate(id: string) {
    const item = allItems.find((i) => i.id === id)
    if (!item) return
    const copy: Cur8Item = { ...item, id: Date.now().toString(), savedAt: new Date().toISOString() }
    const updated = [copy, ...loadItems()]
    saveItems(updated)
    setAllItems(updated)
    setMenuItemId(null)
  }

  function handleMoveToFolder(itemId: string, folderId: string | undefined) {
    const updated = loadItems().map((i) =>
      i.id === itemId ? { ...i, folderId } : i
    )
    saveItems(updated)
    setAllItems(updated)
    setMoveItemId(null)
    setMenuItemId(null)
  }

  function closeModal() {
    setShowAdd(false)
    setUrl('')
    setPreview(null)
    setFetchError('')
    setSelectedFolderForItem(undefined)
  }

  return (
    <div className="cur8 min-h-screen" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>

      {/* ── Header ── */}
      <header className="border-b px-5 py-4 sm:px-8"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
        <div className="mx-auto max-w-5xl">
          <Link href="/cur8"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium transition hover:opacity-70"
            style={{ color: 'var(--muted-foreground)' }}>
            <ArrowLeft size={12} /> Back to Cur8
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${cat.tileFrom} ${cat.tileTo}`}>
                {Icon && <Icon size={22} className={cat.accent} />}
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold">{category}</h1>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {cat.description} · {catItems.length} saved
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              <Plus size={15} /> Save link
            </button>
          </div>
        </div>
      </header>

      {/* ── Body: sidebar + content ── */}
      <div className="mx-auto flex max-w-5xl gap-6 px-5 py-7 sm:px-8">

        {/* Folders sidebar */}
        <aside className="w-48 shrink-0">
          <div className="sticky top-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
                Folders
              </span>
              <button
                onClick={() => setShowNewFolder(true)}
                className="rounded-lg p-1 transition hover:opacity-70"
                title="New folder"
                style={{ color: 'var(--cur8-teal)' }}
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
                      style={{ borderColor: 'var(--border)' }}
                      autoFocus
                    />
                    <button onClick={createFolder} className="rounded-lg p-1.5 text-white"
                      style={{ backgroundColor: 'var(--primary)' }}>
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
                style={activeFolder === null ? { backgroundColor: 'var(--primary)', color: '#fff' } : { color: 'var(--foreground)' }}
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
                      style={isActive ? { backgroundColor: 'var(--cur8-sage)', color: '#fff' } : { color: 'var(--foreground)' }}
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
                <p className="px-3 py-2 text-xs italic" style={{ color: 'var(--muted-foreground)' }}>
                  No folders yet
                </p>
              )}
            </nav>
          </div>
        </aside>

        {/* ── Content grid ── */}
        <section className="flex-1 min-w-0">
          {visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${cat.tileFrom} ${cat.tileTo}`}>
                {Icon && <Icon size={26} className={cat.accent} />}
              </div>
              <p className="mt-4 font-serif text-lg font-semibold">Nothing here yet</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {activeFolder
                  ? 'No items in this folder. Save a link and assign it here.'
                  : 'Paste a link and hit Save — the preview fetches automatically.'}
              </p>
              <button
                onClick={() => setShowAdd(true)}
                className="mt-5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                Save your first {category} link
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {visibleItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ delay: i * 0.04 }}
                    className="group relative overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-0.5 hover:shadow-md"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {/* Thumbnail */}
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.title}
                        className="h-36 w-full object-cover" />
                    ) : (
                      <div className={`flex h-36 w-full items-center justify-center bg-gradient-to-br ${cat.tileFrom} ${cat.tileTo}`}>
                        {Icon && <Icon size={32} className={cat.accent} />}
                      </div>
                    )}

                    {/* Folder badge */}
                    {item.folderId && (
                      <div className="absolute left-2 top-2">
                        <span className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm"
                          style={{ backgroundColor: 'rgba(13,148,136,0.85)' }}>
                          <Folder size={10} />
                          {folders.find((f) => f.id === item.folderId)?.name}
                        </span>
                      </div>
                    )}

                    <div className="p-4">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug"
                        style={{ color: 'var(--foreground)' }}>
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed"
                          style={{ color: 'var(--muted-foreground)' }}>
                          {item.description}
                        </p>
                      )}
                      <p className="mt-2 truncate text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {(() => { try { return new URL(item.url).hostname.replace('www.', '') } catch { return item.url } })()}
                      </p>
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
                            style={{ borderColor: 'var(--border)' }}
                          >
                            {/* Move to folder */}
                            {moveItemId === item.id ? (
                              <div className="p-2">
                                <p className="mb-1.5 px-1 text-xs font-bold" style={{ color: 'var(--muted-foreground)' }}>Move to folder</p>
                                <button
                                  onClick={() => handleMoveToFolder(item.id, undefined)}
                                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50"
                                  style={{ color: item.folderId === undefined ? 'var(--cur8-teal)' : 'var(--foreground)' }}
                                >
                                  <FolderOpen size={11} /> No folder {item.folderId === undefined && <Check size={10} className="ml-auto" />}
                                </button>
                                {folders.map((f) => (
                                  <button
                                    key={f.id}
                                    onClick={() => handleMoveToFolder(item.id, f.id)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50"
                                    style={{ color: item.folderId === f.id ? 'var(--cur8-teal)' : 'var(--foreground)' }}
                                  >
                                    <Folder size={11} /> <span className="truncate">{f.name}</span>
                                    {item.folderId === f.id && <Check size={10} className="ml-auto shrink-0" />}
                                  </button>
                                ))}
                                <button
                                  onClick={() => setMoveItemId(null)}
                                  className="mt-1 w-full rounded-lg px-2 py-1 text-xs font-medium hover:bg-slate-50"
                                  style={{ color: 'var(--muted-foreground)' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <a
                                  href={item.url} target="_blank" rel="noopener noreferrer"
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium hover:bg-slate-50"
                                  style={{ color: 'var(--foreground)' }}
                                >
                                  <ExternalLink size={12} /> Open link
                                </a>
                                <button
                                  onClick={() => setMoveItemId(item.id)}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium hover:bg-slate-50"
                                  style={{ color: 'var(--foreground)' }}
                                >
                                  <FolderInput size={12} /> Move to folder
                                </button>
                                <button
                                  onClick={() => handleDuplicate(item.id)}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium hover:bg-slate-50"
                                  style={{ color: 'var(--foreground)' }}
                                >
                                  <Copy size={12} /> Duplicate
                                </button>
                                <div className="border-t" style={{ borderColor: 'var(--border)' }} />
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
              </AnimatePresence>
            </div>
          )}
        </section>
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
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleFetch() }}
                  placeholder="Paste a link..."
                  className="min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2"
                  style={{ borderColor: 'var(--border)' }}
                  autoFocus
                />
                <button
                  onClick={handleFetch}
                  disabled={fetching || !url.trim()}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {fetching ? <Loader2 size={14} className="animate-spin" /> : 'Fetch'}
                </button>
              </div>

              {fetchError && <p className="mt-2 text-xs text-amber-600">{fetchError}</p>}

              {/* Folder picker */}
              {folders.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                    Save to folder (optional)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setSelectedFolderForItem(undefined)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition ${selectedFolderForItem === undefined ? 'text-white' : 'hover:opacity-80'}`}
                      style={selectedFolderForItem === undefined
                        ? { backgroundColor: 'var(--primary)' }
                        : { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
                    >
                      No folder
                    </button>
                    {folders.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFolderForItem(f.id)}
                        className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium transition ${selectedFolderForItem === f.id ? 'text-white' : 'hover:opacity-80'}`}
                        style={selectedFolderForItem === f.id
                          ? { backgroundColor: 'var(--cur8-sage)' }
                          : { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
                      >
                        <Folder size={10} /> {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview card */}
              {preview && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 overflow-hidden rounded-xl border"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {preview.thumbnail && (
                    <img src={preview.thumbnail} alt="" className="h-32 w-full object-cover" />
                  )}
                  <div className="p-3" style={{ backgroundColor: 'var(--muted)' }}>
                    <input
                      className="w-full bg-transparent text-sm font-semibold outline-none"
                      style={{ color: 'var(--foreground)' }}
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
                </motion.div>
              )}

              {preview && (
                <button
                  onClick={handleSave}
                  className="mt-4 w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: 'var(--primary)' }}
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
