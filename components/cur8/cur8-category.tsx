'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  GraduationCap, Briefcase, Shirt, Heart, Brain, Sparkles, Clapperboard, Music, Globe,
  ArrowLeft, Plus, X, Loader2, ExternalLink, Trash2, FolderPlus,
  Folder, FolderOpen, Check, MoreVertical, Copy, FolderInput, Upload, Paperclip,
  Play, ImageIcon, FileText, Send, ArrowRightLeft, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Pin,
  Mail, MessageCircle, Download, Share2,
} from 'lucide-react'
import {
  CATEGORIES,
  type Cur8Item, type Cur8Folder, type Category,
} from '@/lib/cur8-store'
import { useViewport } from '@/hooks/use-viewport'
import { useReadAloud } from '@/hooks/use-speech'
import { LayoutGrid, Eye, List, Volume2, Square, NotebookPen, Pencil, RotateCcw, ClipboardPaste, PlayCircle, Headphones, CheckSquare, CheckCircle2, Circle, Maximize2, Minimize2 } from 'lucide-react'
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
  updateItem as updateItemAction,
  deleteItem as deleteItemAction,
  createFolder as createFolderAction,
  deleteFolder as deleteFolderAction,
  duplicateFolder as duplicateFolderAction,
  renameFolder as renameFolderAction,
  pinFolder as pinFolderAction,
  reorderFolders as reorderFoldersAction,
  copyFolderToGarden as copyFolderToGardenAction,
  moveItemToGarden as moveItemToGardenAction,
  copyItemToGarden as copyItemToGardenAction,
  markItemOpened,
  getReflections,
  createReflection,
  deleteReflection,
  updateReflection,
  type ReflectionDTO,
} from '@/app/actions/cur8'
import { summarizeItem } from '@/app/actions/summarize'
import CategoryStatsBar from '@/components/cur8/category-stats-bar'
import HavenTypeStats from '@/components/cur8/haven-type-stats'
import CategoryReflections from '@/components/cur8/category-reflections'
import ShareMenu from '@/components/cur8/share-menu'
import { buildMailtoShare, buildWhatsAppShare, openExternal, saveOrDownload, isDownloadableFile, shareToDevice, deviceShareSupported } from '@/lib/cur8-share'

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

