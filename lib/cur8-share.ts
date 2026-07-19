// Shared helpers for sharing items OUT (email, WhatsApp, device) and for
// saving/downloading them. Used by the item preview bar, the image gallery,
// and anywhere else an item can be acted on.

// An uploaded device file is served through our private proxy at
// /api/cur8/file?pathname=... — those can be truly downloaded. Everything else
// (YouTube, TikTok, articles) is a link that lives elsewhere, so "save" there
// means copy-the-link.
export function isDownloadableFile(url: string | undefined): boolean {
  if (!url) return false
  return url.startsWith('/api/cur8/file') || url.startsWith('blob:')
}

// Build a mailto: link. We use encodeURIComponent (spaces → %20) rather than
// URLSearchParams (spaces → "+") so the body renders cleanly in every mail app.
export function buildMailtoShare(title: string, url: string): string {
  const subject = encodeURIComponent(title || 'A save from Cur8')
  const body = encodeURIComponent(`${title}\n\n${url}\n\nShared from Cur8`)
  return `mailto:?subject=${subject}&body=${body}`
}

// Build a wa.me link with the title + url as prefilled text.
export function buildWhatsAppShare(title: string, url: string): string {
  const text = encodeURIComponent(`${title}\n${url}`)
  return `https://wa.me/?text=${text}`
}

// A lightweight description of an attachment to include when sharing a note.
export interface ShareAttachment {
  title: string
  url?: string
}

// Turn relative proxy URLs into absolute so links work outside the app.
function absoluteUrl(url: string): string {
  if (typeof window === 'undefined') return url
  return url.startsWith('/') ? `${window.location.origin}${url}` : url
}

// Compose the plain-text body of a note plus any attachment links.
export function composeShareText(body: string, attachments: ShareAttachment[] = []): string {
  const lines = [body.trim()]
  const withLinks = attachments.filter((a) => a.url)
  if (withLinks.length > 0) {
    lines.push('', 'Attachments:')
    for (const a of withLinks) lines.push(`• ${a.title}: ${absoluteUrl(a.url!)}`)
  } else if (attachments.length > 0) {
    lines.push('', `(${attachments.length} attachment${attachments.length === 1 ? '' : 's'})`)
  }
  return lines.join('\n')
}

export function buildMailtoShareWithAttachments(title: string, body: string, attachments: ShareAttachment[] = []): string {
  const subject = encodeURIComponent(title.slice(0, 60) || 'A note from Cur8')
  const text = encodeURIComponent(`${composeShareText(body, attachments)}\n\nShared from Cur8`)
  return `mailto:?subject=${subject}&body=${text}`
}

export function buildWhatsAppShareWithAttachments(body: string, attachments: ShareAttachment[] = []): string {
  return `https://wa.me/?text=${encodeURIComponent(composeShareText(body, attachments))}`
}

export async function shareNoteToDevice(title: string, body: string, attachments: ShareAttachment[] = []): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) return false
  try {
    await navigator.share({ title: title.slice(0, 60) || 'Cur8 note', text: composeShareText(body, attachments) })
    return true
  } catch {
    return false
  }
}

// Open a URL in a new tab reliably (anchor target=_blank is unreliable on
// Android and can navigate away from the PWA).
export function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

// Native device share sheet (Web Share API). Returns true if it was invoked.
export async function shareToDevice(title: string, url: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) return false
  try {
    // Resolve relative proxy URLs to absolute so the target app can open them.
    const absolute = url.startsWith('/') ? `${window.location.origin}${url}` : url
    await navigator.share({ title, text: title, url: absolute })
    return true
  } catch {
    // User cancelled or share failed — treat as no-op.
    return false
  }
}

export function deviceShareSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share
}

// Copy text to the clipboard, with a fallback for older browsers.
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    return true
  } catch {
    return false
  }
}

// Smart save/download. For real uploaded files, trigger a browser download.
// For links, copy the link to the clipboard. Returns a short status label to
// show the user.
export async function saveOrDownload(title: string, url: string): Promise<'downloaded' | 'copied' | 'failed'> {
  if (isDownloadableFile(url)) {
    try {
      const absolute = url.startsWith('/') ? `${window.location.origin}${url}` : url
      const res = await fetch(absolute)
      if (!res.ok) throw new Error('fetch failed')
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = title || 'cur8-file'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(objectUrl), 4000)
      return 'downloaded'
    } catch {
      return 'failed'
    }
  }
  const ok = await copyToClipboard(url)
  return ok ? 'copied' : 'failed'
}
