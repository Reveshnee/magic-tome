'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function MiniCalendarWidget() {
  // Start null so server and client render identically on first pass (avoids timezone mismatch)
  const [now, setNow] = useState<Date | null>(null)
  const [viewing, setViewing] = useState<{ year: number; month: number } | null>(null)

  useEffect(() => {
    const initial = new Date()
    setNow(initial)
    setViewing({ year: initial.getFullYear(), month: initial.getMonth() })
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  // Everything below is only safe to compute after mount (timezone-sensitive).
  // Return a stable skeleton on the server and first render to avoid hydration mismatches.
  const mounted = now !== null

  const today = mounted ? now!.getDate() : 1
  const todayMonth = mounted ? now!.getMonth() : 0
  const todayYear = mounted ? now!.getFullYear() : 2000

  const { year, month } = viewing ?? { year: todayYear, month: todayMonth }

  function prevMonth() {
    setViewing({ year: month === 0 ? year - 1 : year, month: month === 0 ? 11 : month - 1 })
  }
  function nextMonth() {
    setViewing({ year: month === 11 ? year + 1 : year, month: month === 11 ? 0 : month + 1 })
  }

  // Build calendar grid
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const isToday = (d: number | null) => mounted && d !== null && d === today && month === todayMonth && year === todayYear
  const isCurrentMonth = mounted && month === todayMonth && year === todayYear

  const timeStr = mounted ? now!.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  const dayStr = mounted ? now!.toLocaleDateString([], { weekday: 'long' }) : ''

  return (
    <div style={{ backgroundColor: 'rgba(13,36,32,0.7)', backdropFilter: 'blur(16px)', borderRadius: 20, padding: '18px 20px', border: '1px solid rgba(245,240,232,0.10)', width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Live clock */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)', margin: 0 }}>{dayStr}</p>
          <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 22, fontWeight: 700, color: '#f5f0e8', margin: 0, lineHeight: 1.1 }}>{timeStr}</p>
        </div>
        {isCurrentMonth && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 9, color: 'rgba(245,240,232,0.4)', margin: 0 }}>today</p>
            <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 28, fontWeight: 700, color: '#c9a84c', margin: 0, lineHeight: 1 }}>{today}</p>
          </div>
        )}
      </div>

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.4)', display: 'flex', padding: 2 }}><ChevronLeft size={13} /></button>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(245,240,232,0.8)', letterSpacing: '0.05em' }}>{MONTHS[month]} {year}</span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.4)', display: 'flex', padding: 2 }}><ChevronRight size={13} /></button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {DAYS.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'rgba(245,240,232,0.3)', paddingBottom: 3 }}>{d}</div>
        ))}
        {cells.map((d, i) => (
          <div key={i} style={{
            textAlign: 'center', fontSize: 10, fontWeight: isToday(d) ? 800 : 400,
            color: isToday(d) ? '#0d2420' : d === null ? 'transparent' : 'rgba(245,240,232,0.65)',
            backgroundColor: isToday(d) ? '#c9a84c' : 'transparent',
            borderRadius: 6,
            padding: '3px 0',
            lineHeight: 1.5,
          }}>{d ?? ''}</div>
        ))}
      </div>
    </div>
  )
}
