'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'

export function ReflectionModal({
  tasks,
  onChoose,
  onSkip,
}: {
  tasks: string[]
  onChoose: (index: number) => void
  onSkip: () => void
}) {
  return (
    <Backdrop>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reflection-title"
      >
        <h2
          id="reflection-title"
          className="font-serif text-2xl leading-snug text-foreground text-balance"
        >
          Which one took the most out of you?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No wrong answer. Just the honest one.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          {tasks.map((t, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChoose(i)}
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-left text-sm text-secondary-foreground transition-colors hover:border-primary hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t.trim()}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onSkip}
          className="mt-4 w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Skip this
        </button>
      </motion.div>
    </Backdrop>
  )
}

const CLOSING_LINES = [
  'Five things are off your plate. That is the whole story.',
  'You said you would, and then you actually did. Rare and real.',
  'Nothing here was glamorous. You handled it anyway.',
]

export function FinalReveal({
  tasks,
  chosenIndex,
  secretsFound,
  totalSecrets,
  seed,
  onClose,
}: {
  tasks: string[]
  chosenIndex: number | null
  secretsFound: number
  totalSecrets: number
  seed: number
  onClose: () => void
}) {
  const closing = CLOSING_LINES[seed % CLOSING_LINES.length]

  return (
    <Backdrop>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reveal-title"
      >
        <SparkleField />

        <h2 id="reveal-title" className="font-serif text-3xl text-foreground text-balance">
          The shelf is full.
        </h2>

        {chosenIndex !== null && tasks[chosenIndex]?.trim() && (
          <p className="mt-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground text-pretty">
            <span className="text-primary">&ldquo;{tasks[chosenIndex].trim()}&rdquo;</span> took
            the most out of you. It&apos;s still done.
          </p>
        )}

        <ul className="mt-5 flex flex-col gap-2">
          {tasks.map((t, i) => (
            <li key={i} className="flex items-center gap-3 text-sm text-foreground">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="text-pretty">{t.trim()}</span>
            </li>
          ))}
        </ul>

        <p className="mt-6 font-serif text-lg italic text-muted-foreground text-pretty">
          {closing}
        </p>

        <p className="mt-4 text-xs text-primary">
          The library has settled. Hidden things can now be found among the shelves
          {secretsFound > 0 ? ` — ${secretsFound} of ${totalSecrets} so far.` : '.'}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Explore the library
        </button>
      </motion.div>
    </Backdrop>
  )
}

function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'oklch(0.15 0.04 295 / 78%)', backdropFilter: 'blur(4px)' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

function SparkleField() {
  const sparks = Array.from({ length: 14 }).map((_, i) => ({
    left: (i * 41) % 100,
    top: (i * 27) % 100,
    delay: (i % 6) * 0.2,
  }))
  return (
    <div className="pointer-events-none absolute inset-0">
      {sparks.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: 3,
            height: 3,
            background: 'oklch(0.85 0.12 82)',
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.4, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: s.delay }}
        />
      ))}
    </div>
  )
}
