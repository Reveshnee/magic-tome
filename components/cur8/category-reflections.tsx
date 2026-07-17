'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PenLine, Mic, MicOff, Send, Trash2, Lightbulb } from 'lucide-react'
import { useDictation } from '@/hooks/use-speech'
import type { ReflectionDTO } from '@/app/actions/cur8'

interface Props {
  categoryLabel: string
  accent: string
  reflections: ReflectionDTO[]
  onAdd: (body: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

// Rotating prompts to spark a reflection for this specific garden
const PROMPTS = [
  'What stood out from what you saved here?',
  'One idea worth acting on this week?',
  'What theme keeps showing up in this garden?',
  'Note a thought before it slips away…',
]

export default function CategoryReflections({ categoryLabel, accent, reflections, onAdd, onDelete }: Props) {
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const baseRef = useRef('')
  const { start, stop, listening, supported: micSupported } = useDictation((text) => {
    setDraft((baseRef.current ? baseRef.current + ' ' : '') + text)
  })

  const prompt = PROMPTS[reflections.length % PROMPTS.length]

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
    setDraft('')
    baseRef.current = ''
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 560, margin: '0 auto', padding: '8px 4px' }}>
      {/* Heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PenLine size={16} color={accent} />
        </div>
        <div>
          <h3 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 18, fontWeight: 700, color: '#f5f0e8', margin: 0, lineHeight: 1.1 }}>Reflections</h3>
          <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.5)', margin: 0 }}>Thoughts tied to {categoryLabel}</p>
        </div>
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
              <p style={{ fontSize: 13, color: '#f5f0e8', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap', paddingRight: 22 }}>{r.body}</p>
              <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.4)', marginTop: 6, display: 'block' }}>
                {new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
              <button
                onClick={() => onDelete(r.id)}
                title="Delete reflection"
                style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.35)', padding: 2 }}
              >
                <Trash2 size={13} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {reflections.length === 0 && (
          <p style={{ fontSize: 12, color: 'rgba(245,240,232,0.4)', textAlign: 'center', padding: '8px 0', margin: 0 }}>
            No reflections yet — jot the first thought about this garden above.
          </p>
        )}
      </div>
    </div>
  )
}
