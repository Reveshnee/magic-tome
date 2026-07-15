import Link from 'next/link'

type Theme = {
  href: string
  name: string
  tagline: string
  mood: string
  accent: string
}

const THEMES: Theme[] = [
  {
    href: '/library',
    name: 'The Magic Library',
    tagline: 'Each task you finish shelves a glowing leather book.',
    mood: 'Cozy, candlelit, dark-academia',
    accent: 'oklch(0.82 0.13 82)',
  },
  {
    href: '/stargazer',
    name: "The Stargazer's Sky",
    tagline: 'Each task lights a star and draws tonight\u2019s constellation.',
    mood: 'Calm, wind-down, nervous-system-friendly',
    accent: 'oklch(0.85 0.13 85)',
  },
]

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-10">
      <header>
        <p className="text-sm font-medium text-[oklch(0.8_0.1_85)]">Phoenix&apos;s trackers</p>
        <h1 className="mt-1 text-balance font-serif text-3xl font-semibold text-foreground sm:text-4xl">
          Pick tonight&apos;s ritual
        </h1>
        <p className="mt-2 text-pretty text-muted-foreground">
          Five real follow-ups, one small world to finish them in. A new one waits whenever this
          one gets stale.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        {THEMES.map((theme) => (
          <Link
            key={theme.href}
            href={theme.href}
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-[oklch(0.8_0.12_85)]"
          >
            <span
              className="h-12 w-12 shrink-0 rounded-full"
              style={{
                background: theme.accent,
                boxShadow: `0 0 24px 4px ${theme.accent}`,
              }}
              aria-hidden
            />
            <div className="flex-1">
              <h2 className="font-serif text-xl text-foreground">{theme.name}</h2>
              <p className="mt-0.5 text-pretty text-sm text-muted-foreground">{theme.tagline}</p>
              <p className="mt-1 text-xs text-[oklch(0.72_0.06_300)]">{theme.mood}</p>
            </div>
            <span
              className="text-muted-foreground transition-transform group-hover:translate-x-1"
              aria-hidden
            >
              &rarr;
            </span>
          </Link>
        ))}
      </section>

      <p className="text-center text-xs text-muted-foreground">
        More themes on the way &mdash; ask V for a fresh one anytime.
      </p>
    </main>
  )
}
