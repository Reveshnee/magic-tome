'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { FileText, Download, AlertCircle, Loader2, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  url: string
  filename: string
  accent: string
  itemId?: string // optional — if provided, triggers background text extraction for AI
}

type DocKind = 'pdf' | 'word' | 'sheet' | 'text' | 'unsupported'

function kindFromString(s: string): DocKind | null {
  let check = s
  try {
    const u = new URL(s, 'http://x')
    const p = u.searchParams.get('pathname')
    if (p) check = decodeURIComponent(p)
  } catch { /* use as-is */ }

  const clean = check.split('?')[0].toLowerCase()
  if (clean.endsWith('.pdf')) return 'pdf'
  if (clean.endsWith('.doc') || clean.endsWith('.docx')) return 'word'
  if (clean.endsWith('.xls') || clean.endsWith('.xlsx') || clean.endsWith('.csv')) return 'sheet'
  if (clean.endsWith('.txt') || clean.endsWith('.md')) return 'text'
  return null
}

function RecoveryBar({ url, filename, accent }: { url: string; filename: string; accent: string }) {
  const downloadUrl = `${url}${url.includes('?') ? '&' : '?'}download=1`
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 12px', backgroundColor: 'rgba(13,36,32,0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, zIndex: 10 }}>
      <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.5)' }}>Can&rsquo;t see it?</span>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 50, fontSize: 11, fontWeight: 700, color: '#0d2420', backgroundColor: accent, border: 'none', cursor: 'pointer' }}>
          <ExternalLink size={11} /> Open
        </button>
        <a href={downloadUrl} download={filename}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 50, fontSize: 11, fontWeight: 700, color: 'rgba(245,240,232,0.8)', backgroundColor: 'rgba(245,240,232,0.12)', border: '1px solid rgba(255,255,255,0.15)', textDecoration: 'none' }}>
          <Download size={11} /> Download
        </a>
      </div>
    </div>
  )
}

export default function DocumentViewer({ url, filename, accent, itemId }: Props) {
  const kind: DocKind = kindFromString(filename) ?? kindFromString(url) ?? 'unsupported'

  // Silently trigger text extraction in the background when a doc is first opened.
  // The extracted text is stored in the DB and used by the AI to read your documents.
  useEffect(() => {
    if (!itemId) return
    fetch('/api/cur8/extract-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    }).catch(() => { /* silent — non-critical */ })
  }, [itemId])
  const downloadUrl = `${url}${url.includes('?') ? '&' : '?'}download=1`

  if (kind === 'pdf') return <PdfViewer url={url} filename={filename} accent={accent} />
  if (kind === 'word' || kind === 'sheet') return <OfficeViewer url={url} filename={filename} accent={accent} kind={kind} />
  if (kind === 'text') return <TextViewer url={url} filename={filename} accent={accent} />

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#0a1e1b', color: '#f5f0e8', padding: 32, textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FileText size={30} color={accent} />
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, maxWidth: 280, margin: 0 }}>This file type can&rsquo;t be previewed inline yet.</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 50, fontSize: 12, fontWeight: 700, color: '#0d2420', backgroundColor: accent, border: 'none', cursor: 'pointer' }}>
          <ExternalLink size={13} /> Open file
        </button>
        <a href={downloadUrl} download={filename}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 50, fontSize: 12, fontWeight: 700, color: 'rgba(245,240,232,0.8)', backgroundColor: 'rgba(245,240,232,0.12)', border: '1px solid rgba(255,255,255,0.12)', textDecoration: 'none' }}>
          <Download size={13} /> Download
        </a>
      </div>
    </div>
  )
}

