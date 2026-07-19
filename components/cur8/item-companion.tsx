'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Loader2, X, Copy, Check, Save, MessageSquare, StickyNote, Sparkles, Trash2 } from 'lucide-react'
import { createNote } from '@/app/actions/notes'
import { createReflection, updateItem, saveDiscussion, getDiscussions, deleteDiscussion, type DiscussionDTO, type DiscussionMessage } from '@/app/actions/cur8'
import { copyToClipboard } from '@/lib/cur8-share'

const CREAM = '#f5f0e8'
const GOLD = '#e0a648'
const CORAL = '#d96b52'
const PANEL_BG = '#0b2b28'

type ChatMessage = DiscussionMessage

interface ItemCompanionProps {
  itemId: string
  itemTitle: string
  category: string
  /** current saved note/description for the item */
  initialNote: string
  accent: string
  onClose: () => void
  /** called after the note is saved so the parent can update its copy */
  onNoteSaved?: (note: string) => void
}

type Tab = 'notes' | 'ask'

export function ItemCompanion({ itemId, itemTitle, category, initialNote, accent, onClose, onNoteSaved }: ItemCompanionProps) {
  const [tab, setTab] = useState<Tab>('ask')

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 40,
        display: 'flex', flexDirection: 'column',
        backgroundColor: PANEL_BG, borderLeft: `1px solid ${CREAM}14`,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: `1px solid ${CREAM}12`, flexShrink: 0 }}>
        <Sparkles size={15} style={{ color: accent }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: `${CREAM}55` }}>Companion</p>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: CREAM, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{itemTitle}</p>
        </div>
        <button onClick={onClose} title="Close companion" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600, color: `${CREAM}99`, backgroundColor: `${CREAM}0d`, border: 'none', cursor: 'pointer' }}>
          <X size={13} /> Close
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: `1px solid ${CREAM}0d`, flexShrink: 0 }}>
        <TabButton active={tab === 'ask'} onClick={() => setTab('ask')} icon={<MessageSquare size={13} />} label="Ask AI" accent={accent} />
        <TabButton active={tab === 'notes'} onClick={() => setTab('notes')} icon={<StickyNote size={13} />} label="Notes" accent={accent} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {tab === 'ask' ? (
          <AskTab itemId={itemId} itemTitle={itemTitle} category={category} accent={accent} />
        ) : (
          <NotesTab itemId={itemId} initialNote={initialNote} accent={accent} onNoteSaved={onNoteSaved} />
        )}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon, label, accent }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; accent: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 50,
        fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
        backgroundColor: active ? accent : `${CREAM}0a`,
        color: active ? '#0d2420' : `${CREAM}99`,
      }}
    >
      {icon} {label}
    </button>
  )
}

// ─────────────────────────── Notes tab ───────────────────────────
function NotesTab({ itemId, initialNote, accent, onNoteSaved }: { itemId: string; initialNote: string; accent: string; onNoteSaved?: (note: string) => void }) {
  const [note, setNote] = useState(initialNote)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  // Keep in sync if the parent switches items while the panel is open.
  useEffect(() => { setNote(initialNote) }, [initialNote, itemId])

  async function save() {
    setSaving(true)
    try {
      await updateItem(itemId, { description: note })
      onNoteSaved?.(note)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1800)
    } catch {
      // ignore — user can retry
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, height: '100%' }}>
      <p style={{ margin: 0, fontSize: 11.5, color: `${CREAM}66`, lineHeight: 1.5 }}>
        Jot notes while you watch or read. They save straight to this item — the panel stays open so nothing interrupts you.
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Your notes, key takeaways, quotes, timestamps…"
        style={{ flex: 1, minHeight: 220, width: '100%', resize: 'none', padding: '12px 14px', borderRadius: 12, backgroundColor: '#0d2420', border: `1px solid ${CREAM}18`, color: CREAM, fontSize: 14, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit' }}
      />
      <button
        onClick={save}
        disabled={saving}
        style={{ alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 50, fontSize: 13, fontWeight: 700, border: 'none', cursor: saving ? 'default' : 'pointer', backgroundColor: savedFlash ? '#4ba36a' : accent, color: '#0d2420' }}
      >
        {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : savedFlash ? <Check size={14} /> : <Save size={14} />}
        {savedFlash ? 'Saved' : 'Save note'}
      </button>
    </div>
  )
}

