'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Mail, MessageCircle, Smartphone, Link2, Download, Check } from 'lucide-react'
import {
  buildMailtoShare,
  buildWhatsAppShare,
  buildMailtoShareWithAttachments,
  buildWhatsAppShareWithAttachments,
  composeShareText,
  shareToDevice,
  shareNoteToDevice,
  deviceShareSupported,
  copyToClipboard,
  saveOrDownload,
  isDownloadableFile,
  openExternal,
  type ShareAttachment,
} from '@/lib/cur8-share'

export default function ShareMenu({
  title,
  url,
  accent,
  showLabel = false,
  buttonStyle,
  noteBody,
  attachments,
}: {
  title: string
  url: string
  accent: string
  showLabel?: boolean
  buttonStyle?: React.CSSProperties
  // When sharing a note/reflection, pass its text + attachments so they're
  // bundled into the share (email/WhatsApp/device/copy) instead of just a link.
  noteBody?: string
  attachments?: ShareAttachment[]
}) {
  const isNote = noteBody != null
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<{ x: number; top?: number; bottom?: number } | null>(null)
  const [status, setStatus] = useState('')
  const btnRef = useRef<HTMLButtonElement>(null)

  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    const r = btnRef.current?.getBoundingClientRect()
    if (r) {
      const x = Math.min(r.right, window.innerWidth - 12)
      // Open upward when the button sits in the lower half of the screen,
      // downward otherwise. We anchor with top/bottom directly because Framer
      // Motion's `y` animation overrides any CSS transform we set.
      if (r.top > window.innerHeight / 2) {
        setAnchor({ x, bottom: window.innerHeight - r.top + 8 })
      } else {
        setAnchor({ x, top: r.bottom + 8 })
      }
    }
    setOpen(true)
  }

  function flash(msg: string) {
    setStatus(msg)
    setTimeout(() => setStatus(''), 1800)
  }

  const downloadable = isDownloadableFile(url)
  const deviceOk = deviceShareSupported()
  const canPortal = typeof document !== 'undefined'

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        title="Share or save"
        style={
          buttonStyle ?? {
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 50,
            fontSize: 11, fontWeight: 700, color: 'rgba(245,240,232,0.8)', backgroundColor: 'rgba(245,240,232,0.08)',
            border: 'none', cursor: 'pointer', flexShrink: 0,
          }
        }
      >
        <Share2 size={11} /> {showLabel && 'Share'}
      </button>

      {/* Portal is always mounted; AnimatePresence lives INSIDE it so it can
          track the menu's mount/unmount. (Wrapping a portal in AnimatePresence
          the other way around silently fails to render.) */}
      {canPortal && createPortal(
        <AnimatePresence>
          {open && anchor && (
            <>
              {/* Transparent backdrop — React onClick keeps other handlers intact. */}
              <div
                key="share-backdrop"
                onClick={() => setOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 300 }}
              />
              <motion.div
                key="share-menu"
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.14 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  left: Math.max(12, anchor.x - 210),
                  ...(anchor.top != null ? { top: anchor.top } : { bottom: anchor.bottom }),
                  zIndex: 301,
                  width: 210,
                  borderRadius: 14,
                  border: '1px solid rgba(245,240,232,0.14)',
                  backgroundColor: '#122e29',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
                  overflow: 'hidden',
                  padding: 6,
                }}
              >
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)', padding: '4px 8px 6px' }}>
                  Share
                </p>
                <MenuRow icon={<Mail size={14} />} label="Email" onClick={() => { openExternal(isNote ? buildMailtoShareWithAttachments(title, noteBody!, attachments) : buildMailtoShare(title, url)); setOpen(false) }} />
                <MenuRow icon={<MessageCircle size={14} />} label="WhatsApp" onClick={() => { openExternal(isNote ? buildWhatsAppShareWithAttachments(noteBody!, attachments) : buildWhatsAppShare(title, url)); setOpen(false) }} />
                {deviceOk && (
                  <MenuRow icon={<Smartphone size={14} />} label="This device" onClick={async () => { setOpen(false); if (isNote) await shareNoteToDevice(title, noteBody!, attachments); else await shareToDevice(title, url) }} />
                )}
                <div style={{ height: 1, backgroundColor: 'rgba(245,240,232,0.09)', margin: '5px 4px' }} />
                <MenuRow
                  icon={<Link2 size={14} />}
                  label={isNote ? 'Copy text' : 'Copy link'}
                  onClick={async () => { const ok = await copyToClipboard(isNote ? composeShareText(noteBody!, attachments) : url); setOpen(false); flash(ok ? (isNote ? 'Copied' : 'Link copied') : 'Copy failed') }}
                />
                {!isNote && (
                  <MenuRow
                    icon={<Download size={14} />}
                    label={downloadable ? 'Download file' : 'Save (copy link)'}
                    accent={accent}
                    onClick={async () => {
                      setOpen(false)
                      const res = await saveOrDownload(title, url)
                      flash(res === 'downloaded' ? 'Downloading…' : res === 'copied' ? 'Link copied' : 'Could not save')
                    }}
                  />
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {status && canPortal && createPortal(
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 400, backgroundColor: '#122e29', color: '#f5f0e8', border: '1px solid rgba(245,240,232,0.14)', borderRadius: 50, padding: '9px 18px', fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <Check size={13} style={{ color: accent }} /> {status}
        </div>,
        document.body,
      )}
    </>
  )
}

function MenuRow({ icon, label, onClick, accent }: { icon: React.ReactNode; label: string; onClick: () => void; accent?: string }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 8px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, color: accent ?? '#f5f0e8', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(245,240,232,0.07)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <span style={{ opacity: 0.85, display: 'flex' }}>{icon}</span> {label}
    </button>
  )
}