// ── PDF viewer (PDF.js canvas — works on Android Chrome) ──────────────────
function PdfViewer({ url, filename, accent }: { url: string; filename: string; accent: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null)
  const renderingRef = useRef(false)

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDocRef.current || !containerRef.current || renderingRef.current) return
    renderingRef.current = true
    try {
      const page = await pdfDocRef.current.getPage(pageNum)
      const container = containerRef.current
      const containerWidth = container.clientWidth || 360
      const viewport = page.getViewport({ scale: 1 })
      const scale = containerWidth / viewport.width
      const scaledViewport = page.getViewport({ scale })

      let canvas = container.querySelector('canvas') as HTMLCanvasElement
      if (!canvas) {
        canvas = document.createElement('canvas')
        canvas.style.display = 'block'
        canvas.style.width = '100%'
        container.innerHTML = ''
        container.appendChild(canvas)
      }
      canvas.width = scaledViewport.width
      canvas.height = scaledViewport.height

      const ctx = canvas.getContext('2d')!
      await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise
    } finally {
      renderingRef.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError('')

    ;(async () => {
      try {
        // Fetch the file with auth cookie
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Could not load file (${res.status})`)
        const data = await res.arrayBuffer()
        if (cancelled) return

        // Dynamically load PDF.js
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

        const pdfDoc = await pdfjs.getDocument({ data }).promise
        if (cancelled) return

        pdfDocRef.current = pdfDoc
        setNumPages(pdfDoc.numPages)
        setLoading(false)
        await renderPage(1)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load PDF')
          setLoading(false)
        }
      }
    })()

    return () => { cancelled = true }
  }, [url, renderPage])

  useEffect(() => {
    if (!loading && !error) renderPage(currentPage)
  }, [currentPage, loading, error, renderPage])

  const downloadUrl = `${url}${url.includes('?') ? '&' : '?'}download=1`

  if (loading) return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#0a1e1b' }}>
      <Loader2 size={22} color={accent} style={{ animation: 'cur8spin 0.9s linear infinite' }} />
      <span style={{ fontSize: 13, color: 'rgba(245,240,232,0.6)' }}>Loading PDF...</span>
      <style>{`@keyframes cur8spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#0a1e1b', padding: 32, textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AlertCircle size={30} color={accent} />
      </div>
      <p style={{ fontSize: 13, color: '#f5f0e8', maxWidth: 280, margin: 0 }}>{error}</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 50, fontSize: 12, fontWeight: 700, color: '#0d2420', backgroundColor: accent, border: 'none', cursor: 'pointer' }}>
          <ExternalLink size={13} /> Open file
        </button>
        <a href={downloadUrl} download={filename}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 50, fontSize: 12, fontWeight: 700, color: 'rgba(245,240,232,0.8)', backgroundColor: 'rgba(245,240,232,0.12)', border: '1px solid rgba(255,255,255,0.12)', textDecoration: 'none' }}>
          <Download size={13} /> Download
        </a>
      </div>
    </div>
  )

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#1a1a1a', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#111', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 'calc(100% - 160px)' }}>{filename}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
            style={{ background: 'none', border: 'none', cursor: currentPage <= 1 ? 'default' : 'pointer', color: currentPage <= 1 ? 'rgba(245,240,232,0.25)' : 'rgba(245,240,232,0.7)', padding: 4, display: 'flex' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.6)', minWidth: 60, textAlign: 'center' }}>{currentPage} / {numPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage >= numPages}
            style={{ background: 'none', border: 'none', cursor: currentPage >= numPages ? 'default' : 'pointer', color: currentPage >= numPages ? 'rgba(245,240,232,0.25)' : 'rgba(245,240,232,0.7)', padding: 4, display: 'flex' }}>
            <ChevronRight size={16} />
          </button>
          <a href={downloadUrl} download={filename} title="Download"
            style={{ marginLeft: 4, display: 'flex', alignItems: 'center', color: 'rgba(245,240,232,0.5)', textDecoration: 'none' }}>
            <Download size={14} />
          </a>
        </div>
      </div>
      {/* Canvas area */}
      <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', backgroundColor: '#525659', padding: '12px 0' }} />
    </div>
  )
}

