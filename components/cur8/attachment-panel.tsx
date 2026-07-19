'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { upload } from '@vercel/blob/client'
import {
  Paperclip, X, Loader2, Play, ImageIcon, FileText, Brain, Link2, Smartphone, Search,
  Mic, Square, Trash2, Volume2,
} from 'lucide-react'
import {
  getAttachmentsFor, addAttachment, removeAttachment, getCur8Data, type AttachmentDTO,
} from '@/app/actions/cur8'
import { getNotes, type NoteDTO } from '@/app/actions/notes'
import type { Cur8Item } from '@/lib/cur8-store'

// Small thumbnail/icon for an attachment chip based on its kind + category.
function AttachmentGlyph({ a, size = 14 }: { a: AttachmentDTO; size?: number }) {
  if (a.thumbnail) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={a.thumbnail || '/placeholder.svg'} alt="" crossOrigin="anonymous"
        style={{ width: 22, height: 22, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }} />
    )
  }
  if (a.kind === 'note') return <Brain size={size} style={{ flexShrink: 0 }} />
  if (a.mimeType?.startsWith('audio/')) return <Volume2 size={size} style={{ flexShrink: 0 }} />
  if (a.mimeType?.startsWith('video/')) return <Play size={size} style={{ flexShrink: 0 }} />
  if (a.mimeType?.startsWith('image/')) return <ImageIcon size={size} style={{ flexShrink: 0 }} />
  return <FileText size={size} style={{ flexShrink: 0 }} />
}

// Row of attachment chips shown under a note or reflection. Tap opens; X removes.
export function AttachmentChips({
  attachments, accent, onRemove,
}: {
  attachments: AttachmentDTO[]
  accent: string
  onRemove: (id: string) => void
}) {
  return <AttachmentChipsInner attachments={attachments} accent={accent} onRemove={onRemove} />
}

