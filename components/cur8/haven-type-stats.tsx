'use client'

import { Clapperboard, ImageIcon, FileText, Music, Play } from 'lucide-react'
import type { Cur8Item } from '@/lib/cur8-store'

export type StatKind = 'video' | 'image' | 'sound' | 'doc'

const TYPE_META: Record<StatKind, { label: string; icon: typeof Clapperboard }> = {
  video: { label: 'Videos', icon: Clapperboard },
  image: { label: 'Images', icon: ImageIcon },
  sound: { label: 'Sounds', icon: Music },
  doc: { label: 'Documents', icon: FileText },
}

// A row of tappable per-type counts (Videos 2 · Images 3 · Sounds 2 · Documents 7)
// plus an optional "recently opened" strip so the person can jump back to the
// last things they viewed in this haven.
export default function HavenTypeStats({
  items,
  counts,
  activeType,
  onSelectType,
  recent,
  onOpenItem,
  accent,
  isMobile,
}: {
  items: Cur8Item[]
  counts: Record<StatKind, number>
  activeType: StatKind | null
  onSelectType: (k: StatKind | null) => void
  recent: Cur8Item[]
  onOpenItem: (item: Cur8Item) => void
  accent: string
  isMobile?: boolean
}) {
  const order: StatKind[] = ['video', 'image', 'sound', 'doc']
  const visible = order.filter((k) => counts[k] > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: isMobile ? '10px 16px' : '12px 24px', backgroundColor: '#0a1e1b', borderBottom: '1px solid rgba(245,240,232,0.07)' }}>
      {/* Tappable type filter chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
        <TypeChip
          label="All"
          count={items.length}
          active={activeType === null}
          accent={accent}
          onClick={() => onSelectType(null)}
        />
        {visible.map((k) => {
          const meta = TYPE_META[k]
          return (
            <TypeChip
              key={k}
              label={meta.label}
              count={counts[k]}
              icon={meta.icon}
              active={activeType === k}
              accent={accent}
              onClick={() => onSelectType(activeType === k ? null : k)}
            />
          )
        })}
      </div>

      {/* Recently opened strip */}
      {recent.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)' }}>
            Recently opened
          </span>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
            {recent.map((item) => (
              <button
                key={item.id}
                onClick={() => onOpenItem(item)}
                title={item.title}
                style={{ position: 'relative', flexShrink: 0, width: 108, height: 64, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(245,240,232,0.1)', cursor: 'pointer', padding: 0, backgroundColor: `${accent}18` }}
              >
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnail || "/placeholder.svg"} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={16} color={accent} />
                  </div>
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,18,16,0.85) 0%, transparent 60%)' }} />
                <span style={{ position: 'absolute', bottom: 4, left: 6, right: 6, fontSize: 9, fontWeight: 600, color: '#f5f0e8', lineHeight: 1.2, textAlign: 'left', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {item.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TypeChip({
  label, count, icon: Icon, active, accent, onClick,
}: {
  label: string
  count: number
  icon?: typeof Clapperboard
  active: boolean
  accent: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 7, padding: '7px 13px', borderRadius: 50, flexShrink: 0, cursor: 'pointer',
        border: `1px solid ${active ? accent : 'rgba(245,240,232,0.12)'}`,
        backgroundColor: active ? accent : 'rgba(245,240,232,0.05)',
        color: active ? '#fff' : 'rgba(245,240,232,0.75)',
        fontSize: 12.5, fontWeight: 600, transition: 'all 0.15s ease',
      }}
    >
      {Icon && <Icon size={13} />}
      <span>{label}</span>
      <span style={{ fontWeight: 700, fontSize: 12, opacity: active ? 1 : 0.65 }}>{count}</span>
    </button>
  )
}
