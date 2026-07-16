'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

const WORK_TOOLS = [
  {
    href: '/ceo',
    title: 'CEO Briefing',
    subtitle: '16 July 2026',
    description: 'Full portfolio update for Venu — all 14 clients, proposals, and your followup list.',
    badge: 'Interactive',
    badgeColor: 'bg-sky-100 text-sky-700',
    accent: 'border-l-sky-500',
    icon: '📋',
  },
  {
    href: '/ceo-static',
    title: 'CEO Briefing',
    subtitle: 'Print / Share version',
    description: 'Clean, printable version. Open the link on any device or save as a PDF.',
    badge: 'Shareable',
    badgeColor: 'bg-slate-100 text-slate-600',
    accent: 'border-l-slate-400',
    icon: '🖨️',
  },
  {
    href: '/dashboard',
    title: 'LFI Dashboard',
    subtitle: 'June 2026',
    description: 'Your full client portfolio — kanban board, financials, wins, and Venu actions.',
    badge: 'Kanban',
    badgeColor: 'bg-teal-100 text-teal-700',
    accent: 'border-l-teal-500',
    icon: '📊',
  },
]

const PERSONAL_TOOLS = [
  {
    href: '/cur8',
    title: 'Cur8',
    subtitle: 'Your personal content library',
    description: '8 categories — YouTube, TikTok, Articles, Images and more. Paste a link, it saves instantly.',
    badge: 'New',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    accent: 'border-l-emerald-400',
    icon: '◈',
  },
  {
    href: '/library',
    title: 'Magic Library',
    subtitle: 'Candlelit dark academia',
    description: 'Five tasks. Five glowing books. Hidden secrets unlock when you finish.',
    badge: 'Daily ritual',
    badgeColor: 'bg-amber-100 text-amber-700',
    accent: 'border-l-amber-400',
    icon: '◉',
  },
  {
    href: '/stargazer',
    title: "Stargazer's Sky",
    subtitle: 'Calm night sky',
    description: 'Five tasks become five stars. Watch your constellation grow as you go.',
    badge: 'Daily ritual',
    badgeColor: 'bg-violet-100 text-violet-700',
    accent: 'border-l-violet-400',
    icon: '◎',
  },
]

function ToolCard({ tool }: { tool: typeof WORK_TOOLS[0] }) {
  return (
    <Link
      href={tool.href}
      className={`group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 border-l-4 ${tool.accent}`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-2xl">
        {tool.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h2 className="font-serif text-lg font-bold leading-tight text-slate-900">
              {tool.title}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{tool.subtitle}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tool.badgeColor}`}>
            {tool.badge}
          </span>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">
          {tool.description}
        </p>
      </div>
      <svg
        className="mt-1 shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-slate-500"
        width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden
      >
        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  )
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-400">
        {count}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  )
}

function getGreeting(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Home() {
  const [greeting, setGreeting] = useState('')
  const [today, setToday] = useState('')

  useEffect(() => {
    const now = new Date()
    setGreeting(getGreeting(now.getHours()))
    setToday(now.toLocaleDateString('en-ZA', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }))
  }, [])

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 font-sans">
      <div className="mx-auto w-full max-w-xl">

        {/* Header */}
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
            Linkfields Innovations
          </p>
          <h1 className="font-serif text-3xl font-bold text-slate-900 text-balance leading-snug">
            {greeting ? `${greeting}, Reveshnee.` : 'Welcome, Reveshnee.'}
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">{today}</p>
        </header>

        {/* Work section */}
        <section className="mb-8" aria-label="Work tools">
          <SectionLabel label="Work" count={WORK_TOOLS.length} />
          <div className="flex flex-col gap-3">
            {WORK_TOOLS.map((tool) => (
              <ToolCard key={tool.href} tool={tool} />
            ))}
          </div>
        </section>

        {/* Personal section */}
        <section className="mb-10" aria-label="Personal tools">
          <SectionLabel label="Personal" count={PERSONAL_TOOLS.length} />
          <div className="flex flex-col gap-3">
            {PERSONAL_TOOLS.map((tool) => (
              <ToolCard key={tool.href} tool={tool} />
            ))}
          </div>
        </section>

        {/* Footer */}
        <p className="text-center text-xs text-slate-300">
          More tools on the way &mdash; just ask V.
        </p>
      </div>
    </main>
  )
}
