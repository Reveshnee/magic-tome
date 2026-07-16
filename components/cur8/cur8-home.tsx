'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { CATEGORIES, SEED_ITEMS, type Cur8Item } from '@/lib/cur8-store'

function useItems(): Cur8Item[] {
  if (typeof window === 'undefined') return SEED_ITEMS
  try {
    const stored = localStorage.getItem('cur8_items')
    return stored ? JSON.parse(stored) : SEED_ITEMS
  } catch {
    return SEED_ITEMS
  }
}

export default function Cur8Home() {
  const items = useItems()

  const countFor = (cat: string) =>
    items.filter((i) => i.category === cat).length

  return (
    <div className="cur8 min-h-screen" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Header */}
      <header className="border-b px-6 py-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
        <div className="mx-auto flex max-w-6xl items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
              Your personal content library
            </p>
            <h1 className="font-serif text-4xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
              Cur<span style={{ color: 'var(--cur8-highlight)' }}>8</span>
            </h1>
          </div>
          <p className="mb-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {items.length} saved {items.length === 1 ? 'item' : 'items'}
          </p>
        </div>
      </header>

      {/* Category grid */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="mb-6 text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
          Choose a category to browse or add new items
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map((cat, i) => {
            const count = countFor(cat.name)
            return (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link href={`/cur8/${cat.name.toLowerCase()}`}>
                  <div
                    className={`group relative cursor-pointer rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${cat.bg}`}
                  >
                    {/* Icon */}
                    <span className={`text-2xl ${cat.color}`}>{cat.icon}</span>

                    {/* Name + description */}
                    <h2 className="mt-3 font-serif text-lg font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
                      {cat.name}
                    </h2>
                    <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                      {cat.description}
                    </p>

                    {/* Item count badge */}
                    <div className="mt-4 flex items-center justify-between">
                      <span className={`text-xs font-semibold ${cat.color}`}>
                        {count} {count === 1 ? 'item' : 'items'}
                      </span>
                      <span className={`text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100 ${cat.color}`}>
                        Open →
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Recent saves strip */}
        {items.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
              Recently saved
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {[...items].reverse().slice(0, 8).map((item) => {
                const cat = CATEGORIES.find((c) => c.name === item.category)
                return (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-44 shrink-0 rounded-xl border bg-white p-3 transition hover:shadow-sm"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="mb-2 h-24 w-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className={`mb-2 flex h-24 w-full items-center justify-center rounded-lg text-3xl ${cat?.bg}`}>
                        <span className={cat?.color}>{cat?.icon}</span>
                      </div>
                    )}
                    <p className="line-clamp-2 text-xs font-medium leading-relaxed" style={{ color: 'var(--foreground)' }}>
                      {item.title}
                    </p>
                    <span className={`mt-1 text-xs ${cat?.color}`}>{item.category}</span>
                  </a>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
