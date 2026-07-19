'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Brain, BookOpen, Loader2, RotateCcw, Zap,
  User, Send, MessageSquare, ExternalLink, MessagesSquare, Trash2, Copy, Check,
} from 'lucide-react'
import {
  discoverPatterns, generateWeeklyDigest, getMemories, updateMemory, discoverYou,
  type DiscoveryResult, type DigestResult, type YouResult,
} from '@/app/actions/ai-features'
import { getDiscussions, deleteDiscussion, type DiscussionDTO } from '@/app/actions/cur8'
import { copyToClipboard } from '@/lib/cur8-share'
import WordMap from '@/components/cur8/word-map'
import type { Cur8Item } from '@/lib/cur8-store'

const GOLD   = '#c9a84c'
const SAGE   = '#5a9e84'
const CORAL  = '#c85a40'
const BG     = '#0a1e1b'
const SURFACE = '#122e29'
const CREAM  = '#f5f0e8'

type Tab = 'discover' | 'digest' | 'memory' | 'you' | 'ask' | 'discussions'

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'discover',    label: 'Discover',    icon: Zap },
  { key: 'digest',      label: 'Digest',      icon: BookOpen },
  { key: 'memory',      label: 'Memory',      icon: Brain },
  { key: 'you',         label: 'You',         icon: User },
  { key: 'ask',         label: 'Ask',         icon: MessageSquare },
  { key: 'discussions', label: 'Discussions', icon: MessagesSquare },
]

// ─────────────────────────────────────────────────────────────────────────────

export default function AiHub({ items = [] }: { items?: Pick<Cur8Item, 'id' | 'title' | 'description'>[] }) {
  const [tab, setTab] = useState<Tab>('discover')

  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null)
  const [discoveryLoading, setDiscoveryLoading] = useState(false)

  const [digest, setDigest] = useState<DigestResult | null>(null)
  const [digestLoading, setDigestLoading] = useState(false)

  const [memories, setMemories] = useState<{ id: string; insight: string }[]>([])
  const [memoryLoading, setMemoryLoading] = useState(false)
  const [memoryRefreshing, setMemoryRefreshing] = useState(false)

  const [you, setYou] = useState<YouResult | null>(null)
  const [youLoading, setYouLoading] = useState(false)

  // Auto-load discover on first mount
  useEffect(() => {
    if (!discovery && !discoveryLoading) loadDiscovery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadDiscovery() {
    setDiscoveryLoading(true)
    try { setDiscovery(await discoverPatterns()) } catch { /* noop */ } finally { setDiscoveryLoading(false) }
  }
  async function loadDigest() {
    setDigestLoading(true)
    try { setDigest(await generateWeeklyDigest()) } catch { /* noop */ } finally { setDigestLoading(false) }
  }
  async function loadMemory() {
    setMemoryLoading(true)
    try { setMemories(await getMemories()) } catch { /* noop */ } finally { setMemoryLoading(false) }
  }
  async function refreshMemory() {
    setMemoryRefreshing(true)
    try { await updateMemory(); setMemories(await getMemories()) } catch { /* noop */ } finally { setMemoryRefreshing(false) }
  }
  async function loadYou() {
    setYouLoading(true)
    try { setYou(await discoverYou()) } catch { /* noop */ } finally { setYouLoading(false) }
  }

  function handleTab(t: Tab) {
    setTab(t)
    if (t === 'discover' && !discovery && !discoveryLoading) loadDiscovery()
    if (t === 'digest'   && !digest && !digestLoading) loadDigest()
    if (t === 'memory'   && memories.length === 0 && !memoryLoading) loadMemory()
    if (t === 'you'      && !you && !youLoading) loadYou()
  }

  return (
    <div style={{ borderRadius: 20, overflow: 'hidden', border: `1px solid ${GOLD}33`, backgroundColor: SURFACE }}>

      {/* ── Header ── */}
      <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={15} style={{ color: GOLD, flexShrink: 0 }} />
        <span style={{ fontWeight: 800, fontSize: 14, color: CREAM, letterSpacing: '-0.01em' }}>Know Yourself</span>
        <span style={{ fontSize: 11, color: `${CREAM}44`, fontStyle: 'italic', marginLeft: 2 }}>
          AI insights from your library
        </span>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: 0, marginTop: 14, borderBottom: `1px solid rgba(245,240,232,0.07)`, paddingLeft: 8, paddingRight: 8, overflowX: 'auto' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => handleTab(key)}
            style={{
              flex: 'none', display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11.5, fontWeight: tab === key ? 700 : 500,
              color: tab === key ? GOLD : `${CREAM}55`,
              borderBottom: tab === key ? `2px solid ${GOLD}` : '2px solid transparent',
              marginBottom: -1, whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}>
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* ── Tab body ── */}
      <AnimatePresence mode="wait">
        <motion.div key={tab}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          style={{ padding: '18px 20px 20px', minHeight: 140 }}>

          {tab === 'discover' && (
            discoveryLoading ? <Loader label="Looking across your havens..." /> :
            !discovery ? <EmptyState label="No patterns found yet." onRetry={loadDiscovery} /> :
            <DiscoverBody discovery={discovery} onRefresh={loadDiscovery} loading={discoveryLoading} />
          )}

          {tab === 'digest' && (
            digestLoading ? <Loader label="Writing your digest..." /> :
            !digest ? <EmptyState label="No digest yet." onRetry={loadDigest} /> :
            <DigestBody digest={digest} onRefresh={loadDigest} loading={digestLoading} />
          )}

          {tab === 'memory' && (
            memoryLoading ? <Loader label="Reading your patterns..." /> :
            <MemoryBody memories={memories} onRefresh={refreshMemory} loading={memoryRefreshing} />
          )}

          {tab === 'you' && (
            youLoading ? <Loader label="Building your profile..." /> :
            !you ? <EmptyState label="Build your interests profile." onRetry={loadYou} retryLabel="Build profile" /> :
            <YouBody you={you} onRefresh={loadYou} loading={youLoading} items={items} />
          )}

          {tab === 'ask' && <AskBody />}

          {tab === 'discussions' && <DiscussionsBody />}

        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── DISCOVER ────────────────────────────────────────────────────────────────

function DiscoverBody({ discovery, onRefresh, loading }: { discovery: DiscoveryResult; onRefresh: () => void; loading: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {discovery.themes.map((t, i) => (
        <div key={i} style={{ paddingLeft: 12, borderLeft: `3px solid ${GOLD}55` }}>
          <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: 13, color: CREAM }}>{t.title}</p>
          <p style={{ margin: '0 0 5px', fontSize: 12.5, lineHeight: 1.6, color: `${CREAM}BB` }}>{t.description}</p>
          <p style={{ margin: 0, fontSize: 10.5, color: GOLD, opacity: 0.65 }}>{t.havens.join(' · ')}</p>
        </div>
      ))}
      <Callout color={SAGE} label="Surprise connection" text={discovery.surprise} />
      <Callout color={GOLD} label="What to explore next" text={discovery.nudge} />
      <RefreshBtn onClick={onRefresh} loading={loading} />
    </div>
  )
}

