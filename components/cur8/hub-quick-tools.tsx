'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, X, ClipboardPaste, Loader2, Check, Shuffle, Focus, ExternalLink, Undo2, Play,
} from 'lucide-react'
import { CATEGORIES, type Cur8Item, type Category } from '@/lib/cur8-store'
import { createItem, moveItemToGarden } from '@/app/actions/cur8'
import { useGardenNames } from '@/components/cur8/garden-names-provider'

const ACCENT = '#d13a1f'
const GOLD = '#c9a84c'

// Pull an embeddable id so videos can play inline (instead of jumping to YouTube).
function ytEmbedId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.includes('/shorts/')) return u.pathname.split('/shorts/')[1]?.split('?')[0] ?? null
      return u.searchParams.get('v')
    }
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0] || null
  } catch {}
  return null
}
function tkEmbedId(url: string): string | null {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('tiktok.com')) return null
    const m = u.pathname.match(/\/video\/(\d+)/)
    return m ? m[1] : null
  } catch {}
  return null
}
// Returns the inline-embed src for a playable video, or null if not embeddable.
function embedSrc(url: string): string | null {
  const yt = ytEmbedId(url)
  if (yt) return `https://www.youtube.com/embed/${yt}?autoplay=1&rel=0`
  const tk = tkEmbedId(url)
  if (tk) return `https://www.tiktok.com/embed/v2/${tk}`
  return null
}

// Detect which haven a pasted link belongs to, by content type.
// Slugs are content-type based: youtube, tiktok, instagram, facebook, images,
// documents, web (articles is the general reading bucket).
export function detectCategory(raw: string): Category {
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  let host = ''
  let path = ''
  try {
    const u = new URL(url)
    host = u.hostname.toLowerCase()
    path = u.pathname.toLowerCase()
  } catch {
    return 'Web'
  }
  if (host.includes('youtube') || host === 'youtu.be') return 'YouTube'
  if (host.includes('tiktok')) return 'TikTok'
  if (host.includes('instagram')) return 'Instagram'
  if (host.includes('facebook') || host.includes('fb.watch')) return 'Facebook'
  if (/\.(jpg|jpeg|png|gif|webp|svg|avif)$/.test(path)) return 'Images'
  if (/\.(pdf|docx?|pptx?|xlsx?|txt|csv|key|pages)$/.test(path)) return 'Documents'
  // Blogs / news / long-form reading
  if (host.includes('medium.com') || host.includes('substack') || host.includes('notion')) return 'Articles'
  return 'Web'
}

