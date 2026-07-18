'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  GraduationCap, Briefcase, Shirt, Heart, Brain, Sparkles, Clapperboard, Music, Globe,
  ArrowLeft, Plus, X, Loader2, ExternalLink, Trash2, FolderPlus,
  Folder, FolderOpen, Check, MoreVertical, Copy, FolderInput, Upload, Paperclip,
  Play, ImageIcon, FileText, Send, ArrowRightLeft,
} from 'lucide-react'
import {
  CATEGORIES,
  type Cur8Item, type Cur8Folder, type Category,
} from '@/lib/cur8-store'
import { useViewport } from '@/hooks/use-viewport'
import { useReadAloud } from '@/hooks/use-speech'
import { LayoutGrid, Eye, List, Volume2, Square, NotebookPen, Pencil, RotateCcw, ClipboardPaste, PlayCircle } from 'lucide-react'
import { useGardenNames } from '@/components/cur8/garden-names-provider'
import DocumentViewer from '@/components/cur8/document-viewer'
import { upload } from '@vercel/blob/client'
import { generateVideoThumbnail } from '@/lib/video-thumbnail'
import { findConnections } from '@/app/actions/ai-features'
import { fetchPlaylist, type PlaylistItem } from '@/app/actions/fetch-playlist'
import {
  getCur8Data,
  createItem as createItemAction,
  moveItem as moveItemAction,
  duplicateItem as duplicateItemAction,
  deleteItem as deleteItemAction,
  createFolder as createFolderAction,
  deleteFolder as deleteFolderAction,
  duplicateFolder as duplicateFolderAction,
  moveItemToGarden as moveItemToGardenAction,
  copyItemToGarden as copyItemToGardenAction,
  markItemOpened,
  getReflections,
  createReflection,
  deleteReflection,
  type ReflectionDTO,
} from '@/app/actions/cur8'
import { summarizeItem } from '@/app/actions/summarize'
import CategoryStatsBar from '@/components/cur8/category-stats-bar'
import CategoryReflections from '@/components/cur8/category-reflections'

const ICON_MAP: Record<string, React.ElementType> = {
  'graduation-cap': GraduationCap, briefcase: Briefcase, shirt: Shirt, heart: Heart,
  brain: Brain, sparkles: Sparkles, clapperboard: Clapperboard, 'folder-open': FolderOpen,
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

// Pull the numeric video id out of a full TikTok URL so we can embed the player.
// Short links (vm.tiktok.com / /t/) don't expose the id, so those return null
// and fall back to a thumbnail + "Open in TikTok".
function extractTikTokId(url: string): string | null {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('tiktok.com')) return null
    const m = u.pathname.match(/\/video\/(\d+)/)
    return m ? m[1] : null
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

// Extract the original filename from a proxy URL (or fall back to a title)
function filenameFromUrl(url: string, fallback: string): string {
  if (url.startsWith('/api/cur8/file')) {
    try {
      const params = new URLSearchParams(url.split('?')[1] ?? '')
      const p = params.get('pathname') ?? ''
      const base = p.split('/').pop() ?? ''
      // Stored as "cur8/<timestamp>-<original name>"; strip the timestamp prefix
      return base.replace(/^\d+-/, '') || fallback
    } catch {}
  }
  return fallback
}

// Determine how to render a URL in the preview panel
function getPreviewType(url: string): 'youtube' | 'tiktok' | 'image' | 'pdf' | 'video' | 'audio' | 'document' | 'iframe' {
  // Private-blob proxy URLs — detect by extension in the pathname query param
  if (url.startsWith('/api/cur8/file')) {
    try {
      const params = new URLSearchParams(url.split('?')[1] ?? '')
      const p = (params.get('pathname') ?? '').toLowerCase()
      if (p.match(/\.(jpg|jpeg|png|gif|webp|avif)$/)) return 'image'
      if (p.match(/\.(mp4|webm|mov)$/)) return 'video'
      if (p.match(/\.(mp3|wav|ogg|m4a|aac)$/)) return 'audio'
      if (p.match(/\.pdf$/)) return 'pdf' // native browser PDF viewer (same-origin iframe)
      // Office / text docs must be rendered client-side (can't iframe a .docx)
      if (p.match(/\.(doc|docx|xls|xlsx|ppt|pptx|txt|csv|md)$/)) return 'document'
    } catch {}
    return 'document' // unknown uploaded file → let the viewer offer a download
  }
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') || u.hostname === 'youtu.be') return 'youtube'
    if (u.hostname.includes('tiktok.com')) return 'tiktok'
    const path = u.pathname.toLowerCase()
    if (path.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/)) return 'image'
    if (path.match(/\.(mp4|webm|mov|avi|mkv)$/)) return 'video'
    if (path.match(/\.(mp3|wav|ogg|m4a|aac)$/)) return 'audio'
    if (path.match(/\.pdf$/) || u.hostname.includes('drive.google.com') || u.hostname.includes('docs.google.com')) return 'pdf'
    if (path.match(/\.(doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/)) return 'pdf'
  } catch {}
  return 'iframe'
}

// Files from Google Drive / Android often arrive with an empty or generic MIME
// type. Infer a real one from the filename extension so uploads are accepted,
// videos get thumbnails, and items classify into the right lane.
const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', heic: 'image/heic', heif: 'image/heif',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', avi: 'video/x-msvideo', mkv: 'video/x-matroska', m4v: 'video/mp4', '3gp': 'video/3gpp',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac',
  pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain', csv: 'text/csv', md: 'text/markdown',
}
function resolveMime(file: File): string {
  const t = (file.type || '').toLowerCase()
  // Trust real, specific types; ignore empty and generic octet-stream
  if (t && t !== 'application/octet-stream' && t !== 'binary/octet-stream') return t
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_MIME[ext] ?? 'application/octet-stream'
}

