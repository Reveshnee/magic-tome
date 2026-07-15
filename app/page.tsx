import Link from 'next/link'

const TOOLS = [
  {
    href: '/dashboard',
    title: 'LFI Dashboard',
    description: 'Client portfolio · Kanban board · Financials · Wins',
    badge: '13 clients',
    accentFrom: 'rgba(20,184,166,0.18)',
    accentTo: 'rgba(20,184,166,0.04)',
    border: 'border-teal-500/30',
    dot: 'bg-teal-400',
    glow: '0 0 28px 0px rgba(20,184,166,0.18)',
  },
  {
    href: '/library',
    title: 'Magic Library',
    description: 'Five tasks. Five glowing books. Hidden secrets after.',
    badge: 'Daily ritual',
    accentFrom: 'oklch(0.82 0.13 82 / 18%)',
    accentTo: 'oklch(0.82 0.13 82 / 3%)',
    border: 'border-[oklch(0.82_0.13_82/30%)]',
    dot: 'bg-[oklch(0.82_0.13_82)]',
    glow: '0 0 28px 0px oklch(0.82 0.13 82 / 18%)',
  },
  {
    href: '/stargazer',
    title: "Stargazer's Sky",
    description: 'Five tasks. Five stars. A constellation by the end.',
    badge: 'Daily ritual',
    accentFrom: 'rgba(139,92,246,0.18)',
    accentTo: 'rgba(139,92,246,0.04)',
    border: 'border-violet-500/30',
    dot: 'bg-violet-400',
    glow: '0 0 28px 0px rgba(139,92,246,0.18)',
  },
]

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[oklch(0.16_0.04_270)] px-4 py-14 font-sans">
      <div className="w-full max-w-lg">

        <header className="mb-10 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Phoenix&apos;s workspace
          </p>
          <h1 className="font-serif text-4xl font-bold text-balance text-foreground">
            What do you need today?
          </h1>
          <p className="mt-3 text-sm text-muted-foreground text-pretty">
            Your tools, all in one place. Pick one and go.
          </p>
        </header>

        <div className="flex flex-col gap-3">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 hover:scale-[1.015] hover:shadow-xl active:scale-[0.99] ${tool.border}`}
              style={{
                background: `linear-gradient(135deg, ${tool.accentFrom}, ${tool.accentTo})`,
                boxShadow: tool.glow,
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${tool.dot}`} />
                    <h2 className="font-serif text-xl font-bold text-foreground leading-none">
                      {tool.title}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-4">
                    {tool.description}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-3">
                  <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                    {tool.badge}
                  </span>
                  <svg
                    className="text-muted-foreground transition-transform duration-200 group-hover:translate-x-1"
                    width="16" height="16" viewBox="0 0 16 16" fill="none"
                    aria-hidden
                  >
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          More tools on the way &mdash; ask V for a fresh one anytime.
        </p>
      </div>
    </main>
  )
}
