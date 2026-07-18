'use client'

import { useEffect, useState } from 'react'
import { FileText, Download, AlertCircle, Loader2, ExternalLink } from 'lucide-react'

interface Props {
  url: string
  filename: string
  accent: string
}

type DocKind = 'pdf' | 'word' | 'sheet' | 'text' | 'unsupported'

function kindFromString(s: string): DocKind | null {
  // For blob proxy URLs like /api/cur8/file?pathname=cur8%2FMyFile.pdf,
  // the extension is inside the pathname= query param, not the path itself.
  let check = s
  try {
    const u = new URL(s, 'http://x')
    const p = u.searchParams.get('pathname')
    if (p) check = decodeURIComponent(p)
  } catch { /* not a parseable URL, use as-is */ }

  const clean = check.split('?')[0].toLowerCase()
  if (clean.endsWith('.pdf')) return 'pdf'
  if (clean.endsWith('.doc') || clean.endsWith('.docx')) return 'word'
  if (clean.endsWith('.xls') || clean.endsWith('.xlsx') || clean.endsWith('.csv')) return 'sheet'
  if (clean.endsWith('.txt') || clean.endsWith('.md')) return 'text'
  return null
}

const RecoveryBar = ({ url, filename, accent }: { url: string; filename: string; accent: string }) => {
  const downloadUrl = `${url}${url.includes('?') ? '&' : '?'}download=1`
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 12px', backgroundColor: 'rgba(13,36,32,0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, zIndex: 10 }}>
      <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.55)' }}>Can&rsquo;t see it? Open or download instead.</span>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 50, fontSize: 11, fontWeight: 700, color: '#0d2420', backgroundColor: accent, border: 'none', cursor: 'pointer' }}>
          <ExternalLink size={11} /> Open
        </button>
        <a href={downloadUrl} download={filename}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 50, fontSize: 11, fontWeight: 700, color: 'rgba(245,240,232,0.8)', backgroundColor: 'rgba(245,240,232,0.12)', textDecoration: 'none' }}>
          <Download size={11} /> Download
        </a>
      </div>
    </div>
  )
}