// Classify an item into one of three lanes so the garden can auto-sort:
// videos (far left) · images (centre moodboard/gallery) · docs & links (far right)
type ContentKind = 'video' | 'image' | 'doc'
function getContentKind(item: { url: string }): ContentKind {
  const t = getPreviewType(item.url)
  if (t === 'image') return 'image'
  if (t === 'youtube' || t === 'video' || t === 'audio') return 'video'
  // Social platforms preview as generic iframes but are really videos
  try {
    const h = new URL(item.url).hostname.toLowerCase()
    if (/tiktok|instagram|vimeo|fb\.watch|facebook|dailymotion|twitch|youtu/.test(h)) return 'video'
  } catch {}
  return 'doc'
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
  const [saveTab, setSaveTab] = useState<'links' | 'playlist'>('links')
  const [playlistInput, setPlaylistInput] = useState('')
  const [playlistFetching, setPlaylistFetching] = useState(false)
  const [playlistSaving, setPlaylistSaving] = useState(false)
  const [playlistResult, setPlaylistResult] = useState<{ title: string; items: (PlaylistItem & { selected: boolean })[] } | null>(null)
  const [playlistError, setPlaylistError] = useState('')
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
  const [connections, setConnections] = useState<{ item: { id: string; title: string; category: string; url: string }; reason: string }[]>([])
  const [connectionsLoading, setConnectionsLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadProgress, setUploadProgress] = useState<string>('')
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
  // Centre panel: 'preview' (idle = rotating moodboard) or 'gallery' (image grid)
  const [middleView, setMiddleView] = useState<'preview' | 'gallery'>('preview')
  const [moodIndex, setMoodIndex] = useState(0)
  // Cross-garden move/copy submenu + duplicate-folder tracking
  const [gardenPickItemId, setGardenPickItemId] = useState<string | null>(null)
  const [gardenPickMode, setGardenPickMode] = useState<'move' | 'copy'>('move')
  const [menuFolderId, setMenuFolderId] = useState<string | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null)
  const [folderMenuAnchor, setFolderMenuAnchor] = useState<{ x: number; y: number } | null>(null)

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

  // ── AI smart summary ──
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState('')
  const [summaryOpen, setSummaryOpen] = useState(false)

  // When the selected item changes, show its summary panel if one already
  // exists, and clear any stale loading/error state from the previous item.
  useEffect(() => {
    setSummaryError('')
    setSummaryLoading(false)
    setSummaryOpen(!!selectedItem?.summary)
  }, [selectedItem?.id, selectedItem?.summary])

  async function handleSummarise(item: Cur8Item, regenerate = false) {
    setSummaryError('')
    setSummaryLoading(true)
    try {
      const { summary } = await summarizeItem(item.id, regenerate)
      // Store it on the item so it's cached in the UI and shown instantly next time
      setAllItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, summary } : it)))
      setSelectedItem((cur) => (cur && cur.id === item.id ? { ...cur, summary } : cur))
    } catch {
      setSummaryError('Could not create a summary just now. Please try again in a moment.')
    } finally {
      setSummaryLoading(false)
    }
  }

  // Load cross-haven connections when an item is selected
  useEffect(() => {
    if (!selectedItem) { setConnections([]); return }
    setConnectionsLoading(true)
    findConnections(selectedItem.id)
      .then(setConnections)
      .catch(() => {})
      .finally(() => setConnectionsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem?.id])

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

  // If we arrived here from a native "Share to Cur8" (PWA share target) or a
  // ?share= link, open the save dialog with the link pre-filled and fetched.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const shared = params.get('share') || params.get('url') || params.get('text')
    if (shared && extractUrls(shared).length > 0) {
      setShowAdd(true)
      setUrl(shared)
      handleFetch(shared)
      window.history.replaceState({}, '', window.location.pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    getReflections(category).then(setReflections).catch(() => {})
  }, [category])

  // NOTE: menus are closed by their own fixed click-catcher overlays.
  // We must NOT add a native document click listener here — React's
  // stopPropagation() does not stop native document listeners, so it would
  // close the menu on the very click that opens a submenu (Move to folder).

  const catItems = allItems.filter((i) => i.category === category)
  const visibleItems = activeFolder === null ? catItems : catItems.filter((i) => i.folderId === activeFolder)

  // Auto-sorted lanes
  const videoItems = visibleItems.filter((i) => getContentKind(i) === 'video')
  const imageItems = visibleItems.filter((i) => getContentKind(i) === 'image')
  const docItems = visibleItems.filter((i) => getContentKind(i) === 'doc')

  // Image URLs for the rotating idle moodboard (use stored thumb or the image url itself)
  const moodImages = imageItems
    .map((i) => getThumbnailFromUrl(i.url, i.thumbnail) || i.url)
    .filter(Boolean)

  // Gently rotate the idle moodboard every 5s when nothing is selected
  useEffect(() => {
    if (selectedItem || middleView !== 'preview' || moodImages.length <= 1) return
    const t = setInterval(() => setMoodIndex((n) => (n + 1) % moodImages.length), 5000)
    return () => clearInterval(t)
  }, [selectedItem, middleView, moodImages.length])

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
    setUploadProgress('')
    try {
      const saved: Awaited<ReturnType<typeof createItemAction>>[] = []
      // Upload one at a time so progress is clear and large files stay reliable
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        const label = fileArray.length > 1 ? `(${i + 1}/${fileArray.length}) ` : ''
        setUploadProgress(`${label}Starting ${file.name}…`)

        // Resolve a real MIME type (Drive/Android files often have none)
        const mime = resolveMime(file)
        // Ensure the stored filename has a usable extension so previews & lane
        // classification work even when the original name lacks one.
        let safeName = file.name
        if (!/\.[a-z0-9]{2,5}$/i.test(safeName)) {
          const guessedExt = Object.entries(EXT_MIME).find(([, v]) => v === mime)?.[0]
          if (guessedExt) safeName = `${safeName}.${guessedExt}`
        }

        // Client-side direct upload — streams straight to Blob storage.
        // multipart:true splits big files into parallel parts (handles large videos).
        const blob = await upload(`cur8/${safeName}`, file, {
          access: 'private',
          handleUploadUrl: '/api/cur8/upload',
          multipart: true,
          contentType: mime,
          onUploadProgress: ({ percentage }) => {
            setUploadProgress(`${label}Uploading ${file.name} — ${Math.round(percentage)}%`)
          },
        })

        const url = `/api/cur8/file?pathname=${encodeURIComponent(blob.pathname)}`
        const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')

        // Work out a thumbnail: images use themselves; videos get a captured frame
        let thumbnail: string | undefined = mime.startsWith('image/') ? url : undefined
        if (mime.startsWith('video/')) {
          setUploadProgress(`${label}Making thumbnail for ${file.name}…`)
          const thumbBlob = await generateVideoThumbnail(file).catch(() => null)
          if (thumbBlob) {
            const thumbUpload = await upload(`cur8/thumbs/${Date.now()}-${safeName}.jpg`, thumbBlob, {
              access: 'private',
              handleUploadUrl: '/api/cur8/upload',
              contentType: 'image/jpeg',
            })
            thumbnail = `/api/cur8/file?pathname=${encodeURIComponent(thumbUpload.pathname)}`
          }
        }

        const item = await createItemAction({
          category,
          folderId: selectedFolderForItem,
          url,
          title,
          description: `${mime} · ${(file.size / 1024).toFixed(0)} KB`,
          thumbnail,
        })
        saved.push(item)
      }
      setAllItems((prev) => [...(saved.filter(Boolean) as Cur8Item[]), ...prev])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress('')
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
    // 1) Grab every explicit http(s) URL, however they're separated (spaces, newlines, commas)
    const explicit = text.match(/https?:\/\/[^\s,]+/gi) ?? []
    if (explicit.length > 0) {
      // De-duplicate while preserving order
      return Array.from(new Set(explicit.map((s) => s.trim())))
    }
    // 2) No protocols present — split on whitespace/newlines/commas and normalise domain-like tokens
    return Array.from(
      new Set(
        text
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 4 && s.includes('.'))
          .map(normaliseUrl),
      ),
    )
  }

  // Read the clipboard and, if it holds a link, fill + fetch it in one tap.
  // This is the low-friction path: copy a link in YouTube/TikTok, come back,
  // tap "Paste link" and it fetches immediately.
  async function pasteFromClipboard() {
    try {
      const text = (await navigator.clipboard.readText())?.trim()
      if (!text) { setFetchError('Clipboard is empty — copy a link first.'); return }
      setUrl(text)
      if (extractUrls(text).length > 0) handleFetch(text)
    } catch {
      setFetchError('Could not read the clipboard. Paste the link into the box instead.')
    }
  }

  async function handleFetch(override?: string) {
    const source = (override ?? url).trim()
    if (!source) return
    const urls = extractUrls(source)
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
        // Prefer a resolved canonical URL (e.g. TikTok short link → /video/<id>)
        // so playback can embed it inline instead of bouncing to the app.
        setPreview({ ...data, url: data.resolvedUrl || normalised })
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
            return { ...data, url: data.resolvedUrl || u, selected: true }
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

  async function handleDuplicateFolder(folderId: string) {
    setMenuFolderId(null)
    const result = await duplicateFolderAction(folderId).catch(() => null)
    if (result) {
      setFolders((prev) => [result.folder as Cur8Folder, ...prev])
      setAllItems((prev) => [...(result.items as Cur8Item[]), ...prev])
      setActiveFolder(result.folder.id)
    }
  }

  // Move or copy an item into a different garden (category)
  async function handleSendToGarden(itemId: string, targetCategory: Category, mode: 'move' | 'copy') {
    setGardenPickItemId(null)
    setMenuItemId(null)
    if (mode === 'move') {
      if (selectedItem?.id === itemId) setSelectedItem(null)
      setAllItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, category: targetCategory, folderId: undefined } : i)))
      await moveItemToGardenAction(itemId, targetCategory).catch(() => {})
    } else {
      const copy = await copyItemToGardenAction(itemId, targetCategory).catch(() => null)
      if (copy) setAllItems((prev) => [copy as Cur8Item, ...prev])
    }
  }

  async function handleFetchPlaylist() {
    const input = playlistInput.trim()
    if (!input) return
    setPlaylistFetching(true)
    setPlaylistError('')
    setPlaylistResult(null)
    try {
      const result = await fetchPlaylist(input)
      if (result.error) { setPlaylistError(result.error); return }
      setPlaylistResult({ title: result.title, items: result.items.map((i) => ({ ...i, selected: true })) })
    } catch (e) {
      setPlaylistError(e instanceof Error ? e.message : 'Could not load playlist')
    } finally {
      setPlaylistFetching(false)
    }
  }

  async function handleSavePlaylist() {
    if (!playlistResult) return
    const selected = playlistResult.items.filter((i) => i.selected)
    if (selected.length === 0) return
    setPlaylistSaving(true)
    // Save directly from the data already fetched during playlist load —
    // no extra fetch-meta call per video (which would time out on mobile).
    for (const item of selected) {
      try {
        const newItem = await createItemAction({
          url: item.url,
          title: item.title,
          description: item.channelName ? `By ${item.channelName}` : '',
          thumbnail: item.thumbnail || '',
          category: cat as unknown as Category,
          folderId: selectedFolderForItem,
        })
        if (newItem) setAllItems((prev) => [newItem as Cur8Item, ...prev])
      } catch { /* skip failed items silently */ }
    }
    setPlaylistSaving(false)
    closeModal()
  }

  function closeModal() {
    setShowAdd(false)
    setUrl('')
    setPreview(null)
    setMultiPreviews([])
    setFetchError('')
    setSelectedFolderForItem(undefined)
    setSaveTab('links')
    setPlaylistInput('')
    setPlaylistResult(null)
    setPlaylistError('')
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

    if (type === 'tiktok') {
      const tkId = extractTikTokId(item.url)
      // Full /video/ links embed & play inline via TikTok's player.
      if (tkId) {
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
            <iframe
              style={{ width: '100%', maxWidth: 340, height: '100%', border: 'none', display: 'block' }}
              src={`https://www.tiktok.com/embed/v2/${tkId}`}
              title={item.title}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
            />
          </div>
        )
      }
      // Short links (vm.tiktok.com) have no embeddable id — show the poster + open button.
      const poster = getThumbnailFromUrl(item.url, item.thumbnail)
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#0a1e1b', padding: 24, textAlign: 'center' }}>
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt={item.title} style={{ maxWidth: 220, maxHeight: '55%', borderRadius: 14, objectFit: 'cover' }} />
          ) : null}
          <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 15, fontWeight: 600, color: '#f5f0e8', maxWidth: 300 }}>{item.title}</p>
          <a href={item.url} target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 50, fontSize: 12, fontWeight: 700, color: '#fff', backgroundColor: tileStyle.accent, textDecoration: 'none' }}>
            <Play size={13} /> Play on TikTok
          </a>
        </div>
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

    if (type === 'document') {
      // Uploaded Office / text docs — rendered client-side (mammoth / xlsx)
      return (
        <DocumentViewer
          url={item.url}
          filename={filenameFromUrl(item.url, item.title)}
          accent={tileStyle.accent}
        />
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

  // Single three-dot context menu rendered as a FIXED overlay so it is never
  // clipped by the scrolling panels. Positioned at the clicked button's coords.
  function renderItemMenu() {
    const item = allItems.find((i) => i.id === menuItemId)
    if (!item || !menuAnchor) return null
    const otherGardens = CATEGORIES.filter((c) => c.name !== category)
    const MENU_W = 200
    const MENU_H = 340
    // Clamp to viewport; flip up/left near edges
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768
    const left = Math.min(Math.max(8, menuAnchor.x - MENU_W), vw - MENU_W - 8)
    const openUp = menuAnchor.y + MENU_H > vh
    const top = openUp ? Math.max(8, menuAnchor.y - MENU_H) : menuAnchor.y + 6
    return (
      <>
        {/* Click-catcher so the next click anywhere closes the menu */}
        <div onClick={() => { setMenuItemId(null); setMoveItemId(null); setGardenPickItemId(null) }}
          style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'fixed', left, top, zIndex: 201, width: MENU_W, borderRadius: 14, border: '1px solid rgba(245,240,232,0.12)', backgroundColor: '#122e29', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden', maxHeight: MENU_H, overflowY: 'auto' }}
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
                {folders.length === 0 && <p style={{ fontSize: 10, color: 'rgba(245,240,232,0.4)', padding: '2px 4px', fontStyle: 'italic' }}>No folders yet — create one from the bar above.</p>}
                <button onClick={() => setMoveItemId(null)}
                  style={{ width: '100%', padding: '4px 8px', marginTop: 4, borderRadius: 8, fontSize: 10, fontWeight: 600, color: 'rgba(245,240,232,0.4)', cursor: 'pointer', border: 'none', backgroundColor: 'transparent' }}>
                  Cancel
                </button>
              </div>
            ) : gardenPickItemId === item.id ? (
              <div style={{ padding: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(245,240,232,0.4)', padding: '0 4px 6px' }}>
                        {gardenPickMode === 'move' ? 'Move to haven' : 'Copy to haven'}
                </p>
                {otherGardens.map((g) => (
                  <button key={g.name} onClick={() => handleSendToGarden(item.id, g.name as Category, gardenPickMode)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 8px', borderRadius: 8, fontSize: 11, cursor: 'pointer', border: 'none', backgroundColor: 'transparent', color: '#f5f0e8', textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245,240,232,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <Folder size={11} style={{ flexShrink: 0, opacity: 0.7 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName(g.name)}</span>
                  </button>
                ))}
                <button onClick={() => setGardenPickItemId(null)}
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
                <button onClick={() => { setGardenPickMode('move'); setGardenPickItemId(item.id) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', fontSize: 12, fontWeight: 500, color: '#f5f0e8', cursor: 'pointer', border: 'none', backgroundColor: 'transparent', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245,240,232,0.07)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <ArrowRightLeft size={12} /> Move to haven
                </button>
                <button onClick={() => { setGardenPickMode('copy'); setGardenPickItemId(item.id) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', fontSize: 12, fontWeight: 500, color: '#f5f0e8', cursor: 'pointer', border: 'none', backgroundColor: 'transparent', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245,240,232,0.07)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <Send size={12} /> Copy to haven
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
        </AnimatePresence>
      </>
    )
  }

  // Folder options menu (duplicate / delete), fixed overlay so it isn't clipped
  function renderFolderMenu() {
    if (!menuFolderId || !folderMenuAnchor) return null
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
    const left = Math.min(folderMenuAnchor.x, vw - 178)
    const top = folderMenuAnchor.y + 6
    return (
      <>
        <div onClick={() => setMenuFolderId(null)} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', left, top, zIndex: 201, width: 170, borderRadius: 12, border: '1px solid rgba(245,240,232,0.12)', backgroundColor: '#122e29', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
          <button onClick={() => handleDuplicateFolder(menuFolderId!)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 13px', fontSize: 12, color: '#f5f0e8', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245,240,232,0.07)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <Copy size={12} /> Duplicate folder
          </button>
          <button onClick={() => { deleteFolder(menuFolderId!); setMenuFolderId(null) }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 13px', fontSize: 12, color: '#e05050', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(224,80,80,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <Trash2 size={12} /> Delete folder
          </button>
        </motion.div>
      </>
    )
  }

  function toggleItemMenu(id: string, e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    // Anchor to the right edge of the button, just below it
    setMenuAnchor({ x: rect.right, y: rect.bottom })
    setMenuItemId(menuItemId === id ? null : id)
    setMoveItemId(null)
    setGardenPickItemId(null)
  }

  // When previewing a media item on mobile, collapse the banner/stats/folder
  // chrome so the video (esp. tall TikTok embeds) gets nearly the full screen.
  const mediaFocus = isMobile && !!selectedItem && middleView === 'preview'

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
            {uploading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {uploadProgress || 'Uploading files…'}</> : <><X size={14} color="#c85a40" /> {uploadError} <button onClick={() => setUploadError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.5)', marginLeft: 4, padding: 0 }}><X size={11} /></button></>}
        </div>
      )}

      {/* ── Banner ── */}
      <div style={{ position: 'relative', height: 150, flexShrink: 0, overflow: 'hidden', display: mediaFocus ? 'none' : 'block' }}>
        <Image src={tileStyle.image} alt={category} fill className="object-cover object-center" priority sizes="100vw" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,36,32,0.5) 0%, rgba(13,36,32,0.92) 100%)' }} />
        {/* Nav */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
          <Link href="/cur8" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 50, fontSize: 11, fontWeight: 600, color: '#f5f0e8', textDecoration: 'none', backgroundColor: 'rgba(245,240,232,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <ArrowLeft size={10} /> All havens
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
        <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 28, fontWeight: 700, color: '#f5f0e8', margin: 0, lineHeight: 1.1, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{gardenName}</h1>
            <button
              onClick={openRename}
              aria-label="Rename this haven"
              title="Rename this haven"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 8, background: 'rgba(245,240,232,0.12)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--c-cream)', cursor: 'pointer', backdropFilter: 'blur(8px)', flexShrink: 0 }}
            >
              <Pencil size={11} />
            </button>
          </div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: tileStyle.accent, margin: '0 0 5px' }}>{cat.area}</p>
          <p style={{ fontSize: 9.5, color: 'rgba(245,240,232,0.5)', margin: 0 }}>{cat.description} · {catItems.length} saved</p>
        </div>
      </div>

      {/* ── Stats bar ── */}
      {!mediaFocus && <CategoryStatsBar items={catItems} accent={tileStyle.accent} reflectionCount={reflections.length} />}

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

      {/* ── Full-width folder filter bar (filters all three lanes) ── */}
      <div style={{ flexShrink: 0, padding: '8px 14px', backgroundColor: '#0a1e1b', borderBottom: '1px solid rgba(245,240,232,0.07)', display: mediaFocus ? 'none' : 'flex', alignItems: 'center', gap: 8, overflowX: 'auto' }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)', flexShrink: 0 }}>Folders</span>
        <button onClick={() => setActiveFolder(null)}
          style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 50, cursor: 'pointer', border: 'none', backgroundColor: activeFolder === null ? tileStyle.accent : 'rgba(245,240,232,0.1)', color: '#f5f0e8' }}>
          All <span style={{ opacity: 0.6 }}>{catItems.length}</span>
        </button>
        {folders.map((f) => {
          const folderCount = catItems.filter((i) => i.folderId === f.id).length
          return (
          <div key={f.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <button onClick={() => setActiveFolder(f.id)}
              style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 50, cursor: 'pointer', border: 'none', backgroundColor: activeFolder === f.id ? tileStyle.accent : 'rgba(245,240,232,0.1)', color: '#f5f0e8' }}>
              {f.name} <span style={{ opacity: 0.6 }}>{folderCount}</span>
            </button>
            <button onClick={(e) => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setFolderMenuAnchor({ x: r.left, y: r.bottom })
                setMenuFolderId(menuFolderId === f.id ? null : f.id)
              }} title="Folder options"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.4)', display: 'flex', padding: '0 2px' }}>
              <MoreVertical size={12} />
            </button>
          </div>
          )
        })}
        {showNewFolder ? (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) createFolder(); if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName('') } }}
              placeholder="Folder name" autoFocus
              style={{ border: '1px solid rgba(245,240,232,0.15)', borderRadius: 8, padding: '3px 8px', fontSize: 11, outline: 'none', width: 110, backgroundColor: 'rgba(245,240,232,0.08)', color: '#f5f0e8' }} />
            <button onClick={createFolder} style={{ background: tileStyle.accent, border: 'none', borderRadius: 8, padding: '3px 7px', cursor: 'pointer', color: '#fff', display: 'flex' }}>
              <Check size={11} />
            </button>
          </div>
        ) : (
          <button onClick={() => setShowNewFolder(true)} title="New folder"
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '1px dashed rgba(245,240,232,0.2)', borderRadius: 50, padding: '3px 10px', cursor: 'pointer', color: 'rgba(245,240,232,0.55)', fontSize: 10, fontWeight: 600 }}>
            <FolderPlus size={11} /> New
          </button>
        )}
      </div>

      {/* ── Three-panel body (stacks on mobile) ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Panel 1: Videos lane ── */}
        <div style={{ width: isMobile ? '100%' : 240, flex: isMobile ? 1 : undefined, flexShrink: 0, display: isMobile && mobileTab !== 'browse' ? 'none' : 'flex', flexDirection: 'column', borderRight: isMobile ? 'none' : '1px solid rgba(245,240,232,0.07)', backgroundColor: '#0a1e1b', overflow: 'hidden' }}>
          <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid rgba(245,240,232,0.07)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clapperboard size={13} color={tileStyle.accent} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.55)' }}>Videos</span>
            <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.35)', marginLeft: 'auto' }}>{videoItems.length}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {videoItems.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: 16 }}>
                <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.4)', lineHeight: 1.5 }}>No videos here yet. YouTube, TikTok, Instagram and uploaded clips land here.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr 1fr' : '1fr 1fr', gap: 6 }}>
                {videoItems.map((item) => {
                  const thumb = getThumbnailFromUrl(item.url, item.thumbnail)
                  const isActive = selectedItem?.id === item.id
                  return (
                    <div key={item.id} style={{ position: 'relative' }}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectedItem(isActive ? null : item); setMiddleView('preview') }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedItem(isActive ? null : item); setMiddleView('preview') } }}
                        title={item.title}
                        style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', outline: isActive ? `2.5px solid ${tileStyle.accent}` : '2.5px solid transparent', outlineOffset: 1, transition: 'outline 0.15s' }}>
                        <div style={{ position: 'relative', width: '100%', height: isMobile ? 88 : 72, backgroundColor: tileStyle.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Clapperboard size={20} style={{ color: tileStyle.accent }} />
                          {thumb ? (
                            <img src={thumb} alt={item.title}
                              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              onError={(e) => { e.currentTarget.style.display = 'none' }} />
                          ) : null}
                        </div>
                        {/* Play glyph so videos read as videos */}
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 26, height: 26, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Play size={12} color="#fff" style={{ marginLeft: 1 }} />
                        </div>
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,61,58,0.75) 0%, transparent 55%)' }} />
                        <p style={{ position: 'absolute', bottom: 4, left: 4, right: 4, fontSize: 8, fontWeight: 600, color: '#f5f0e8', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleItemMenu(item.id, e) }}
                        title="Options"
                        style={{ position: 'absolute', top: 3, right: 3, zIndex: 10, background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', padding: 3, borderRadius: 6, color: '#fff', display: 'flex', alignItems: 'center' }}>
                        <MoreVertical size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Panel 2: Centre — preview / rotating moodboard / image gallery ── */}
        <div style={{ flex: 1, display: isMobile && mobileTab !== 'preview' ? 'none' : 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#0d2420', minWidth: 0 }}>
          {/* Centre tabs */}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '8px 10px', borderBottom: '1px solid rgba(245,240,232,0.07)', backgroundColor: '#0a1e1b' }}>
            <button onClick={() => setMiddleView('preview')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 50, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', backgroundColor: middleView === 'preview' ? tileStyle.accent : 'rgba(245,240,232,0.08)', color: middleView === 'preview' ? '#fff' : 'rgba(245,240,232,0.7)' }}>
              <Eye size={12} /> Preview
            </button>
            <button onClick={() => { setMiddleView('gallery'); setSelectedItem(null) }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 50, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', backgroundColor: middleView === 'gallery' ? tileStyle.accent : 'rgba(245,240,232,0.08)', color: middleView === 'gallery' ? '#fff' : 'rgba(245,240,232,0.7)' }}>
              <ImageIcon size={12} /> Images <span style={{ opacity: 0.6 }}>{imageItems.length}</span>
            </button>
          </div>

          {middleView === 'gallery' ? (
            /* ── Dedicated image gallery ── */
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              {imageItems.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, textAlign: 'center' }}>
                  <ImageIcon size={30} color={`${tileStyle.accent}`} />
                  <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.45)', maxWidth: 240 }}>No images saved here yet. Uploaded pictures and image links will fill this gallery.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                  {imageItems.map((item) => {
                    const thumb = getThumbnailFromUrl(item.url, item.thumbnail) || item.url
                    return (
                      <div key={item.id} style={{ position: 'relative' }}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => { setSelectedItem(item); setMiddleView('preview') }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedItem(item); setMiddleView('preview') } }}
                          title={item.title}
                          style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', aspectRatio: '1 / 1' }}>
                          <img src={thumb} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} crossOrigin="anonymous" />
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,61,58,0.7) 0%, transparent 50%)' }} />
                          <p style={{ position: 'absolute', bottom: 5, left: 6, right: 6, fontSize: 9, fontWeight: 600, color: '#f5f0e8', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleItemMenu(item.id, e) }}
                          title="Options"
                          style={{ position: 'absolute', top: 5, right: 5, zIndex: 10, background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', padding: 3, borderRadius: 6, color: '#fff', display: 'flex', alignItems: 'center' }}>
                          <MoreVertical size={12} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : selectedItem ? (
            <>
              {/*
               * Preview area layout:
               * - Desktop + summary open: side-by-side (video | summary panel)
               * - Mobile + summary open: video fills top, summary is a FIXED bottom sheet
               *   rendered via portal (outside this flex column) so it never shrinks the video.
               * - Summary closed: video fills everything.
               */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', position: 'relative' }}>

                {/* Video / preview — always full height, shrinks only on desktop when summary open */}
                <div style={{
                  flex: 1,
                  backgroundColor: '#000',
                  overflow: 'hidden',
                  // On desktop: shrink to make room for the side panel
                  minWidth: 0,
                  transition: 'flex 0.3s ease',
                }}>
                  {renderPreview(selectedItem)}
                </div>

                {/* ── Desktop summary side-panel ── */}
                <AnimatePresence>
                  {!isMobile && summaryOpen && (summaryLoading || summaryError || selectedItem.summary || connections.length > 0 || connectionsLoading) && (
                    <motion.div
                      key="summary-side"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 280, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                      style={{
                        flexShrink: 0, overflow: 'hidden',
                        backgroundColor: '#0a1e1b',
                        borderLeft: `1px solid ${tileStyle.accent}33`,
                        display: 'flex', flexDirection: 'column',
                      }}
                    >
                      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px' }}>
                        {/* Panel header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Sparkles size={12} style={{ color: tileStyle.accent }} />
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: tileStyle.accent, flex: 1 }}>Summary</span>
                          {!summaryLoading && selectedItem.summary && (
                            <button onClick={() => handleSummarise(selectedItem, true)} title="Refresh"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 50, fontSize: 9, fontWeight: 600, color: 'rgba(245,240,232,0.55)', backgroundColor: 'rgba(245,240,232,0.06)', border: 'none', cursor: 'pointer' }}>
                              <RotateCcw size={9} /> Refresh
                            </button>
                          )}
                          <button onClick={() => setSummaryOpen(false)} title="Close"
                            style={{ display: 'inline-flex', padding: 3, borderRadius: 50, color: 'rgba(245,240,232,0.5)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
                            <X size={12} />
                          </button>
                        </div>

                        {summaryLoading ? (
                          <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'rgba(245,240,232,0.6)', margin: 0, fontStyle: 'italic' }}>
                            <Loader2 size={13} className="animate-spin" style={{ color: tileStyle.accent }} /> Taking a gentle look...
                          </p>
                        ) : summaryError ? (
                          <p style={{ fontSize: 12.5, color: '#e8b4a0', margin: 0 }}>{summaryError}</p>
                        ) : (
                          <p style={{ fontSize: 12.5, lineHeight: 1.65, color: 'rgba(245,240,232,0.9)', margin: 0 }}>{selectedItem.summary}</p>
                        )}

                        {(connections.length > 0 || connectionsLoading) && (
                          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(245,240,232,0.08)' }}>
                            <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#c9a84c', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Sparkles size={10} /> Also in your havens
                            </p>
                            {connectionsLoading ? (
                              <p style={{ margin: 0, fontSize: 11.5, color: 'rgba(245,240,232,0.4)', fontStyle: 'italic' }}>Finding connections...</p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {connections.map(({ item: conn, reason }) => (
                                  <div key={conn.id}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#f5f0e8', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conn.title}</span>
                                    <span style={{ fontSize: 10.5, color: '#c9a84c', opacity: 0.75 }}>{conn.category} · {reason}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Mobile summary: FIXED bottom sheet — rendered outside the flex column
                  so it never shrinks the video iframe ── */}
              <AnimatePresence>
                {isMobile && summaryOpen && (summaryLoading || summaryError || selectedItem.summary || connections.length > 0 || connectionsLoading) && (
                  <motion.div
                    key="summary-mobile-sheet"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                    style={{
                      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 300,
                      backgroundColor: '#0a1e1b',
                      borderTop: `2px solid ${tileStyle.accent}55`,
                      borderRadius: '18px 18px 0 0',
                      boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
                      maxHeight: '45vh',
                      display: 'flex', flexDirection: 'column',
                    }}
                  >
                    {/* Drag handle */}
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                      <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(245,240,232,0.25)' }} />
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <Sparkles size={12} style={{ color: tileStyle.accent }} />
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: tileStyle.accent, flex: 1 }}>A gentle summary</span>
                        {!summaryLoading && selectedItem.summary && (
                          <button onClick={() => handleSummarise(selectedItem, true)} title="Refresh"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 50, fontSize: 9, fontWeight: 600, color: 'rgba(245,240,232,0.55)', backgroundColor: 'rgba(245,240,232,0.06)', border: 'none', cursor: 'pointer' }}>
                            <RotateCcw size={9} /> Refresh
                          </button>
                        )}
                        <button onClick={() => setSummaryOpen(false)} title="Close"
                          style={{ display: 'inline-flex', padding: 4, borderRadius: 50, color: 'rgba(245,240,232,0.5)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
                          <X size={14} />
                        </button>
                      </div>
                      {summaryLoading ? (
                        <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'rgba(245,240,232,0.6)', margin: 0, fontStyle: 'italic' }}>
                          <Loader2 size={13} className="animate-spin" style={{ color: tileStyle.accent }} /> Taking a gentle look...
                        </p>
                      ) : summaryError ? (
                        <p style={{ fontSize: 12.5, color: '#e8b4a0', margin: 0 }}>{summaryError}</p>
                      ) : (
                        <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(245,240,232,0.9)', margin: 0 }}>{selectedItem.summary}</p>
                      )}
                      {(connections.length > 0 || connectionsLoading) && (
                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(245,240,232,0.08)' }}>
                          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#c9a84c', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Sparkles size={10} /> Also in your havens
                          </p>
                          {connectionsLoading ? (
                            <p style={{ margin: 0, fontSize: 11.5, color: 'rgba(245,240,232,0.4)', fontStyle: 'italic' }}>Finding connections...</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {connections.map(({ item: conn, reason }) => (
                                <div key={conn.id}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: '#f5f0e8', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conn.title}</span>
                                  <span style={{ fontSize: 10.5, color: '#c9a84c', opacity: 0.75 }}>{conn.category} · {reason}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Details bar at bottom */}
              <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid rgba(245,240,232,0.08)', backgroundColor: '#0a1e1b', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 15, fontWeight: 700, color: '#f5f0e8', margin: 0, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedItem.title}</h2>
                  <p style={{ fontSize: 10, color: 'rgba(245,240,232,0.4)', margin: 0 }}>
                    {(() => { try { return new URL(selectedItem.url).hostname.replace('www.', '') } catch { return selectedItem.url } })()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (selectedItem.summary && !summaryLoading) { setSummaryOpen((o) => !o) }
                    else { setSummaryOpen(true); handleSummarise(selectedItem) }
                  }}
                  disabled={summaryLoading}
                  title="Get a warm AI summary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 50, fontSize: 11, fontWeight: 700, color: summaryOpen ? '#0d2420' : 'rgba(245,240,232,0.8)', backgroundColor: summaryOpen ? tileStyle.accent : 'rgba(245,240,232,0.08)', border: 'none', cursor: summaryLoading ? 'wait' : 'pointer', flexShrink: 0 }}>
                  {summaryLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} {!isMobile && 'Summary'}
                </button>
                {ttsSupported && (
                  <button onClick={() => readItemAloud(selectedItem)}
                    title={speaking ? 'Stop reading' : 'Read title & notes aloud'}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 50, fontSize: 11, fontWeight: 700, color: speaking ? '#0d2420' : 'rgba(245,240,232,0.8)', backgroundColor: speaking ? tileStyle.accent : 'rgba(245,240,232,0.08)', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                    {speaking ? <Square size={11} /> : <Volume2 size={11} />} {!isMobile && (speaking ? 'Stop' : 'Listen')}
                  </button>
                )}
                <button onClick={() => openItem(selectedItem)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 50, fontSize: 11, fontWeight: 700, color: '#fff', backgroundColor: tileStyle.accent, border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  <ExternalLink size={11} /> {!isMobile && 'Open'}
                </button>
                <button onClick={() => setSelectedItem(null)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 50, fontSize: 11, fontWeight: 600, color: 'rgba(245,240,232,0.6)', backgroundColor: 'rgba(245,240,232,0.08)', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  <X size={11} /> {!isMobile && 'Close'}
                </button>
              </div>
            </>
          ) : moodImages.length > 0 ? (
            /* ── Idle: rotating moodboard of saved images ── */
            <button
              onClick={() => setMiddleView('gallery')}
              style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#000', border: 'none', cursor: 'pointer', padding: 0, width: '100%' }}
              title="Open the image gallery"
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={moodIndex}
                  src={moodImages[moodIndex % moodImages.length]}
                  alt="Saved moodboard image"
                  crossOrigin="anonymous"
                  initial={{ opacity: 0, scale: 1.06 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </AnimatePresence>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,36,32,0.85) 0%, transparent 45%)' }} />
              <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, textAlign: 'left' }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: tileStyle.accent, marginBottom: 3 }}>Your moodboard</p>
                <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 16, fontWeight: 700, color: '#f5f0e8', margin: 0 }}>{imageItems.length} saved images · tap to open the gallery</p>
              </div>
            </button>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: 32 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: `${tileStyle.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {Icon && <Icon size={28} style={{ color: tileStyle.accent }} />}
              </div>
              <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 17, fontWeight: 600, color: '#f5f0e8' }}>Select something to preview</p>
              <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.4)', maxWidth: 240 }}>{isMobile ? 'Tap a video, image or doc to preview it here' : 'Tap a video on the left or a doc on the right to load it here. Saved images appear as a moodboard.'}</p>
            </div>
          )}
        </div>

        {/* ── Panel 3: Right — docs & links ── */}
        <div style={{ width: isMobile ? '100%' : 260, flex: isMobile ? 1 : undefined, flexShrink: 0, display: isMobile && mobileTab !== 'links' ? 'none' : 'flex', flexDirection: 'column', borderLeft: isMobile ? 'none' : '1px solid rgba(245,240,232,0.07)', backgroundColor: '#0a1e1b', overflow: 'hidden' }}>
          <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid rgba(245,240,232,0.07)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={13} color={tileStyle.accent} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.55)' }}>Docs &amp; Links</span>
            <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.35)', marginLeft: 'auto' }}>{docItems.length}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
            {docItems.length === 0 ? (
              <p style={{ fontSize: 12, color: 'rgba(245,240,232,0.35)', textAlign: 'center', marginTop: 24, fontStyle: 'italic', lineHeight: 1.5 }}>No docs or links here yet. Articles, PDFs, Google Docs and web links land here.</p>
            ) : docItems.map((item) => {
              const thumb = getThumbnailFromUrl(item.url, item.thumbnail)
              const isActive = selectedItem?.id === item.id
              return (
                <div key={item.id} style={{ position: 'relative' }}>
                  {/* Use div+role instead of <button> so the inner three-dot <button> is valid HTML */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => { setSelectedItem(isActive ? null : item); setMiddleView('preview') }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedItem(isActive ? null : item); setMiddleView('preview') } }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 8px', borderRadius: 12, cursor: 'pointer', border: isActive ? `1px solid ${tileStyle.accent}44` : '1px solid transparent', textAlign: 'left', backgroundColor: isActive ? 'rgba(245,240,232,0.07)' : 'transparent', marginBottom: 2, transition: 'background 0.12s' }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(245,240,232,0.05)' }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent' }}
                  >
                    {thumb ? (
                      <img src={thumb} alt="" style={{ width: 48, height: 34, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 48, height: 34, borderRadius: 7, backgroundColor: `${tileStyle.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={14} style={{ color: tileStyle.accent }} />
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
                      onClick={(e) => { e.stopPropagation(); toggleItemMenu(item.id, e) }}
                      style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 6, color: 'rgba(245,240,232,0.35)', display: 'flex', alignItems: 'center' }}
                    >
                      <MoreVertical size={13} />
                    </button>
                  </div>
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
              {/* Modal header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 18, fontWeight: 700, color: '#f5f0e8' }}>Save to {gardenName}</h2>
                <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.4)', display: 'flex' }}><X size={17} /></button>
              </div>

              {/* Tab switcher: Links | Playlist */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 16, backgroundColor: 'rgba(245,240,232,0.06)', borderRadius: 12, padding: 4 }}>
                {(['links', 'playlist'] as const).map((tab) => (
                  <button key={tab} onClick={() => setSaveTab(tab)}
                    style={{ flex: 1, padding: '7px 0', borderRadius: 9, fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.15s', backgroundColor: saveTab === tab ? tileStyle.accent : 'transparent', color: saveTab === tab ? '#0d2420' : 'rgba(245,240,232,0.55)' }}>
                    {tab === 'links' ? 'Links / Files' : 'Import Playlist'}
                  </button>
                ))}
              </div>

              {saveTab === 'links' ? (
                <>
                  {/* ── Links tab ── */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <textarea value={url} onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && !e.shiftKey) { e.preventDefault(); handleFetch() } }}
                      placeholder="Paste one or more links — one per line&#10;YouTube, TikTok, articles, Google Docs, any URL..."
                      rows={3}
                      style={{ flex: 1, resize: 'none', borderRadius: 12, border: '1.5px solid rgba(245,240,232,0.12)', padding: '10px 14px', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: '#f5f0e8', lineHeight: 1.5, backgroundColor: 'rgba(245,240,232,0.07)' }}
                      autoFocus />
                    <button onClick={() => handleFetch()} disabled={fetching || !url.trim()}
                      style={{ flexShrink: 0, alignSelf: 'stretch', borderRadius: 12, padding: '0 16px', fontSize: 13, fontWeight: 700, color: '#fff', backgroundColor: tileStyle.accent, border: 'none', cursor: 'pointer', opacity: (fetching || !url.trim()) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                      {fetching ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Fetch'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <button onClick={pasteFromClipboard}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 50, fontSize: 12, fontWeight: 600, color: '#f5f0e8', backgroundColor: 'rgba(245,240,232,0.1)', border: 'none', cursor: 'pointer' }}>
                      <ClipboardPaste size={13} /> Paste link from clipboard
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.4)', marginTop: 6 }}>Copy a link in YouTube, TikTok, Instagram or any app, then tap Paste — it fetches automatically. Works with articles, Google Docs, images, and any webpage too.</p>
                </>
              ) : (
                <>
                  {/* ── Playlist tab ── */}
                  <p style={{ fontSize: 12, color: 'rgba(245,240,232,0.55)', marginBottom: 10 }}>
                    Paste a YouTube playlist URL and Cur8 will load every video so you can pick which ones to save. TikTok playlists are not public — paste multiple TikTok links one per line in the Links tab instead.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={playlistInput}
                      onChange={(e) => setPlaylistInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); handleFetchPlaylist() } }}
                      placeholder="https://www.youtube.com/playlist?list=..."
                      style={{ flex: 1, borderRadius: 12, border: '1.5px solid rgba(245,240,232,0.12)', padding: '10px 14px', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: '#f5f0e8', backgroundColor: 'rgba(245,240,232,0.07)' }}
                      autoFocus
                    />
                    <button onClick={handleFetchPlaylist} disabled={playlistFetching || !playlistInput.trim()}
                      style={{ flexShrink: 0, borderRadius: 12, padding: '0 16px', fontSize: 13, fontWeight: 700, color: '#0d2420', backgroundColor: tileStyle.accent, border: 'none', cursor: playlistFetching || !playlistInput.trim() ? 'not-allowed' : 'pointer', opacity: playlistFetching || !playlistInput.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                      {playlistFetching ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Load'}
                    </button>
                  </div>

                  {playlistError && <p style={{ fontSize: 12, color: '#e8b4a0', marginTop: 8 }}>{playlistError}</p>}

                  {playlistResult && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#f5f0e8', margin: 0 }}>{playlistResult.title}</p>
                        <button onClick={() => setPlaylistResult((r) => r ? { ...r, items: r.items.map((i) => ({ ...i, selected: !r.items.every((x) => x.selected) })) } : r)}
                          style={{ fontSize: 11, color: tileStyle.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                          {playlistResult.items.every((i) => i.selected) ? 'Deselect all' : 'Select all'}
                        </button>
                      </div>
                      <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {playlistResult.items.map((item, idx) => (
                          <button key={idx}
                            onClick={() => setPlaylistResult((r) => r ? { ...r, items: r.items.map((x, i) => i === idx ? { ...x, selected: !x.selected } : x) } : r)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, border: `1.5px solid ${item.selected ? tileStyle.accent + '88' : 'rgba(245,240,232,0.1)'}`, backgroundColor: item.selected ? 'rgba(245,240,232,0.06)' : 'transparent', cursor: 'pointer', textAlign: 'left', opacity: item.selected ? 1 : 0.45 }}>
                            {item.thumbnail ? (
                              <img src={item.thumbnail} alt="" style={{ width: 56, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 56, height: 36, borderRadius: 8, backgroundColor: 'rgba(245,240,232,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <PlayCircle size={14} color={tileStyle.accent} />
                              </div>
                            )}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ fontSize: 12, fontWeight: 600, color: '#f5f0e8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                              {item.channelName && <p style={{ fontSize: 10, color: 'rgba(245,240,232,0.45)', margin: '2px 0 0' }}>{item.channelName}</p>}
                            </div>
                            <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, backgroundColor: item.selected ? tileStyle.accent : 'rgba(245,240,232,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Check size={10} color={item.selected ? '#0d2420' : 'transparent'} />
                            </div>
                          </button>
                        ))}
                      </div>
                      <button onClick={handleSavePlaylist} disabled={playlistSaving || playlistResult.items.every((i) => !i.selected)}
                        style={{ marginTop: 12, width: '100%', borderRadius: 12, padding: '11px 0', fontSize: 14, fontWeight: 700, color: '#0d2420', backgroundColor: tileStyle.accent, border: 'none', cursor: playlistSaving ? 'not-allowed' : 'pointer', opacity: playlistSaving || playlistResult.items.every((i) => !i.selected) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        {playlistSaving ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : `Save ${playlistResult.items.filter((i) => i.selected).length} videos to ${gardenName}`}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* File upload, previews — only on the Links tab */}
              {saveTab === 'links' && (
                <>
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
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.mov,.webm,.mkv,.avi,.m4v,.3gp"
                    style={{ display: 'none' }}
                    onChange={(e) => { if (e.target.files?.length) handleFileDrop(e.target.files) }}
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
                            {f.name} <span style={{ opacity: 0.6 }}>{catItems.filter((i) => i.folderId === f.id).length}</span>
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
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Item & folder context menus (fixed overlays, never clipped) ── */}
      {renderItemMenu()}
      {renderFolderMenu()}

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
              role="dialog" aria-label="Rename haven"
              style={{ position: 'fixed', zIndex: 141, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(380px, 92vw)', backgroundColor: '#0a1e1b', border: '1px solid rgba(245,240,232,0.12)', borderRadius: 18, padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: `${tileStyle.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={15} color={tileStyle.accent} />
                </div>
                <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 18, fontWeight: 700, color: '#f5f0e8', margin: 0 }}>Rename this haven</h2>
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