// ── Word / Sheet viewer ───────────────────────────────────────────────────
function OfficeViewer({ url, filename, accent, kind }: { url: string; filename: string; accent: string; kind: DocKind }) {
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(''); setHtml('')
    ;(async () => {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Could not load file (${res.status})`)
        const buf = await res.arrayBuffer()
        if (cancelled) return

        if (kind === 'word') {
          const mammoth = await import('mammoth')
          const result = await mammoth.convertToHtml({ arrayBuffer: buf })
          if (!cancelled) setHtml(result.value || '<p>This document appears to be empty.</p>')
        } else {
          if (!cancelled) setError('Spreadsheets can be opened or downloaded using the buttons below.')
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not open this document')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [url, kind])

  const downloadUrl = `${url}${url.includes('?') ? '&' : '?'}download=1`

  if (loading) return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#0a1e1b' }}>
      <Loader2 size={22} color={accent} style={{ animation: 'cur8spin 0.9s linear infinite' }} />
      <span style={{ fontSize: 13, color: 'rgba(245,240,232,0.6)' }}>Loading document...</span>
      <style>{`@keyframes cur8spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#0a1e1b', padding: 32, textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AlertCircle size={30} color={accent} />
      </div>
      <p style={{ fontSize: 13, color: '#f5f0e8', maxWidth: 280, margin: 0 }}>{error}</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 50, fontSize: 12, fontWeight: 700, color: '#0d2420', backgroundColor: accent, border: 'none', cursor: 'pointer' }}>
          <ExternalLink size={13} /> Open file
        </button>
        <a href={downloadUrl} download={filename}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 50, fontSize: 12, fontWeight: 700, color: 'rgba(245,240,232,0.8)', backgroundColor: 'rgba(245,240,232,0.12)', border: '1px solid rgba(255,255,255,0.12)', textDecoration: 'none' }}>
          <Download size={13} /> Download
        </a>
      </div>
    </div>
  )

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#f5f0e8', overflowY: 'auto' }}>
      <div className="cur8-doc-body" style={{ maxWidth: 760, margin: '0 auto', padding: '32px 36px 80px' }}
        dangerouslySetInnerHTML={{ __html: html }} />
      <style>{`
        .cur8-doc-body { color: #1a2e2a; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 15px; line-height: 1.75; }
        .cur8-doc-body h1,.cur8-doc-body h2,.cur8-doc-body h3 { color: #0d2420; margin: 1.4em 0 0.5em; line-height: 1.25; }
        .cur8-doc-body h1 { font-size: 26px; } .cur8-doc-body h2 { font-size: 20px; } .cur8-doc-body h3 { font-size: 16px; }
        .cur8-doc-body p { margin: 0 0 0.9em; }
        .cur8-doc-body ul,.cur8-doc-body ol { margin: 0 0 1em; padding-left: 1.5em; }
        .cur8-doc-body li { margin-bottom: 0.3em; }
        .cur8-doc-body a { color: ${accent}; }
        .cur8-doc-body img { max-width: 100%; border-radius: 6px; }
        .cur8-doc-body table { border-collapse: collapse; width: 100%; margin: 0 0 1.2em; font-size: 13px; }
        .cur8-doc-body td,.cur8-doc-body th { border: 1px solid #d4cfc4; padding: 6px 10px; }
        .cur8-doc-body th { background: #e8e2d5; font-weight: 600; }
      `}</style>
      <RecoveryBar url={url} filename={filename} accent={accent} />
    </div>
  )
}

// ── Plain text viewer ───────────────────────��─────────────────────────────
function TextViewer({ url, filename, accent }: { url: string; filename: string; accent: string }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(url)
      .then(async res => { if (!res.ok) throw new Error(`${res.status}`); if (!cancelled) setText(await res.text()) })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [url])

  if (loading) return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a1e1b' }}>
      <Loader2 size={22} color={accent} style={{ animation: 'cur8spin 0.9s linear infinite' }} />
      <style>{`@keyframes cur8spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
  if (error) return <div style={{ padding: 24, color: 'rgba(245,240,232,0.5)', fontSize: 13 }}>{error}</div>

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#0f1f1c', overflowY: 'auto' }}>
      <pre style={{ padding: '20px 24px 80px', fontFamily: 'monospace', fontSize: 12.5, lineHeight: 1.6, color: '#c8d5d0', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {text}
      </pre>
      <RecoveryBar url={url} filename={filename} accent={accent} />
    </div>
  )
}
