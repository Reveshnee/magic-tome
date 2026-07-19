'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { Cur8Item } from '@/lib/cur8-store'

// ── Stop words — common words that carry no meaning ──────────────────────────
const STOP = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','as','is','was','are','were','be','been','being','have','has',
  'had','do','does','did','will','would','could','should','may','might',
  'shall','can','need','dare','ought','used','i','you','he','she','it','we',
  'they','me','him','her','us','them','my','your','his','its','our','their',
  'this','that','these','those','what','which','who','how','why','when',
  'where','all','any','both','each','few','more','most','other','some',
  'such','no','not','only','same','so','than','too','very','just','about',
  'into','through','during','before','after','above','below','between',
  'out','off','up','down','over','under','again','then','once','here',
  'there','s','t','re','ve','ll','d','m','www','com','https','http',
  'watch','video','like','make','get','also','new','one','two','three',
  // File extensions & MIME-type fragments that leak in from uploaded filenames
  'mp4','mov','webm','avi','mkv','m4v','3gp','mp3','wav','ogg','m4a','aac',
  'pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv','md','jpg','jpeg',
  'png','gif','webp','avif','heic','heif','svg',
  'vnd','openxmlformats','officedocument','wordprocessingml','spreadsheetml',
  'presentationml','application','msword','document','sheet','presentation',
  'octet','stream','binary','mimetype','x-msvideo','quicktime','matroska',
  'untitled','copy','final','draft','version','file','files','download','downloads',
])

// Strip file-name / MIME noise before tokenising: trailing extensions, blob
// hash suffixes (name-AbC123.pdf), and slash/dot separated MIME strings.
function cleanText(raw: string): string {
  return raw
    // remove MIME types like application/vnd.openxmlformats-officedocument...
    .replace(/[a-z]+\/[a-z0-9.\-+]+/gi, ' ')
    // remove file extensions at word boundaries (.docx .pdf .mp4 etc.)
    .replace(/\.(mp4|mov|webm|avi|mkv|m4v|3gp|mp3|wav|ogg|m4a|aac|pdf|docx?|xlsx?|pptx?|txt|csv|md|jpe?g|png|gif|webp|avif|heic|heif|svg)\b/gi, ' ')
    // remove blob hash suffixes: -a1B2c3D4e5 (10+ mixed alnum) appended to names
    .replace(/-[a-z0-9]{8,}\b/gi, ' ')
}

interface WordEntry {
  word: string
  count: number
  size: number   // 12-30 px
  opacity: number
  color: string
}

const COLORS = ['#c9a84c', '#5a9e84', '#8ec8b4', '#c85a40', '#f5f0e8', '#c9a84c80']

function extractWords(items: Pick<Cur8Item, 'title' | 'description'>[]): WordEntry[] {
  const freq: Record<string, number> = {}
  for (const item of items) {
    const text = cleanText(`${item.title ?? ''} ${item.description ?? ''}`)
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .split(/\s+/)
      .map((w) => w.replace(/^['-]+|['-]+$/g, ''))
      // require at least one vowel so technical/hash tokens (e.g. "xqz") drop out
      .filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w) && /[aeiou]/.test(w))
    for (const w of words) {
      freq[w] = (freq[w] ?? 0) + 1
    }
  }
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 60)
  if (sorted.length === 0) return []
  const max = sorted[0][1]
  const min = sorted[sorted.length - 1][1]
  const range = max - min || 1
  return sorted.map(([word, count], i) => ({
    word,
    count,
    size: Math.round(12 + ((count - min) / range) * 18),
    opacity: 0.55 + ((count - min) / range) * 0.45,
    color: COLORS[i % COLORS.length],
  }))
}

interface Props {
  items: Pick<Cur8Item, 'id' | 'title' | 'description'>[]
  onFilter?: (word: string | null) => void
  activeWord?: string | null
  compact?: boolean   // smaller variant for haven panel
}

export default function WordMap({ items, onFilter, activeWord, compact = false }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)
  const words = useMemo(() => extractWords(items), [items])

  if (words.length < 3) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 12 }}>
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(245,240,232,0.4)' }}>
            Word map — {items.length} saves
          </p>
          {activeWord && (
            <button onClick={() => onFilter?.(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 50, fontSize: 10.5, fontWeight: 600, color: '#c9a84c', backgroundColor: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', cursor: 'pointer' }}>
              <X size={9} /> clear
            </button>
          )}
        </div>
      )}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: compact ? 6 : 9, alignItems: 'center',
        padding: compact ? '10px 12px' : '14px 16px',
        borderRadius: 12, backgroundColor: 'rgba(13,36,32,0.6)',
        border: '1px solid rgba(245,240,232,0.07)',
        minHeight: compact ? 60 : 90,
      }}>
        {words.map((w) => {
          const isActive = activeWord === w.word
          const isHov = hovered === w.word
          return (
            <motion.button
              key={w.word}
              onMouseEnter={() => setHovered(w.word)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onFilter?.(isActive ? null : w.word)}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.96 }}
              style={{
                background: isActive ? 'rgba(201,168,76,0.18)' : isHov ? 'rgba(245,240,232,0.06)' : 'none',
                border: isActive ? '1px solid rgba(201,168,76,0.5)' : '1px solid transparent',
                borderRadius: 6,
                padding: compact ? '2px 5px' : '3px 7px',
                cursor: 'pointer',
                fontSize: compact ? Math.max(10, w.size * 0.75) : w.size,
                fontWeight: w.count > 2 ? 700 : 500,
                color: isActive ? '#c9a84c' : w.color,
                opacity: isActive ? 1 : isHov ? 1 : w.opacity,
                lineHeight: 1.3,
                transition: 'background 0.15s, border-color 0.15s, opacity 0.15s',
              }}
            >
              {w.word}
              {isActive && <span style={{ fontSize: compact ? 8 : 9, marginLeft: 3, opacity: 0.7 }}>×</span>}
            </motion.button>
          )
        })}
      </div>
      {activeWord && !compact && (
        <AnimatePresence>
          <motion.p
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ margin: 0, fontSize: 11.5, color: 'rgba(245,240,232,0.55)', fontStyle: 'italic' }}>
            Showing saves containing &ldquo;{activeWord}&rdquo;
          </motion.p>
        </AnimatePresence>
      )}
    </div>
  )
}
