'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, X, Mic, MicOff, Send, Volume2, Square, Pin, PinOff,
  Copy, Trash2, Loader2, Mail, Check, ChevronDown, MessageCircle, Wand2, Pencil,
} from 'lucide-react'
import {
  getNotes, createNote, deleteNote, togglePinNote, updateNote,
  getSettings, saveSettings, type NoteDTO, type Cur8Settings,
} from '@/app/actions/notes'
import { useReadAloud, useDictation } from '@/hooks/use-speech'
import { cleanupBrainDump, type CleanupResult } from '@/app/actions/ai-features'

const ACCENT = '#c9a84c'
const SAGE = '#8ec8b4'

export default function BrainDump() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState<NoteDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<Cur8Settings>({ emailTo: '', memEmail: 'save@mem.ai', autoEmail: false })
  const [settingsSaved, setSettingsSaved] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const baseDraftRef = useRef('')
  const [cleanup, setCleanup] = useState<CleanupResult | null>(null)
  const [cleanupLoading, setCleanupLoading] = useState(false)

  const { speak, stop: stopSpeak, speaking, supported: ttsSupported } = useReadAloud()

  // Dictation appends onto whatever was in the box when the mic started
  const handleDictation = useCallback((text: string) => {
    setDraft((baseDraftRef.current ? baseDraftRef.current + ' ' : '') + text)
  }, [])
  const { start: startDictation, stop: stopDictation, listening, supported: sttSupported } = useDictation(handleDictation)

  // Allow other components (e.g. HomeQuickActions) to open the panel via a custom event
  useEffect(() => {
    function handleOpenEvent() { setOpen(true) }
    window.addEventListener('cur8:openBrainDump', handleOpenEvent)
    return () => window.removeEventListener('cur8:openBrainDump', handleOpenEvent)
  }, [])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false) }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [open])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([getNotes(), getSettings()])
      .then(([n, s]) => { setNotes(n); setSettings(s) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  // Close speech when panel closes
  useEffect(() => {
    if (!open) { stopSpeak(); stopDictation() }
  }, [open, stopSpeak, stopDictation])

  function toggleMic() {
    if (listening) {
      stopDictation()
    } else {
      baseDraftRef.current = draft
      startDictation()
      textareaRef.current?.focus()
    }
  }

  async function handleSave() {
    const body = draft.trim()
    if (!body || saving) return
    setSaving(true)
    if (listening) stopDictation()
    try {
      const note = await createNote(body)
      setNotes((prev) => [note, ...prev])
      setDraft('')
      baseDraftRef.current = ''
      // If auto-send is on, open the user's email pre-filled to mem.ai
      if (settings.autoEmail) emailNote(body)
    } catch {
      // keep the draft so nothing is lost
    } finally {
      setSaving(false)
    }
  }

  function readNote(note: NoteDTO) {
    if (speakingId === note.id && speaking) {
      stopSpeak()
      setSpeakingId(null)
    } else {
      speak(note.body)
      setSpeakingId(note.id)
    }
  }

  async function handlePin(note: NoteDTO) {
    const next = !note.pinned
    setNotes((prev) => {
      const updated = prev.map((n) => (n.id === note.id ? { ...n, pinned: next } : n))
      return [...updated].sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (b.createdAt < a.createdAt ? -1 : 1))
    })
    await togglePinNote(note.id, next).catch(() => {})
  }

  async function handleDelete(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    if (speakingId === id) { stopSpeak(); setSpeakingId(null) }
    await deleteNote(id).catch(() => {})
  }

  function startEdit(note: NoteDTO) {
    setEditingId(note.id)
    setEditDraft(note.body)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDraft('')
  }

  async function saveEdit(id: string) {
    const body = editDraft.trim()
    if (!body) return
    // Optimistic update
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, body } : n)))
    setEditingId(null)
    setEditDraft('')
    await updateNote(id, body).catch(() => {})
  }

  async function copyNote(note: NoteDTO) {
    try {
      await navigator.clipboard.writeText(note.body)
      setCopiedId(note.id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch { /* noop */ }
  }

  // Build a mailto that opens the user's own email app, pre-addressed to mem.ai
  // (and cc'd to their own inbox) with the thought as the body. Sending from the
  // user's own address is what lets mem.ai recognise and file it.
  //
  // IMPORTANT: we build the query with encodeURIComponent (which encodes spaces
  // as %20), NOT URLSearchParams — URLSearchParams encodes spaces as "+", and
  // email apps like Gmail then show the "+" signs literally in the message.
  function buildMailto(body: string, toOverride?: string) {
    const to = (toOverride ?? settings.memEmail).trim() || 'save@mem.ai'
    const cc = settings.emailTo.trim()
    const firstLine = body.split('\n')[0].slice(0, 60)
    const parts = [
      `subject=${encodeURIComponent(firstLine || 'Cur8 thought')}`,
      `body=${encodeURIComponent(body)}`,
    ]
    // Don't cc yourself when you're deliberately sending to someone else.
    if (cc && !toOverride) parts.push(`cc=${encodeURIComponent(cc)}`)
    return `mailto:${to}?${parts.join('&')}`
  }

  function emailNote(body: string, toOverride?: string) {
    window.location.href = buildMailto(body, toOverride)
  }

  // Open WhatsApp with the thought pre-filled; the user picks any contact.
  function whatsAppNote(body: string) {
    window.open(`https://wa.me/?text=${encodeURIComponent(body)}`, '_blank', 'noopener')
  }

  async function persistSettings(next: Cur8Settings) {
    setSettings(next)
    await saveSettings(next).catch(() => {})
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 1600)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSave()
    }
  }

  if (pathname?.includes('/sign-in') || pathname?.includes('/sign-up')) return null

  // On haven category pages the toolbar button opens the panel — hide the floating pill
  const isHavenPage = !!pathname && pathname.startsWith('/cur8/') && pathname !== '/cur8/'

  return (
    <>
      {/* Floating trigger — hidden on haven pages where the toolbar handles it */}
      {!isHavenPage && <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        aria-label="Open Brain Dump"
        style={{
          position: 'fixed', bottom: 20, left: 20, zIndex: 60,
          width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
          backgroundColor: '#0a1e1b', boxShadow: `0 6px 24px rgba(0,0,0,0.4), 0 0 0 1px ${ACCENT}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT,
        }}
      >
        <Brain size={22} />
      </motion.button>}

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 70, backgroundColor: 'rgba(6,18,16,0.6)', backdropFilter: 'blur(3px)' }}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{
                position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 71,
                width: 'min(420px, 92vw)', backgroundColor: '#0d2420',
                borderRight: `1px solid ${ACCENT}33`, display: 'flex', flexDirection: 'column',
                fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif', color: '#f5f0e8',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid rgba(245,240,232,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: `${ACCENT}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Brain size={18} color={ACCENT} />
                  </div>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 18, fontWeight: 700, margin: 0 }}>Brain Dump</h2>
                    <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.5)', margin: 0 }}>Catch the thought before it floats off</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.6)', padding: 4 }}>
                  <X size={20} />
                </button>
              </div>

              {/* Composer */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(245,240,232,0.08)' }}>
                <div style={{ position: 'relative' }}>
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={listening ? 'Listening… just talk' : 'Type or tap the mic to speak…'}
                    rows={3}
                    style={{
                      width: '100%', resize: 'vertical', minHeight: 74, padding: '12px 14px', borderRadius: 12,
                      backgroundColor: '#0a1e1b', border: `1px solid ${listening ? SAGE : 'rgba(245,240,232,0.15)'}`,
                      color: '#f5f0e8', fontSize: 14, lineHeight: 1.5, outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  {listening && (
                    <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 10, fontWeight: 700, color: SAGE, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: SAGE, animation: 'pulse 1s ease-in-out infinite' }} /> REC
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  {sttSupported && (
                    <button
                      onClick={toggleMic}
                      title={listening ? 'Stop dictation' : 'Dictate with your voice'}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
                        border: `1px solid ${listening ? SAGE : 'rgba(245,240,232,0.2)'}`, fontSize: 13, fontWeight: 600,
                        backgroundColor: listening ? `${SAGE}22` : 'transparent', color: listening ? SAGE : 'rgba(245,240,232,0.8)',
                      }}
                    >
                      {listening ? <MicOff size={15} /> : <Mic size={15} />} {listening ? 'Stop' : 'Speak'}
                    </button>
                  )}
                  {/* AI Tidy button */}
                  <button
                    onClick={async () => {
                      if (!draft.trim()) return
                      setCleanup(null)
                      setCleanupLoading(true)
                      try { setCleanup(await cleanupBrainDump(draft)) } catch { /* noop */ } finally { setCleanupLoading(false) }
                    }}
                    disabled={cleanupLoading || !draft.trim()}
                    title="AI: tidy this thought and pull out action items"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 13px', borderRadius: 10, cursor: cleanupLoading || !draft.trim() ? 'not-allowed' : 'pointer', border: `1px solid ${ACCENT}55`, fontSize: 13, fontWeight: 600, backgroundColor: `${ACCENT}15`, color: cleanupLoading || !draft.trim() ? 'rgba(245,240,232,0.3)' : ACCENT }}
                  >
                    {cleanupLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Wand2 size={14} />} Tidy
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!draft.trim() || saving}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 14px', borderRadius: 10,
                      border: 'none', cursor: draft.trim() && !saving ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700,
                      backgroundColor: draft.trim() && !saving ? ACCENT : 'rgba(245,240,232,0.1)',
                      color: draft.trim() && !saving ? '#0d2420' : 'rgba(245,240,232,0.4)',
                    }}
                  >
                    {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />} Save thought
                  </button>
                </div>
                {!sttSupported && (
                  <p style={{ fontSize: 10.5, color: 'rgba(245,240,232,0.4)', marginTop: 8 }}>Voice dictation isn&apos;t supported in this browser — try Chrome or your Android phone.</p>
                )}

                {/* AI cleanup result panel */}
                <AnimatePresence>
                  {cleanup && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden', marginTop: 10, borderRadius: 12, border: `1px solid ${ACCENT}44`, backgroundColor: '#0e2822' }}>
                      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: ACCENT }}>Tidied thought</span>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button onClick={() => { setDraft(cleanup.tidy); setCleanup(null) }} style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 50, color: '#0d2420', backgroundColor: ACCENT, border: 'none', cursor: 'pointer' }}>Use this</button>
                            <button onClick={() => setCleanup(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.5)', display: 'flex' }}><X size={13} /></button>
                          </div>
                        </div>
                        <p style={{ fontSize: 13, lineHeight: 1.6, color: '#f5f0e8', margin: 0 }}>{cleanup.tidy}</p>
                        {cleanup.bullets.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.45)', margin: 0 }}>Key points</p>
                            {cleanup.bullets.map((b, i) => <p key={i} style={{ fontSize: 12, color: 'rgba(245,240,232,0.8)', margin: 0, paddingLeft: 10, borderLeft: `2px solid ${ACCENT}55` }}>{b}</p>)}
                          </div>
                        )}
                        {cleanup.actions.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.45)', margin: 0 }}>Action items</p>
                            {cleanup.actions.map((a, i) => <p key={i} style={{ fontSize: 12, color: '#c8e6c9', margin: 0, paddingLeft: 10, borderLeft: '2px solid #5a9e84' }}>{a}</p>)}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Notes list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 20px' }}>
                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <Loader2 size={22} color={ACCENT} style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : notes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(245,240,232,0.4)' }}>
                    <Brain size={30} style={{ opacity: 0.4, marginBottom: 10 }} />
                    <p style={{ fontSize: 13 }}>No thoughts captured yet. Empty your head here whenever something pops up.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {notes.map((note) => (
                      <motion.div
                        key={note.id}
                        layout
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        style={{
                          padding: '12px 14px', borderRadius: 12, backgroundColor: '#0a1e1b',
                          border: `1px solid ${note.pinned ? `${ACCENT}55` : 'rgba(245,240,232,0.08)'}`,
                        }}
                      >
                        {editingId === note.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <textarea
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) { e.preventDefault(); saveEdit(note.id) }
                                if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
                              }}
                              autoFocus
                              rows={3}
                              style={{ width: '100%', resize: 'vertical', minHeight: 64, padding: '10px 12px', borderRadius: 10, backgroundColor: '#0d2420', border: `1px solid ${SAGE}`, color: '#f5f0e8', fontSize: 14, lineHeight: 1.5, outline: 'none', fontFamily: 'inherit' }}
                            />
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button onClick={cancelEdit} style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(245,240,232,0.2)', background: 'none', color: 'rgba(245,240,232,0.7)', cursor: 'pointer' }}>Cancel</button>
                              <button onClick={() => saveEdit(note.id)} disabled={!editDraft.trim()} style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: 'none', backgroundColor: editDraft.trim() ? ACCENT : 'rgba(245,240,232,0.1)', color: editDraft.trim() ? '#0d2420' : 'rgba(245,240,232,0.4)', cursor: editDraft.trim() ? 'pointer' : 'not-allowed' }}>Save</button>
                            </div>
                          </div>
                        ) : (
                          <>
                        <p style={{ fontSize: 14, lineHeight: 1.55, margin: '0 0 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{note.body}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 10.5, color: 'rgba(245,240,232,0.4)' }}>
                            {new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {new Date(note.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {ttsSupported && (
                              <IconBtn onClick={() => readNote(note)} title="Read aloud" active={speakingId === note.id && speaking}>
                                {speakingId === note.id && speaking ? <Square size={14} /> : <Volume2 size={14} />}
                              </IconBtn>
                            )}
                            <IconBtn onClick={() => startEdit(note)} title="Edit">
                              <Pencil size={14} />
                            </IconBtn>
                            <IconBtn onClick={() => emailNote(note.body)} title={`Email to ${settings.memEmail.trim() || 'save@mem.ai'}`}>
                              <Mail size={14} />
                            </IconBtn>
                            <IconBtn onClick={() => whatsAppNote(note.body)} title="Send via WhatsApp">
                              <MessageCircle size={14} />
                            </IconBtn>
                            <IconBtn onClick={() => copyNote(note)} title="Copy">
                              {copiedId === note.id ? <Check size={14} color={SAGE} /> : <Copy size={14} />}
                            </IconBtn>
                            <IconBtn onClick={() => handlePin(note)} title={note.pinned ? 'Unpin' : 'Pin'} active={note.pinned}>
                              {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                            </IconBtn>
                            <IconBtn onClick={() => handleDelete(note.id)} title="Delete" danger>
                              <Trash2 size={14} />
                            </IconBtn>
                          </div>
                        </div>
                          </>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Email-out to mem.ai settings */}
              <div style={{ borderTop: '1px solid rgba(245,240,232,0.08)' }}>
                <button
                  onClick={() => setShowSettings((s) => !s)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.7)', fontSize: 12.5, fontWeight: 600 }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={14} color={ACCENT} /> Where thoughts are sent {settingsSaved && <Check size={13} color={SAGE} />}</span>
                  <ChevronDown size={16} style={{ transform: showSettings ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.5)', margin: 0, lineHeight: 1.5 }}>
                          The mail icon opens your email app with the thought ready to send. Keep it as save@mem.ai to file into mem, or change it to send to anyone. The WhatsApp icon lets you share a thought to any chat.
                        </p>

                        <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(245,240,232,0.7)' }}>
                          Email the mail icon sends to
                          <input
                            value={settings.memEmail}
                            onChange={(e) => setSettings((s) => ({ ...s, memEmail: e.target.value }))}
                            onBlur={() => persistSettings(settings)}
                            placeholder="save@mem.ai"
                            style={{ width: '100%', marginTop: 5, padding: '9px 12px', borderRadius: 10, backgroundColor: '#0a1e1b', border: '1px solid rgba(245,240,232,0.15)', color: '#f5f0e8', fontSize: 12.5, outline: 'none' }}
                          />
                        </label>

                        <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(245,240,232,0.7)' }}>
                          Also copy to my email (optional)
                          <input
                            value={settings.emailTo}
                            onChange={(e) => setSettings((s) => ({ ...s, emailTo: e.target.value }))}
                            onBlur={() => persistSettings(settings)}
                            placeholder="you@example.com"
                            style={{ width: '100%', marginTop: 5, padding: '9px 12px', borderRadius: 10, backgroundColor: '#0a1e1b', border: '1px solid rgba(245,240,232,0.15)', color: '#f5f0e8', fontSize: 12.5, outline: 'none' }}
                          />
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 12, color: 'rgba(245,240,232,0.85)' }}>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={settings.autoEmail}
                            onClick={() => persistSettings({ ...settings, autoEmail: !settings.autoEmail })}
                            style={{ position: 'relative', width: 40, height: 22, borderRadius: 50, border: 'none', cursor: 'pointer', flexShrink: 0, backgroundColor: settings.autoEmail ? SAGE : 'rgba(245,240,232,0.2)', transition: 'background-color 0.2s' }}
                          >
                            <span style={{ position: 'absolute', top: 2, left: settings.autoEmail ? 20 : 2, width: 18, height: 18, borderRadius: '50%', backgroundColor: '#0d2420', transition: 'left 0.2s' }} />
                          </button>
                          Open email automatically each time I save
                        </label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  )
}

function IconBtn({ children, onClick, title, active, danger }: { children: React.ReactNode; onClick: () => void; title: string; active?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: active ? 'rgba(201,168,76,0.18)' : 'transparent',
        color: danger ? '#c85a40' : active ? '#c9a84c' : 'rgba(245,240,232,0.6)',
      }}
    >
      {children}
    </button>
  )
}
