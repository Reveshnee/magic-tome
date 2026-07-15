'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import { LibraryScene, type SecretId } from '@/components/library-scene'
import { ReflectionModal, FinalReveal } from '@/components/reflection-reveal'
import { playTaskChime, playSecretChime, playFinale } from '@/lib/magic-sound'

type Task = {
  id: number
  text: string
  done: boolean
}

const ALL_SECRETS: SecretId[] = ['shelf', 'candle', 'orb', 'moon', 'cat']

const SECRET_MESSAGES: Record<SecretId, string> = {
  shelf: 'A loose panel swings open — an empty niche, just for you.',
  candle: 'You pinch the reading candle out. The quiet gets deeper.',
  orb: 'The orb pulses warm and follows your cursor for a heartbeat.',
  moon: 'The window-moon brightens, spilling silver across the spines.',
  cat: 'Two amber eyes blink once, then decide you are trustworthy.',
}

const PLACEHOLDERS = [
  'What are you following up on?',
  'The one you keep putting off…',
  'Another thing on your list',
  'Something you promised someone',
  'The last loose end',
]

export function MagicLibraryTracker() {
  const [tasks, setTasks] = useState<Task[]>(() =>
    Array.from({ length: 5 }, (_, i) => ({ id: i, text: '', done: false })),
  )
  const [reflectPhase, setReflectPhase] = useState<'none' | 'ask' | 'reveal'>('none')
  const [chosenIndex, setChosenIndex] = useState<number | null>(null)
  const [foundSecrets, setFoundSecrets] = useState<Set<SecretId>>(new Set())
  const [toast, setToast] = useState<string | null>(null)
  const [seed] = useState(() => Math.floor(Math.random() * 1000))
  const finaleFired = useRef(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const completedCount = useMemo(() => tasks.filter((t) => t.done).length, [tasks])
  const allDone = completedCount === 5
  // Secrets only become active after the reflection/reveal flow is finished.
  const secretsUnlocked = allDone && reflectPhase === 'none' && finaleFired.current

  const updateText = useCallback((id: number, text: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t)))
  }, [])

  const toggleDone = useCallback(
    (id: number) => {
      setTasks((prev) => {
        const target = prev.find((t) => t.id === id)
        if (!target) return prev
        // Require some typed text before it can be marked done.
        if (!target.done && target.text.trim().length === 0) {
          showToast('Write the task first, then shelve it.')
          return prev
        }
        const next = prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
        const nowDone = next.filter((t) => t.done).length

        if (!target.done) {
          const becameAll = nowDone === 5
          if (becameAll) {
            playFinale()
            // Let the last book animate before asking the reflection question.
            setTimeout(() => setReflectPhase('ask'), 1400)
          } else {
            playTaskChime()
          }
        }
        return next
      })
    },
    [],
  )

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  const discoverSecret = useCallback(
    (id: SecretId) => {
      setFoundSecrets((prev) => {
        if (prev.has(id)) return prev
        const next = new Set(prev)
        next.add(id)
        playSecretChime()
        showToast(SECRET_MESSAGES[id])
        return next
      })
    },
    [showToast],
  )

  const handleChoose = useCallback((index: number) => {
    setChosenIndex(index)
    finaleFired.current = true
    setReflectPhase('reveal')
  }, [])

  const handleSkip = useCallback(() => {
    setChosenIndex(null)
    finaleFired.current = true
    setReflectPhase('reveal')
  }, [])

  const closeReveal = useCallback(() => {
    playFinale()
    setReflectPhase('none')
  }, [])

  const typedTasks = tasks.map((t) => t.text)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="text-center">
        <p className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Magic Library
        </p>
        <h1 className="mt-1 font-serif text-3xl leading-tight text-foreground sm:text-4xl text-balance">
          Shelve your follow-ups
        </h1>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          Five tasks. Five books. Finish one in real life and watch it take its place.
        </p>
      </header>

      <LibraryScene
        completedCount={completedCount}
        allDone={allDone}
        secretsUnlocked={secretsUnlocked}
        foundSecrets={foundSecrets}
        onDiscoverSecret={discoverSecret}
      />

      {/* progress */}
      <div className="flex items-center justify-between gap-4">
        <p className="font-serif text-lg text-foreground">
          {completedCount} of 5 books shelved
        </p>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${(completedCount / 5) * 100}%` }}
            transition={{ type: 'spring', stiffness: 160, damping: 22 }}
          />
        </div>
      </div>

      {secretsUnlocked && (
        <p className="-mt-3 text-center text-xs text-primary">
          {foundSecrets.size} of {ALL_SECRETS.length} secrets found — tap around the library
        </p>
      )}

      {/* task rows */}
      <ul className="flex flex-col gap-3">
        {tasks.map((task, i) => (
          <li key={task.id}>
            <div
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                task.done ? 'border-primary/50 bg-primary/10' : 'border-border bg-card'
              }`}
            >
              <span className="w-5 text-center font-serif text-sm text-muted-foreground">
                {i + 1}
              </span>
              <input
                type="text"
                value={task.text}
                onChange={(e) => updateText(task.id, e.target.value)}
                placeholder={PLACEHOLDERS[i]}
                disabled={task.done}
                aria-label={`Follow-up task ${i + 1}`}
                className={`min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none ${
                  task.done ? 'line-through opacity-70' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => toggleDone(task.id)}
                aria-pressed={task.done}
                aria-label={task.done ? `Mark task ${i + 1} not done` : `Mark task ${i + 1} done`}
                className={`flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  task.done
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-secondary text-secondary-foreground hover:border-primary'
                }`}
              >
                {task.done ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : (
                  <span className="whitespace-nowrap">Mark done</span>
                )}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <footer className="pb-4 text-center text-xs text-muted-foreground">
        Sound plays best after your first tap. Turn it up a little.
      </footer>

      {/* toast for secrets & hints */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-sm rounded-xl border border-border bg-popover px-4 py-3 text-center text-sm text-popover-foreground shadow-xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
            role="status"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* reflection question */}
      <AnimatePresence>
        {reflectPhase === 'ask' && (
          <ReflectionModal tasks={typedTasks} onChoose={handleChoose} onSkip={handleSkip} />
        )}
      </AnimatePresence>

      {/* final reveal */}
      <AnimatePresence>
        {reflectPhase === 'reveal' && (
          <FinalReveal
            tasks={typedTasks}
            chosenIndex={chosenIndex}
            secretsFound={foundSecrets.size}
            totalSecrets={ALL_SECRETS.length}
            seed={seed}
            onClose={closeReveal}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
