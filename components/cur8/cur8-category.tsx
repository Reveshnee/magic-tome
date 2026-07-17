'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  Play, Music, Camera, Users, Newspaper, ImageIcon, FileText, Globe,
  ArrowLeft, Plus, X, Loader2, ExternalLink, Trash2, FolderPlus,
  Folder, FolderOpen, Check, MoreVertical, Copy, FolderInput, Upload, Paperclip,
} from 'lucide-react'
import {
  CATEGORIES,
  type Cur8Item, type Cur8Folder, type Category,
} from '@/lib/cur8-store'
import { useViewport } from '@/hooks/use-viewport'
import { useReadAloud } from '@/hooks/use-speech'
import { LayoutGrid, Eye, List, Volume2, Square, NotebookPen, Pencil, RotateCcw } from 'lucide-react'
import { useGardenNames } from '@/components/cur8/garden-names-provider'
import {
  getCur8Data,
  createItem as createItemAction,
  moveItem as moveItemAction,
  duplicateItem as duplicateItemAction,
  deleteItem as deleteItemAction,
  createFolder as createFolderAction,
  deleteFolder as deleteFolderAction,
  markItemOpened,
  getReflections,
  createReflection,
  deleteReflection,
  type ReflectionDTO,
} from '@/app/actions/cur8'
import CategoryStatsBar from '@/components/cur8/category-stats-bar'
import CategoryReflections from '@/components/cur8/category-reflections'

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

function getThumbnailFromUrl(url: string, stored: string | undefined): string {
  if (stored) return stored
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return `https://img.youtube.com/vi/${v}/hqdefault.jpg`
      if (u.pathname.includes('/shorts/')) {
        const v2 = u.pathname.split('/shorts/')[1]?.split('?')[0]
        if (v2) return `https://img.youtube.com/vi/${v2}/hqdefault.jpg`
      }
    }
    if (u.hostname === 'youtu.be') {
      const v = u.pathname.slice(1).split('?')[0]
      if (v) return `https://img.youtube.com/vi/${v}/hqdefault.jpg`
    }
  } catch {}
  return ''
}

// Determine how to render a URL in the preview panel
function getPreviewType(url: string): 'youtube' | 'image' | 'pdf' | 'video' | 'audio' | 'iframe' {
  // Private-blob proxy URLs — detect by extension in the pathname query param
  if (url.startsWith('/api/cur8/file')) {
    try {
      const params = new URLSearchParams(url.split('?')[1] ?? '')
      const p = (params.get('pathname') ?? '').toLowerCase()
      if (p.match(/\.(jpg|jpeg|png|gif|webp|avif)$/)) return 'image'
      if (p.match(/\.(mp4|webm|mov)$/)) return 'video'
      if (p.match(/\.(mp3|wav|ogg|m4a|aac)$/)) return 'audio'
      // PDFs and all Office docs render via native iframe since the file is
      // served from our own origin — no CORS / X-Frame-Options issue
      if (p.match(/\.pdf$/)) return 'pdf'
      if (p.match(/\.(doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/)) return 'pdf'
    } catch {}
    return 'pdf' // default for unknown uploaded file types
  }
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') || u.hostname === 'youtu.be') return 'youtube'
    const path = u.pathname.toLowerCase()
    if (path.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/)) return 'image'
    if (path.match(/\.(mp4|webm|mov|avi|mkv)$/)) return 'video'
    if (path.match(/\.(mp3|wav|ogg|m4a|aac)$/)) return 'audio'
    if (path.match(/\.pdf$/) || u.hostname.includes('drive.google.com') || u.hostname.includes('docs.google.com')) return 'pdf'
    if (path.match(/\.(doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/)) return 'pdf'
  } catch {}
  return 'iframe'
}

const TILE_STYLES: Record<string, { accent: string; accentLight: string; image: string }> = {
  YouTube:   { accent: '#c85a40', accentLight: '#faecea', image: '/cur8/tile-grove.png' },
  TikTok:    { accent: '#c97a7a', accentLight: '#f9eded', image: '/cur8/tile-bloom.png' },
  Instagram: { accent: '#b06a9c', accentLight: '#f4ecf1', image: '/cur8/tile-greenhouse.png' },
  Facebook:  { accent: '#4a6d78', accentLight: '#e8f0f4', image: '/cur8/tile-current.png' },
  Articles:  { accent: '#b8892a', accentLight: '#f5ede0', image: '/cur8/tile-archive.png' },
  Images:    { accent: '#5a9e84', accentLight: '#e8f4ef', image: '/cur8/tile-sanctuary.png' },
  Documents: { accent: '#3a6b8c', accentLight: '#e8f0f6', image: '/cur8/tile-tide.png' },
  Web:       { accent: '#c9843c', accentLight: '#f5ede0', image: '/cur8/tile-ember.png' },
}

interface Props { category: Category }