// ─── DIGEST ──────────────────────────────────────────────────────────────────

function DigestBody({ digest, onRefresh, loading }: { digest: DigestResult; onRefresh: () => void; loading: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.45, color: GOLD, fontStyle: 'italic' }}>{digest.headline}</p>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.75, color: `${CREAM}DD`, whiteSpace: 'pre-wrap' }}>{digest.digest}</p>
      <div>
        <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: `${CREAM}44` }}>Worth revisiting</p>
        {digest.highlights.map((h, i) => (
          <p key={i} style={{ margin: '0 0 5px', fontSize: 12.5, color: `${CREAM}CC`, paddingLeft: 10, borderLeft: `2px solid ${GOLD}44` }}>{h}</p>
        ))}
      </div>
      <RefreshBtn onClick={onRefresh} loading={loading} />
    </div>
  )
}

// ─── MEMORY ──────────────────────────────────────────────────────────────────

function MemoryBody({ memories, onRefresh, loading }: { memories: { id: string; insight: string }[]; onRefresh: () => void; loading: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {memories.length === 0 ? (
        <p style={{ margin: '0 0 8px', fontSize: 13, color: `${CREAM}55`, fontStyle: 'italic' }}>
          No memories yet. Tap Refresh to let AI learn from what you&apos;ve saved.
        </p>
      ) : (
        memories.map((m, i) => (
          <div key={m.id} style={{ paddingLeft: 12, borderLeft: `3px solid ${i % 2 === 0 ? GOLD : SAGE}44` }}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: `${CREAM}CC` }}>{m.insight}</p>
          </div>
        ))
      )}
      <button onClick={onRefresh} disabled={loading}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 50, fontSize: 11.5, fontWeight: 600, color: loading ? `${CREAM}33` : GOLD, backgroundColor: `${GOLD}15`, border: `1px solid ${GOLD}44`, cursor: loading ? 'wait' : 'pointer', alignSelf: 'flex-start', marginTop: 4 }}>
        {loading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={12} />}
        {loading ? 'Learning...' : 'Refresh memory'}
      </button>
    </div>
  )
}

// ─── YOU ─────────────────────────────────────────────────────────────────────

