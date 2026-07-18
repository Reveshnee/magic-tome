'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PenLine, Mic, MicOff, Send, Trash2, Lightbulb, X, Mail, MessageCircle, Pencil } from 'lucide-react'
import { useDictation } from '@/hooks/use-speech'
import type { ReflectionDTO } from '@/app/actions/cur8'
import { getSettings, type Cur8Settings } from '@/app/actions/notes'

interface Props {
  open: boolean
  onClose: () => void
  categoryLabel: string
  accent: string
  reflections: ReflectionDTO[]
  onAdd: (body: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onEdit: (id: string, body: string) => Promise<void>
}

// Rotating prompts to spark a reflection for this specific garden
const PROMPTS = [
  'What stood out from what you saved here?',
  'One idea worth acting on this week?',
  'What theme keeps showing up in this garden?',
  'Note a thought before it slips away…',
]

export default function CategoryReflections({ open, onClose, categoryLabel, accent, reflections, onAdd, onDelete, onEdit }: Props) {
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Cur8Settings | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const baseRef = useRef('')

  async function saveEdit(id: string) {
    const body = editDraft.trim()
    if (!body) return
    setEditingId(null)
    await onEdit(id, body).catch(() => {})
  }
  const { start, stop, listening, supported: micSupported } = useDictation((text) => {
    setDraft((baseRef.current ? baseRef.current + ' ' : '') + text)
  })

  const prompt = PROMPTS[reflections.length % PROMPTS.length]

  // Load the shared mem.ai email settings the first time the drawer opens
  useEffect(() => {
    if (open && !settings) getSettings().then(setSettings).catch(() => {})
  }, [open, settings])

  // Open the user's own email app pre-addressed to mem.ai, tagging the garden
  // so filed reflections stay grouped by area.
  // IMPORTANT: build the query with encodeURIComponent (spaces → %20), NOT
  // URLSearchParams (spaces → "+"), which desktop Chrome renders literally.
  function emailReflection(body: string) {
    const to = (settings?.memEmail || 'save@mem.ai').trim()
    const cc = (settings?.emailTo || '').trim()
    const subject = encodeURIComponent(`Cur8 reflection · ${categoryLabel}`)
    const fullBody = encodeURIComponent(`${body}\n\n— Reflection from ${categoryLabel} (Cur8)`)
    const parts = [`subject=${subject}`, `body=${fullBody}`]
    if (cc) parts.push(`cc=${encodeURIComponent(cc)}`)
    window.location.href = `mailto:${to}?${parts.join('&')}`
  }

  // Open WhatsApp with the reflection pre-filled; the user picks any contact.
  function whatsAppReflection(body: string) {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${body}\n\n— Reflection from ${categoryLabel} (Cur8)`)}`, '_blank', 'noopener')
  }

  function toggleMic() {
    if (listening) { stop(); return }
    baseRef.current = draft.trim()
    start()
  }

