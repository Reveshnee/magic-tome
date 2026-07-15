'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'

export type SecretId = 'shelf' | 'candle' | 'orb' | 'moon' | 'cat'

type LibrarySceneProps = {
  completedCount: number
  allDone: boolean
  secretsUnlocked: boolean
  foundSecrets: Set<SecretId>
  onDiscoverSecret: (id: SecretId) => void
  onWittyToast: (msg: string) => void
}

const BOOK_STYLES = [
  { spine: '#8a3b2e', accent: '#e9c46a', h: 120, w: 30 },
  { spine: '#2f5d50', accent: '#d9b26f', h: 138, w: 34 },
  { spine: '#7a3b6b', accent: '#e6c76a', h: 108, w: 28 },
  { spine: '#334e7a', accent: '#e9c46a', h: 132, w: 32 },
  { spine: '#5a3921', accent: '#f0d896', h: 146, w: 36 },
]

// Witty lines for poking things mid-task
const CANDLE_QUIPS = [
  "Careful. That's the only light in here.",
  'The candle flickers, unimpressed.',
  'It refuses to be extinguished. Mood.',
  "Hot. Don't touch. (You touched it, didn't you.)",
  'The flame dances like it owns the place.',
]

const EMPTY_SHELF_QUIPS = [
  'Nothing there yet. Keep going.',
  'An empty shelf waiting patiently.',
  'Room for a book. Or your excuses. Your call.',
  'Tragically bare. Finish a task.',
  'The shelf stares back. Expectantly.',
]

const DUST_QUIPS = [
  'The dust scatters. Rude.',
  'It was minding its own business.',
  'You disturbed 400 years of peace.',
  'The dust relocates. Dramatically.',
]

const AMBIENT_EVENTS = [
  'A book seems to lean slightly toward you.',
  'Something skitters behind the far shelf.',
  'The candle above you gutters in a sourceless breeze.',
  'A page turns somewhere. On its own.',
  'The shadows rearrange themselves. Politely.',
]

// Funny post-unlock secret messages
const SECRET_MESSAGES: Record<SecretId, string[]> = {
  shelf: [
    'A hidden compartment! It contains... a note that says "you found it."',
    'A secret panel! Behind it: another smaller shelf. Shelfception.',
    'Something skitters away. You choose not to investigate further.',
  ],
  candle: [
    'You snuff it. The library judges you silently.',
    'It sputters, then reignites. It will not be told what to do.',
    'The flame whispers: "I knew you\'d come back."',
  ],
  orb: [
    "The orb blinks. It was napping. Apologies all round.",
    'It splits into three tiny sparks, then reassembles, embarrassed.',
    'Warm. Slightly smug. Glows a little brighter now that you noticed.',
  ],
  moon: [
    'The window floods with silver light. A cat outside catches your eye.',
    'Full moon. The library hums one note louder.',
    'You make eye contact with the moon. Neither of you look away first.',
  ],
  cat: [
    "Two amber eyes blink once. Then it knocks a book off on purpose.",
    "The cat has been watching you this whole time. It approves, begrudgingly.",
    "It stretches. Yawns. Somehow this is more satisfying than finishing your tasks.",
  ],
}