function YouBody({ you, onRefresh, loading, items }: { you: YouResult; onRefresh: () => void; loading: boolean; items: Pick<Cur8Item, 'id' | 'title' | 'description'>[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Narrative */}
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.75, color: `${CREAM}EE`, fontStyle: 'italic', borderLeft: `3px solid ${GOLD}66`, paddingLeft: 12 }}>
        {you.narrative}
      </p>

      {/* Pattern */}
      {you.pattern && (
        <p style={{ margin: 0, fontSize: 12, color: `${CREAM}66`, lineHeight: 1.6, paddingLeft: 12, borderLeft: `3px solid ${SAGE}44` }}>
          {you.pattern}
        </p>
      )}

      {/* Interest labels */}
      {you.interests.length > 0 && (
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: `${CREAM}44` }}>Your interest areas</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {you.interests.map((interest, i) => (
              <span key={i} style={{
                padding: '4px 10px', borderRadius: 50, fontSize: 11.5, fontWeight: 600,
                backgroundColor: i % 2 === 0 ? `${GOLD}18` : `${SAGE}18`,
                border: `1px solid ${i % 2 === 0 ? `${GOLD}44` : `${SAGE}44`}`,
                color: i % 2 === 0 ? GOLD : SAGE,
              }}>
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Compact word map — visual fingerprint of their library */}
      {items.length >= 3 && (
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: `${CREAM}44` }}>Your library fingerprint</p>
          <WordMap items={items} compact />
        </div>
      )}

      {/* Outside recommendations */}
      {you.outside.length > 0 && (
        <div>
          <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: `${CREAM}44` }}>You might love — outside your library</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {you.outside.map((rec, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: CORAL, backgroundColor: `${CORAL}18`, border: `1px solid ${CORAL}33`, borderRadius: 4, padding: '2px 6px', marginTop: 2 }}>
                  {rec.type}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 12.5, fontWeight: 700, color: CREAM }}>{rec.title}</p>
                  <p style={{ margin: 0, fontSize: 11.5, color: `${CREAM}77`, lineHeight: 1.55 }}>{rec.why}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <RefreshBtn onClick={onRefresh} loading={loading} label="Rebuild profile" />
    </div>
  )
}

// ─── DISCUSSIONS ─────────────────────────────────────────────────────────────
// A browsable list of every auto-saved AI Q&A conversation. Reusable so a haven
// page can show just that haven's discussions by passing a `category`.

function DiscussionsBody() {
  return <DiscussionList />
}