export default function DocumentViewer({ url, filename, accent }: Props) {
  // Check both filename and url pathname — blob files have random suffixes
  // so the extension lives inside the original filename segment of the pathname.
  const kind: DocKind = kindFromString(filename) ?? kindFromString(url) ?? 'unsupported'
  console.log('[v0] DocumentViewer url:', url)
  console.log('[v0] DocumentViewer filename:', filename)
  console.log('[v0] DocumentViewer kind:', kind)

  // For PDFs: objectUrl holds a blob: URL created from a client-side fetch.
  // The browser fetches /api/cur8/file with the session cookie automatically,
  // gets back the raw PDF bytes, and we render them locally — no external servers.
  const [objectUrl, setObjectUrl] = useState<string>('')
  const [html, setHtml] = useState<string>('')
  const [text, setText] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    let blobUrl = ''

    setLoading(true)
    setError('')
    setObjectUrl('')
    setHtml('')
    setText('')

    ;(async () => {
      try {
        const res = await fetch(url)
        console.log('[v0] fetch status:', res.status, 'content-type:', res.headers.get('content-type'))
        if (!res.ok) throw new Error(`Could not load file (${res.status})`)

        if (kind === 'pdf') {
          // Fetch raw bytes, create a local blob: URL — works on all browsers/devices
          // because it's entirely local (no cross-origin, no auth issue).
          const blob = await res.blob()
          blobUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
          if (!cancelled) setObjectUrl(blobUrl)
        } else if (kind === 'word') {
          const buf = await res.arrayBuffer()
          const mammoth = await import('mammoth')
          const result = await mammoth.convertToHtml({ arrayBuffer: buf })
          if (!cancelled) setHtml(result.value || '<p>This document appears to be empty.</p>')
        } else if (kind === 'sheet') {
          const buf = await res.arrayBuffer()
          const XLSX = await import('xlsx')
          const wb = XLSX.read(buf, { type: 'array' })
          const parts: string[] = []
          wb.SheetNames.forEach((sheetName) => {
            const sheet = wb.Sheets[sheetName]
            const table = XLSX.utils.sheet_to_html(sheet, { header: '' })
            parts.push(`<h3 class="cur8-sheet-title">${sheetName}</h3>${table}`)
          })
          if (!cancelled) setHtml(parts.join('\n'))
        } else if (kind === 'text') {
          if (!cancelled) setText(await res.text())
        } else {
          // unsupported — still set loading false so error state renders
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not open this document')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      // Revoke the blob URL when the component unmounts or url changes
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [url, kind])

  if (loading) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#0a1e1b', color: 'rgba(245,240,232,0.6)' }}>
        <Loader2 size={26} color={accent} style={{ animation: 'cur8spin 0.9s linear infinite' }} />
        <p style={{ fontSize: 12 }}>Opening {filename}…</p>
        <style>{`@keyframes cur8spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // PDF — rendered from a local blob: URL, works on Android and desktop
  if (kind === 'pdf' && objectUrl) {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <iframe
          src={objectUrl}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block', backgroundColor: '#fff' }}
          title={filename}
        />
        <RecoveryBar url={url} filename={filename} accent={accent} />
      </div>
    )
  }

  // Error or unsupported — show open/download buttons
  if (error || kind === 'unsupported' || (kind === 'pdf' && !objectUrl)) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#0a1e1b', color: '#f5f0e8', padding: 32, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {error ? <AlertCircle size={30} color={accent} /> : <FileText size={30} color={accent} />}
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, maxWidth: 320 }}>
          {error || 'This file type can\u2019t be previewed inline yet.'}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 50, fontSize: 12, fontWeight: 700, color: '#0d2420', backgroundColor: accent, border: 'none', cursor: 'pointer' }}>
            <ExternalLink size={13} /> Open file
          </button>
          <a href={`${url}${url.includes('?') ? '&' : '?'}download=1`} download={filename}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 50, fontSize: 12, fontWeight: 700, color: 'rgba(245,240,232,0.8)', backgroundColor: 'rgba(245,240,232,0.12)', textDecoration: 'none' }}>
            <Download size={13} /> Download
          </a>
        </div>
      </div>
    )
  }

  // Rendered Word / Sheet HTML, or plain text
  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', backgroundColor: '#f5f0e8' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 40px' }}>
        {text ? (
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--font-inter), ui-monospace, monospace', fontSize: 14, lineHeight: 1.7, color: '#1a2e2a', margin: 0 }}>{text}</pre>
        ) : (
          <div className="cur8-doc-body" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
      <style>{`
        .cur8-doc-body { color: #1a2e2a; font-family: var(--font-inter), ui-sans-serif, system-ui, sans-serif; font-size: 15px; line-height: 1.75; }
        .cur8-doc-body h1, .cur8-doc-body h2, .cur8-doc-body h3 { font-family: var(--font-playfair), Georgia, serif; color: #0d2420; margin: 1.4em 0 0.5em; line-height: 1.25; }
        .cur8-doc-body h1 { font-size: 26px; } .cur8-doc-body h2 { font-size: 21px; } .cur8-doc-body h3 { font-size: 17px; }
        .cur8-doc-body p { margin: 0 0 0.9em; }
        .cur8-doc-body ul, .cur8-doc-body ol { margin: 0 0 1em; padding-left: 1.4em; }
        .cur8-doc-body li { margin-bottom: 0.35em; }
        .cur8-doc-body a { color: ${accent}; text-decoration: underline; }
        .cur8-doc-body img { max-width: 100%; height: auto; border-radius: 8px; }
        .cur8-doc-body table { border-collapse: collapse; width: 100%; margin: 0 0 1.2em; font-size: 13px; }
        .cur8-doc-body td, .cur8-doc-body th { border: 1px solid #d4cfc4; padding: 6px 10px; text-align: left; }
        .cur8-doc-body tr:first-child td, .cur8-doc-body th { background: #e8e2d5; font-weight: 600; }
        .cur8-sheet-title { font-family: var(--font-playfair), Georgia, serif; color: #0d2420; font-size: 18px; margin: 1.2em 0 0.5em; }
      `}</style>
    </div>
  )
}
