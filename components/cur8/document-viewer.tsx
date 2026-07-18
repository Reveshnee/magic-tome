'use client'

import { useEffect, useState } from 'react'
import { FileText, Download, AlertCircle, Loader2, ExternalLink, Eye } from 'lucide-react'

interface Props {
  url: string
  filename: string
  accent: string
}

type DocKind = 'pdf' | 'word' | 'sheet' | 'text' | 'unsupported'

function kindFromString(s: string): DocKind | null {
  // Blob proxy URLs look like /api/cur8/file?pathname=cur8%2FMyFile.pdf
  // The extension lives inside the pathname= query param, not the path itself.
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
      <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.5)' }}>Can&rsquo;t see it? Open or download instead.</span>
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

export default function DocumentViewer({ url, filename, accent }: Props) {
  const kind: DocKind = kindFromString(filename) ?? kindFromString(url) ?? 'unsupported'
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Detect mobile — Android Chrome cannot render PDFs inside iframes at all
    setIsMobile(window.innerWidth < 768 || /Android|iPhone|iPad/i.test(navigator.userAgent))
  }, [])

  const downloadUrl = `${url}${url.includes('?') ? '&' : '?'}download=1`

  // ── PDF ───────────────────────────────────────────────────────────────────
  // Desktop Chrome renders PDFs in iframes natively — just pass the auth route.
  // Android Chrome CANNOT render PDFs inside iframes (blank / unsupported).
  // On mobile we show an "Open PDF" button — tapping it opens the URL in a new
  // tab where Android's native PDF viewer takes over.
  if (kind === 'pdf') {
    if (isMobile) {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, backgroundColor: '#0a1e1b', padding: 32, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, backgroundColor: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={34} color={accent} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f5f0e8', margin: '0 0 6px' }}>{filename}</p>
            <p style={{ fontSize: 12, color: 'rgba(245,240,232,0.5)', margin: 0 }}>
              PDF files open in your device&rsquo;s built-in PDF viewer
            </p>
          </div>
          <button
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 30px', borderRadius: 50, fontSize: 14, fontWeight: 700, color: '#0d2420', backgroundColor: accent, border: 'none', cursor: 'pointer' }}>
            <Eye size={16} /> Open PDF
          </button>
          <a href={downloadUrl} download={filename}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 50, fontSize: 12, fontWeight: 600, color: 'rgba(245,240,232,0.65)', backgroundColor: 'rgba(245,240,232,0.07)', border: '1px solid rgba(255,255,255,0.12)', textDecoration: 'none' }}>
            <Download size={13} /> Download instead
          </a>
        </div>
      )
    }

    // Desktop — iframe with direct auth route, session cookie sent automatically
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <iframe
          src={url}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block', backgroundColor: '#fff' }}
          title={filename}
        />
        <RecoveryBar url={url} filename={filename} accent={accent} />
      </div>
    )
  }

  // ── Word / Sheet ──────────────────────────────────────────────────────────
  if (kind === 'word' || kind === 'sheet') {
    return <OfficeViewer url={url} filename={filename} accent={accent} kind={kind} />
  }

  // ── Plain text ────────────────────────────────────────────────────────────
  if (kind === 'text') {
    return <TextViewer url={url} filename={filename} accent={accent} />
  }

  // ── Unsupported ───────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#0a1e1b', color: '#f5f0e8', padding: 32, textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FileText size={30} color={accent} />
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, maxWidth: 280, margin: 0 }}>
        This file type can&rsquo;t be previewed inline yet.
      </p>
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
          // xlsx — needs heavy lib, show open/download for now
          if (!cancelled) setError('Spreadsheets open directly in your device — use Open or Download.')
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
      <div
        className="cur8-doc-body"
        style={{ maxWidth: 760, margin: '0 auto', padding: '32px 36px 80px' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
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
        .cur8-doc-body th,.cur8-doc-body tr:first-child td { background: #e8e2d5; font-weight: 600; }
      `}</style>
      <RecoveryBar url={url} filename={filename} accent={accent} />
    </div>
  )
}

// ── Plain text viewer ─────────────────────────────────────────────────────
function TextViewer({ url, filename, accent }: { url: string; filename: string; accent: string }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(url)
      .then(async res => {
        if (!res.ok) throw new Error(`Could not load file (${res.status})`)
        if (!cancelled) setText(await res.text())
      })
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

  if (error) return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a1e1b' }}>
      <span style={{ color: 'rgba(245,240,232,0.5)', fontSize: 13 }}>{error}</span>
    </div>
  )

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#0f1f1c', overflowY: 'auto' }}>
      <pre style={{ padding: '20px 24px 80px', fontFamily: 'monospace', fontSize: 12.5, lineHeight: 1.6, color: '#c8d5d0', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {text}
      </pre>
      <RecoveryBar url={url} filename={filename} accent={accent} />
    </div>
  )
}