export function DiscussionList({ category, itemId }: { category?: string; itemId?: string }) {
  const [items, setItems] = useState<DiscussionDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    getDiscussions({ category, itemId })
      .then((d) => { if (alive) setItems(d) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [category, itemId])

  async function remove(id: string) {
    await deleteDiscussion(id).catch(() => {})
    setItems((prev) => prev.filter((d) => d.id !== id))
    if (openId === id) setOpenId(null)
  }

  async function copyConvo(d: DiscussionDTO) {
    const text = d.messages.map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${m.content}`).join('\n\n')
    const ok = await copyToClipboard(text)
    if (ok) { setCopiedId(d.id); setTimeout(() => setCopiedId(null), 1600) }
  }

  if (loading) return <Loader label="Gathering your conversations..." />
  if (items.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: 12.5, color: `${CREAM}66`, lineHeight: 1.6 }}>
        No saved conversations yet. Open any item and tap <strong style={{ color: CREAM }}>Ask AI</strong> — every chat is saved here automatically so nothing disappears.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((d) => {
        const open = openId === d.id
        return (
          <div key={d.id} style={{ borderRadius: 12, backgroundColor: `${CREAM}06`, border: `1px solid ${CREAM}10`, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 13px' }}>
              <button onClick={() => setOpenId(open ? null : d.id)} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: CREAM }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10.5, color: `${CREAM}50` }}>
                  {d.messages.length} messages · {new Date(d.updatedAt).toLocaleDateString()}
                </p>
              </button>
              <button onClick={() => copyConvo(d)} title="Copy conversation" style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: `${CREAM}55`, padding: 4 }}>
                {copiedId === d.id ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button onClick={() => remove(d.id)} title="Delete" style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: `${CREAM}55`, padding: 4 }}>
                <Trash2 size={14} />
              </button>
            </div>
            {open && (
              <div style={{ padding: '4px 13px 13px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: `1px solid ${CREAM}0a` }}>
                {d.messages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '90%', padding: '8px 12px', borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                      backgroundColor: m.role === 'user' ? `${GOLD}22` : `${CREAM}08`,
                      border: `1px solid ${m.role === 'user' ? `${GOLD}33` : `${CREAM}12`}`,
                      fontSize: 12.5, lineHeight: 1.6, color: m.role === 'user' ? CREAM : `${CREAM}DD`, whiteSpace: 'pre-wrap',
                    }}>{m.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── ASK ─────────────────────────────────────────────────────────────────────

interface ChatMessage { role: 'user' | 'assistant'; content: string }

const STARTERS = [
  'What have I been most obsessed with lately?',
  'What patterns do you notice in what I save?',
  'What should I explore next based on what I love?',
  'How do my havens connect to each other?',
]

function AskBody() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || streaming) return
    setInput('')
    setError('')
    const userMessage: ChatMessage = { role: 'user', content: msg }
    const history = [...messages, userMessage]
    setMessages(history)

    const assistant: ChatMessage = { role: 'assistant', content: '' }
    setMessages([...history, assistant])
    setStreaming(true)

    abortRef.current = new AbortController()
    try {
      const res = await fetch('/api/cur8/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: messages }),
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
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Conversation */}
      {messages.length === 0 ? (
        <div>
          <p style={{ margin: '0 0 10px', fontSize: 12.5, color: `${CREAM}77`, lineHeight: 1.6 }}>
            Ask me anything about what you&apos;ve saved. I know your whole library.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {STARTERS.map((s) => (
              <button key={s} onClick={() => send(s)}
                style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 10, fontSize: 12, color: `${CREAM}AA`, backgroundColor: `${CREAM}07`, border: `1px solid ${CREAM}12`, cursor: 'pointer', lineHeight: 1.5 }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div ref={scrollRef} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '88%', padding: '9px 13px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                backgroundColor: m.role === 'user' ? `${GOLD}22` : `${CREAM}08`,
                border: `1px solid ${m.role === 'user' ? `${GOLD}33` : `${CREAM}12`}`,
                fontSize: 13, lineHeight: 1.65, color: m.role === 'user' ? CREAM : `${CREAM}DD`,
                whiteSpace: 'pre-wrap',
              }}>
                {m.content}
                {m.role === 'assistant' && m.content === '' && streaming && (
                  <Loader2 size={12} style={{ color: GOLD, animation: 'spin 1s linear infinite', display: 'inline-block', marginLeft: 4 }} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p style={{ margin: 0, fontSize: 11.5, color: CORAL }}>{error}</p>}

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Ask about your library..."
          rows={1}
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 12, fontSize: 13,
            backgroundColor: `${CREAM}08`, border: `1px solid ${CREAM}18`,
            color: CREAM, resize: 'none', outline: 'none', lineHeight: 1.5,
            fontFamily: 'inherit',
          }}
        />
        <button onClick={() => send()} disabled={!input.trim() || streaming}
          style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', border: 'none', backgroundColor: !input.trim() || streaming ? `${GOLD}33` : GOLD, color: !input.trim() || streaming ? `${CREAM}44` : '#0d2420', cursor: !input.trim() || streaming ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {streaming ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
        </button>
      </div>

      {messages.length > 0 && (
        <button onClick={() => setMessages([])} style={{ alignSelf: 'flex-start', fontSize: 10.5, color: `${CREAM}40`, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          Clear conversation
        </button>
      )}
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Callout({ color, label, text }: { color: string; label: string; text: string }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: `${color}12`, border: `1px solid ${color}30` }}>
      <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color }}>{label}</p>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: `${CREAM}DD` }}>{text}</p>
    </div>
  )
}

function Loader({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      <Loader2 size={14} style={{ color: GOLD, animation: 'spin 1s linear infinite', flexShrink: 0 }} />
      <p style={{ margin: 0, fontSize: 13, color: `${CREAM}55`, fontStyle: 'italic' }}>{label}</p>
    </div>
  )
}

function EmptyState({ label, onRetry, retryLabel = 'Generate' }: { label: string; onRetry: () => void; retryLabel?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ margin: 0, fontSize: 13, color: `${CREAM}55`, fontStyle: 'italic' }}>{label}</p>
      <button onClick={onRetry}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 50, fontSize: 12, fontWeight: 600, color: GOLD, backgroundColor: `${GOLD}18`, border: `1px solid ${GOLD}44`, cursor: 'pointer', alignSelf: 'flex-start' }}>
        <Sparkles size={12} /> {retryLabel}
      </button>
    </div>
  )
}

function RefreshBtn({ onClick, loading, label = 'Refresh' }: { onClick: () => void; loading: boolean; label?: string }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 50, fontSize: 11, fontWeight: 600, color: loading ? `${CREAM}30` : `${CREAM}60`, backgroundColor: `${CREAM}07`, border: 'none', cursor: loading ? 'wait' : 'pointer', alignSelf: 'flex-start' }}>
      {loading ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={11} />} {label}
    </button>
  )
}