// Finer classification used only for the tappable mini-stats + type filter.
// Splits audio ("sounds") out from video, which getContentKind lumps together.
type StatKind = 'video' | 'image' | 'sound' | 'doc'
function getStatKind(item: { url: string }): StatKind {
  const t = getPreviewType(item.url)
  if (t === 'audio') return 'sound'
  // Uploaded audio files land as generic docs — sniff the extension/mime.
  if (/\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/i.test(item.url) || /audio%2F|audio\//i.test(item.url)) return 'sound'
  const k = getContentKind(item)
  return k as StatKind
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
  const [playlistNeedsApiKey, setPlaylistNeedsApiKey] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [selectedFolderForItem, setSelectedFolderForItem] = useState<string | undefined>(undefined)
  const [menuItemId, setMenuItemId] = useState<string | null>(null)
  const [moveItemId, setMoveItemId] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [preview, setPreview] = useState<Partial<Cur8Item> | null>(null)
  const [saveWhy, setSaveWhy] = useState('')
  const [multiPreviews, setMultiPreviews] = useState<(Partial<Cur8Item> & { selected: boolean })[]>([])
  const [selectedItem, setSelectedItem] = useState<Cur8Item | null>(null)
  const [editItem, setEditItem] = useState<{ id: string; title: string; description: string; whySaved: string } | null>(null)
  const [toast, setToast] = useState('')
  function flashToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 1900)
  }
  // Resolve a stored (possibly relative proxy) URL to an absolute one for sharing.
  function absoluteItemUrl(url: string) {
    if (typeof window === 'undefined') return url
    return url.startsWith('/') ? `${window.location.origin}${url}` : url
  }
  const [savingEdit, setSavingEdit] = useState(false)
  // Multi-select
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchPicker, setBatchPicker] = useState<null | 'folder' | 'moveGarden' | 'copyGarden'>(null)
  const [batchBusy, setBatchBusy] = useState(false)
  const [batchNote, setBatchNote] = useState('')
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
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null)
  const [renameFolderDraft, setRenameFolderDraft] = useState('')
  const [folderGardenPickId, setFolderGardenPickId] = useState<string | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null)
  const [folderMenuAnchor, setFolderMenuAnchor] = useState<{ x: number; y: number } | null>(null)
  // Collapsible side panels — desktop only (mobile uses tab switcher instead).
  // Start collapsed so the centre preview fills as much width as possible by
  // default — no need to manually hit Expand.
  // Panels open by default on desktop, closed on mobile (mobile uses tab switcher instead).
  // Start false to avoid SSR mismatch, then set correctly once client viewport is known.
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  useEffect(() => {
    if (!isMobile) { setLeftOpen(true); setRightOpen(true) }
  }, [isMobile])
  // Desktop "full page" preview — hides both side panels + all chrome so the
  // media fills the whole window (the mobile experience, brought to laptop).
  const [expandedPreview, setExpandedPreview] = useState(false)
  // Active content-type filter (videos / images / documents / sounds) driven by
  // the tappable mini-stats. null = show everything.
  const [typeFilter, setTypeFilter] = useState<StatKind | null>(null)
  // Collapsible "overview" rows (stats cards + type pills + recently opened).
  // Hiding them hands the video/docs board much more room without scrolling.
  const [overviewOpen, setOverviewOpen] = useState(true)

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
  async function addReflection(body: string): Promise<string | null> {
    const r = await createReflection(category, body).catch(() => null)
    if (r) { setReflections((prev) => [r, ...prev]); return r.id }
    return null
  }
  async function removeReflection(id: string) {
    setReflections((prev) => prev.filter((r) => r.id !== id))
    await deleteReflection(id).catch(() => {})
  }
  async function editReflection(id: string, body: string) {
    setReflections((prev) => prev.map((r) => (r.id === id ? { ...r, body } : r)))
    await updateReflection(id, body).catch(() => {})
  }
  async function saveItemEdit() {
    if (!editItem) return
    const title = editItem.title.trim()
    if (!title) return
    setSavingEdit(true)
    const description = editItem.description.trim()
    const whySaved = editItem.whySaved.trim()
    // Optimistic update in the list and the open preview
    setAllItems((prev) => prev.map((it) => (it.id === editItem.id ? { ...it, title, description, whySaved } : it)))
    setSelectedItem((prev) => (prev && prev.id === editItem.id ? { ...prev, title, description, whySaved } : prev))
    await updateItemAction(editItem.id, { title, description, whySaved }).catch(() => {})
    setSavingEdit(false)
    setEditItem(null)
  }

  // ── Multi-select ──
  function enterSelectMode() {
    setSelectMode(true)
    setSelectedItem(null)
    setSelectedIds(new Set())
  }
  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
    setBatchPicker(null)
  }
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function selectAllVisible() {
    setSelectedIds(new Set(catItems.map((i) => i.id)))
  }
  async function batchMoveToFolder(folderId: string | undefined) {
    const ids = Array.from(selectedIds)
    setBatchBusy(true)
    setAllItems((prev) => prev.map((i) => (selectedIds.has(i.id) ? { ...i, folderId } : i)))
    for (const id of ids) await moveItemAction(id, folderId).catch(() => {})
    setBatchBusy(false)
    exitSelectMode()
  }
  async function batchSendToGarden(targetCategory: Category, mode: 'move' | 'copy') {
    const ids = Array.from(selectedIds)
    setBatchBusy(true)
    if (mode === 'move') {
      setAllItems((prev) => prev.map((i) => (selectedIds.has(i.id) ? { ...i, category: targetCategory, folderId: undefined } : i)))
      for (const id of ids) await moveItemToGardenAction(id, targetCategory).catch(() => {})
    } else {
      for (const id of ids) {
        const copy = await copyItemToGardenAction(id, targetCategory).catch(() => null)
        if (copy) setAllItems((prev) => [copy as Cur8Item, ...prev])
      }
    }
    setBatchBusy(false)
    exitSelectMode()
  }
  async function batchDelete() {
    const ids = Array.from(selectedIds)
    setBatchBusy(true)
    setAllItems((prev) => prev.filter((i) => !selectedIds.has(i.id)))
    for (const id of ids) await deleteItemAction(id).catch(() => {})
    setBatchBusy(false)
    exitSelectMode()
  }
  // Share the selected items together. Uses the device share sheet when available
  // (one message with all the links), otherwise copies them to the clipboard.
  async function batchShare() {
    const chosen = catItems.filter((i) => selectedIds.has(i.id))
    if (chosen.length === 0) return
    const lines = chosen.map((i) => `${i.title}\n${i.url}`).join('\n\n')
    const title = `${chosen.length} saved item${chosen.length === 1 ? '' : 's'} from Cur8`
    if (deviceShareSupported()) {
      await shareToDevice(title, lines).catch(() => {})
    } else {
      try {
        await navigator.clipboard.writeText(lines)
        setBatchNote('Links copied')
      } catch {
        setBatchNote('Could not share')
      }
      setTimeout(() => setBatchNote(''), 2200)
    }
  }
  // Download / save each selected item (files download; links are saved).
  async function batchDownload() {
    const chosen = catItems.filter((i) => selectedIds.has(i.id))
    if (chosen.length === 0) return
    setBatchBusy(true)
    for (const i of chosen) await saveOrDownload(i.title, i.url).catch(() => {})
    setBatchBusy(false)
    setBatchNote('Saved')
    setTimeout(() => setBatchNote(''), 2200)
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
  const folderItems = activeFolder === null ? catItems : catItems.filter((i) => i.folderId === activeFolder)
  // Apply the tappable type filter (Videos / Images / Sounds / Documents)
  const visibleItems = typeFilter ? folderItems.filter((i) => getStatKind(i) === typeFilter) : folderItems

  // Per-type counts for the tappable mini-stats (based on the current folder, not the type filter)
  const typeCounts: Record<StatKind, number> = { video: 0, image: 0, sound: 0, doc: 0 }
  for (const i of folderItems) typeCounts[getStatKind(i)]++

  // Recently opened items in this haven (max 8), newest first
  const recentItems = [...catItems]
    .filter((i) => i.openedAt)
    .sort((a, b) => new Date(b.openedAt!).getTime() - new Date(a.openedAt!).getTime())
    .slice(0, 8)

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
      whySaved: saveWhy.trim() || undefined,
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

  async function handleRenameFolder(folderId: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, name: trimmed } : f)))
    setRenameFolderId(null)
    await renameFolderAction(folderId, trimmed).catch(() => {})
  }

  async function handlePinFolder(folderId: string, pinned: boolean) {
    setMenuFolderId(null)
    setFolders((prev) => {
      const next = prev.map((f) => (f.id === folderId ? { ...f, pinned } : f))
      // Re-sort: pinned first, then existing order
      return [...next].sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1))
    })
    await pinFolderAction(folderId, pinned).catch(() => {})
  }

  // Move a folder chip left or right within the current haven, then persist order.
  async function handleReorderFolder(folderId: string, dir: -1 | 1) {
    setMenuFolderId(null)
    const list = folders.filter((f) => f.category === category)
    const idx = list.findIndex((f) => f.id === folderId)
    const target = idx + dir
    if (idx < 0 || target < 0 || target >= list.length) return
    const reordered = [...list]
    const [moved] = reordered.splice(idx, 1)
    reordered.splice(target, 0, moved)
    // Merge back with folders from other havens untouched
    const others = folders.filter((f) => f.category !== category)
    setFolders([...reordered, ...others])
    await reorderFoldersAction(reordered.map((f) => f.id)).catch(() => {})
  }

  async function handleCopyFolderToGarden(folderId: string, targetCategory: Category) {
    setMenuFolderId(null)
    setFolderGardenPickId(null)
    const result = await copyFolderToGardenAction(folderId, targetCategory).catch(() => null)
    if (result) {
      setFolders((prev) => [result.folder as Cur8Folder, ...prev])
      setAllItems((prev) => [...(result.items as Cur8Item[]), ...prev])
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
    setPlaylistNeedsApiKey(false)
    try {
      const result = await fetchPlaylist(input)
      if (result.needsApiKey) { setPlaylistNeedsApiKey(true); setPlaylistError(result.error ?? ''); return }
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
          category,
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
    setSaveWhy('')
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
      if (!ytId) {
        // No extractable ID — show poster + open button with explanation
        const poster = getThumbnailFromUrl(item.url, item.thumbnail)
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#0a1e1b', padding: 24, textAlign: 'center' }}>
            {poster && <img src={poster} alt={item.title} style={{ maxWidth: 260, maxHeight: '40%', borderRadius: 14, objectFit: 'cover' }} />}
            <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 15, fontWeight: 600, color: '#f5f0e8', maxWidth: 300, margin: 0 }}>{item.title}</p>
            <p style={{ fontSize: 12, color: 'rgba(245,240,232,0.5)', maxWidth: 280, margin: 0, lineHeight: 1.5 }}>This video has embedding disabled by the channel. Tap below to open it in YouTube — your Cur8 session stays open.</p>
            <button
              onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 22px', borderRadius: 50, backgroundColor: '#c85a40', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              <ExternalLink size={14} /> Watch on YouTube
            </button>
          </div>
        )
      }
      // Use only the video ID — strip list/index params so YouTube's embed
      // doesn't throw "An error occurred" for playlist-sourced videos.
      return (
        <iframe
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          src={`https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0`}
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
          <button
            onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 50, fontSize: 12, fontWeight: 700, color: '#fff', backgroundColor: tileStyle.accent, border: 'none', cursor: 'pointer' }}>
            <Play size={13} /> Play on TikTok
          </button>
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
          itemId={item.id}
        />
      )
    }

    if (type === 'pdf') {
      // Private blob PDFs — fetch client-side (session cookie sent automatically)
      // and create a local blob: URL. Avoids Android iframe blank + Google Docs
      // viewer auth failure. DocumentViewer handles the fetch + objectURL lifecycle.
      if (item.url.startsWith('/api/cur8/file')) {
        return (
          <DocumentViewer
            url={item.url}
            filename={item.title ?? 'document.pdf'}
            accent={tileStyle.accent}
            itemId={item.id}
          />
        )
      }

      // External / Google Drive PDFs — keep existing iframe approach
      let embedUrl = item.url
      if (item.url.includes('drive.google.com/file/d/')) {
        const id = item.url.match(/\/d\/([^/]+)/)?.[1]
        if (id) embedUrl = `https://drive.google.com/file/d/${id}/preview`
      } else if (item.url.includes('docs.google.com')) {
        embedUrl = item.url.replace('/edit', '/preview').replace('/pub', '/preview')
      } else {
        const abs = item.url.startsWith('http') ? item.url : `${window.location.origin}${item.url}`
        embedUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(abs)}&embedded=true`
      }
      const downloadUrl = `${item.url}${item.url.includes('?') ? '&' : '?'}download=1`
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <iframe
            src={embedUrl}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block', backgroundColor: '#fff' }}
            title={item.title}
          />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 12px', backgroundColor: 'rgba(13,36,32,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.6)' }}>Can&rsquo;t see it? Open or download instead.</span>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 50, fontSize: 11, fontWeight: 700, color: '#0d2420', backgroundColor: tileStyle.accent, border: 'none', cursor: 'pointer' }}>
                <ExternalLink size={11} /> Open
              </button>
              <a href={downloadUrl} download
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 50, fontSize: 11, fontWeight: 700, color: '#f5f0e8', backgroundColor: 'rgba(245,240,232,0.12)', border: '1px solid rgba(255,255,255,0.15)', textDecoration: 'none' }}>
                <Download size={11} /> Download
              </a>
            </div>
          </div>
        </div>
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
                <div style={{ height: 1, backgroundColor: 'rgba(245,240,232,0.08)', margin: '2px 0' }} />
                <button onClick={() => { openExternal(buildMailtoShare(item.title, absoluteItemUrl(item.url))); setMenuItemId(null) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', fontSize: 12, fontWeight: 500, color: '#f5f0e8', cursor: 'pointer', border: 'none', backgroundColor: 'transparent', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245,240,232,0.07)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <Mail size={12} /> Share to email
                </button>
                <button onClick={() => { openExternal(buildWhatsAppShare(item.title, absoluteItemUrl(item.url))); setMenuItemId(null) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', fontSize: 12, fontWeight: 500, color: '#f5f0e8', cursor: 'pointer', border: 'none', backgroundColor: 'transparent', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245,240,232,0.07)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <MessageCircle size={12} /> Share to WhatsApp
                </button>
                <button onClick={async () => { setMenuItemId(null); const r = await saveOrDownload(item.title, item.url); flashToast(r === 'downloaded' ? 'Downloading…' : r === 'copied' ? 'Link copied' : 'Could not save') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', fontSize: 12, fontWeight: 500, color: '#f5f0e8', cursor: 'pointer', border: 'none', backgroundColor: 'transparent', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245,240,232,0.07)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <Download size={12} /> {isDownloadableFile(item.url) ? 'Download file' : 'Save (copy link)'}
                </button>
                <div style={{ height: 1, backgroundColor: 'rgba(245,240,232,0.08)', margin: '2px 0' }} />
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
          style={{ position: 'fixed', left, top, zIndex: 201, width: 190, borderRadius: 12, border: '1px solid rgba(245,240,232,0.12)', backgroundColor: '#122e29', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden', maxHeight: 360, overflowY: 'auto' }}>
          {folderGardenPickId === menuFolderId ? (
            <div style={{ padding: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(245,240,232,0.4)', padding: '0 4px 6px' }}>Copy folder to haven</p>
              {CATEGORIES.filter((c) => c.name !== category).map((g) => (
                <button key={g.name} onClick={() => handleCopyFolderToGarden(menuFolderId!, g.name as Category)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 8px', borderRadius: 8, fontSize: 11, cursor: 'pointer', border: 'none', backgroundColor: 'transparent', color: '#f5f0e8', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245,240,232,0.07)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <Folder size={11} style={{ flexShrink: 0, opacity: 0.7 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName(g.name)}</span>
                </button>
              ))}
              <button onClick={() => setFolderGardenPickId(null)}
                style={{ width: '100%', padding: '4px 8px', marginTop: 4, borderRadius: 8, fontSize: 10, fontWeight: 600, color: 'rgba(245,240,232,0.4)', cursor: 'pointer', border: 'none', backgroundColor: 'transparent' }}>
                Back
              </button>
            </div>
          ) : (
            <>
          {(() => { const f = folders.find((x) => x.id === menuFolderId); const pinned = !!f?.pinned; return (
            <button onClick={() => handlePinFolder(menuFolderId!, !pinned)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 13px', fontSize: 12, color: '#f5f0e8', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245,240,232,0.07)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
              <Pin size={12} /> {pinned ? 'Unpin folder' : 'Pin to top'}
            </button>
          ) })()}
          <button onClick={() => { const f = folders.find((x) => x.id === menuFolderId); setRenameFolderDraft(f?.name ?? ''); setRenameFolderId(menuFolderId); setMenuFolderId(null) }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 13px', fontSize: 12, color: '#f5f0e8', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245,240,232,0.07)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <Pencil size={12} /> Rename
          </button>
          <div style={{ display: 'flex', gap: 4, padding: '4px 9px' }}>
            <button onClick={() => handleReorderFolder(menuFolderId!, -1)} title="Move left"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '7px', borderRadius: 8, fontSize: 11, color: '#f5f0e8', background: 'rgba(245,240,232,0.06)', border: 'none', cursor: 'pointer' }}>
              <ChevronLeft size={13} />
            </button>
            <button onClick={() => handleReorderFolder(menuFolderId!, 1)} title="Move right"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '7px', borderRadius: 8, fontSize: 11, color: '#f5f0e8', background: 'rgba(245,240,232,0.06)', border: 'none', cursor: 'pointer' }}>
              <ChevronRight size={13} />
            </button>
          </div>
          <div style={{ height: 1, backgroundColor: 'rgba(245,240,232,0.08)', margin: '2px 0' }} />
          <button onClick={() => handleDuplicateFolder(menuFolderId!)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 13px', fontSize: 12, color: '#f5f0e8', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245,240,232,0.07)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <Copy size={12} /> Duplicate here
          </button>
          <button onClick={() => setFolderGardenPickId(menuFolderId)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 13px', fontSize: 12, color: '#f5f0e8', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245,240,232,0.07)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <ArrowRightLeft size={12} /> Copy to haven
          </button>
          <div style={{ height: 1, backgroundColor: 'rgba(245,240,232,0.08)', margin: '2px 0' }} />
          <button onClick={() => { deleteFolder(menuFolderId!); setMenuFolderId(null) }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 13px', fontSize: 12, color: '#e05050', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(224,80,80,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <Trash2 size={12} /> Delete folder
          </button>
            </>
          )}
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
  // On desktop the same full-screen treatment kicks in when the user taps the
  // Expand button (expandedPreview), so the media can fill the whole laptop.
  const mediaFocus = (isMobile || expandedPreview) && !!selectedItem && middleView === 'preview'

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        // mediaFocus: lock to 100vh so the video iframe has a real height to fill.
        // Otherwise (desktop AND mobile): auto-height so the WHOLE page scrolls
        // naturally — the video/docs board is no longer trapped in a tiny strip.
        height: mediaFocus ? '100vh' : 'auto',
        minHeight: '100vh',
        backgroundColor: '#0d2420', color: '#f5f0e8',
        fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
        overflowY: mediaFocus ? 'hidden' : 'auto',
        overflowX: 'hidden',
        position: 'relative',
      }}
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

      {/* ── Media-focus overlay: fixed back buttons when video is fullscreen ── */}
      {mediaFocus && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 180, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', backgroundColor: 'rgba(10,30,27,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Exit full page. On desktop this just shrinks back to the 3-panel view
              (keeping the item open); on mobile it returns to the haven browse. */}
          <button
            onClick={() => { if (isMobile) { setSelectedItem(null); setMobileTab('browse') } else { setExpandedPreview(false) } }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 50, fontSize: 12, fontWeight: 700, color: '#f5f0e8', backgroundColor: 'rgba(245,240,232,0.12)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}
          >
            {isMobile ? <><ArrowLeft size={12} /> Back to {gardenName}</> : <><Minimize2 size={12} /> Exit full page</>}
          </button>
          {/* Back to all havens */}
          <Link
            href="/cur8"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 50, fontSize: 12, fontWeight: 600, color: 'rgba(245,240,232,0.65)', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none' }}
          >
            All havens
          </Link>
          {/* Selected item title */}
          {selectedItem && <p style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'rgba(245,240,232,0.7)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedItem.title}</p>}
        </div>
      )}

      {/* ── Banner ── */}
      <div style={{ position: 'relative', height: 140, flexShrink: 0, overflow: 'hidden', display: mediaFocus ? 'none' : 'block' }}>
        <Image src={tileStyle.image} alt={category} fill className="object-cover object-center" priority sizes="100vw" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,36,32,0.45) 0%, rgba(13,36,32,0.9) 100%)' }} />
        {/* Back nav row */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
          <Link href="/cur8" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 50, fontSize: 11, fontWeight: 600, color: '#f5f0e8', textDecoration: 'none', backgroundColor: 'rgba(245,240,232,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <ArrowLeft size={10} /> All havens
          </Link>
          <button
            onClick={() => setShowAdd(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 16px', borderRadius: 50, fontSize: 11, fontWeight: 700, color: '#0d2420', backgroundColor: tileStyle.accent, border: 'none', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
          >
            <Plus size={11} /> Save
          </button>
        </div>
        {/* Title */}
        <div style={{ position: 'absolute', bottom: 10, left: 14, right: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
            <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 24, fontWeight: 700, color: '#f5f0e8', margin: 0, lineHeight: 1.1, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{gardenName}</h1>
            <button
              onClick={openRename}
              aria-label="Rename this haven"
              title="Rename this haven"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 7, background: 'rgba(245,240,232,0.12)', border: '1px solid rgba(255,255,255,0.15)', color: '#f5f0e8', cursor: 'pointer', backdropFilter: 'blur(8px)', flexShrink: 0 }}
            >
              <Pencil size={10} />
            </button>
          </div>
          <p style={{ fontSize: 9.5, color: 'rgba(245,240,232,0.5)', margin: 0 }}>{catItems.length} saved · {cat.area}</p>
        </div>
      </div>

      {/* ── Haven Toolbar — Brain Dump · Reflections · Focus Sounds · Stats ── */}
      {!mediaFocus && (
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          overflowX: isMobile ? 'visible' : 'auto',
          backgroundColor: '#0a1e1b',
          borderBottom: '1px solid rgba(245,240,232,0.07)',
        }}>
          {/* Brain Dump */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('cur8:openBrainDump'))}
            style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 50, fontSize: 11, fontWeight: 600, color: '#f5f0e8', backgroundColor: 'rgba(245,240,232,0.08)', border: '1px solid rgba(245,240,232,0.12)', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <Brain size={11} color="#c9a84c" /> Brain dump
          </button>
          {/* Reflections */}
          <button
            onClick={() => setShowReflections(true)}
            style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 50, fontSize: 11, fontWeight: 600, color: '#f5f0e8', backgroundColor: reflections.length > 0 ? `${tileStyle.accent}22` : 'rgba(245,240,232,0.08)', border: `1px solid ${reflections.length > 0 ? tileStyle.accent + '55' : 'rgba(245,240,232,0.12)'}`, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <NotebookPen size={11} color={reflections.length > 0 ? tileStyle.accent : undefined} />
            Reflect{reflections.length > 0 ? ` · ${reflections.length}` : ''}
          </button>
          {/* Focus Sounds */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('cur8:openFocusSounds'))}
            style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 50, fontSize: 11, fontWeight: 600, color: '#f5f0e8', backgroundColor: 'rgba(245,240,232,0.08)', border: '1px solid rgba(245,240,232,0.12)', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <Headphones size={11} color="#8ec8b4" /> Focus sounds
          </button>
          {/* Spacer — desktop only; on mobile the row wraps so no spacer needed */}
          <div style={{ flex: 1, display: isMobile ? 'none' : 'block' }} />
          {/* Collapse the overview rows to hand the board more room */}
          <button
            onClick={() => setOverviewOpen((o) => !o)}
            title={overviewOpen ? 'Hide the overview and see more of your board' : 'Show the overview'}
            style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 50, fontSize: 10.5, fontWeight: 600, color: 'rgba(245,240,232,0.7)', backgroundColor: 'rgba(245,240,232,0.08)', border: '1px solid rgba(245,240,232,0.12)', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: isMobile ? 'auto' : 0 }}
          >
            {overviewOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {overviewOpen ? 'Hide overview' : 'Show overview'}
          </button>
          {/* Quick count chip */}
          <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, color: 'rgba(245,240,232,0.5)', whiteSpace: 'nowrap' }}>{catItems.length} saved</span>
        </div>
      )}

      {/* ── Stats bar (part of the collapsible overview) ── */}
      {!mediaFocus && overviewOpen && <CategoryStatsBar items={catItems} accent={tileStyle.accent} reflectionCount={reflections.length} />}
      {!mediaFocus && overviewOpen && (
        <HavenTypeStats
          items={folderItems}
          counts={typeCounts}
          activeType={typeFilter}
          onSelectType={setTypeFilter}
          recent={recentItems}
          onOpenItem={(item) => { setSelectedItem(item); setMiddleView('preview'); if (isMobile) setMobileTab('preview') }}
          accent={tileStyle.accent}
          isMobile={isMobile}
        />
      )}

      {/* ── Mobile tab switcher ── */}
      {isMobile && !mediaFocus && (
        <div style={{ display: 'flex', flexShrink: 0, backgroundColor: '#0a1e1b', borderBottom: '1px solid rgba(245,240,232,0.07)' }}>
          {([
            { id: 'browse' as const, label: 'Browse', icon: LayoutGrid },
            { id: 'preview' as const, label: 'Preview', icon: Eye },
            { id: 'links' as const, label: 'Links', icon: List },
          ]).map((t) => {
            const TIcon = t.icon
            const on = mobileTab === t.id
            // On the Preview tab, if something is selected, show "Back" to encourage deselection
            const isPreviewWithItem = t.id === 'preview' && on && !!selectedItem
            return (
              <button
                key={t.id}
                onClick={() => {
                  if (isPreviewWithItem) {
                    // Tap "Back" to deselect and return to browse
                    setSelectedItem(null)
                    setMobileTab('browse')
                  } else {
                    setMobileTab(t.id)
                  }
                }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 4px', border: 'none', borderBottom: `2px solid ${on ? tileStyle.accent : 'transparent'}`, backgroundColor: 'transparent', cursor: 'pointer', color: on ? '#f5f0e8' : 'rgba(245,240,232,0.45)', fontSize: 12, fontWeight: 600 }}
              >
                {isPreviewWithItem
                  ? <><ArrowLeft size={13} color={tileStyle.accent} /> Back</>
                  : <><TIcon size={14} color={on ? tileStyle.accent : 'rgba(245,240,232,0.45)'} /> {t.label}</>
                }
              </button>
            )
          })}
        </div>
      )}

      {/* ── Full-width folder filter bar (filters all three lanes) ── */}
      <div style={{ flexShrink: 0, padding: '8px 14px', backgroundColor: '#0a1e1b', borderBottom: '1px solid rgba(245,240,232,0.07)', display: mediaFocus ? 'none' : 'flex', alignItems: 'center', gap: 8, overflowX: 'auto' }}>
        {/* "All" chip — shows total count, acts as clear-folder filter.
            Highlighted in accent when no folder is active so it's clear it's the active state. */}
        <button
          onClick={() => setActiveFolder(null)}
          title="Show all items across all folders"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 50, cursor: 'pointer', border: 'none', backgroundColor: activeFolder === null ? tileStyle.accent : 'rgba(245,240,232,0.1)', color: activeFolder === null ? '#0d2420' : 'rgba(245,240,232,0.7)' }}
        >
          <Folder size={11} /> All {catItems.length}
        </button>
        {folders.map((f) => {
          const inFolder = catItems.filter((i) => i.folderId === f.id)
          const folderCount = inFolder.length
          // Type breakdown for the folder, shown on hover (e.g. "19 videos · 8 documents")
          const fb: Record<StatKind, number> = { video: 0, image: 0, sound: 0, doc: 0 }
          for (const i of inFolder) fb[getStatKind(i)]++
          const breakdown = ([['video', 'videos'], ['image', 'images'], ['sound', 'sounds'], ['doc', 'documents']] as const)
            .filter(([k]) => fb[k] > 0)
            .map(([k, label]) => `${fb[k]} ${label}`)
            .join(' · ') || 'empty'
          if (renameFolderId === f.id) {
            return (
              <div key={f.id} style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <input type="text" value={renameFolderDraft} onChange={(e) => setRenameFolderDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleRenameFolder(f.id, renameFolderDraft); if (e.key === 'Escape') setRenameFolderId(null) }}
                  autoFocus
                  style={{ border: `1px solid ${tileStyle.accent}`, borderRadius: 8, padding: '3px 8px', fontSize: 11, outline: 'none', width: 110, backgroundColor: 'rgba(245,240,232,0.08)', color: '#f5f0e8' }} />
                <button onClick={() => handleRenameFolder(f.id, renameFolderDraft)} style={{ background: tileStyle.accent, border: 'none', borderRadius: 8, padding: '3px 7px', cursor: 'pointer', color: '#fff', display: 'flex' }}>
                  <Check size={11} />
                </button>
              </div>
            )
          }
          return (
          <div key={f.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <button onClick={() => setActiveFolder(f.id)} title={`${f.name}: ${breakdown}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 50, cursor: 'pointer', border: 'none', backgroundColor: activeFolder === f.id ? tileStyle.accent : 'rgba(245,240,232,0.1)', color: '#f5f0e8' }}>
              {f.pinned && <Pin size={9} style={{ opacity: 0.85 }} />}
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
        {/* Select multiple — sits at the right of the folder bar, beside New folder */}
        <button
          onClick={() => (selectMode ? exitSelectMode() : enterSelectMode())}
          title={selectMode ? 'Finish selecting' : 'Select multiple items'}
          style={{ flexShrink: 0, marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 50, fontSize: 10, fontWeight: 600, color: selectMode ? '#0d2420' : '#f5f0e8', backgroundColor: selectMode ? tileStyle.accent : 'rgba(245,240,232,0.1)', border: `1px solid ${selectMode ? tileStyle.accent : 'rgba(245,240,232,0.12)'}`, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          <CheckSquare size={11} /> {selectMode ? 'Done' : 'Select'}
        </button>
      </div>

      {/* ── Three-panel body (stacks on mobile) ── */}
      {/* paddingTop clears the fixed mediaFocus overlay bar (~56px) on mobile.
          Desktop: a tall, fixed board height (near-full viewport) so the video
          and docs columns are roomy — the page itself scrolls to reach it, and
          the top overview can be collapsed for even more room. */}
      <div style={{
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        overflow: (isMobile && !mediaFocus) ? 'visible' : 'hidden',
        position: 'relative', paddingTop: mediaFocus ? 56 : 0,
        ...(mediaFocus
          ? { flex: 1, minHeight: 0 }
          : isMobile
            ? { minHeight: 'auto' }
            : { height: 'calc(100vh - 44px)', minHeight: 460 }),
      }}>

        {/* ── Panel 1: Videos lane ── */}
        {/* Desktop: collapsible. Mobile: tab-switched. */}
        {/* When left panel is collapsed on desktop, show a floating re-open tab on the left edge */}
        {!isMobile && !leftOpen && !mediaFocus && (
          <button
            onClick={() => setLeftOpen(true)}
            title="Show videos panel"
            aria-label="Show videos panel"
            style={{
              position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
              zIndex: 20, width: 20, height: 56, borderRadius: '0 8px 8px 0',
              backgroundColor: '#122e29', border: '1px solid rgba(245,240,232,0.12)',
              borderLeft: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(245,240,232,0.6)',
            }}
          >
            <ChevronRight size={12} />
          </button>
        )}
        <motion.div
          animate={{ width: isMobile ? '100%' : (leftOpen ? 240 : 0) }}
          transition={{ type: 'spring', stiffness: 340, damping: 36 }}
          style={{ flexShrink: 0, display: mediaFocus || (isMobile && mobileTab !== 'browse') ? 'none' : 'flex', flexDirection: 'column', borderRight: isMobile ? 'none' : '1px solid rgba(245,240,232,0.07)', backgroundColor: '#0a1e1b', overflow: isMobile ? 'visible' : 'hidden', minHeight: isMobile ? 'auto' : 0 }}>
          <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid rgba(245,240,232,0.07)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clapperboard size={13} color={tileStyle.accent} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.55)' }}>Videos</span>
            <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.35)', marginLeft: 'auto' }}>{videoItems.length}</span>
            {/* Desktop collapse — hide panel */}
            {!isMobile && (
              <button
                onClick={() => setLeftOpen(false)}
                title="Hide videos panel"
                aria-label="Hide videos panel"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: 'rgba(245,240,232,0.07)', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.45)', flexShrink: 0 }}
              >
                <ChevronLeft size={12} />
              </button>
            )}
          </div>
          <div style={{ flex: 1, overflowY: isMobile ? 'visible' : 'auto', padding: 8, minHeight: isMobile ? 'auto' : 0 }}>
            {videoItems.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.4)', lineHeight: 1.5 }}>No videos here yet. YouTube, TikTok, Instagram and uploaded clips land here.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr 1fr' : '1fr 1fr', gap: 6 }}>
                {videoItems.map((item) => {
                  const thumb = getThumbnailFromUrl(item.url, item.thumbnail)
                  const isActive = selectedItem?.id === item.id
                  const isChecked = selectedIds.has(item.id)
                  return (
                    <div key={item.id} style={{ position: 'relative' }}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => { if (selectMode) { toggleSelect(item.id); return } setSelectedItem(isActive ? null : item); setMiddleView('preview'); if (isMobile) setMobileTab('preview') }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { if (selectMode) { toggleSelect(item.id); return } setSelectedItem(isActive ? null : item); setMiddleView('preview'); if (isMobile) setMobileTab('preview') } }}
                        title={item.title}
                        style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', outline: (selectMode && isChecked) ? `2.5px solid ${tileStyle.accent}` : isActive ? `2.5px solid ${tileStyle.accent}` : '2.5px solid transparent', outlineOffset: 1, transition: 'outline 0.15s' }}>
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
                        {/* Selection overlay */}
                        {selectMode && (
                          <div style={{ position: 'absolute', inset: 0, backgroundColor: isChecked ? `${tileStyle.accent}33` : 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', padding: 4 }}>
                            {isChecked ? <CheckCircle2 size={20} color={tileStyle.accent} fill="#0d2420" /> : <Circle size={20} color="#fff" />}
                          </div>
                        )}
                      </div>
                      {!selectMode && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleItemMenu(item.id, e) }}
                          title="Options"
                          style={{ position: 'absolute', top: 3, right: 3, zIndex: 10, background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', padding: 3, borderRadius: 6, color: '#fff', display: 'flex', alignItems: 'center' }}>
                          <MoreVertical size={12} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Panel 2: Centre — preview / rotating moodboard / image gallery ── */}
        {/* In mediaFocus mode overflow must be hidden so the iframe has a real height to fill */}
        <div style={{ flex: 1, display: isMobile && mobileTab !== 'preview' ? 'none' : 'flex', flexDirection: 'column', overflow: (isMobile && !mediaFocus) ? 'visible' : 'hidden', backgroundColor: '#0d2420', minWidth: 0, minHeight: (isMobile && !mediaFocus) ? 'auto' : 0 }}>
          {/* Centre tabs — hidden during mediaFocus so the iframe gets all available height */}
          <div style={{ flexShrink: 0, display: mediaFocus ? 'none' : 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderBottom: '1px solid rgba(245,240,232,0.07)', backgroundColor: '#0a1e1b' }}>
            {/* When a video/item is selected, show a back button first */}
            {selectedItem && middleView === 'preview' && (
              <button
                onClick={() => setSelectedItem(null)}
                title="Close preview"
                aria-label="Close preview"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(245,240,232,0.15)', backgroundColor: 'rgba(245,240,232,0.07)', color: 'rgba(245,240,232,0.8)', marginRight: 2 }}
              >
                <X size={11} /> Close
              </button>
            )}
            <button onClick={() => setMiddleView('preview')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 50, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', backgroundColor: middleView === 'preview' ? tileStyle.accent : 'rgba(245,240,232,0.08)', color: middleView === 'preview' ? '#fff' : 'rgba(245,240,232,0.7)' }}>
              <Eye size={12} /> Preview
            </button>
            <button onClick={() => { setMiddleView('gallery'); setSelectedItem(null) }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 50, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', backgroundColor: middleView === 'gallery' ? tileStyle.accent : 'rgba(245,240,232,0.08)', color: middleView === 'gallery' ? '#fff' : 'rgba(245,240,232,0.7)' }}>
              <ImageIcon size={12} /> Images <span style={{ opacity: 0.6 }}>{imageItems.length}</span>
            </button>
            {/* Selected item title pill */}
            {selectedItem && middleView === 'preview' && (
              <span style={{ flex: 1, fontSize: 10, fontWeight: 600, color: 'rgba(245,240,232,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 4 }}>{selectedItem.title}</span>
            )}
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
              {/* Preview — always takes 100% of the available space, never shrunk */}
              <div style={{ flex: 1, backgroundColor: '#000', overflow: 'hidden' }}>
                {renderPreview(selectedItem)}
              </div>

              {/* ── Summary: slides in from the RIGHT edge as a full-height panel.
                  The video is never resized — this is a fixed overlay.
                  On mobile it's full-width. On desktop it's 380 px wide.
                  Swipe/drag to close is handled by the backdrop click. ── */}
              <AnimatePresence>
                {summaryOpen && (summaryLoading || summaryError || selectedItem.summary || connections.length > 0 || connectionsLoading) && (
                  <>
                    {/* Backdrop — tap anywhere to dismiss */}
                    <motion.div
                      key="summary-backdrop"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setSummaryOpen(false)}
                      style={{ position: 'fixed', inset: 0, zIndex: 290, backgroundColor: 'rgba(6,18,16,0.45)', backdropFilter: 'blur(1px)' }}
                    />
                    {/* Slide panel */}
                    <motion.div
                      key="summary-panel"
                      initial={{ x: '100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '100%' }}
                      transition={{ type: 'spring', stiffness: 340, damping: 36 }}
                      style={{
                        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 291,
                        width: isMobile ? '100vw' : 380,
                        display: 'flex', flexDirection: 'column',
                        backgroundColor: '#0a1e1b',
                        borderLeft: `1px solid ${tileStyle.accent}33`,
                        boxShadow: '-8px 0 48px rgba(0,0,0,0.6)',
                      }}
                    >
                      {/* Panel header */}
                      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px', borderBottom: '1px solid rgba(245,240,232,0.07)' }}>
                        <Sparkles size={14} color={tileStyle.accent} />
                        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: tileStyle.accent, flex: 1 }}>A gentle summary</span>
                        {!summaryLoading && selectedItem.summary && (
                          <button onClick={() => handleSummarise(selectedItem, true)} title="Refresh"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600, color: 'rgba(245,240,232,0.6)', backgroundColor: 'rgba(245,240,232,0.07)', border: 'none', cursor: 'pointer' }}>
                            <RotateCcw size={11} /> Refresh
                          </button>
                        )}
                        <button onClick={() => setSummaryOpen(false)} title="Close — slide back"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 50, fontSize: 11, fontWeight: 600, color: 'rgba(245,240,232,0.7)', backgroundColor: 'rgba(245,240,232,0.08)', border: 'none', cursor: 'pointer' }}>
                          <X size={13} /> Close
                        </button>
                      </div>

                      {/* Item title inside the panel so you know what you're reading */}
                      <div style={{ flexShrink: 0, padding: '14px 18px 10px', borderBottom: '1px solid rgba(245,240,232,0.05)' }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#f5f0e8', margin: 0, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{selectedItem.title}</p>
                      </div>

                      {/* Scrollable summary body */}
                      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 32px' }}>
                        {summaryLoading ? (
                          <p style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'rgba(245,240,232,0.6)', margin: 0, fontStyle: 'italic' }}>
                            <Loader2 size={15} className="animate-spin" style={{ color: tileStyle.accent }} /> Taking a gentle look...
                          </p>
                        ) : summaryError ? (
                          <p style={{ fontSize: 14, color: '#e8b4a0', margin: 0, lineHeight: 1.6 }}>{summaryError}</p>
                        ) : (
                          <p style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(245,240,232,0.92)', margin: 0 }}>{selectedItem.summary}</p>
                        )}

                        {(connections.length > 0 || connectionsLoading) && (
                          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(245,240,232,0.08)' }}>
                            <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#c9a84c', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Sparkles size={10} /> Also in your havens
                            </p>
                            {connectionsLoading ? (
                              <p style={{ margin: 0, fontSize: 13, color: 'rgba(245,240,232,0.4)', fontStyle: 'italic' }}>Finding connections...</p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {connections.map(({ item: conn, reason }) => (
                                  <div key={conn.id} style={{ padding: '10px 12px', borderRadius: 10, backgroundColor: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.07)' }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#f5f0e8', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conn.title}</span>
                                    <span style={{ fontSize: 11.5, color: '#c9a84c', opacity: 0.8 }}>{conn.category} · {reason}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Details bar at bottom */}
              <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid rgba(245,240,232,0.08)', backgroundColor: '#0a1e1b', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 15, fontWeight: 700, color: '#f5f0e8', margin: 0, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedItem.title}</h2>
                  {selectedItem.whySaved ? (
                    <p title={selectedItem.whySaved} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: tileStyle.accent, margin: 0, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Sparkles size={9} style={{ flexShrink: 0 }} /> {selectedItem.whySaved}
                    </p>
                  ) : (
                    <p style={{ fontSize: 10, color: 'rgba(245,240,232,0.4)', margin: 0 }}>
                      {(() => { try { return new URL(selectedItem.url).hostname.replace('www.', '') } catch { return selectedItem.url } })()}
                    </p>
                  )}
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
                <button onClick={() => setEditItem({ id: selectedItem.id, title: selectedItem.title, description: selectedItem.description ?? '', whySaved: selectedItem.whySaved ?? '' })}
                  title="Edit title, note & why you saved it"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 50, fontSize: 11, fontWeight: 700, color: 'rgba(245,240,232,0.8)', backgroundColor: 'rgba(245,240,232,0.08)', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  <Pencil size={11} /> {!isMobile && 'Edit'}
                </button>
                <ShareMenu title={selectedItem.title} url={selectedItem.url} accent={tileStyle.accent} showLabel={!isMobile} />
                {!isMobile && (
                  <button onClick={() => setExpandedPreview((v) => !v)}
                    title={expandedPreview ? 'Exit full page' : 'Fill the whole page'}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 50, fontSize: 11, fontWeight: 700, color: expandedPreview ? '#0d2420' : 'rgba(245,240,232,0.8)', backgroundColor: expandedPreview ? tileStyle.accent : 'rgba(245,240,232,0.08)', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                    {expandedPreview ? <Minimize2 size={11} /> : <Maximize2 size={11} />} {expandedPreview ? 'Shrink' : 'Expand'}
                  </button>
                )}
                <button onClick={() => openItem(selectedItem)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 50, fontSize: 11, fontWeight: 700, color: '#fff', backgroundColor: tileStyle.accent, border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  <ExternalLink size={11} /> {!isMobile && 'Open'}
                </button>
                <button onClick={() => { setSelectedItem(null); setExpandedPreview(false) }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 50, fontSize: 11, fontWeight: 600, color: 'rgba(245,240,232,0.6)', backgroundColor: 'rgba(245,240,232,0.08)', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  <X size={11} /> {!isMobile && 'Close'}
                </button>
              </div>
            </>
          ) : videoItems.length > 0 ? (
            /* ── Idle: video grid so a video-only haven/folder is instantly
                 playable from the big centre panel (not just the narrow left lane) ── */
            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)' }}>
                {videoItems.length} {videoItems.length === 1 ? 'video' : 'videos'} · tap to play
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
                {videoItems.map((item) => {
                  const thumb = getThumbnailFromUrl(item.url, item.thumbnail)
                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => { setSelectedItem(item); setMiddleView('preview'); if (isMobile) setMobileTab('preview') }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedItem(item); setMiddleView('preview'); if (isMobile) setMobileTab('preview') } }}
                      title={item.title}
                      style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', aspectRatio: '16 / 10', backgroundColor: tileStyle.accentLight }}
                    >
                      {thumb ? (
                        <img src={thumb} alt={item.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                      ) : (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clapperboard size={26} style={{ color: tileStyle.accent }} /></div>
                      )}
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 40, height: 40, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Play size={18} color="#fff" style={{ marginLeft: 2 }} />
                      </div>
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,61,58,0.8) 0%, transparent 55%)' }} />
                      <p style={{ position: 'absolute', bottom: 6, left: 8, right: 8, fontSize: 11, fontWeight: 600, color: '#f5f0e8', lineHeight: 1.25, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.title}</p>
                    </div>
                  )
                })}
              </div>
            </div>
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
        {/* When right panel is collapsed on desktop, show a floating re-open tab on the right edge */}
        {!isMobile && !rightOpen && !mediaFocus && (
          <button
            onClick={() => setRightOpen(true)}
            title="Show docs panel"
            aria-label="Show docs panel"
            style={{
              position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
              zIndex: 20, width: 20, height: 56, borderRadius: '8px 0 0 8px',
              backgroundColor: '#122e29', border: '1px solid rgba(245,240,232,0.12)',
              borderRight: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(245,240,232,0.6)',
            }}
          >
            <ChevronLeft size={12} />
          </button>
        )}
        <motion.div
          animate={{ width: isMobile ? '100%' : (rightOpen ? 260 : 0) }}
          transition={{ type: 'spring', stiffness: 340, damping: 36 }}
          style={{ flexShrink: 0, display: mediaFocus || (isMobile && mobileTab !== 'links') ? 'none' : 'flex', flexDirection: 'column', borderLeft: isMobile ? 'none' : '1px solid rgba(245,240,232,0.07)', backgroundColor: '#0a1e1b', overflow: isMobile ? 'visible' : 'hidden', minHeight: isMobile ? 'auto' : 0 }}>
          <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid rgba(245,240,232,0.07)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Desktop collapse — hide panel (chevron first so it's on the left edge) */}
            {!isMobile && (
              <button
                onClick={() => setRightOpen(false)}
                title="Hide docs panel"
                aria-label="Hide docs panel"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: 'rgba(245,240,232,0.07)', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.45)', flexShrink: 0 }}
              >
                <ChevronRight size={12} />
              </button>
            )}
            <FileText size={13} color={tileStyle.accent} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.55)' }}>Docs &amp; Links</span>
            <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.35)', marginLeft: 'auto' }}>{docItems.length}</span>
          </div>
          <div style={{ flex: 1, overflowY: isMobile ? 'visible' : 'auto', padding: '8px 8px', minHeight: isMobile ? 'auto' : 0 }}>
            {docItems.length === 0 ? (
              <p style={{ fontSize: 12, color: 'rgba(245,240,232,0.35)', textAlign: 'center', marginTop: 24, fontStyle: 'italic', lineHeight: 1.5 }}>No docs or links here yet. Articles, PDFs, Google Docs and web links land here.</p>
            ) : docItems.map((item) => {
              const thumb = getThumbnailFromUrl(item.url, item.thumbnail)
              const isActive = selectedItem?.id === item.id
              const isChecked = selectedIds.has(item.id)
              return (
                <div key={item.id} style={{ position: 'relative' }}>
                  {/* Use div+role instead of <button> so the inner three-dot <button> is valid HTML */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => { if (selectMode) { toggleSelect(item.id); return } setSelectedItem(isActive ? null : item); setMiddleView('preview'); if (isMobile) setMobileTab('preview') }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { if (selectMode) { toggleSelect(item.id); return } setSelectedItem(isActive ? null : item); setMiddleView('preview'); if (isMobile) setMobileTab('preview') } }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 8px', borderRadius: 12, cursor: 'pointer', border: (selectMode && isChecked) ? `1px solid ${tileStyle.accent}` : isActive ? `1px solid ${tileStyle.accent}44` : '1px solid transparent', textAlign: 'left', backgroundColor: (selectMode && isChecked) ? `${tileStyle.accent}22` : isActive ? 'rgba(245,240,232,0.07)' : 'transparent', marginBottom: 2, transition: 'background 0.12s' }}
                    onMouseEnter={e => { if (!isActive && !isChecked) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(245,240,232,0.05)' }}
                    onMouseLeave={e => { if (!isActive && !isChecked) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent' }}
                  >
                    {selectMode && (
                      <span style={{ flexShrink: 0, display: 'flex' }}>
                        {isChecked ? <CheckCircle2 size={18} color={tileStyle.accent} /> : <Circle size={18} color="rgba(245,240,232,0.35)" />}
                      </span>
                    )}
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
                    {!selectMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleItemMenu(item.id, e) }}
                        style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 6, color: 'rgba(245,240,232,0.35)', display: 'flex', alignItems: 'center' }}
                      >
                        <MoreVertical size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
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

                  {playlistNeedsApiKey && (
                    <div style={{ marginTop: 10, borderRadius: 12, backgroundColor: 'rgba(200,150,80,0.12)', border: '1px solid rgba(200,150,80,0.25)', padding: '12px 14px' }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#c9a84c', margin: '0 0 4px' }}>YouTube API key needed</p>
                      <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.6)', margin: '0 0 10px', lineHeight: 1.5 }}>
                        Playlist import uses the free YouTube Data API. Set it up in 2 minutes:
                      </p>
                      <ol style={{ margin: '0 0 10px', paddingLeft: 16, fontSize: 11, color: 'rgba(245,240,232,0.6)', lineHeight: 1.8 }}>
                        <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: '#c9a84c' }}>Google Cloud Console</a></li>
                        <li>Create a project → Enable &quot;YouTube Data API v3&quot;</li>
                        <li>Create an API Key → copy it</li>
                        <li>In Cur8 Settings (top right) → Vars → add <code style={{ background: 'rgba(245,240,232,0.1)', padding: '1px 4px', borderRadius: 4 }}>YOUTUBE_API_KEY</code></li>
                      </ol>
                      <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.4)', margin: 0 }}>Free quota: 10,000 requests/day — more than enough for personal use.</p>
                    </div>
                  )}
                  {!playlistNeedsApiKey && playlistError && <p style={{ fontSize: 12, color: '#e8b4a0', marginTop: 8 }}>{playlistError}</p>}

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
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, borderRadius: 11, border: `1px solid ${tileStyle.accent}44`, backgroundColor: '#0d2420', padding: '9px 12px' }}>
                        <Sparkles size={13} style={{ color: tileStyle.accent, flexShrink: 0 }} />
                        <input value={saveWhy} onChange={(e) => setSaveWhy(e.target.value)} maxLength={280}
                          placeholder="Why I'm saving this (a note to future me)…"
                          style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 12.5, color: '#f5f0e8', outline: 'none', boxSizing: 'border-box' }} />
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
        onEdit={editReflection}
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
              transformTemplate={(_, generated) => `translate(-50%, -50%) ${generated}`}
              role="dialog" aria-label="Rename haven"
              style={{ position: 'fixed', zIndex: 141, top: '50%', left: '50%', width: 'min(380px, 92vw)', backgroundColor: '#0a1e1b', border: '1px solid rgba(245,240,232,0.12)', borderRadius: 18, padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
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

      {/* ── Multi-select batch action bar ── */}
      <AnimatePresence>
        {selectMode && (
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            style={{ position: 'fixed', left: 12, right: 12, marginLeft: 'auto', marginRight: 'auto', bottom: 16, zIndex: 160, maxWidth: 560, backgroundColor: '#0a1e1b', border: `1px solid ${tileStyle.accent}55`, borderRadius: 16, boxShadow: '0 16px 50px rgba(0,0,0,0.55)', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f5f0e8', whiteSpace: 'nowrap' }}>
              {batchNote || `${selectedIds.size} selected`}
            </span>
            <button onClick={selectAllVisible} style={{ fontSize: 11, fontWeight: 600, color: 'rgba(245,240,232,0.7)', background: 'none', border: '1px solid rgba(245,240,232,0.15)', borderRadius: 50, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Select all</button>
            <button disabled={selectedIds.size === 0 || batchBusy} onClick={() => setBatchPicker('folder')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: selectedIds.size ? '#f5f0e8' : 'rgba(245,240,232,0.3)', backgroundColor: 'rgba(245,240,232,0.08)', border: 'none', borderRadius: 50, padding: '7px 12px', cursor: selectedIds.size ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
              <FolderInput size={13} /> Folder
            </button>
            <button disabled={selectedIds.size === 0 || batchBusy} onClick={() => setBatchPicker('moveGarden')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: selectedIds.size ? '#f5f0e8' : 'rgba(245,240,232,0.3)', backgroundColor: 'rgba(245,240,232,0.08)', border: 'none', borderRadius: 50, padding: '7px 12px', cursor: selectedIds.size ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
              <ArrowRightLeft size={13} /> Move
            </button>
            <button disabled={selectedIds.size === 0 || batchBusy} onClick={() => setBatchPicker('copyGarden')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: selectedIds.size ? '#f5f0e8' : 'rgba(245,240,232,0.3)', backgroundColor: 'rgba(245,240,232,0.08)', border: 'none', borderRadius: 50, padding: '7px 12px', cursor: selectedIds.size ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
              <Copy size={13} /> Copy
            </button>
            <button disabled={selectedIds.size === 0 || batchBusy} onClick={batchShare}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: selectedIds.size ? '#f5f0e8' : 'rgba(245,240,232,0.3)', backgroundColor: 'rgba(245,240,232,0.08)', border: 'none', borderRadius: 50, padding: '7px 12px', cursor: selectedIds.size ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
              <Share2 size={13} /> Share
            </button>
            <button disabled={selectedIds.size === 0 || batchBusy} onClick={batchDownload}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: selectedIds.size ? '#f5f0e8' : 'rgba(245,240,232,0.3)', backgroundColor: 'rgba(245,240,232,0.08)', border: 'none', borderRadius: 50, padding: '7px 12px', cursor: selectedIds.size ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
              {batchBusy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Save
            </button>
            <button disabled={selectedIds.size === 0 || batchBusy} onClick={batchDelete}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: selectedIds.size ? '#e8927c' : 'rgba(245,240,232,0.3)', backgroundColor: selectedIds.size ? 'rgba(200,90,64,0.14)' : 'rgba(245,240,232,0.08)', border: 'none', borderRadius: 50, padding: '7px 12px', cursor: selectedIds.size ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
              {batchBusy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
            </button>
            <button onClick={exitSelectMode} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'rgba(245,240,232,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 8px' }}>
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Batch picker sheet (choose folder or destination haven) ── */}
      <AnimatePresence>
        {batchPicker && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setBatchPicker(null)}
              style={{ position: 'fixed', inset: 0, zIndex: 170, backgroundColor: 'rgba(6,18,16,0.6)', backdropFilter: 'blur(3px)' }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              transformTemplate={(_, generated) => `translate(-50%, -50%) ${generated}`}
              role="dialog" aria-label="Choose destination"
              style={{ position: 'fixed', zIndex: 171, top: '50%', left: '50%', width: 'min(380px, 92vw)', maxHeight: '70vh', overflowY: 'auto', backgroundColor: '#0a1e1b', border: '1px solid rgba(245,240,232,0.12)', borderRadius: 18, padding: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
            >
              <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 17, fontWeight: 700, color: '#f5f0e8', margin: '0 0 4px' }}>
                {batchPicker === 'folder' ? 'Move to folder' : batchPicker === 'moveGarden' ? 'Move to another haven' : 'Copy to another haven'}
              </h2>
              <p style={{ fontSize: 11.5, color: 'rgba(245,240,232,0.5)', margin: '0 0 14px' }}>{selectedIds.size} item{selectedIds.size === 1 ? '' : 's'} selected</p>
              {batchPicker === 'folder' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button onClick={() => batchMoveToFolder(undefined)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'rgba(245,240,232,0.06)', color: '#f5f0e8', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                    <FolderOpen size={15} style={{ color: tileStyle.accent }} /> No folder (top level)
                  </button>
                  {folders.map((f) => (
                    <button key={f.id} onClick={() => batchMoveToFolder(f.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'rgba(245,240,232,0.06)', color: '#f5f0e8', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                      <Folder size={15} style={{ color: tileStyle.accent }} /> {f.name}
                    </button>
                  ))}
                  {folders.length === 0 && <p style={{ fontSize: 12, color: 'rgba(245,240,232,0.4)', padding: '8px 4px' }}>No folders yet in this haven.</p>}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {CATEGORIES.filter((c) => c.name !== category).map((g) => (
                    <button key={g.name} onClick={() => batchSendToGarden(g.name as Category, batchPicker === 'moveGarden' ? 'move' : 'copy')}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'rgba(245,240,232,0.06)', color: '#f5f0e8', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                      <ArrowRightLeft size={14} style={{ color: tileStyle.accent }} /> {displayName(g.name as Category)}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Edit item modal (title & note) ── */}
      <AnimatePresence>
        {editItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditItem(null)}
              style={{ position: 'fixed', inset: 0, zIndex: 150, backgroundColor: 'rgba(6,18,16,0.6)', backdropFilter: 'blur(3px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              transformTemplate={(_, generated) => `translate(-50%, -50%) ${generated}`}
              role="dialog" aria-label="Edit item"
              style={{ position: 'fixed', zIndex: 151, top: '50%', left: '50%', width: 'min(420px, 92vw)', backgroundColor: '#0a1e1b', border: '1px solid rgba(245,240,232,0.12)', borderRadius: 18, padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: `${tileStyle.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={15} color={tileStyle.accent} />
                </div>
                <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 18, fontWeight: 700, color: '#f5f0e8', margin: 0 }}>Edit this item</h2>
              </div>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.5)', display: 'block', marginBottom: 5 }}>Title</label>
              <input
                autoFocus
                value={editItem.title}
                onChange={(e) => setEditItem((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) saveItemEdit() }}
                maxLength={300}
                style={{ width: '100%', padding: '11px 13px', borderRadius: 11, backgroundColor: '#0d2420', border: '1px solid rgba(245,240,232,0.15)', color: '#f5f0e8', fontSize: 14, outline: 'none', marginBottom: 14 }}
              />
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.5)', display: 'block', marginBottom: 5 }}>Your note</label>
              <textarea
                value={editItem.description}
                onChange={(e) => setEditItem((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                rows={11}
                placeholder="Add notes, key takeaways, quotes, anything you want to keep about this item…"
                style={{ width: '100%', resize: 'vertical', minHeight: 220, padding: '11px 13px', borderRadius: 11, backgroundColor: '#0d2420', border: '1px solid rgba(245,240,232,0.15)', color: '#f5f0e8', fontSize: 14, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit', marginBottom: 14 }}
              />
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: tileStyle.accent, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                <Sparkles size={11} /> Why I saved this
              </label>
              <input
                value={editItem.whySaved}
                onChange={(e) => setEditItem((prev) => (prev ? { ...prev, whySaved: e.target.value } : prev))}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) saveItemEdit() }}
                maxLength={280}
                placeholder="One line of context for future you…"
                style={{ width: '100%', padding: '11px 13px', borderRadius: 11, backgroundColor: '#0d2420', border: `1px solid ${tileStyle.accent}55`, color: '#f5f0e8', fontSize: 14, outline: 'none' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
                <button
                  onClick={saveItemEdit}
                  disabled={savingEdit || !editItem.title.trim()}
                  style={{ flex: 1, padding: '10px', borderRadius: 11, border: 'none', cursor: savingEdit || !editItem.title.trim() ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, backgroundColor: editItem.title.trim() ? tileStyle.accent : 'rgba(245,240,232,0.12)', color: editItem.title.trim() ? '#fff' : 'rgba(245,240,232,0.4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {savingEdit ? <Loader2 size={13} className="animate-spin" /> : null} Save changes
                </button>
                <button
                  onClick={() => setEditItem(null)}
                  style={{ padding: '10px 16px', borderRadius: 11, border: '1px solid rgba(245,240,232,0.15)', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'rgba(245,240,232,0.7)' }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Transient status toast (share / save feedback) */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            transformTemplate={(_, generated) => `translateX(-50%) ${generated}`}
            style={{ position: 'fixed', bottom: 24, left: '50%', zIndex: 400, backgroundColor: '#122e29', color: '#f5f0e8', border: '1px solid rgba(245,240,232,0.14)', borderRadius: 50, padding: '9px 18px', fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <Check size={13} style={{ color: tileStyle.accent }} /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