export function LibraryScene({
  completedCount,
  allDone,
  secretsUnlocked,
  foundSecrets,
  onDiscoverSecret,
  onWittyToast,
}: LibrarySceneProps) {
  const dust = useMemo(
    () =>
      Array.from({ length: 22 }).map((_, i) => ({
        left: (i * 37) % 100,
        top: (i * 53) % 100,
        delay: (i % 7) * 0.4,
        size: 1 + (i % 3),
      })),
    [],
  )

  const [crazyCandleIndex, setCrazyCandleIndex] = useState<number | null>(null)
  const [wanderingMote, setWanderingMote] = useState(false)
  const catIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const candleLit = completedCount >= 3
  const orbVisible = completedCount >= 4
  const glowIntense = completedCount >= 5

  // Random ambient events while tasks are in progress
  useEffect(() => {
    if (allDone) return
    const interval = setInterval(() => {
      const roll = Math.random()
      if (roll < 0.35) {
        setCrazyCandleIndex(Math.floor(Math.random() * 4))
        setTimeout(() => setCrazyCandleIndex(null), 1200)
      } else if (roll < 0.55) {
        setWanderingMote(true)
        setTimeout(() => setWanderingMote(false), 2000)
      }
    }, 8000)
    return () => clearInterval(interval)
  }, [allDone])

  // Cat demands attention after 30s of inactivity post-unlock
  useEffect(() => {
    if (!secretsUnlocked) return
    catIdleTimer.current = setTimeout(() => {
      onWittyToast("Psst. The cat has been waiting 30 seconds for you to notice it.")
    }, 30000)
    return () => {
      if (catIdleTimer.current) clearTimeout(catIdleTimer.current)
    }
  }, [secretsUnlocked, onWittyToast])

  function tapCandle(index: number) {
    const msg = CANDLE_QUIPS[Math.floor(Math.random() * CANDLE_QUIPS.length)]
    onWittyToast(msg)
    setCrazyCandleIndex(index)
    setTimeout(() => setCrazyCandleIndex(null), 800)
  }

  function tapDust() {
    const msg = DUST_QUIPS[Math.floor(Math.random() * DUST_QUIPS.length)]
    onWittyToast(msg)
  }

  function tapEmptyShelf(index: number) {
    const msg = secretsUnlocked
      ? EMPTY_SHELF_QUIPS[index % EMPTY_SHELF_QUIPS.length]
      : EMPTY_SHELF_QUIPS[Math.floor(Math.random() * EMPTY_SHELF_QUIPS.length)]
    onWittyToast(msg)
  }

  function discoverSecret(id: SecretId) {
    const msgs = SECRET_MESSAGES[id]
    const msg = msgs[Math.floor(Math.random() * msgs.length)]
    onWittyToast(msg)
    onDiscoverSecret(id)
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-border"
      style={{
        height: 'min(45vh, 420px)',
        background:
          'radial-gradient(120% 90% at 50% 10%, oklch(0.3 0.06 295) 0%, oklch(0.2 0.05 295) 55%, oklch(0.15 0.04 295) 100%)',
      }}
      role="img"
      aria-label={`Magical library with ${completedCount} of 5 books shelved`}
    >
      {/* floating dust motes — always tappable for a quip */}
      {dust.map((d, i) => (
        <motion.button
          key={i}
          type="button"
          onClick={tapDust}
          className="absolute rounded-full outline-none"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.size + 4,
            height: d.size + 4,
            background: 'transparent',
          }}
          aria-label="A dust mote"
        >
          <motion.span
            className="block rounded-full"
            style={{
              width: d.size,
              height: d.size,
              background: 'oklch(0.85 0.08 90)',
              margin: 'auto',
            }}
            animate={
              wanderingMote && i === 7
                ? { opacity: [0.1, 0.9, 0.1], x: [0, 18, -12, 0], y: [0, -12, 8, 0] }
                : { opacity: [0.1, 0.6, 0.1], y: [0, -6, 0] }
            }
            transition={{ duration: wanderingMote && i === 7 ? 2 : 4 + (i % 4), repeat: Infinity, delay: d.delay }}
          />
        </motion.button>
      ))}

      {/* hanging ceiling candles — always tappable */}
      <div className="absolute inset-x-0 top-0 flex justify-around px-6">
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => tapCandle(i)}
            className="outline-none"
            aria-label={`Ceiling candle ${i + 1}`}
          >
            <HangingCandle index={i} intensity={0.5 + completedCount * 0.1} frantic={crazyCandleIndex === i} />
          </button>
        ))}
      </div>

      {/* the shelves */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-2 px-3 pb-3 sm:gap-4 sm:px-6">
        {BOOK_STYLES.map((style, i) => {
          const filled = i < completedCount
          return (
            <Bookshelf
              key={i}
              index={i}
              filled={filled}
              style={style}
              glowIntense={glowIntense}
              secretsUnlocked={secretsUnlocked}
              found={foundSecrets.has('shelf')}
              onDiscover={() => filled ? discoverSecret('shelf') : tapEmptyShelf(i)}
            />
          )
        })}
      </div>

      {/* reading candle on a side table (task 3) */}
      <AnimatePresence>
        {candleLit && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => secretsUnlocked ? discoverSecret('candle') : tapCandle(99)}
            className="absolute bottom-4 left-3 flex flex-col items-center sm:left-6"
            aria-label="A reading candle"
          >
            <SideCandle blown={secretsUnlocked && foundSecrets.has('candle')} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* floating orb of light (task 4) */}
      <AnimatePresence>
        {orbVisible && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: [0, 18, -10, 0],
              y: [0, -14, 8, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.8 },
              scale: { duration: 0.8 },
              x: { duration: 9, repeat: Infinity, ease: 'easeInOut' },
              y: { duration: 7, repeat: Infinity, ease: 'easeInOut' },
            }}
            onClick={() => secretsUnlocked ? discoverSecret('orb') : onWittyToast("The orb drifts away, unbothered.")}
            className="absolute right-6 top-1/2"
            aria-label="A drifting orb of light"
          >
            <span
              className="block rounded-full"
              style={{
                width: foundSecrets.has('orb') ? 26 : 18,
                height: foundSecrets.has('orb') ? 26 : 18,
                background:
                  'radial-gradient(circle at 35% 35%, oklch(0.95 0.06 300), oklch(0.72 0.14 300))',
                boxShadow: '0 0 22px 6px oklch(0.72 0.14 300 / 60%)',
                transition: 'all 0.4s ease',
              }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* crescent moon window — teases before unlock, secret after */}
      <button
        type="button"
        onClick={() =>
          secretsUnlocked
            ? discoverSecret('moon')
            : onWittyToast('The moon is minding its business. As are you.')
        }
        className="absolute right-4 top-4 h-9 w-9 rounded-full outline-none"
        aria-label="A crescent moon in a high window"
        style={{
          background: foundSecrets.has('moon')
            ? 'radial-gradient(circle at 60% 40%, oklch(0.95 0.05 90), oklch(0.8 0.12 82))'
            : 'transparent',
          boxShadow: foundSecrets.has('moon')
            ? '0 0 24px 8px oklch(0.82 0.13 82 / 55%)'
            : 'inset -6px -2px 0 0 oklch(0.82 0.1 82 / 35%)',
          transition: 'all 0.5s ease',
        }}
      />

      {/* ambient text hint — floats into view randomly */}
      <AmbientHint allDone={allDone} />

      {/* hidden library cat */}
      <button
        type="button"
        onClick={() =>
          secretsUnlocked
            ? discoverSecret('cat')
            : onWittyToast("Something watches from the shadows. It's judging your pace.")
        }
        className="absolute bottom-3 left-1/2 -translate-x-1/2 outline-none"
        aria-label="Something lurks in the shadows"
      >
        <motion.span
          className="block"
          initial={{ y: 6, opacity: 0.25 }}
          animate={
            foundSecrets.has('cat')
              ? { y: -4, opacity: 1 }
              : { y: [6, 2, 6], opacity: [0.2, 0.4, 0.2] }
          }
          transition={{ duration: 3, repeat: foundSecrets.has('cat') ? 0 : Infinity }}
        >
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{
              background: 'oklch(0.4 0.03 295)',
              boxShadow: foundSecrets.has('cat')
                ? '-6px 0 0 oklch(0.82 0.13 82), 6px 0 0 oklch(0.82 0.13 82)'
                : '-6px 0 0 oklch(0.55 0.1 82 / 60%), 6px 0 0 oklch(0.55 0.1 82 / 60%)',
            }}
          />
        </motion.span>
      </button>

      {/* secret counter */}
      {secretsUnlocked && (
        <div className="absolute left-3 top-3 rounded-full bg-[oklch(0.16_0.05_275/70%)] px-3 py-1 text-xs font-medium text-[oklch(0.85_0.1_85)]">
          {foundSecrets.size} of 5 secrets found
        </div>
      )}

      {/* ambient hint when secrets just unlocked */}
      <AnimatePresence>
        {secretsUnlocked && foundSecrets.size === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="absolute bottom-14 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[oklch(0.16_0.05_275/80%)] px-3 py-1 text-xs text-[oklch(0.82_0.1_85)]"
          >
            The library has secrets. Poke around.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Randomly surfaces a one-liner about the library ambiance mid-session
function AmbientHint({ allDone }: { allDone: boolean }) {
  const [hint, setHint] = useState<string | null>(null)
  useEffect(() => {
    if (allDone) return
    const t = setTimeout(() => {
      setHint(AMBIENT_EVENTS[Math.floor(Math.random() * AMBIENT_EVENTS.length)])
      setTimeout(() => setHint(null), 3200)
    }, 18000 + Math.random() * 12000)
    return () => clearTimeout(t)
  }, [allDone])

  return (
    <AnimatePresence>
      {hint && (
        <motion.div
          key={hint}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="pointer-events-none absolute bottom-[28%] left-1/2 w-[80%] -translate-x-1/2 rounded-lg bg-[oklch(0.16_0.05_275/75%)] px-3 py-2 text-center font-serif text-xs italic text-[oklch(0.82_0.08_90)]"
        >
          {hint}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Bookshelf({
  index,
  filled,
  style,
  glowIntense,
  secretsUnlocked,
  found,
  onDiscover,
}: {
  index: number
  filled: boolean
  style: (typeof BOOK_STYLES)[number]
  glowIntense: boolean
  secretsUnlocked: boolean
  found: boolean
  onDiscover: () => void
}) {
  return (
    <button
      type="button"
      onClick={onDiscover}
      className="group relative flex flex-1 flex-col items-center justify-end"
      style={{ maxWidth: 76 }}
      aria-label={
        filled
          ? `Bookshelf ${index + 1}, book shelved — tap to inspect`
          : `Bookshelf ${index + 1}, empty — tap it`
      }
    >
      <div
        className="relative w-full rounded-t-md border-x border-t"
        style={{
          height: 150,
          borderColor: 'oklch(0.35 0.04 60 / 60%)',
          background:
            'linear-gradient(180deg, oklch(0.3 0.045 60) 0%, oklch(0.24 0.04 60) 100%)',
        }}
      >
        <div
          className="absolute inset-x-1 top-1/3 h-[3px] rounded"
          style={{ background: 'oklch(0.2 0.03 60)' }}
        />
        <AnimatePresence>
          {filled && (
            <motion.div
              className="absolute left-1/2 flex items-center justify-center"
              style={{ bottom: 8 }}
              initial={{ x: '-50%', y: 0, rotateY: 0, opacity: 0 }}
              animate={{
                x: '-50%',
                y: [0, -46, -30],
                rotateY: [0, 0, -22],
                opacity: 1,
              }}
              transition={{ duration: 1.1, times: [0, 0.6, 1], ease: 'easeOut' }}
            >
              <motion.span
                className="absolute rounded-full"
                style={{
                  width: style.w * 2.6,
                  height: style.h * 1.3,
                  background:
                    'radial-gradient(circle, oklch(0.8 0.1 300 / 55%), transparent 70%)',
                }}
                animate={{
                  opacity: glowIntense ? [0.6, 1, 0.6] : [0.3, 0.55, 0.3],
                  scale: glowIntense ? [1, 1.15, 1] : [1, 1.05, 1],
                }}
                transition={{ duration: glowIntense ? 1.6 : 3, repeat: Infinity }}
              />
              <div className="relative flex items-end" style={{ perspective: 400 }}>
                <div
                  className="origin-right rounded-l-sm"
                  style={{
                    width: style.w,
                    height: style.h,
                    background: style.spine,
                    transform: 'rotateY(28deg)',
                    boxShadow: 'inset -4px 0 6px rgba(0,0,0,0.35)',
                  }}
                />
                <div
                  className="-mx-[1px]"
                  style={{
                    width: style.w * 0.9,
                    height: style.h * 0.92,
                    background:
                      'repeating-linear-gradient(180deg, #f3ead2 0 3px, #e6d9b8 3px 4px)',
                  }}
                />
                <div
                  className="origin-left rounded-r-sm"
                  style={{
                    width: style.w,
                    height: style.h,
                    background: style.spine,
                    transform: 'rotateY(-28deg)',
                    boxShadow: 'inset 4px 0 6px rgba(0,0,0,0.35)',
                  }}
                />
                <span
                  className="absolute inset-x-0 top-1/2 h-[3px]"
                  style={{ background: style.accent, opacity: 0.85 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div
        className="h-2 w-[110%] rounded-sm"
        style={{ background: 'oklch(0.26 0.04 60)' }}
      />
      {secretsUnlocked && !found && (
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-md"
          animate={{ boxShadow: ['0 0 0 0 transparent', '0 0 16px 2px oklch(0.82 0.13 82 / 30%)', '0 0 0 0 transparent'] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        />
      )}
    </button>
  )
}

function HangingCandle({ index, intensity, frantic }: { index: number; intensity: number; frantic: boolean }) {
  return (
    <div className="flex flex-col items-center" style={{ marginTop: 4 + (index % 2) * 14 }}>
      <div
        className="w-[2px]"
        style={{ height: 18 + (index % 3) * 10, background: 'oklch(0.5 0.03 60 / 60%)' }}
      />
      <div
        className="relative w-3 rounded-sm"
        style={{ height: 22, background: 'oklch(0.85 0.03 90)' }}
      >
        <motion.span
          className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full"
          style={{
            width: 7,
            height: 11,
            background:
              'radial-gradient(circle at 50% 70%, oklch(0.95 0.13 85), oklch(0.7 0.16 55))',
            filter: 'blur(0.3px)',
          }}
          animate={
            frantic
              ? { scaleY: [1, 1.8, 0.5, 1.4, 1], scaleX: [1, 0.6, 1.3, 0.8, 1], rotate: [-8, 8, -12, 6, 0] }
              : { scaleY: [1, 1.2, 0.95, 1.1, 1], opacity: [0.85, 1, 0.9, 1, 0.85] }
          }
          transition={{ duration: frantic ? 0.7 : 1.4, repeat: frantic ? 0 : Infinity }}
        />
        <span
          className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-full"
          style={{
            width: 46,
            height: 46,
            background: `radial-gradient(circle, oklch(0.82 0.13 82 / ${Math.min(0.35, intensity * 0.3)}), transparent 70%)`,
          }}
        />
      </div>
    </div>
  )
}

function SideCandle({ blown }: { blown: boolean }) {
  return (
    <div className="flex flex-col items-center">
      {!blown ? (
        <motion.span
          className="mb-[1px] rounded-full"
          style={{
            width: 8,
            height: 13,
            background:
              'radial-gradient(circle at 50% 70%, oklch(0.95 0.13 85), oklch(0.7 0.16 55))',
          }}
          animate={{ scaleY: [1, 1.25, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      ) : (
        <motion.span
          className="mb-[1px] block text-[10px]"
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 0.4, y: -6 }}
          style={{ color: 'oklch(0.7 0.02 300)' }}
        >
          ~
        </motion.span>
      )}
      <div className="w-2.5 rounded-sm" style={{ height: 18, background: 'oklch(0.86 0.05 90)' }} />
      <div className="h-1.5 w-6 rounded-sm" style={{ background: 'oklch(0.3 0.04 60)' }} />
    </div>
  )
}
