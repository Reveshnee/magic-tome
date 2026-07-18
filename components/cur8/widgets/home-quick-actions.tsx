'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PenLine, Mic, MicOff, Send, Trash2, Mail, MessageCircle, X, Lightbulb, Headphones } from 'lucide-react'
import { useDictation } from '@/hooks/use-speech'
import { getReflections, createReflection, deleteReflection, type ReflectionDTO } from '@/app/actions/cur8'
import { getSettings, type Cur8Settings } from '@/app/actions/notes'

// The "general haven" for homepage reflections
const HOME_CATEGORY = 'General'
const ACCENT = '#c9a84c'

const PROMPTS = [
  'What is on your mind right now?',
  'One thing you want to remember today?',
  'A thought worth capturing before it slips away…',
  'What are you noticing lately?',
]

export default function HomeQuickActions() {
  const [reflectOpen, setReflectOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [reflections, setReflections] = useState<ReflectionDTO[]>([])
  const [loadingReflections, setLoadingReflections] = useState(false)
  const [settings, setSettings] = useState<Cur8Settings | null>(null)
  const baseRef = { current: '' }
  const { start, stop, listening, supported: micSupported } = useDictation((text) => {
    setDraft((baseRef.current ? baseRef.current + ' ' : '') + text)
  })

  const prompt = PROMPTS[reflections.length % PROMPTS.length]

  useEffect(() => {
    if (reflectOpen && !settings) getSettings().then(setSettings).catch(() => {})
    if (reflectOpen && reflections.length === 0 && !loadingReflections) {
      setLoadingReflections(true)
      getReflections(HOME_CATEGORY).then(setReflections).catch(() => {}).finally(() => setLoadingReflections(false))
    }
  }, [reflectOpen])

  function emailReflection(body: string) {
    const to = (settings?.memEmail || 'save@mem.ai').trim()
    const cc = (settings?.emailTo || '').trim()
    const subject = encodeURIComponent(`Cur8 reflection · ${HOME_CATEGORY}`)
    const fullBody = encodeURIComponent(`${body}\n\n— Reflection from ${HOME_CATEGORY} (Cur8)`)
    const parts = [`subject=${subject}`, `body=${fullBody}`]
    if (cc) parts.push(`cc=${encodeURIComponent(cc)}`)
    window.location.href = `mailto:${to}?${parts.join('&')}`
  }

  function whatsAppReflection(body: string) {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${body}\n\n— Reflection from ${HOME_CATEGORY} (Cur8)`)}`,
      '_blank', 'noopener'
    )
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
    const created = await createReflection(HOME_CATEGORY, body).catch(() => null)
    if (settings?.autoEmail) emailReflection(body)
    if (created) setReflections((prev) => [created, ...prev])
    setDraft('')
    baseRef.current = ''
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await deleteReflection(id).catch(() => {})
    setReflections((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <>
      {/* ── Three action buttons in a row ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>

        {/* Brain Dump trigger — opens the global BrainDump panel via custom event */}
        <motion.button
          onClick={() => window.dispatchEvent(new Event('cur8:openBrainDump'))}
          whileTap={{ scale: 0.95 }}
          style={{
            flex: 1, minWidth: 120,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px 18px', borderRadius: 16, cursor: 'pointer',
            backgroundColor: 'rgba(200,90,64,0.15)', border: '1px solid rgba(200,90,64,0.3)',
            color: '#f5f0e8', fontSize: 13, fontWeight: 700,
          }}
        >
          <PenLine size={15} color="#c85a40" />
          Brain Dump
        </motion.button>

        {/* Reflect trigger */}
        <motion.button
          onClick={() => setReflectOpen(true)}
          whileTap={{ scale: 0.95 }}
          style={{
            flex: 1, minWidth: 120,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px 18px', borderRadius: 16, cursor: 'pointer',
            backgroundColor: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)',
            color: '#f5f0e8', fontSize: 13, fontWeight: 700,
          }}
        >
          <Lightbulb size={15} color={ACCENT} />
          Reflect
        </motion.button>

        {/* Focus Sounds trigger — opens the global FocusSoundPlayer panel via custom event */}
        <motion.button
          onClick={() => window.dispatchEvent(new Event('cur8:openFocusSounds'))}
          whileTap={{ scale: 0.95 }}
          style={{
            flex: 1, minWidth: 120,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px 18px', borderRadius: 16, cursor: 'pointer',
            backgroundColor: 'rgba(90,158,132,0.1)', border: '1px solid rgba(90,158,132,0.25)',
            color: '#f5f0e8', fontSize: 13, fontWeight: 700,
          }}
        >
          <Headphones size={15} color="#5a9e84" />
          Focus Sounds
        </motion.button>
      </div>

      {/* ── Reflect slide-in panel ── */}
      <AnimatePresence>
        {reflectOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setReflectOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 120, backgroundColor: 'rgba(6,18,16,0.6)', backdropFilter: 'blur(3px)' }}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              role="dialog" aria-label="Reflections"
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 121, width: 'min(440px, 92vw)', display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 18px', overflowY: 'auto', backgroundColor: '#0a1e1b', borderLeft: '1px solid rgba(245,240,232,0.1)', boxShadow: '-8px 0 40px rgba(0,0,0,0.5)' }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: `${ACCENT}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Lightbulb size={16} color={ACCENT} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 18, fontWeight: 700, color: '#f5f0e8', margin: 0, lineHeight: 1.1 }}>Reflections</h3>
                  <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.5)', margin: 0 }}>General thoughts</p>
                </div>
                <button onClick={() => setReflectOpen(false)} aria-label="Close reflections" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.5)', padding: 4 }}>
                  <X size={18} />
                </button>
              </div>

              {/* Prompt hint */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                <Lightbulb size={13} color={ACCENT} style={{ flexShrink: 0 }} />
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
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 50, border: 'none', cursor: draft.trim() && !saving ? 'pointer' : 'default', fontSize: 12, fontWeight: 700, backgroundColor: draft.trim() && !saving ? ACCENT : 'rgba(245,240,232,0.1)', color: draft.trim() && !saving ? '#0d2420' : 'rgba(245,240,232,0.4)' }}
                  >
                    <Send size={12} /> Save
                  </button>
                </div>
              </div>

              {/* Reflection list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <AnimatePresence initial={false}>
                  {reflections.map((r) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ position: 'relative', padding: '12px 14px', borderRadius: 12, backgroundColor: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.08)', borderLeft: `3px solid ${ACCENT}` }}
                    >
                      <p style={{ fontSize: 13, color: '#f5f0e8', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap', paddingRight: 68 }}>{r.body}</p>
                      <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.4)', marginTop: 6, display: 'block' }}>
                        {new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4 }}>
                        <button onClick={() => emailReflection(r.body)} title="Send by email" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.35)', padding: 2 }}>
                          <Mail size={13} />
                        </button>
                        <button onClick={() => whatsAppReflection(r.body)} title="Share via WhatsApp" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.35)', padding: 2 }}>
                          <MessageCircle size={13} />
                        </button>
                        <button onClick={() => handleDelete(r.id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.35)', padding: 2 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {reflections.length === 0 && !loadingReflections && (
                  <p style={{ fontSize: 12, color: 'rgba(245,240,232,0.4)', textAlign: 'center', padding: '8px 0', margin: 0 }}>
                    No reflections yet — jot your first thought above.
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