function AttachmentChipsInner({
  attachments, accent, onRemove,
}: {
  attachments: AttachmentDTO[]
  accent: string
  onRemove: (id: string) => void
}) {
  // Track which audio voice-note is expanded into an inline player.
  const [playingId, setPlayingId] = useState<string | null>(null)
  if (attachments.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {attachments.map((a) => {
        const isAudio = a.mimeType?.startsWith('audio/')
        const expanded = isAudio && playingId === a.id
        return (
        <div key={a.id}
          style={{ display: 'inline-flex', flexDirection: expanded ? 'column' : 'row', alignItems: expanded ? 'stretch' : 'center', gap: 6, padding: '4px 6px 4px 7px', borderRadius: 8, backgroundColor: 'rgba(245,240,232,0.06)', border: `1px solid ${accent}33`, maxWidth: expanded ? 260 : 200 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              onClick={() => {
                // Voice notes play inline; everything else opens in a new tab.
                if (isAudio) setPlayingId((id) => (id === a.id ? null : a.id))
                else if (a.url) window.open(a.url, '_blank', 'noopener,noreferrer')
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: (a.url || isAudio) ? 'pointer' : 'default', color: accent, minWidth: 0 }}>
              <AttachmentGlyph a={a} />
              <span style={{ fontSize: 11, color: '#f5f0e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
            </span>
            <button onClick={() => onRemove(a.id)} aria-label="Remove attachment"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.4)', display: 'flex', padding: 0, flexShrink: 0, marginLeft: 'auto' }}>
              <X size={12} />
            </button>
          </div>
          {expanded && a.url && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <audio src={a.url} controls autoPlay style={{ width: '100%', height: 34 }} />
          )}
        </div>
      )})}
    </div>
  )
}

type Tab = 'cur8' | 'note' | 'device' | 'record'

// Payload describing something to attach, before it's tied to a saved parent.
export interface PendingAttachment {
  kind: 'item' | 'note' | 'file'
  refId?: string
  url?: string
  title: string
  thumbnail?: string
  mimeType?: string
}

// Picker sheet: attach an existing Cur8 item, another note, or a device file.
//
// Two modes:
//  - Normal: pass parentId + onAttached. Attachments persist to that parent.
//  - Deferred (drafting): pass onPick instead. Nothing is persisted — the chosen
//    payload is handed back so the caller can attach it once the note is saved.
//    Device files / recordings are still uploaded to blob (that has to happen now).
export function AttachmentPicker({
  parentType, parentId, accent, onClose, onAttached, onPick,
}: {
  parentType: 'note' | 'reflection'
  parentId?: string
  accent: string
  onClose: () => void
  onAttached?: (a: AttachmentDTO) => void
  onPick?: (p: PendingAttachment) => void
}) {
  const deferred = !!onPick
  const [tab, setTab] = useState<Tab>('cur8')
  const [items, setItems] = useState<Cur8Item[]>([])
  const [notes, setNotes] = useState<NoteDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Voice-note recording state
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [recordError, setRecordError] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const blobRef = useRef<Blob | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Clean up the recorder + object URL if the sheet closes mid-record.
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      recorderRef.current?.stream?.getTracks().forEach((t) => t.stop())
      if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startRecording() {
    setRecordError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Pick a mime type the browser actually supports (Safari differs from Chrome).
      const preferred = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported(t))
      const rec = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined)
      chunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = () => {
        const type = rec.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        blobRef.current = blob
        setRecordedUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((t) => t.stop())
      }
      recorderRef.current = rec
      rec.start()
      setRecording(true)
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } catch {
      setRecordError('Microphone access was blocked. Please allow the mic and try again.')
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  function discardRecording() {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    setRecordedUrl(null)
    blobRef.current = null
    setElapsed(0)
  }

  async function saveRecording() {
    if (!blobRef.current) return
    const ext = blobRef.current.type.includes('mp4') ? 'm4a' : blobRef.current.type.includes('ogg') ? 'ogg' : 'webm'
    const stamp = new Date().toLocaleString('en-ZA', { hour12: false }).replace(/[/:,\s]+/g, '-')
    const file = new File([blobRef.current], `Voice note ${stamp}.${ext}`, { type: blobRef.current.type })
    await attachDeviceFile(file)
  }

  function fmtTime(s: number) {
    const m = Math.floor(s / 60); const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([getCur8Data(), getNotes()])
      .then(([data, n]) => { setItems(data.items as Cur8Item[]); setNotes(n) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function attachItem(it: Cur8Item) {
    setBusy(true)
    const a = await addAttachment({
      parentType, parentId, kind: 'item', refId: it.id, url: it.url,
      title: it.title, thumbnail: it.thumbnail,
    }).catch(() => null)
    setBusy(false)
    if (a) { onAttached(a); onClose() }
  }

  async function attachNote(n: NoteDTO) {
    setBusy(true)
    const a = await addAttachment({
      parentType, parentId, kind: 'note', refId: n.id,
      title: n.body.slice(0, 80),
    }).catch(() => null)
    setBusy(false)
    if (a) { onAttached(a); onClose() }
  }

  async function attachDeviceFile(file: File) {
    setBusy(true)
    setUploadMsg(`Uploading ${file.name}…`)
    try {
      const mime = file.type || 'application/octet-stream'
      const blob = await upload(`cur8/${file.name}`, file, {
        access: 'private', handleUploadUrl: '/api/cur8/upload', multipart: true, contentType: mime,
        onUploadProgress: ({ percentage }) => setUploadMsg(`Uploading ${file.name} — ${Math.round(percentage)}%`),
      })
      const url = `/api/cur8/file?pathname=${encodeURIComponent(blob.pathname)}`
      const a = await addAttachment({
        parentType, parentId, kind: 'file', url,
        title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        thumbnail: mime.startsWith('image/') ? url : undefined,
        mimeType: mime,
      })
      onAttached(a)
      onClose()
    } catch {
      setUploadMsg('Upload failed — try again.')
    } finally {
      setBusy(false)
    }
  }

  const q = query.trim().toLowerCase()
  const filteredItems = q ? items.filter((i) => i.title.toLowerCase().includes(q)) : items
  const filteredNotes = q ? notes.filter((n) => n.body.toLowerCase().includes(q)) : notes

  const TABS: { id: Tab; label: string; icon: typeof Link2 }[] = [
    { id: 'cur8', label: 'From Cur8', icon: Link2 },
    { id: 'note', label: 'A note', icon: Brain },
    { id: 'record', label: 'Record', icon: Mic },
    { id: 'device', label: 'File', icon: Smartphone },
  ]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(6,18,16,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{ width: 'min(460px, 100%)', maxHeight: '80vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0d2420', borderRadius: 18, border: `1px solid ${accent}33`, overflow: 'hidden', fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(245,240,232,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Paperclip size={16} color={accent} />
              <h3 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 16, fontWeight: 700, color: '#f5f0e8', margin: 0 }}>Add an attachment</h3>
            </div>
            <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.5)', display: 'flex' }}><X size={18} /></button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, padding: '10px 16px 0' }}>
            {TABS.map((t) => {
              const active = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 6px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, backgroundColor: active ? accent : 'rgba(245,240,232,0.06)', color: active ? '#0d2420' : 'rgba(245,240,232,0.7)' }}>
                  <t.icon size={13} /> {t.label}
                </button>
              )
            })}
          </div>

          {/* Search (for cur8 + note tabs only — not record or device) */}
          {tab !== 'device' && tab !== 'record' && (
            <div style={{ padding: '12px 16px 6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, backgroundColor: '#0a1e1b', border: '1px solid rgba(245,240,232,0.12)' }}>
                <Search size={14} color="rgba(245,240,232,0.4)" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…"
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f5f0e8', fontSize: 13 }} />
              </div>
            </div>
          )}

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 16px' }}>
            {loading && tab !== 'device' ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}>
                <Loader2 size={20} color={accent} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : tab === 'cur8' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredItems.length === 0 && <p style={{ fontSize: 12, color: 'rgba(245,240,232,0.4)', textAlign: 'center', padding: 20 }}>Nothing saved yet.</p>}
                {filteredItems.slice(0, 60).map((it) => (
                  <button key={it.id} disabled={busy} onClick={() => attachItem(it)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10, border: '1px solid rgba(245,240,232,0.08)', backgroundColor: 'rgba(245,240,232,0.03)', cursor: busy ? 'wait' : 'pointer', textAlign: 'left', width: '100%' }}>
                    {it.thumbnail
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={it.thumbnail || '/placeholder.svg'} alt="" crossOrigin="anonymous" style={{ width: 40, height: 40, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 40, height: 40, borderRadius: 7, backgroundColor: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Link2 size={16} color={accent} /></div>}
                    <span style={{ fontSize: 12.5, color: '#f5f0e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
                  </button>
                ))}
              </div>
            ) : tab === 'note' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredNotes.length === 0 && <p style={{ fontSize: 12, color: 'rgba(245,240,232,0.4)', textAlign: 'center', padding: 20 }}>No brain-dump notes yet.</p>}
                {filteredNotes.slice(0, 60).map((n) => (
                  <button key={n.id} disabled={busy} onClick={() => attachNote(n)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: 10, border: '1px solid rgba(245,240,232,0.08)', backgroundColor: 'rgba(245,240,232,0.03)', cursor: busy ? 'wait' : 'pointer', textAlign: 'left', width: '100%' }}>
                    <Brain size={15} color={accent} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 12.5, color: '#f5f0e8', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.body}</span>
                  </button>
                ))}
              </div>
            ) : tab === 'record' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 12px' }}>
                {!recordedUrl ? (
                  <>
                    <button disabled={busy} onClick={recording ? stopRecording : startRecording}
                      aria-label={recording ? 'Stop recording' : 'Start recording'}
                      style={{ width: 96, height: 96, borderRadius: '50%', border: `2px solid ${accent}`, backgroundColor: recording ? accent : `${accent}22`, color: recording ? '#0d2420' : accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {recording
                        ? <Square size={30} fill="currentColor" />
                        : <Mic size={34} />}
                    </button>
                    <div style={{ textAlign: 'center' }}>
                      {recording ? (
                        <p style={{ fontSize: 20, fontWeight: 700, color: '#f5f0e8', margin: 0, fontVariantNumeric: 'tabular-nums' }}>{fmtTime(elapsed)}</p>
                      ) : (
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#f5f0e8', margin: 0 }}>Tap to record a voice note</p>
                      )}
                      <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.5)', margin: '4px 0 0' }}>
                        {recording ? 'Tap the square to stop' : 'Speak your thought — it saves as an audio attachment'}
                      </p>
                    </div>
                    {recordError && <p style={{ fontSize: 11.5, color: '#e08a6f', margin: 0, textAlign: 'center' }}>{recordError}</p>}
                  </>
                ) : (
                  <>
                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, backgroundColor: 'rgba(245,240,232,0.05)', border: `1px solid ${accent}33` }}>
                      <Volume2 size={16} color={accent} style={{ flexShrink: 0 }} />
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <audio src={recordedUrl} controls style={{ flex: 1, height: 36 }} />
                    </div>
                    <p style={{ fontSize: 11.5, color: 'rgba(245,240,232,0.55)', margin: 0 }}>Length {fmtTime(elapsed)} — happy with it?</p>
                    <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                      <button disabled={busy} onClick={discardRecording}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', borderRadius: 50, border: '1px solid rgba(245,240,232,0.2)', background: 'none', color: 'rgba(245,240,232,0.8)', fontSize: 12.5, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>
                        <Trash2 size={14} /> Re-record
                      </button>
                      <button disabled={busy} onClick={saveRecording}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', borderRadius: 50, border: 'none', backgroundColor: accent, color: '#0d2420', fontSize: 12.5, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>
                        {busy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Paperclip size={14} />} {busy ? 'Saving…' : 'Attach'}
                      </button>
                    </div>
                    {uploadMsg && <p style={{ fontSize: 11.5, color: 'rgba(245,240,232,0.6)', margin: 0 }}>{uploadMsg}</p>}
                  </>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 12px' }}>
                <input ref={fileRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) attachDeviceFile(f) }} />
                <button disabled={busy} onClick={() => fileRef.current?.click()}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%', padding: '28px 16px', borderRadius: 14, border: `2px dashed ${accent}55`, backgroundColor: 'rgba(245,240,232,0.03)', cursor: busy ? 'wait' : 'pointer', color: accent }}>
                  {busy ? <Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} /> : <Smartphone size={26} />}
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{busy ? 'Uploading…' : 'Choose a file from this device'}</span>
                  <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.5)' }}>Photos, PDFs, audio, video — anything</span>
                </button>
                {uploadMsg && <p style={{ fontSize: 11.5, color: 'rgba(245,240,232,0.6)', margin: 0 }}>{uploadMsg}</p>}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Convenience hook to load + manage attachments for a set of parents.
export function useAttachments(parentType: 'note' | 'reflection', parentIds: string[], enabled: boolean) {
  const [byParent, setByParent] = useState<Record<string, AttachmentDTO[]>>({})
  const key = parentIds.join(',')
  useEffect(() => {
    if (!enabled || parentIds.length === 0) return
    getAttachmentsFor(parentType, parentIds)
      .then((rows) => {
        const grouped: Record<string, AttachmentDTO[]> = {}
        for (const r of rows) (grouped[r.parentId] ||= []).push(r)
        setByParent(grouped)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, parentType])

  function add(a: AttachmentDTO) {
    setByParent((prev) => ({ ...prev, [a.parentId]: [a, ...(prev[a.parentId] || [])] }))
  }
  function remove(parentId: string, id: string) {
    setByParent((prev) => ({ ...prev, [parentId]: (prev[parentId] || []).filter((x) => x.id !== id) }))
    removeAttachment(id).catch(() => {})
  }
  return { byParent, add, remove }
}