export default function Cur8Category({ category }: Props) {
  const cat = CATEGORIES.find((c) => c.name === category)!
  const Icon = ICON_MAP[cat.lucideIcon]
  const tileStyle = TILE_STYLES[category] ?? { accent: '#5a9e84', accentLight: '#e8f4ef', image: '/cur8/tile-grove.png' }

  const [allItems, setAllItems] = useState<Cur8Item[]>([])
  const [folders, setFolders] = useState<Cur8Folder[]>([])
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [selectedFolderForItem, setSelectedFolderForItem] = useState<string | undefined>(undefined)
  const [menuItemId, setMenuItemId] = useState<string | null>(null)
  const [moveItemId, setMoveItemId] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [preview, setPreview] = useState<Partial<Cur8Item> | null>(null)
  const [multiPreviews, setMultiPreviews] = useState<(Partial<Cur8Item> & { selected: boolean })[]>([])
  const [selectedItem, setSelectedItem] = useState<Cur8Item | null>(null)
  const [fetchError, setFetchError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)
  const { isMobile } = useViewport()
  const { speak, stop: stopSpeak, speaking, supported: ttsSupported } = useReadAloud()
  const [mobileTab, setMobileTab] = useState<'browse' | 'preview' | 'links'>('browse')
  const [reflections, setReflections] = useState<ReflectionDTO[]>([])
  const [showReflections, setShowReflections] = useState(false)
  const { displayName, defaultName, isCustom, rename, reset } = useGardenNames()
  const gardenName = displayName(category)
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  function readItemAloud(item: Cur8Item) {
    if (speaking) { stopSpeak(); return }
    const text = [item.title, item.description].filter(Boolean).join('. ')
    speak(text, 0.95)
  }

  // Mark an item as opened (drives the "not yet accessed" stat) then open it
  function openItem(item: Cur8Item) {
    if (!item.openedAt) {
      setAllItems((prev) => prev.map((it) => it.id === item.id ? { ...it, openedAt: new Date().toISOString() } : it))
      markItemOpened(item.id).catch(() => {})
    }
    window.open(item.url, '_blank', 'noopener,noreferrer')
  }

  // Rename this garden
  function openRename() {
    setNameDraft(gardenName)
    setRenaming(true)
  }
  async function saveRename() {
    const next = nameDraft.trim()
    if (next && next !== gardenName) await rename(category, next)
    setRenaming(false)
  }
  async function resetName() {
    await reset(category)
    setRenaming(false)
  }

  // Reflection handlers (category-tied notes, distinct from global brain dump)
  async function addReflection(body: string) {
    const r = await createReflection(category, body).catch(() => null)
    if (r) setReflections((prev) => [r, ...prev])
  }
  async function removeReflection(id: string) {
    setReflections((prev) => prev.filter((r) => r.id !== id))
    await deleteReflection(id).catch(() => {})
  }

  // On mobile, jump to the preview tab whenever an item is opened
  useEffect(() => {
    if (isMobile && selectedItem) setMobileTab('preview')
    stopSpeak()
  }, [selectedItem, isMobile, stopSpeak])

  function refresh() {
    return getCur8Data().then((data) => {
      setAllItems(data.items as Cur8Item[])
      setFolders((data.folders as Cur8Folder[]).filter((f) => f.category === category))
    })
  }

  useEffect(() => { refresh().catch(() => {}) }, [category])

  useEffect(() => {
    getReflections(category).then(setReflections).catch(() => {})
  }, [category])

  useEffect(() => {
    if (!menuItemId) return
    function handleOutside() { setMenuItemId(null); setMoveItemId(null) }
    document.addEventListener('click', handleOutside)
    return () => document.removeEventListener('click', handleOutside)
  }, [menuItemId])

  const catItems = allItems.filter((i) => i.category === category)
  const visibleItems = activeFolder === null ? catItems : catItems.filter((i) => i.folderId === activeFolder)

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

  // ── File drag-and-drop & upload ──
  const handleFileDrop = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return
    // Close the modal immediately so the user sees the upload toast while it works
    closeModal()
    setUploading(true)
    setUploadError('')
    try {
      const saved = await Promise.all(
        fileArray.map(async (file) => {
          const fd = new FormData()
          fd.append('file', file)
          const res = await fetch('/api/cur8/upload', { method: 'POST', body: fd })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body.error || `Upload failed for ${file.name}`)
          }
          const { url } = await res.json()
          // Derive a friendly title from the filename
          const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
          return createItemAction({
            category,
            folderId: selectedFolderForItem,
            url,
            title,
            description: `${file.type || 'file'} · ${(file.size / 1024).toFixed(0)} KB`,
            thumbnail: file.type.startsWith('image/') ? url : undefined,
          })
        })
      )
      setAllItems((prev) => [...(saved.filter(Boolean) as Cur8Item[]), ...prev])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [category, selectedFolderForItem])

  // Attach drag events to document so they work anywhere on the page,
  // including over fixed-position overlays (brain dump, focus timer, etc.)
  useEffect(() => {
    function onDragEnter(e: DragEvent) {
      e.preventDefault()
      dragCounter.current++
      if (e.dataTransfer?.types.includes('Files')) setIsDragging(true)
    }
    function onDragLeave(e: DragEvent) {
      e.preventDefault()
      dragCounter.current--
      if (dragCounter.current <= 0) { dragCounter.current = 0; setIsDragging(false) }
    }
    function onDragOver(e: DragEvent) { e.preventDefault() }
    function onDrop(e: DragEvent) {
      e.preventDefault()
      dragCounter.current = 0
      setIsDragging(false)
      if (e.dataTransfer?.files.length) handleFileDrop(e.dataTransfer.files)
    }
    document.addEventListener('dragenter', onDragEnter)
    document.addEventListener('dragleave', onDragLeave)
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('dragenter', onDragEnter)
      document.removeEventListener('dragleave', onDragLeave)
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('drop', onDrop)
    }
  }, [handleFileDrop])

  function normaliseUrl(raw: string) {
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  }

  function extractUrls(text: string): string[] {
    return text.split(/[\n]+/).map((s) => s.trim()).filter((s) => s.length > 4).map(normaliseUrl)
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
    if (multiPreviews.length > 0) {
      const toSave = multiPreviews.filter((p) => p.selected)
      const created = await Promise.all(
        toSave.map((p) => createItemAction({
          category, folderId: selectedFolderForItem,
          url: p.url ?? '', title: p.title || p.url || '',
          description: p.description || undefined,
          thumbnail: p.thumbnail || undefined, favicon: p.favicon || undefined,
        }))
      )
      setAllItems((prev) => [...(created.filter(Boolean) as Cur8Item[]), ...prev])
      closeModal()
      return
    }
    if (!preview) return
    const created = await createItemAction({
      category, folderId: selectedFolderForItem,
      url: preview.url!, title: preview.title || preview.url!,
      description: preview.description || undefined,
      thumbnail: preview.thumbnail || undefined, favicon: preview.favicon || undefined,
    })
    setAllItems((prev) => [created as Cur8Item, ...prev])
    closeModal()
  }

  async function handleDelete(id: string) {
    if (selectedItem?.id === id) setSelectedItem(null)
    setAllItems((prev) => prev.filter((i) => i.id !== id))
    await deleteItemAction(id)
  }

  async function handleDuplicate(id: string) {
    setMenuItemId(null)
    const copy = await duplicateItemAction(id)
    if (copy) setAllItems((prev) => [copy as Cur8Item, ...prev])
  }

  async function handleMoveToFolder(itemId: string, folderId: string | undefined) {
    setAllItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, folderId } : i)))
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

  // Render the centre preview panel content — fills the entire panel height
  function renderPreview(item: Cur8Item) {
    const type = getPreviewType(item.url)

    if (type === 'youtube') {
      const ytId = extractYouTubeId(item.url)
      return (
        <iframe
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          src={`https://www.youtube.com/embed/${ytId}?autoplay=0`}
          title={item.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )
    }

    if (type === 'image') {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt={item.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
        </div>
      )
    }

    if (type === 'video') {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={item.url} controls style={{ maxWidth: '100%', maxHeight: '100%' }} />
        </div>
      )
    }

    if (type === 'audio') {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#0a1e1b', padding: 32 }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, backgroundColor: `${tileStyle.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Music size={36} color={tileStyle.accent} />
          </div>
          <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 16, fontWeight: 600, color: '#f5f0e8', textAlign: 'center' }}>{item.title}</p>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio src={item.url} controls style={{ width: '100%', maxWidth: 380 }} />
        </div>
      )
    }

    if (type === 'pdf') {
      let embedUrl = item.url

      if (item.url.startsWith('/api/cur8/file')) {
        // Private blob served from our own origin — iframe it directly, no viewer needed
        embedUrl = item.url
      } else if (item.url.includes('drive.google.com/file/d/')) {
        const id = item.url.match(/\/d\/([^/]+)/)?.[1]
        if (id) embedUrl = `https://drive.google.com/file/d/${id}/preview`
      } else if (item.url.includes('docs.google.com')) {
        embedUrl = item.url.replace('/edit', '/preview').replace('/pub', '/preview')
      } else {
        // External PDF or Office doc — route through Google Docs viewer
        // Build an absolute URL so Google can fetch it
        const abs = item.url.startsWith('http') ? item.url : `${window.location.origin}${item.url}`
        embedUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(abs)}&embedded=true`
      }
      return (
        <iframe
          src={embedUrl}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block', backgroundColor: '#fff' }}
          title={item.title}
        />
      )
    }

    // Generic webpage / article / TikTok etc — attempt inline iframe
    // Many sites block framing; we show a friendly fallback if they do
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <iframe
          src={item.url}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block', backgroundColor: '#fff' }}
          title={item.title}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          referrerPolicy="no-referrer"
        />
        {/* Overlay hint — only visible if iframe is blocked */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 12px', backgroundColor: 'rgba(13,36,32,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.55)' }}>Some sites block previewing. Use &ldquo;Open&rdquo; to view in full.</span>
        </div>
      </div>
    )
  }

  const THUMB_PAGE_SIZE = 8

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#0d2420', color: '#f5f0e8', fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif', overflow: 'hidden', position: 'relative' }}
    >

      {/* ── Drag-and-drop overlay ── */}
      {isDragging && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: 'rgba(13,36,32,0.92)', backdropFilter: 'blur(8px)', border: `2px dashed ${tileStyle.accent}`, borderRadius: 0, pointerEvents: 'none' }}>
          <Upload size={48} color={tileStyle.accent} />
          <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 24, fontWeight: 700, color: '#f5f0e8' }}>Drop files to save</p>
          <p style={{ fontSize: 14, color: 'rgba(245,240,232,0.55)' }}>Images, PDFs, documents — anything</p>
        </div>
      )}

      {/* ── Upload in-progress toast ── */}
      {(uploading || uploadError) && (
        <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 90, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderRadius: 50, backgroundColor: uploadError ? '#3a1212' : '#0a2e28', border: `1px solid ${uploadError ? '#c85a40' : tileStyle.accent}44`, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', color: '#f5f0e8', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {uploading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Uploading files…</> : <><X size={14} color="#c85a40" /> {uploadError} <button onClick={() => setUploadError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.5)', marginLeft: 4, padding: 0 }}><X size={11} /></button></>}
        </div>
      )}

      {/* ── Banner ── */}
      <div style={{ position: 'relative', height: 100, flexShrink: 0, overflow: 'hidden' }}>
        <Image src={tileStyle.image} alt={category} fill className="object-cover object-center" priority sizes="100vw" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,36,32,0.5) 0%, rgba(13,36,32,0.92) 100%)' }} />
        {/* Nav */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
          <Link href="/cur8" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 50, fontSize: 11, fontWeight: 600, color: '#f5f0e8', textDecoration: 'none', backgroundColor: 'rgba(245,240,232,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <ArrowLeft size={10} /> All gardens
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setShowReflections(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 50, fontSize: 11, fontWeight: 600, color: '#f5f0e8', backgroundColor: 'rgba(245,240,232,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}
            >
              <NotebookPen size={11} /> Reflect{reflections.length > 0 ? ` · ${reflections.length}` : ''}
            </button>
            <button
              onClick={() => setShowAdd(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 16px', borderRadius: 50, fontSize: 11, fontWeight: 700, color: '#fff', backgroundColor: tileStyle.accent, border: 'none', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
            >
              <Plus size={11} /> Save link
            </button>
          </div>
        </div>
        {/* Title */}
        <div style={{ position: 'absolute', bottom: 10, left: 16, right: 16, display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 22, fontWeight: 700, color: '#f5f0e8', margin: 0 }}>{gardenName}</h1>
            <button
              onClick={openRename}
              aria-label="Rename this garden"
              title="Rename this garden"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 8, background: 'rgba(245,240,232,0.12)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--c-cream)', cursor: 'pointer', backdropFilter: 'blur(8px)' }}
            >
              <Pencil size={12} />
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.5)', margin: 0 }}>{cat.description} · {catItems.length} saved</p>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <CategoryStatsBar items={catItems} accent={tileStyle.accent} reflectionCount={reflections.length} />

      {/* ── Mobile tab switcher ── */}
      {isMobile && (
        <div style={{ display: 'flex', flexShrink: 0, backgroundColor: '#0a1e1b', borderBottom: '1px solid rgba(245,240,232,0.07)' }}>
          {([
            { id: 'browse' as const, label: 'Browse', icon: LayoutGrid },
            { id: 'preview' as const, label: 'Preview', icon: Eye },
            { id: 'links' as const, label: 'Links', icon: List },
          ]).map((t) => {
            const TIcon = t.icon
            const on = mobileTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setMobileTab(t.id)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 4px', border: 'none', borderBottom: `2px solid ${on ? tileStyle.accent : 'transparent'}`, backgroundColor: 'transparent', cursor: 'pointer', color: on ? '#f5f0e8' : 'rgba(245,240,232,0.45)', fontSize: 12, fontWeight: 600 }}
              >
                <TIcon size={14} color={on ? tileStyle.accent : 'rgba(245,240,232,0.45)'} /> {t.label}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Three-panel body (stacks on mobile) ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Panel 1: Thumbnail grid (8 visible, scrollable) ── */}
        <div style={{ width: isMobile ? '100%' : 240, flex: isMobile ? 1 : undefined, flexShrink: 0, display: isMobile && mobileTab !== 'browse' ? 'none' : 'flex', flexDirection: 'column', borderRight: isMobile ? 'none' : '1px solid rgba(245,240,232,0.07)', backgroundColor: '#0a1e1b', overflow: 'hidden' }}>
          {/* Folders strip */}
          <div style={{ padding: '10px 10px 6px', borderBottom: '1px solid rgba(245,240,232,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)' }}>Folders</span>
              <button onClick={() => setShowNewFolder(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.5)', display: 'flex' }} title="New folder">
                <FolderPlus size={13} />
              </button>
            </div>
            <AnimatePresence>
              {showNewFolder && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) createFolder(); if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName('') } }}
                      placeholder="Folder name" autoFocus
                      style={{ flex: 1, border: '1px solid rgba(245,240,232,0.15)', borderRadius: 8, padding: '4px 8px', fontSize: 11, outline: 'none', minWidth: 0, backgroundColor: 'rgba(245,240,232,0.08)', color: '#f5f0e8' }} />
                    <button onClick={createFolder} style={{ background: tileStyle.accent, border: 'none', borderRadius: 8, padding: '4px 7px', cursor: 'pointer', color: '#fff', display: 'flex' }}>
                      <Check size={11} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Folder chips */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <button onClick={() => setActiveFolder(null)}
                style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 50, cursor: 'pointer', border: 'none', backgroundColor: activeFolder === null ? tileStyle.accent : 'rgba(245,240,232,0.1)', color: '#f5f0e8' }}>
                All <span style={{ opacity: 0.6 }}>{catItems.length}</span>
              </button>
              {folders.map((f) => (
                <div key={f.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <button onClick={() => setActiveFolder(f.id)}
                    style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px 3px 9px', borderRadius: 50, cursor: 'pointer', border: 'none', backgroundColor: activeFolder === f.id ? tileStyle.accent : 'rgba(245,240,232,0.1)', color: '#f5f0e8' }}>
                    {f.name}
                  </button>
                  <button onClick={() => deleteFolder(f.id)} style={{ position: 'absolute', right: -4, top: -4, background: '#0a1e1b', border: '1px solid rgba(245,240,232,0.15)', borderRadius: '50%', width: 14, height: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    <X size={8} color="rgba(245,240,232,0.5)" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Thumbnail grid — 2 columns, 4 rows = 8 visible */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {visibleItems.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#f5f0e8', marginBottom: 4 }}>Nothing here yet</p>
                <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.4)', marginBottom: 10 }}>Save a link to get started</p>
                <button onClick={() => setShowAdd(true)} style={{ backgroundColor: tileStyle.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Save link</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr 1fr' : '1fr 1fr', gap: 6 }}>
                {visibleItems.map((item) => {
                  const thumb = getThumbnailFromUrl(item.url, item.thumbnail)
                  const isActive = selectedItem?.id === item.id
                  return (
                    <div key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedItem(isActive ? null : item)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedItem(isActive ? null : item) }}
                      title={item.title}
                      style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', outline: isActive ? `2.5px solid ${tileStyle.accent}` : '2.5px solid transparent', outlineOffset: 1, transition: 'outline 0.15s' }}>
                      {thumb ? (
                        <img src={thumb} alt={item.title} style={{ width: '100%', height: isMobile ? 88 : 72, objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', height: isMobile ? 88 : 72, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: tileStyle.accentLight }}>
                          {Icon && <Icon size={20} style={{ color: tileStyle.accent }} />}
                        </div>
                      )}
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,61,58,0.75) 0%, transparent 55%)' }} />
                      <p style={{ position: 'absolute', bottom: 4, left: 4, right: 4, fontSize: 8, fontWeight: 600, color: '#f5f0e8', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(245,240,232,0.07)', fontSize: 10, color: 'rgba(245,240,232,0.35)', textAlign: 'center' }}>
            {visibleItems.length} saved · scroll to see all
          </div>
        </div>

        {/* ── Panel 2: Centre preview ── */}
        <div style={{ flex: 1, display: isMobile && mobileTab !== 'preview' ? 'none' : 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#0d2420', minWidth: 0 }}>
          {selectedItem ? (
            <>
              {/* Preview area — fills as much as possible */}
              <div style={{ flex: 1, backgroundColor: '#000', overflow: 'hidden', position: 'relative' }}>
                {renderPreview(selectedItem)}
              </div>
              {/* Details bar at bottom */}
              <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid rgba(245,240,232,0.08)', backgroundColor: '#0a1e1b', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 15, fontWeight: 700, color: '#f5f0e8', margin: 0, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedItem.title}</h2>
                  <p style={{ fontSize: 10, color: 'rgba(245,240,232,0.4)', margin: 0 }}>
                    {(() => { try { return new URL(selectedItem.url).hostname.replace('www.', '') } catch { return selectedItem.url } })()}
                  </p>
                </div>
                {ttsSupported && (
                  <button onClick={() => readItemAloud(selectedItem)}
                    title={speaking ? 'Stop reading' : 'Read title & notes aloud'}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 50, fontSize: 11, fontWeight: 700, color: speaking ? '#0d2420' : 'rgba(245,240,232,0.8)', backgroundColor: speaking ? tileStyle.accent : 'rgba(245,240,232,0.08)', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                    {speaking ? <Square size={11} /> : <Volume2 size={11} />} {speaking ? 'Stop' : 'Listen'}
                  </button>
                )}
                <button onClick={() => openItem(selectedItem)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 50, fontSize: 11, fontWeight: 700, color: '#fff', backgroundColor: tileStyle.accent, border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  <ExternalLink size={11} /> Open
                </button>
                <button onClick={() => setSelectedItem(null)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 50, fontSize: 11, fontWeight: 600, color: 'rgba(245,240,232,0.6)', backgroundColor: 'rgba(245,240,232,0.08)', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  <X size={11} /> Close
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: 32 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: `${tileStyle.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {Icon && <Icon size={28} style={{ color: tileStyle.accent }} />}
              </div>
              <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 17, fontWeight: 600, color: '#f5f0e8' }}>Select something to preview</p>
              <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.4)', maxWidth: 240 }}>{isMobile ? 'Tap any item in Browse or Links to preview it here' : 'Tap a thumbnail on the left or any saved item on the right to load it here'}</p>
            </div>
          )}
        </div>

        {/* ── Panel 3: Right — full links list ── */}
        <div style={{ width: isMobile ? '100%' : 260, flex: isMobile ? 1 : undefined, flexShrink: 0, display: isMobile && mobileTab !== 'links' ? 'none' : 'flex', flexDirection: 'column', borderLeft: isMobile ? 'none' : '1px solid rgba(245,240,232,0.07)', backgroundColor: '#0a1e1b', overflow: 'hidden' }}>
          <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid rgba(245,240,232,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)' }}>Saved links</span>
            <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.35)' }}>{visibleItems.length}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
            {visibleItems.length === 0 ? (
              <p style={{ fontSize: 12, color: 'rgba(245,240,232,0.35)', textAlign: 'center', marginTop: 24, fontStyle: 'italic' }}>Nothing saved yet</p>
            ) : visibleItems.map((item) => {
              const thumb = getThumbnailFromUrl(item.url, item.thumbnail)
              const isActive = selectedItem?.id === item.id
              return (
                <div key={item.id} style={{ position: 'relative' }}>
                  {/* Use div+role instead of <button> so the inner three-dot <button> is valid HTML */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedItem(isActive ? null : item)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedItem(isActive ? null : item) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 8px', borderRadius: 12, cursor: 'pointer', border: isActive ? `1px solid ${tileStyle.accent}44` : '1px solid transparent', textAlign: 'left', backgroundColor: isActive ? 'rgba(245,240,232,0.07)' : 'transparent', marginBottom: 2, transition: 'background 0.12s' }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(245,240,232,0.05)' }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent' }}
                  >
                    {thumb ? (
                      <img src={thumb} alt="" style={{ width: 48, height: 34, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 48, height: 34, borderRadius: 7, backgroundColor: `${tileStyle.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {Icon && <Icon size={14} style={{ color: tileStyle.accent }} />}
                      </div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#f5f0e8', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 1 }}>{item.title}</p>
                      <p style={{ fontSize: 10, color: 'rgba(245,240,232,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(() => { try { return new URL(item.url).hostname.replace('www.', '') } catch { return item.url } })()}
                      </p>
                    </div>
                    {/* Three-dot menu */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuItemId(menuItemId === item.id ? null : item.id); setMoveItemId(null) }}
                      style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 6, color: 'rgba(245,240,232,0.35)', display: 'flex', alignItems: 'center' }}
                    >
                      <MoreVertical size={13} />
                    </button>
                  </div>

                  {/* Context menu */}
                  <AnimatePresence>
                    {menuItemId === item.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        style={{ position: 'absolute', right: 4, top: 44, zIndex: 30, width: 176, borderRadius: 14, border: '1px solid rgba(245,240,232,0.12)', backgroundColor: '#122e29', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden' }}
                      >
                        {moveItemId === item.id ? (
                          <div style={{ padding: 8 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(245,240,232,0.4)', padding: '0 4px 6px' }}>Move to folder</p>
                            <button onClick={() => handleMoveToFolder(item.id, undefined)}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 8px', borderRadius: 8, fontSize: 11, cursor: 'pointer', border: 'none', backgroundColor: 'transparent', color: item.folderId === undefined ? tileStyle.accent : '#f5f0e8', textAlign: 'left' }}>
                              <FolderOpen size={11} /> No folder {item.folderId === undefined && <Check size={9} style={{ marginLeft: 'auto' }} />}
                            </button>
                            {folders.map((f) => (
                              <button key={f.id} onClick={() => handleMoveToFolder(item.id, f.id)}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 8px', borderRadius: 8, fontSize: 11, cursor: 'pointer', border: 'none', backgroundColor: 'transparent', color: item.folderId === f.id ? tileStyle.accent : '#f5f0e8', textAlign: 'left' }}>
                                <Folder size={11} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                                {item.folderId === f.id && <Check size={9} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                              </button>
                            ))}
                            <button onClick={() => setMoveItemId(null)}
                              style={{ width: '100%', padding: '4px 8px', marginTop: 4, borderRadius: 8, fontSize: 10, fontWeight: 600, color: 'rgba(245,240,232,0.4)', cursor: 'pointer', border: 'none', backgroundColor: 'transparent' }}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => { openItem(item); setMenuItemId(null) }}
                              style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8, padding: '9px 14px', fontSize: 12, fontWeight: 500, color: '#f5f0e8', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245,240,232,0.07)')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                              <ExternalLink size={12} /> Open link
                            </button>
                            <button onClick={() => setMoveItemId(item.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', fontSize: 12, fontWeight: 500, color: '#f5f0e8', cursor: 'pointer', border: 'none', backgroundColor: 'transparent', textAlign: 'left' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245,240,232,0.07)')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                              <FolderInput size={12} /> Move to folder
                            </button>
                            <button onClick={() => handleDuplicate(item.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', fontSize: 12, fontWeight: 500, color: '#f5f0e8', cursor: 'pointer', border: 'none', backgroundColor: 'transparent', textAlign: 'left' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245,240,232,0.07)')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                              <Copy size={12} /> Duplicate
                            </button>
                            <div style={{ height: 1, backgroundColor: 'rgba(245,240,232,0.08)', margin: '2px 0' }} />
                            <button onClick={() => { handleDelete(item.id); setMenuItemId(null) }}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', fontSize: 12, fontWeight: 500, color: '#e05050', cursor: 'pointer', border: 'none', backgroundColor: 'transparent', textAlign: 'left' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(224,80,80,0.1)')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                              <Trash2 size={12} /> Delete
                            </button>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Add link modal ── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', padding: 16 }}
            onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
            <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
              style={{ width: '100%', maxWidth: 440, borderRadius: 20, backgroundColor: '#122e29', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', border: '1px solid rgba(245,240,232,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 18, fontWeight: 700, color: '#f5f0e8' }}>Save to {gardenName}</h2>
                <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.4)', display: 'flex' }}><X size={17} /></button>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <textarea value={url} onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && !e.shiftKey) { e.preventDefault(); handleFetch() } }}
                  placeholder="Paste one or more links — one per line&#10;YouTube, TikTok, articles, Google Docs, any URL..."
                  rows={3}
                  style={{ flex: 1, resize: 'none', borderRadius: 12, border: '1.5px solid rgba(245,240,232,0.12)', padding: '10px 14px', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: '#f5f0e8', lineHeight: 1.5, backgroundColor: 'rgba(245,240,232,0.07)' }}
                  autoFocus />
                <button onClick={handleFetch} disabled={fetching || !url.trim()}
                  style={{ flexShrink: 0, alignSelf: 'stretch', borderRadius: 12, padding: '0 16px', fontSize: 13, fontWeight: 700, color: '#fff', backgroundColor: tileStyle.accent, border: 'none', cursor: 'pointer', opacity: (fetching || !url.trim()) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {fetching ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Fetch'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.4)', marginTop: 5 }}>Works with YouTube, TikTok, Instagram, articles, Google Docs, images, and any webpage</p>

              {/* File upload divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 10px' }}>
                <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(245,240,232,0.1)' }} />
                <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.35)', flexShrink: 0 }}>or upload a file</span>
                <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(245,240,232,0.1)' }} />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.mp4,.mp3"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.length) {
                    handleFileDrop(e.target.files)
                  }
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, color: 'rgba(245,240,232,0.8)', backgroundColor: 'rgba(245,240,232,0.07)', border: '1.5px dashed rgba(245,240,232,0.2)', cursor: 'pointer' }}
              >
                <Paperclip size={14} /> Choose files from your device
              </button>

              {fetchError && <p style={{ fontSize: 12, color: '#c9a84c', marginTop: 8 }}>{fetchError}</p>}

              {/* Folder picker */}
              {folders.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(245,240,232,0.5)', marginBottom: 6 }}>Save to folder (optional)</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <button onClick={() => setSelectedFolderForItem(undefined)}
                      style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 50, border: 'none', cursor: 'pointer', backgroundColor: selectedFolderForItem === undefined ? tileStyle.accent : 'rgba(245,240,232,0.1)', color: '#f5f0e8' }}>
                      No folder
                    </button>
                    {folders.map((f) => (
                      <button key={f.id} onClick={() => setSelectedFolderForItem(f.id)}
                        style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 50, border: 'none', cursor: 'pointer', backgroundColor: selectedFolderForItem === f.id ? tileStyle.accent : 'rgba(245,240,232,0.1)', color: '#f5f0e8' }}>
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Multi-preview list */}
              {multiPreviews.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#6b8884', marginBottom: 8 }}>
                    {multiPreviews.filter(p => p.selected).length} of {multiPreviews.length} selected — tap to deselect
                  </p>
                  <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {multiPreviews.map((p, i) => (
                      <button key={i} onClick={() => setMultiPreviews(prev => prev.map((x, j) => j === i ? { ...x, selected: !x.selected } : x))}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, border: `1.5px solid ${p.selected ? '#5a9e84' : 'rgba(13,61,58,0.10)'}`, backgroundColor: p.selected ? '#f0f7f4' : '#fafafa', opacity: p.selected ? 1 : 0.5, cursor: 'pointer', textAlign: 'left' }}>
                        {p.thumbnail ? (
                          <img src={p.thumbnail} alt="" style={{ width: 52, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 52, height: 36, borderRadius: 8, backgroundColor: '#eef2ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Globe size={14} color="#5a9e84" />
                          </div>
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#1a2e2b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title || p.url}</p>
                          <p style={{ fontSize: 10, color: '#6b8884', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(p.url ?? '').replace(/^https?:\/\//, '')}</p>
                        </div>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: p.selected ? '#5a9e84' : '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={10} color="white" />
                        </div>
                      </button>
                    ))}
                  </div>
                  <button onClick={handleSave}
                    style={{ marginTop: 10, width: '100%', borderRadius: 12, padding: '11px 0', fontSize: 14, fontWeight: 700, color: '#fff', backgroundColor: '#0d3d3a', border: 'none', cursor: 'pointer' }}>
                    Save {multiPreviews.filter(p => p.selected).length} links to {gardenName}
                  </button>
                </div>
              )}

              {/* Single preview */}
              {preview && (
                <>
                  <div style={{ marginTop: 14, borderRadius: 12, overflow: 'hidden', border: '1.5px solid rgba(13,61,58,0.10)' }}>
                    {preview.thumbnail && <img src={preview.thumbnail} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />}
                    <div style={{ padding: '10px 12px', backgroundColor: '#eef2ee' }}>
                      <input value={preview.title || ''} onChange={(e) => setPreview({ ...preview, title: e.target.value })} placeholder="Title"
                        style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 13, fontWeight: 600, color: '#1a2e2b', outline: 'none', boxSizing: 'border-box' }} />
                      <input value={preview.description || ''} onChange={(e) => setPreview({ ...preview, description: e.target.value })} placeholder="Description (optional)"
                        style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 11, color: '#6b8884', outline: 'none', marginTop: 4, boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <button onClick={handleSave}
                    style={{ marginTop: 12, width: '100%', borderRadius: 12, padding: '11px 0', fontSize: 14, fontWeight: 700, color: '#fff', backgroundColor: '#0d3d3a', border: 'none', cursor: 'pointer' }}>
                    Save to {gardenName}{selectedFolderForItem ? ` · ${folders.find((f) => f.id === selectedFolderForItem)?.name}` : ''}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reflections drawer ── */}
      <CategoryReflections
        open={showReflections}
        onClose={() => setShowReflections(false)}
        categoryLabel={gardenName}
        accent={tileStyle.accent}
        reflections={reflections}
        onAdd={addReflection}
        onDelete={removeReflection}
      />

      {/* ── Rename garden modal ── */}
      <AnimatePresence>
        {renaming && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setRenaming(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 140, backgroundColor: 'rgba(6,18,16,0.6)', backdropFilter: 'blur(3px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              role="dialog" aria-label="Rename garden"
              style={{ position: 'fixed', zIndex: 141, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(380px, 92vw)', backgroundColor: '#0a1e1b', border: '1px solid rgba(245,240,232,0.12)', borderRadius: 18, padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: `${tileStyle.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={15} color={tileStyle.accent} />
                </div>
                <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 18, fontWeight: 700, color: '#f5f0e8', margin: 0 }}>Rename this garden</h2>
              </div>
              <p style={{ fontSize: 11.5, color: 'rgba(245,240,232,0.5)', margin: '0 0 14px', lineHeight: 1.5 }}>
                Give this area a name that fits you. It updates everywhere — the tile, header, save buttons and email subjects.
              </p>
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) saveRename() }}
                maxLength={40}
                placeholder={defaultName(category)}
                style={{ width: '100%', padding: '11px 13px', borderRadius: 11, backgroundColor: '#0d2420', border: '1px solid rgba(245,240,232,0.15)', color: '#f5f0e8', fontSize: 14, outline: 'none' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
                <button
                  onClick={saveRename}
                  style={{ flex: 1, padding: '10px', borderRadius: 11, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, backgroundColor: tileStyle.accent, color: '#fff' }}
                >
                  Save name
                </button>
                {isCustom(category) && (
                  <button
                    onClick={resetName}
                    title={`Reset to "${defaultName(category)}"`}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 14px', borderRadius: 11, border: '1px solid rgba(245,240,232,0.15)', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'rgba(245,240,232,0.7)' }}
                  >
                    <RotateCcw size={13} /> Reset
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
