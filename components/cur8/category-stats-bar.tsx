'use client'

import { Bookmark, Sparkles, Eye, PenLine, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Cur8Item } from '@/lib/cur8-store'

interface Props {
  items: Cur8Item[]      // already filtered to this category
  reflectionCount: number
  accent: string
  isMobile?: boolean
}

export default function CategoryStatsBar({ items, reflectionCount, accent, isMobile }: Props) {
  const now = Date.now()
  const week = 7 * 86400000
  const thisWeek = items.filter((i) => now - new Date(i.savedAt).getTime() < week).length
  const prevWeek = items.filter((i) => {
    const age = now - new Date(i.savedAt).getTime()
    return age >= week && age < week * 2
  }).length
  const unopened = items.filter((i) => !i.openedAt).length
  const delta = thisWeek - prevWeek

  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  const trendColor = delta > 0 ? '#5a9e84' : delta < 0 ? '#c85a40' : 'rgba(245,240,232,0.4)'
  const trendText = delta > 0 ? `${delta} more than last week` : delta < 0 ? `${Math.abs(delta)} fewer than last week` : 'Same as last week'

  const stats = [
    { icon: Bookmark, value: items.length, label: 'Saved', color: accent },
    { icon: Sparkles, value: thisWeek, label: 'This week', color: '#c9a84c' },
    { icon: Eye, value: unopened, label: 'To revisit', color: unopened > 0 ? '#c85a40' : '#5a9e84' },
    { icon: PenLine, value: reflectionCount, label: 'Reflections', color: '#8ec8b4' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: isMobile ? '12px 16px' : '14px 24px', backgroundColor: '#0a1e1b', borderBottom: '1px solid rgba(245,240,232,0.07)' }}>
      <div style={{ display: 'flex', gap: isMobile ? 8 : 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {stats.map((s) => {
          const SIcon = s.icon
          return (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: isMobile ? '8px 12px' : '9px 16px', borderRadius: 12, backgroundColor: 'rgba(245,240,232,0.05)', border: '1px solid rgba(245,240,232,0.07)', flexShrink: 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <SIcon size={15} color={s.color} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 19, fontWeight: 700, color: '#f5f0e8' }}>{s.value}</span>
                <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.04em', color: 'rgba(245,240,232,0.5)', whiteSpace: 'nowrap' }}>{s.label}</span>
              </div>
            </div>
          )
        })}
      </div>
      {/* Trend line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 2 }}>
        <TrendIcon size={13} color={trendColor} />
        <span style={{ fontSize: 11, color: trendColor, fontWeight: 600 }}>{trendText}</span>
      </div>
    </div>
  )
}
