'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Brain, BookOpen, Loader2, ChevronDown, RotateCcw, X, Zap } from 'lucide-react'
import {
  discoverPatterns, generateWeeklyDigest, getMemories, updateMemory,
  type DiscoveryResult, type DigestResult,
} from '@/app/actions/ai-features'

const GOLD = '#c9a84c'
const SAGE = '#5a9e84'
const BG = '#0a1e1b'
const SURFACE = '#122e29'

type Tab = 'discover' | 'digest' | 'memory'

export default function AiHub() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('discover')

  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null)
  const [discoveryLoading, setDiscoveryLoading] = useState(false)

  const [digest, setDigest] = useState<DigestResult | null>(null)
  const [digestLoading, setDigestLoading] = useState(false)

  const [memories, setMemories] = useState<{ id: string; insight: string }[]>([])
  const [memoryLoading, setMemoryLoading] = useState(false)
  const [memoryRefreshing, setMemoryRefreshing] = useState(false)

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
    try {
      await updateMemory()
      setMemories(await getMemories())
    } catch { /* noop */ } finally { setMemoryRefreshing(false) }
  }

  function handleOpen() {
    setOpen(true)
    // Auto-load the active tab if it has no data yet
    if (tab === 'discover' && !discovery && !discoveryLoading) loadDiscovery()
    if (tab === 'digest' && !digest && !digestLoading) loadDigest()
    if (tab === 'memory' && memories.length === 0 && !memoryLoading) loadMemory()
  }

  function handleTabChange(t: Tab) {
    setTab(t)
    if (t === 'discover' && !discovery && !discoveryLoading) loadDiscovery()
    if (t === 'digest' && !digest && !digestLoading) loadDigest()
    if (t === 'memory' && memories.length === 0 && !memoryLoading) loadMemory()
  }

  const loading = discoveryLoading || digestLoading || memoryLoading

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${GOLD}33`, backgroundColor: SURFACE }}>
      {/* Header / toggle */}
      <button
        onClick={() => open ? setOpen(false) : handleOpen()}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', color: '#f5f0e8' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={15} style={{ color: GOLD }} />
          <span style={{ fontWeight: 700, fontSize: 13.5 }}>AI Insights</span>
          <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.45)', fontStyle: 'italic' }}>
            {loading ? 'thinking...' : 'patterns · digest · memory'}
          </span>
        </span>
        <ChevronDown size={16} style={{ color: 'rgba(245,240,232,0.5)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
            {/* Tab switcher */}
            <div style={{ display: 'flex', borderTop: '1px solid rgba(245,240,232,0.07)', borderBottom: '1px solid rgba(245,240,232,0.07)' }}>
              {([
                { key: 'discover', label: 'Discover', icon: Zap },
                { key: 'digest', label: 'Digest', icon: BookOpen },
                { key: 'memory', label: 'Memory', icon: Brain },
              ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => handleTabChange(key)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px 6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: tab === key ? 700 : 500, color: tab === key ? GOLD : 'rgba(245,240,232,0.5)', borderBottom: tab === key ? `2px solid ${GOLD}` : '2px solid transparent' }}>
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>

            <div style={{ padding: '16px 18px 18px', minHeight: 120 }}>

              {/* ── DISCOVER ── */}
              {tab === 'discover' && (
                discoveryLoading ? <Loader label="Looking across your havens..." /> :
                !discovery ? <EmptyState label="No patterns found yet." onRetry={loadDiscovery} /> :
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {discovery.themes.map((t, i) => (
                    <div key={i} style={{ paddingLeft: 12, borderLeft: `3px solid ${GOLD}66` }}>
                      <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: 13, color: '#f5f0e8' }}>{t.title}</p>
                      <p style={{ margin: '0 0 5px', fontSize: 12.5, lineHeight: 1.55, color: 'rgba(245,240,232,0.75)' }}>{t.description}</p>
                      <p style={{ margin: 0, fontSize: 10.5, color: GOLD, opacity: 0.7 }}>{t.havens.join(' · ')}</p>
                    </div>
                  ))}
                  <div style={{ marginTop: 4, padding: '10px 14px', borderRadius: 10, backgroundColor: `${SAGE}15`, border: `1px solid ${SAGE}33` }}>
                    <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: SAGE }}>Surprise connection</p>
                    <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'rgba(245,240,232,0.85)' }}>{discovery.surprise}</p>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: `${GOLD}12`, border: `1px solid ${GOLD}33` }}>
                    <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: GOLD }}>What to explore next</p>
                    <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'rgba(245,240,232,0.85)' }}>{discovery.nudge}</p>
                  </div>
                  <RefreshBtn onClick={loadDiscovery} loading={discoveryLoading} />
                </div>
              )}

              {/* ── DIGEST ── */}
              {tab === 'digest' && (
                digestLoading ? <Loader label="Writing your digest..." /> :
                !digest ? <EmptyState label="No digest yet." onRetry={loadDigest} /> :
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: GOLD, fontStyle: 'italic' }}>{digest.headline}</p>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: 'rgba(245,240,232,0.85)', whiteSpace: 'pre-wrap' }}>{digest.digest}</p>
                  <div>
                    <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(245,240,232,0.45)' }}>Worth revisiting</p>
                    {digest.highlights.map((h, i) => (
                      <p key={i} style={{ margin: '0 0 4px', fontSize: 12.5, color: 'rgba(245,240,232,0.8)', paddingLeft: 10, borderLeft: `2px solid ${GOLD}55` }}>{h}</p>
                    ))}
                  </div>
                  <RefreshBtn onClick={loadDigest} loading={digestLoading} />
                </div>
              )}

              {/* ── MEMORY ── */}
              {tab === 'memory' && (
                memoryLoading ? <Loader label="Reading your patterns..." /> :
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {memories.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 13, color: 'rgba(245,240,232,0.5)', fontStyle: 'italic' }}>
                      No memories yet. Tap Refresh to let AI learn from what you&apos;ve saved.
                    </p>
                  ) : (
                    memories.map((m, i) => (
                      <div key={m.id} style={{ paddingLeft: 12, borderLeft: `3px solid ${i % 2 === 0 ? GOLD : SAGE}55` }}>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(245,240,232,0.85)' }}>{m.insight}</p>
                      </div>
                    ))
                  )}
                  <button onClick={refreshMemory} disabled={memoryRefreshing}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 50, fontSize: 11.5, fontWeight: 600, color: memoryRefreshing ? 'rgba(245,240,232,0.35)' : GOLD, backgroundColor: `${GOLD}15`, border: `1px solid ${GOLD}44`, cursor: memoryRefreshing ? 'wait' : 'pointer', alignSelf: 'flex-start' }}>
                    {memoryRefreshing ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={12} />}
                    {memoryRefreshing ? 'Learning...' : 'Refresh memory'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Loader({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      <Loader2 size={14} style={{ color: GOLD, animation: 'spin 1s linear infinite', flexShrink: 0 }} />
      <p style={{ margin: 0, fontSize: 13, color: 'rgba(245,240,232,0.55)', fontStyle: 'italic' }}>{label}</p>
    </div>
  )
}

function EmptyState({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ margin: 0, fontSize: 13, color: 'rgba(245,240,232,0.5)', fontStyle: 'italic' }}>{label}</p>
      <RefreshBtn onClick={onRetry} loading={false} />
    </div>
  )
}

function RefreshBtn({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 50, fontSize: 11, fontWeight: 600, color: loading ? 'rgba(245,240,232,0.3)' : 'rgba(245,240,232,0.6)', backgroundColor: 'rgba(245,240,232,0.06)', border: 'none', cursor: loading ? 'wait' : 'pointer', alignSelf: 'flex-start' }}>
      {loading ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={11} />} Refresh
    </button>
  )
}