  async function submit() {
    const body = draft.trim()
    if (!body || saving) return
    setSaving(true)
    if (listening) stop()
    await onAdd(body).catch(() => {})
    if (settings?.autoEmail) emailReflection(body)
    setDraft('')
    baseRef.current = ''
    setSaving(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 120, backgroundColor: 'rgba(6,18,16,0.6)', backdropFilter: 'blur(3px)' }}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            role="dialog" aria-label={`Reflections for ${categoryLabel}`}
            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 121, width: 'min(440px, 92vw)', display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 18px', overflowY: 'auto', backgroundColor: '#0a1e1b', borderLeft: '1px solid rgba(245,240,232,0.1)', boxShadow: '-8px 0 40px rgba(0,0,0,0.5)' }}
          >
            {/* Heading */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <PenLine size={16} color={accent} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 18, fontWeight: 700, color: '#f5f0e8', margin: 0, lineHeight: 1.1 }}>Reflections</h3>
                <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.5)', margin: 0 }}>Thoughts tied to {categoryLabel}</p>
              </div>
              <button onClick={onClose} aria-label="Close reflections" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.5)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

      {/* Prompt hint */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
        <Lightbulb size={13} color="#c9a84c" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, color: 'rgba(245,240,232,0.75)', fontStyle: 'italic' }}>{prompt}</span>
      </div>

      {/* Composer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 14, backgroundColor: 'rgba(245,240,232,0.05)', border: '1px solid rgba(245,240,232,0.1)' }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing && e.keyCode !== 229) submit()
          }}
          placeholder="Capture a reflection or brainstorm…"
          rows={3}
          style={{ width: '100%', resize: 'none', background: 'none', border: 'none', outline: 'none', color: '#f5f0e8', fontSize: 13.5, lineHeight: 1.5, fontFamily: 'inherit' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {micSupported ? (
            <button
              onClick={toggleMic}
              title={listening ? 'Stop dictation' : 'Dictate'}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, backgroundColor: listening ? '#c85a40' : 'rgba(245,240,232,0.08)', color: listening ? '#fff' : 'rgba(245,240,232,0.7)' }}
            >
              {listening ? <MicOff size={13} /> : <Mic size={13} />}
              {listening ? 'Listening…' : 'Voice'}
            </button>
          ) : <span />}
          <button
            onClick={submit}
            disabled={!draft.trim() || saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 50, border: 'none', cursor: draft.trim() && !saving ? 'pointer' : 'default', fontSize: 12, fontWeight: 700, backgroundColor: draft.trim() && !saving ? accent : 'rgba(245,240,232,0.1)', color: draft.trim() && !saving ? '#fff' : 'rgba(245,240,232,0.4)' }}
          >
            <Send size={12} /> Save
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <AnimatePresence initial={false}>
          {reflections.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: -8 }}
              style={{ position: 'relative', padding: '12px 14px', borderRadius: 12, backgroundColor: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.08)', borderLeft: `3px solid ${accent}` }}
            >
              {editingId === r.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); saveEdit(r.id) }
                      if (e.key === 'Escape') { e.preventDefault(); setEditingId(null) }
                    }}
                    autoFocus
                    rows={3}
                    style={{ width: '100%', resize: 'vertical', minHeight: 60, padding: '8px 10px', borderRadius: 8, backgroundColor: '#0d2420', border: `1px solid ${accent}`, color: '#f5f0e8', fontSize: 13, lineHeight: 1.5, outline: 'none', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditingId(null)} style={{ fontSize: 11.5, fontWeight: 600, padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(245,240,232,0.2)', background: 'none', color: 'rgba(245,240,232,0.7)', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => saveEdit(r.id)} disabled={!editDraft.trim()} style={{ fontSize: 11.5, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: 'none', backgroundColor: editDraft.trim() ? accent : 'rgba(245,240,232,0.1)', color: editDraft.trim() ? '#fff' : 'rgba(245,240,232,0.4)', cursor: editDraft.trim() ? 'pointer' : 'not-allowed' }}>Save</button>
                  </div>
                </div>
              ) : (
                <>
              <p style={{ fontSize: 13, color: '#f5f0e8', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap', paddingRight: 68 }}>{r.body}</p>
              <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.4)', marginTop: 6, display: 'block' }}>
                {new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
              <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4 }}>
                <button
                  onClick={() => { setEditingId(r.id); setEditDraft(r.body) }}
                  title="Edit reflection"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.35)', padding: 2 }}
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => emailReflection(r.body)}
                  title="Send to mem.ai by email"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.35)', padding: 2 }}
                >
                  <Mail size={13} />
                </button>
                <button
                  onClick={() => whatsAppReflection(r.body)}
                  title="Share via WhatsApp"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.35)', padding: 2 }}
                >
                  <MessageCircle size={13} />
                </button>
                <button
                  onClick={() => onDelete(r.id)}
                  title="Delete reflection"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.35)', padding: 2 }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {reflections.length === 0 && (
          <p style={{ fontSize: 12, color: 'rgba(245,240,232,0.4)', textAlign: 'center', padding: '8px 0', margin: 0 }}>
            No reflections yet — jot the first thought about this garden above.
          </p>
        )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
