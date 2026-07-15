'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { StargazerScene, STARGAZER_SECRET_COUNT } from './stargazer-scene'
import { playTaskChime, playSecretChime, playFinale } from '@/lib/magic-sound'

type Task = {
  id: number
  text: string
  done: boolean
}

const CLOSING_LINES = [
  'The list is empty now. That is the whole reward.',
  'You did the actual things, not just planned them. Notice that.',
  'Nothing dramatic happened. You just followed through. That is enough.',
]

const emptyTasks: Task[] = Array.from({ length: 5 }).map((_, i) => ({
  id: i,
  text: '',
  done: false,
}))

export function StargazerTracker() {
  const [tasks, setTasks] = useState<Task[]>(emptyTasks)
  const [foundSecrets, setFoundSecrets] = useState<string[]>([])
  const [showReflection, setShowReflection] = useState(false)
  const [showReveal, setShowReveal] = useState(false)
  const [hardestId, setHardestId] = useState<number | null>(null)
  const [nudgeId, setNudgeId] = useState<number | null>(null)

  const completedCount = tasks.filter((t) => t.done).length
  const allDone = completedCount === 5
  const closingLine = useMemo(
    () => CLOSING_LINES[Math.floor(Math.random() * CLOSING_LINES.length)],
    [],
  )

  function updateText(id: number, text: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t)))
  }

  function toggleDone(id: number) {
    const task = tasks.find((t) => t.id === id)
    if (!task) return

    // Require real, user-typed text before completing.
    if (!task.done && task.text.trim() === '') {
      setNudgeId(id)
      window.setTimeout(() => setNudgeId((n) => (n === id ? null : n)), 1800)
      return
    }

    const willBeDone = !task.done
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: willBeDone } : t)))

    if (willBeDone) {
      const newCount = completedCount + 1
      if (newCount === 5) {
        playFinale()
        window.setTimeout(() => setShowReflection(true), 900)
      } else {
        playTaskChime()
      }
    }
  }

  function foundSecret(id: string) {
    if (foundSecrets.includes(id)) return
    setFoundSecrets((prev) => [...prev, id])
    playSecretChime()
  }

  function chooseHardest(id: number | null) {
    setHardestId(id)
    setShowReflection(false)
    window.setTimeout(() => setShowReveal(true), 300)
  }

  const hardestTask = hardestId != null ? tasks.find((t) => t.id === hardestId) : null

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-balance font-serif text-2xl font-semibold text-[oklch(0.92_0.06_90)] sm:text-3xl">
            The Stargazer&apos;s Sky
          </h1>
          <p className="mt-1 text-pretty text-sm text-muted-foreground">
            Each thing you finish lights a star. Draw tonight&apos;s constellation.
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          All trackers
        </Link>
      </header>

      {/* Scene: ~45% of viewport */}
      <section aria-label="Night sky scene" className="h-[45vh] min-h-64 w-full">
        <StargazerScene
          completedCount={completedCount}
          unlocked={showReveal}
          foundSecrets={foundSecrets}
          onFoundSecret={foundSecret}
        />
      </section>

      {/* Progress */}
      <section aria-label="Progress">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-[oklch(0.85_0.1_85)]">
            {completedCount} of 5 stars lit
          </span>
          {showReveal && (
            <span className="text-muted-foreground">
              {foundSecrets.length} of {STARGAZER_SECRET_COUNT} secrets
            </span>
          )}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full bg-[oklch(0.85_0.13_85)]"
            animate={{ width: `${(completedCount / 5) * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </section>

      {/* Task rows */}
      <section aria-label="Your follow-up tasks" className="flex flex-col gap-3">
        {tasks.map((task, i) => (
          <div
            key={task.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-[oklch(0.85_0.1_85)]">
              {i + 1}
            </span>
            <div className="flex-1">
              <input
                type="text"
                value={task.text}
                onChange={(e) => updateText(task.id, e.target.value)}
                disabled={task.done}
                placeholder="What are you following up on?"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70 disabled:opacity-70"
                aria-label={`Task ${i + 1}`}
              />
              <AnimatePresence>
                {nudgeId === task.id && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-1 text-xs text-[oklch(0.8_0.13_85)]"
                  >
                    Write it down first, then light the star.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <button
              type="button"
              onClick={() => toggleDone(task.id)}
              aria-pressed={task.done}
              aria-label={task.done ? `Mark task ${i + 1} not done` : `Mark task ${i + 1} done`}
              className={`flex h-9 min-w-16 items-center justify-center rounded-full px-3 text-xs font-medium transition-colors ${
                task.done
                  ? 'bg-[oklch(0.85_0.13_85)] text-[oklch(0.2_0.05_275)]'
                  : 'border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {task.done ? 'Lit' : 'Light it'}
            </button>
          </div>
        ))}
      </section>

      {!allDone && (
        <p className="text-center text-xs text-muted-foreground">
          Finish all five to unlock the sky&apos;s hidden secrets.
        </p>
      )}

      {/* Reflection modal */}
      <AnimatePresence>
        {showReflection && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0.12_0.05_275/80%)] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6"
              role="dialog"
              aria-modal="true"
              aria-label="Reflection"
            >
              <h2 className="text-balance font-serif text-xl text-[oklch(0.92_0.06_90)]">
                Which one pulled hardest on you tonight?
              </h2>
              <div className="mt-4 flex flex-col gap-2">
                {tasks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => chooseHardest(t.id)}
                    className="rounded-lg border border-border px-4 py-3 text-left text-sm text-foreground transition-colors hover:border-[oklch(0.85_0.13_85)] hover:bg-secondary"
                  >
                    {t.text.trim() || `Task ${t.id + 1}`}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => chooseHardest(null)}
                className="mt-4 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Skip this
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final reveal */}
      <AnimatePresence>
        {showReveal && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[oklch(0.12_0.05_275/85%)] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              className="my-8 w-full max-w-md rounded-2xl border border-border bg-card p-6"
              role="dialog"
              aria-modal="true"
              aria-label="You finished"
            >
              {hardestTask && hardestTask.text.trim() && (
                <p className="mb-4 text-pretty font-serif text-lg text-[oklch(0.9_0.06_90)]">
                  &ldquo;{hardestTask.text.trim()}&rdquo; took the most out of you. It&apos;s still
                  done.
                </p>
              )}

              <h2 className="font-serif text-xl text-[oklch(0.92_0.06_90)]">Tonight&apos;s sky</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-0.5 text-[oklch(0.85_0.13_85)]" aria-hidden>
                      &#10003;
                    </span>
                    <span>{t.text.trim() || `Task ${t.id + 1}`}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-5 text-pretty text-sm text-muted-foreground">{closingLine}</p>

              <div className="mt-5 rounded-lg bg-secondary p-3 text-xs text-[oklch(0.85_0.1_85)]">
                The sky is unlocked. Tap the moon, the telescope, the middle star, the owl, and the
                open sky to find what&apos;s hidden.
              </div>

              <button
                type="button"
                onClick={() => setShowReveal(false)}
                className="mt-5 w-full rounded-full bg-[oklch(0.85_0.13_85)] py-2.5 text-sm font-medium text-[oklch(0.2_0.05_275)]"
              >
                Explore the sky
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