// ─────────────────────────── Ask tab ───────────────────────────
function AskTab({ itemId, itemTitle, category, accent }: { itemId: string; itemTitle: string; category: string; accent: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const [discussionId, setDiscussionId] = useState<string | null>(null)
  const [history, setHistory] = useState<DiscussionDTO[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [saveMenuFor, setSaveMenuFor] = useState<number | 'all' | null>(null)
  const [saveFlash, setSaveFlash] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // Load any past discussions for this item so history persists across sessions.
  useEffect(() => {
    let alive = true
    getDiscussions({ itemId }).then((d) => { if (alive) setHistory(d) }).catch(() => {})
    return () => { alive = false }
  }, [itemId])

  const STARTERS = [
    'Give me the key takeaways from this.',
    'What are the main ideas here?',
    'How does this connect to my other saves?',
  ]

  async function persist(msgs: ChatMessage[]) {
    try {
      const saved = await saveDiscussion({ id: discussionId, itemId, category, messages: msgs })
      if (saved) {
        setDiscussionId(saved.id)
        // refresh history list (put newest first, replacing any existing entry)
        setHistory((prev) => {
          const others = prev.filter((d) => d.id !== saved.id)
          return [saved, ...others]
        })
      }
    } catch {
      // non-fatal — the conversation stays on screen regardless
    }
  }

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || streaming) return
    setInput('')
    setError('')
    const userMessage: ChatMessage = { role: 'user', content: msg }
    const base = [...messages, userMessage]
    setMessages([...base, { role: 'assistant', content: '' }])
    setStreaming(true)

    abortRef.current = new AbortController()
    try {
      const res = await fetch('/api/cur8/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: messages, focusItemId: itemId }),
        signal: abortRef.current.signal,
      })
      if (!res.ok || !res.body) throw new Error('Could not reach AI')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: full }
          return updated
        })
      }
      // Auto-save the full exchange so nothing is ever lost.
      const finalMsgs: ChatMessage[] = [...base, { role: 'assistant', content: full }]
      await persist(finalMsgs)
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') {
        setError('Something went wrong. Try again.')
        setMessages((prev) => prev.slice(0, -1))
      }
    } finally {
      setStreaming(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && (e as unknown as { keyCode: number }).keyCode !== 229) {
      e.preventDefault()
      send()
    }
  }

  function newConversation() {
    setMessages([])
    setDiscussionId(null)
    setError('')
    setShowHistory(false)
  }

  function openPast(d: DiscussionDTO) {
    setMessages(d.messages)
    setDiscussionId(d.id)
    setShowHistory(false)
  }

  async function removePast(id: string) {
    await deleteDiscussion(id).catch(() => {})
    setHistory((prev) => prev.filter((d) => d.id !== id))
    if (discussionId === id) newConversation()
  }

  async function copyOne(idx: number) {
    const ok = await copyToClipboard(messages[idx].content)
    if (ok) { setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 1600) }
  }

  async function copyAll() {
    const text = messages.map((m) => `${m.role === 'user' ? 'You' : 'Cur8'}: ${m.content}`).join('\n\n')
    const ok = await copyToClipboard(text)
    if (ok) { setCopiedAll(true); setTimeout(() => setCopiedAll(false), 1600) }
  }

  function transcriptFor(target: number | 'all'): string {
    if (target === 'all') {
      return `About "${itemTitle}"\n\n` + messages.map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${m.content}`).join('\n\n')
    }
    // A single answer, prefixed by the question that prompted it if available.
    const q = target > 0 && messages[target - 1]?.role === 'user' ? `Q: ${messages[target - 1].content}\n\n` : ''
    return `About "${itemTitle}"\n\n${q}A: ${messages[target].content}`
  }

  async function saveTo(target: number | 'all', dest: 'braindump' | 'reflection') {
    const body = transcriptFor(target)
    try {
      if (dest === 'braindump') await createNote(body)
      else await createReflection(category, body)
      setSaveFlash(dest === 'braindump' ? 'Saved to brain dump' : 'Saved to reflections')
    } catch {
      setSaveFlash('Could not save — try again')
    } finally {
      setSaveMenuFor(null)
      setTimeout(() => setSaveFlash(''), 2200)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Toolbar: history + new + copy all */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderBottom: `1px solid ${CREAM}0a`, flexShrink: 0 }}>
        <button onClick={() => setShowHistory((s) => !s)} style={miniBtn(showHistory ? accent : `${CREAM}0d`, showHistory ? '#0d2420' : `${CREAM}99`)}>
          History{history.length > 0 ? ` · ${history.length}` : ''}
        </button>
        <button onClick={newConversation} style={miniBtn(`${CREAM}0d`, `${CREAM}99`)}>New</button>
        <div style={{ flex: 1 }} />
        {messages.length > 0 && (
          <button onClick={copyAll} style={miniBtn(`${CREAM}0d`, `${CREAM}99`)}>
            {copiedAll ? <Check size={11} /> : <Copy size={11} />} Copy all
          </button>
        )}
        {messages.length > 0 && (
          <button onClick={() => setSaveMenuFor(saveMenuFor === 'all' ? null : 'all')} style={miniBtn(`${CREAM}0d`, `${CREAM}99`)}>
            <Save size={11} /> Share
          </button>
        )}
      </div>

      {saveFlash && (
        <div style={{ padding: '7px 12px', fontSize: 11.5, color: accent, backgroundColor: `${accent}12`, flexShrink: 0 }}>{saveFlash}</div>
      )}

      {/* Save-all destination menu */}
      {saveMenuFor === 'all' && (
        <SaveMenu accent={accent} onPick={(dest) => saveTo('all', dest)} onClose={() => setSaveMenuFor(null)} />
      )}

      {/* History drawer */}
      {showHistory ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${CREAM}55` }}>Past conversations</p>
          {history.length === 0 ? (
            <p style={{ fontSize: 12.5, color: `${CREAM}55`, fontStyle: 'italic' }}>No saved conversations for this item yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map((d) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, backgroundColor: `${CREAM}07`, border: `1px solid ${CREAM}10` }}>
                  <button onClick={() => openPast(d)} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: CREAM }}>
                    <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10.5, color: `${CREAM}50` }}>{d.messages.length} messages · {new Date(d.updatedAt).toLocaleDateString()}</p>
                  </button>
                  <button onClick={() => removePast(d.id)} title="Delete" style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: `${CREAM}55`, padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Conversation */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 ? (
              <div>
                <p style={{ margin: '0 0 10px', fontSize: 12.5, color: `${CREAM}77`, lineHeight: 1.6 }}>
                  Ask me anything about <strong style={{ color: CREAM }}>{itemTitle}</strong>. I&apos;ve read its full content.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {STARTERS.map((s) => (
                    <button key={s} onClick={() => send(s)} style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 10, fontSize: 12, color: `${CREAM}AA`, backgroundColor: `${CREAM}07`, border: `1px solid ${CREAM}12`, cursor: 'pointer', lineHeight: 1.5 }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 4 }}>
                  <div style={{
                    maxWidth: '90%', padding: '9px 13px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    backgroundColor: m.role === 'user' ? `${GOLD}22` : `${CREAM}08`,
                    border: `1px solid ${m.role === 'user' ? `${GOLD}33` : `${CREAM}12`}`,
                    fontSize: 13, lineHeight: 1.65, color: m.role === 'user' ? CREAM : `${CREAM}DD`, whiteSpace: 'pre-wrap',
                  }}>
                    {m.content}
                    {m.role === 'assistant' && m.content === '' && streaming && (
                      <Loader2 size={12} style={{ color: accent, animation: 'spin 1s linear infinite', display: 'inline-block', marginLeft: 4 }} />
                    )}
                  </div>
                  {/* Per-answer actions */}
                  {m.role === 'assistant' && m.content !== '' && (
                    <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
                      <button onClick={() => copyOne(i)} style={answerBtn}>
                        {copiedIdx === i ? <Check size={11} /> : <Copy size={11} />} {copiedIdx === i ? 'Copied' : 'Copy'}
                      </button>
                      <button onClick={() => setSaveMenuFor(saveMenuFor === i ? null : i)} style={answerBtn}>
                        <Save size={11} /> Save to…
                      </button>
                      {saveMenuFor === i && (
                        <SaveMenu accent={accent} inline onPick={(dest) => saveTo(i, dest)} onClose={() => setSaveMenuFor(null)} />
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {error && <p style={{ margin: '0 12px 8px', fontSize: 11.5, color: CORAL }}>{error}</p>}

          {/* Input */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', padding: 12, borderTop: `1px solid ${CREAM}0d`, flexShrink: 0 }}>
            <textarea
              value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Ask about this item…" rows={1}
              style={{ flex: 1, padding: '9px 12px', borderRadius: 12, fontSize: 13, backgroundColor: `${CREAM}08`, border: `1px solid ${CREAM}18`, color: CREAM, resize: 'none', outline: 'none', lineHeight: 1.5, fontFamily: 'inherit', maxHeight: 120 }}
            />
            <button onClick={() => send()} disabled={!input.trim() || streaming}
              style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', border: 'none', backgroundColor: !input.trim() || streaming ? `${accent}44` : accent, color: !input.trim() || streaming ? `${CREAM}44` : '#0d2420', cursor: !input.trim() || streaming ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {streaming ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function SaveMenu({ accent, onPick, onClose, inline }: { accent: string; onPick: (dest: 'braindump' | 'reflection') => void; onClose: () => void; inline?: boolean }) {
  return (
    <>
      {/* click-away backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
      <div style={{
        position: 'absolute', zIndex: 50,
        // Per-answer menus open UPWARD so they are never clipped by the panel bottom.
        // The whole-chat "Share" menu opens downward from the toolbar (top: 36).
        ...(inline ? { bottom: 28, left: 0 } : { top: 36, right: 0 }),
        backgroundColor: '#123c37', border: `1px solid ${CREAM}1a`, borderRadius: 12, padding: 6, minWidth: 188,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        <p style={{ margin: '4px 8px 6px', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${CREAM}55` }}>
          {inline ? 'Save this answer to' : 'Share whole chat to'}
        </p>
        <button onClick={() => onPick('braindump')} style={saveRow(accent)}>Brain dump</button>
        <button onClick={() => onPick('reflection')} style={saveRow(accent)}>Reflections</button>
      </div>
    </>
  )
}

const miniBtn = (bg: string, color: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 50,
  fontSize: 10.5, fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: bg, color, whiteSpace: 'nowrap',
})

const answerBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 50,
  fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: `${CREAM}0a`, color: `${CREAM}77`,
}

const saveRow = (accent: string): React.CSSProperties => ({
  textAlign: 'left', padding: '8px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 500,
  border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: CREAM,
})