// ─── Quick Save: paste a link, auto-file it, offer undo/redirect ───
export function QuickSave({ onSaved }: { onSaved?: (item: Cur8Item) => void }) {
  const { displayName } = useGardenNames()
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<{ item: Cur8Item; category: Category } | null>(null)

  useEffect(() => {
    function handleOpen() { setOpen(true) }
    window.addEventListener('cur8:openQuickSave', handleOpen)
    return () => window.removeEventListener('cur8:openQuickSave', handleOpen)
  }, [])

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setUrl(text.trim())
    } catch { /* clipboard blocked — user can type instead */ }
  }

  async function save() {
    const link = url.trim()
    if (!link || saving) return
    setSaving(true)
    const category = detectCategory(link)
    let title = link
    let thumbnail: string | undefined
    let description: string | undefined
    let favicon: string | undefined
    try {
      const res = await fetch(`/api/cur8/fetch-meta?url=${encodeURIComponent(link)}`)
      if (res.ok) {
        const meta = await res.json()
        title = meta.title || link
        thumbnail = meta.thumbnail || undefined
        description = meta.description || undefined
        favicon = meta.favicon || undefined
      }
    } catch { /* offline / meta failed — save the bare link */ }
    const normalized = /^https?:\/\//i.test(link) ? link : `https://${link}`
    const item = await createItem({ category, url: normalized, title, thumbnail, description, favicon })
      .catch(() => null)
    setSaving(false)
    if (item) {
      setSaved({ item: item as Cur8Item, category })
      setUrl('')
      onSaved?.(item as Cur8Item)
    }
  }

  // Re-file the just-saved item into a different haven
  async function refile(category: Category) {
    if (!saved) return
    await moveItemToGarden(saved.item.id, category).catch(() => {})
    setSaved({ item: { ...saved.item, category }, category })
  }

  function reset() {
    setSaved(null)
    setUrl('')
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, backgroundColor: ACCENT, color: '#fff', boxShadow: `0 6px 20px ${ACCENT}55` }}
      >
        <Zap size={15} /> Quick save
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={reset}
            style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(6,18,16,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '14vh 16px 16px' }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: -8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: 'min(460px, 100%)', backgroundColor: '#0d2420', borderRadius: 18, border: `1px solid ${ACCENT}44`, padding: 20, fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: `${ACCENT}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={16} color={ACCENT} />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 17, fontWeight: 700, color: '#f5f0e8', margin: 0 }}>Quick save</h3>
                    <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.5)', margin: 0 }}>Paste a link — I&apos;ll file it for you</p>
                  </div>
                </div>
                <button onClick={reset} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.5)', display: 'flex' }}><X size={18} /></button>
              </div>

              {saved ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, backgroundColor: 'rgba(90,158,132,0.14)', border: '1px solid rgba(90,158,132,0.3)' }}>
                    <Check size={16} color="#8ec8b4" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#f5f0e8' }}>
                      Saved to <strong style={{ color: GOLD }}>{displayName(saved.category)}</strong>
                    </span>
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)', margin: 0 }}>Wrong spot? Move it:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {CATEGORIES.filter((c) => c.name !== saved.category).map((c) => (
                      <button key={c.name} onClick={() => refile(c.name)}
                        style={{ padding: '6px 12px', borderRadius: 50, border: '1px solid rgba(245,240,232,0.18)', backgroundColor: 'rgba(245,240,232,0.05)', color: 'rgba(245,240,232,0.85)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
                        {displayName(c.name)}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={() => window.open(saved.item.url, '_blank', 'noopener,noreferrer')}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 10, border: '1px solid rgba(245,240,232,0.18)', background: 'none', color: '#f5f0e8', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                      <ExternalLink size={13} /> Open
                    </button>
                    <button onClick={() => setSaved(null)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 10, border: 'none', backgroundColor: ACCENT, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                      <Zap size={13} /> Save another
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) save() }}
                    placeholder="Paste a link…"
                    autoFocus
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, backgroundColor: '#0a1e1b', border: '1px solid rgba(245,240,232,0.15)', color: '#f5f0e8', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  />
                  {url.trim() && (
                    <p style={{ fontSize: 11.5, color: 'rgba(245,240,232,0.55)', margin: 0 }}>
                      Will file into <strong style={{ color: GOLD }}>{displayName(detectCategory(url))}</strong> — you can move it after.
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={pasteFromClipboard}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(245,240,232,0.18)', background: 'none', color: 'rgba(245,240,232,0.8)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                      <ClipboardPaste size={14} /> Paste
                    </button>
                    <button onClick={save} disabled={!url.trim() || saving}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 14px', borderRadius: 10, border: 'none', cursor: url.trim() && !saving ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700, backgroundColor: url.trim() && !saving ? ACCENT : 'rgba(245,240,232,0.1)', color: url.trim() && !saving ? '#fff' : 'rgba(245,240,232,0.4)' }}>
                      {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={15} />} {saving ? 'Filing…' : 'Save & file'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  )
}

// ─── One thing: pick a haven, then focus on a single surfaced item ───
export function OneThing({ items }: { items: Cur8Item[] }) {
  const { displayName } = useGardenNames()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<Category | null>(null)
  const [current, setCurrent] = useState<Cur8Item | null>(null)
  const [playing, setPlaying] = useState(false)

  const pool = category ? items.filter((i) => i.category === category) : []

  function pick(fromCategory: Category) {
    const list = items.filter((i) => i.category === fromCategory)
    setPlaying(false)
    if (list.length === 0) { setCategory(fromCategory); setCurrent(null); return }
    setCategory(fromCategory)
    setCurrent(list[Math.floor(Math.random() * list.length)])
  }

  function shuffle() {
    if (pool.length === 0) return
    setPlaying(false)
    let next = pool[Math.floor(Math.random() * pool.length)]
    if (pool.length > 1 && current) {
      while (next.id === current.id) next = pool[Math.floor(Math.random() * pool.length)]
    }
    setCurrent(next)
  }

  function close() {
    setOpen(false)
    setCategory(null)
    setCurrent(null)
    setPlaying(false)
  }

  const havenCounts = CATEGORIES.map((c) => ({ ...c, count: items.filter((i) => i.category === c.name).length }))

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 50, border: `1px solid ${GOLD}`, cursor: 'pointer', fontSize: 13, fontWeight: 700, backgroundColor: 'rgba(201,168,76,0.14)', color: GOLD }}
      >
        <Focus size={15} /> One thing
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 210, backgroundColor: 'rgba(8,22,19,0.94)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          >
            <button onClick={close} aria-label="Close" style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.6)', display: 'flex' }}><X size={22} /></button>

            {!category ? (
              // Step 1: choose a haven
              <div style={{ width: 'min(520px, 100%)', textAlign: 'center' }}>
                <Focus size={30} color={GOLD} style={{ marginBottom: 14 }} />
                <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 26, fontWeight: 700, color: '#f5f0e8', margin: '0 0 6px' }}>One thing at a time</h2>
                <p style={{ fontSize: 13.5, color: 'rgba(245,240,232,0.6)', margin: '0 0 24px', lineHeight: 1.5 }}>Pick a haven and I&apos;ll surface just one thing to focus on right now.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                  {havenCounts.map((c) => (
                    <button key={c.name} onClick={() => pick(c.name)} disabled={c.count === 0}
                      style={{ padding: '10px 16px', borderRadius: 12, border: `1px solid ${c.count ? 'rgba(245,240,232,0.2)' : 'rgba(245,240,232,0.07)'}`, backgroundColor: 'rgba(245,240,232,0.04)', color: c.count ? '#f5f0e8' : 'rgba(245,240,232,0.3)', fontSize: 13, fontWeight: 600, cursor: c.count ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 7 }}>
                      {displayName(c.name)}
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 50, backgroundColor: c.count ? GOLD : 'rgba(245,240,232,0.1)', color: c.count ? '#0d2420' : 'rgba(245,240,232,0.4)' }}>{c.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : current ? (
              // Step 2: the one surfaced item
              <motion.div key={current.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} style={{ width: 'min(460px, 100%)', textAlign: 'center' }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, margin: '0 0 16px' }}>Just this one — {displayName(category)}</p>
                {(() => {
                const src = embedSrc(current.url)
                const isVideo = !!src
                return (
                <>
                <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(245,240,232,0.12)', backgroundColor: '#122e29', marginBottom: 18 }}>
                  {isVideo && playing ? (
                    <iframe
                      src={src}
                      title={current.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                      style={{ width: '100%', height: 240, border: 'none', display: 'block' }}
                    />
                  ) : current.thumbnail ? (
                    // Clickable poster: for videos, tapping plays inline instead of leaving the app
                    <button
                      onClick={() => isVideo && setPlaying(true)}
                      style={{ position: 'relative', display: 'block', width: '100%', height: 220, padding: 0, border: 'none', cursor: isVideo ? 'pointer' : 'default', background: 'none' }}
                      aria-label={isVideo ? `Play ${current.title}` : current.title}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={current.thumbnail || '/placeholder.svg'} alt={current.title} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      {isVideo && (
                        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.28)' }}>
                          <span style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(0,0,0,0.4)' }}>
                            <Play size={24} color="#0d2420" style={{ marginLeft: 3 }} />
                          </span>
                        </span>
                      )}
                    </button>
                  ) : (
                    <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Focus size={40} color={GOLD} /></div>
                  )}
                  <div style={{ padding: '16px 18px' }}>
                    <h3 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 18, fontWeight: 700, color: '#f5f0e8', margin: 0, lineHeight: 1.3 }}>{current.title}</h3>
                    {current.whySaved && <p style={{ fontSize: 12.5, fontStyle: 'italic', color: GOLD, margin: '8px 0 0' }}>{current.whySaved}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button onClick={shuffle} disabled={pool.length < 2}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 18px', borderRadius: 50, border: '1px solid rgba(245,240,232,0.2)', background: 'none', color: pool.length < 2 ? 'rgba(245,240,232,0.3)' : '#f5f0e8', fontSize: 13, fontWeight: 600, cursor: pool.length < 2 ? 'not-allowed' : 'pointer' }}>
                    <Shuffle size={14} /> Something else
                  </button>
                  {isVideo && !playing ? (
                    <button onClick={() => setPlaying(true)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 20px', borderRadius: 50, border: 'none', backgroundColor: GOLD, color: '#0d2420', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      <Play size={14} style={{ marginLeft: 1 }} /> Play here
                    </button>
                  ) : (
                    <button onClick={() => window.open(current.url, '_blank', 'noopener,noreferrer')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 20px', borderRadius: 50, border: 'none', backgroundColor: GOLD, color: '#0d2420', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      <ExternalLink size={14} /> {isVideo ? 'Open externally' : 'Engage with this'}
                    </button>
                  )}
                </div>
                </>
                )
                })()}
                <button onClick={() => { setCategory(null); setCurrent(null) }}
                  style={{ marginTop: 16, background: 'none', border: 'none', color: 'rgba(245,240,232,0.5)', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Undo2 size={12} /> Pick a different haven
                </button>
              </motion.div>
            ) : (
              // Chosen haven is empty
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'rgba(245,240,232,0.6)', marginBottom: 16 }}>Nothing saved in {displayName(category)} yet.</p>
                <button onClick={() => { setCategory(null); setCurrent(null) }}
                  style={{ padding: '10px 18px', borderRadius: 50, border: `1px solid ${GOLD}`, background: 'none', color: GOLD, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Pick another haven
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
