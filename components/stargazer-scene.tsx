'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

const STAR_POINTS = [
  { x: 18, y: 62 },
  { x: 34, y: 34 },
  { x: 52, y: 55 },
  { x: 70, y: 30 },
  { x: 86, y: 58 },
]

type Secret = { id: string; label: string }

const SECRETS: Secret[] = [
  { id: 'moon', label: 'The moon' },
  { id: 'telescope', label: 'The telescope' },
  { id: 'star', label: 'A wishing star' },
  { id: 'sky', label: 'The open sky' },
  { id: 'owl', label: 'The night owl' },
]

// Always-available witty quips while tasks are in progress
const MOON_QUIPS = [
  "The moon is busy. It has phases to go through.",
  "It glows back at you, unimpressed.",
  "You've made eye contact with the moon. Bold.",
  "The moon is minding its business. Take notes.",
]

const OWL_QUIPS = [
  "The owl blinks. It saw that.",
  "Hoo. Just... hoo.",
  "The owl has been tracking your progress. Silently judging.",
  "It ruffles its feathers. Not a fan of being poked mid-session.",
]

const TELESCOPE_QUIPS = [
  "You nudge the telescope. It was already pointed at your unfinished task list.",
  "It swings. There's nothing out there. Or maybe everything.",
  "The telescope was fine where it was, thank you.",
]

const SKY_QUIPS = [
  "Just sky. Infinite, unhelpful sky.",
  "Nothing up there but stars and your pending tasks.",
  "The cosmos offers no assistance. Carry on.",
  "You squint. The universe squints back.",
]

const DARK_STAR_QUIPS = [
  "This star hasn't earned its light yet. Soon.",
  "Patience. Stars don't rush.",
  "Almost. Just one more task.",
  "Dark for now. That's about to change.",
]

const AMBIENT_MURMURS = [
  "Somewhere out there, a comet passes unnoticed.",
  "The telescope adjusts itself. Slightly.",
  "The owl rotates its head 270 degrees. Standard owl business.",
  "A star flickers. Existentially.",
  "The moon pretends not to notice you staring.",
]

// Post-unlock secret reveals — funny and varied
const SECRET_REVEALS: Record<string, string[]> = {
  moon: [
    "Full moon. The sky hums louder. The owl looks annoyed.",
    "Silver light floods the scene. The telescope swings toward it immediately.",
    "You and the moon stare at each other for an uncomfortable amount of time.",
  ],
  telescope: [
    "It swings to a new corner of sky. Something winks back. Concerning.",
    "The lens adjusts. A tiny planet drifts into view, waves, and moves on.",
    "You look through the eyepiece. The telescope looks back.",
  ],
  star: [
    "A shooting star tears across the sky. Make a wish — but quietly.",
    "The wishing star pulses once, like a heartbeat. It heard you.",
    "Three other stars lean in, curious. Then pretend they weren't listening.",
  ],
  sky: [
    "A tiny planet drifts past like it owns the place. It does.",
    "The sky opens up — for exactly 3 seconds — then returns to indifferent vastness.",
    "Nothing happens. Then, somehow, that feels like enough.",
  ],
  owl: [
    "It hoots once. Somewhere across the cosmos, something hoots back.",
    "The owl blinks, stretches one wing, and gives you a look that says: 'Finally.'",
    "It's been watching since task one. It saw everything. Including that.",
  ],
}

export function StargazerScene({
  completedCount,
  unlocked,
  foundSecrets,
  onFoundSecret,
  onWittyToast,
}: {
  completedCount: number
  unlocked: boolean
  foundSecrets: string[]
  onFoundSecret: (id: string) => void
  onWittyToast: (msg: string) => void
}) {
  const [shootingStar, setShootingStar] = useState(false)
  const [owlBlink, setOwlBlink] = useState(false)
  const [moonPulse, setMoonPulse] = useState(false)
  const [ambientMurmur, setAmbientMurmur] = useState<string | null>(null)
  const [wanderingOrb, setWanderingOrb] = useState(false)

  const litStars = completedCount

  // Ambient events while tasks are in progress
  useEffect(() => {
    if (unlocked) return
    const interval = setInterval(() => {
      const roll = Math.random()
      if (roll < 0.4) {
        setAmbientMurmur(AMBIENT_MURMURS[Math.floor(Math.random() * AMBIENT_MURMURS.length)])
        setTimeout(() => setAmbientMurmur(null), 3200)
      } else if (roll < 0.6) {
        setWanderingOrb(true)
        setTimeout(() => setWanderingOrb(false), 2000)
      } else if (roll < 0.72) {
        // Owl randomly blinks on its own
        setOwlBlink(true)
        setTimeout(() => setOwlBlink(false), 400)
      }
    }, 9000)
    return () => clearInterval(interval)
  }, [unlocked])

  function triggerShootingStar() {
    setShootingStar(true)
    setTimeout(() => setShootingStar(false), 1100)
  }

  function tapMoon() {
    setMoonPulse(true)
    setTimeout(() => setMoonPulse(false), 900)
    if (unlocked && !foundSecrets.includes('moon')) {
      const msgs = SECRET_REVEALS.moon
      onWittyToast(msgs[Math.floor(Math.random() * msgs.length)])
      onFoundSecret('moon')
    } else if (!unlocked) {
      onWittyToast(MOON_QUIPS[Math.floor(Math.random() * MOON_QUIPS.length)])
    }
  }

  function tapTelescope() {
    triggerShootingStar()
    if (unlocked && !foundSecrets.includes('telescope')) {
      const msgs = SECRET_REVEALS.telescope
      onWittyToast(msgs[Math.floor(Math.random() * msgs.length)])
      onFoundSecret('telescope')
    } else if (!unlocked) {
      onWittyToast(TELESCOPE_QUIPS[Math.floor(Math.random() * TELESCOPE_QUIPS.length)])
    }
  }

  function tapStar(index: number) {
    const isMiddle = index === 2
    const lit = index < litStars
    if (unlocked && isMiddle && !foundSecrets.includes('star')) {
      triggerShootingStar()
      const msgs = SECRET_REVEALS.star
      onWittyToast(msgs[Math.floor(Math.random() * msgs.length)])
      onFoundSecret('star')
    } else if (!lit) {
      onWittyToast(DARK_STAR_QUIPS[Math.floor(Math.random() * DARK_STAR_QUIPS.length)])
    } else if (lit && !unlocked) {
      onWittyToast("Already done. You earned that one.")
    }
  }

  function tapSky() {
    if (unlocked && !foundSecrets.includes('sky')) {
      triggerShootingStar()
      const msgs = SECRET_REVEALS.sky
      onWittyToast(msgs[Math.floor(Math.random() * msgs.length)])
      onFoundSecret('sky')
    } else {
      onWittyToast(SKY_QUIPS[Math.floor(Math.random() * SKY_QUIPS.length)])
    }
  }

  function tapOwl() {
    setOwlBlink(true)
    setTimeout(() => setOwlBlink(false), 500)
    if (unlocked && !foundSecrets.includes('owl')) {
      const msgs = SECRET_REVEALS.owl
      onWittyToast(msgs[Math.floor(Math.random() * msgs.length)])
      onFoundSecret('owl')
    } else {
      onWittyToast(OWL_QUIPS[Math.floor(Math.random() * OWL_QUIPS.length)])
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-[oklch(0.4_0.06_265/40%)]">
      {/* Night sky gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.32_0.08_265)_0%,oklch(0.2_0.07_270)_45%,oklch(0.14_0.05_275)_100%)]" />

      {/* Distant static starfield */}
      {STATIC_STARS.map((s, i) => (
        <span
          key={i}
          className="pointer-events-none absolute rounded-full bg-[oklch(0.95_0.02_90)]"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r, height: s.r, opacity: s.o }}
        />
      ))}

      {/* Twinkling background stars */}
      {TWINKLE_STARS.map((s, i) => (
        <motion.span
          key={`tw-${i}`}
          className="pointer-events-none absolute rounded-full bg-[oklch(0.92_0.05_90)]"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: 2, height: 2 }}
          animate={{ opacity: [0.2, 0.9, 0.2] }}
          transition={{ duration: s.d, repeat: Infinity, delay: s.delay }}
        />
      ))}

      {/* Clickable open sky zone — always responds, special reveal when unlocked */}
      <button
        type="button"
        aria-label="The open sky"
        onClick={tapSky}
        className="absolute inset-0 h-full w-full outline-none"
        style={{ background: 'transparent' }}
      />

      {/* Moon */}
      <motion.button
        type="button"
        aria-label="The moon"
        onClick={tapMoon}
        className="absolute right-[10%] top-[14%] h-14 w-14 rounded-full outline-none"
        animate={{
          opacity: completedCount >= 3 ? 1 : 0.35,
          scale: moonPulse ? [1, 1.18, 1] : 1,
          boxShadow:
            completedCount >= 3
              ? '0 0 40px 10px oklch(0.9 0.08 90 / 45%)'
              : '0 0 12px 2px oklch(0.9 0.08 90 / 15%)',
        }}
        transition={{ duration: 0.6 }}
      >
        <span className="block h-full w-full rounded-full bg-[radial-gradient(circle_at_35%_35%,oklch(0.96_0.03_90),oklch(0.82_0.05_85))]" />
      </motion.button>

      {/* Aurora ribbon (task 4+) */}
      <AnimatePresence>
        {completedCount >= 4 && (
          <motion.div
            key="aurora"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4 }}
            className="pointer-events-none absolute inset-x-0 top-[8%] h-24"
          >
            <motion.div
              className="h-full w-full bg-[linear-gradient(100deg,transparent,oklch(0.8_0.13_180/60%),oklch(0.75_0.15_150/55%),transparent)] blur-xl"
              animate={{ x: ['-6%', '6%', '-6%'] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Constellation lines — decorative, non-blocking */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {STAR_POINTS.slice(0, Math.max(0, litStars - 1)).map((p, i) => {
          const next = STAR_POINTS[i + 1]
          return (
            <motion.line
              key={`line-${i}`}
              x1={p.x} y1={p.y} x2={next.x} y2={next.y}
              stroke="oklch(0.85 0.12 85 / 70%)"
              strokeWidth={0.4}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.8 }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
            />
          )
        })}
      </svg>

      {/* The five constellation stars — all tappable */}
      {STAR_POINTS.map((p, i) => {
        const lit = i < litStars
        const isSecretStar = i === 2
        return (
          <motion.button
            key={`star-${i}`}
            type="button"
            aria-label={`Star ${i + 1}`}
            onClick={() => tapStar(i)}
            className="absolute -translate-x-1/2 -translate-y-1/2 outline-none"
            style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: 10 }}
            animate={{
              scale: lit ? (unlocked ? [1, 1.15, 1] : 1) : 0.5,
              opacity: lit ? 1 : 0.18,
            }}
            transition={
              unlocked && lit
                ? { duration: 2.4, repeat: Infinity, delay: i * 0.2 }
                : { duration: 0.5 }
            }
          >
            <span
              className="block rounded-full"
              style={{
                width: isSecretStar && unlocked ? 18 : 14,
                height: isSecretStar && unlocked ? 18 : 14,
                background:
                  'radial-gradient(circle, oklch(0.98 0.05 90) 0%, oklch(0.85 0.14 85) 55%, transparent 75%)',
                boxShadow: lit
                  ? `0 0 ${unlocked ? 26 : 16}px ${unlocked ? 8 : 4}px oklch(0.85 0.14 85 / 60%)`
                  : 'none',
              }}
            />
          </motion.button>
        )
      })}

      {/* Floating orb (task 4+) — always tappable mid-task for a quip */}
      <AnimatePresence>
        {completedCount >= 4 && (
          <motion.button
            key="orb"
            type="button"
            aria-label="A drifting light"
            onClick={() => onWittyToast("The orb drifts away, unbothered. It has places to be.")}
            initial={{ opacity: 0 }}
            animate={{
              opacity: 0.8,
              x: wanderingOrb ? ['0%', '120%', '40%', '0%'] : ['0%', '40%', '10%', '0%'],
              y: wanderingOrb ? ['0%', '-60%', '30%', '0%'] : ['0%', '-30%', '20%', '0%'],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: wanderingOrb ? 2 : 12, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute left-[24%] top-[70%] h-3 w-3 rounded-full bg-[oklch(0.85_0.12_180)]"
            style={{ boxShadow: '0 0 18px 6px oklch(0.85 0.12 180 / 55%)', zIndex: 10 }}
          />
        )}
      </AnimatePresence>

      {/* Observatory silhouette */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[26%]">
        <div className="absolute inset-0 bg-[linear-gradient(to_top,oklch(0.1_0.04_275)_20%,transparent)]" />
      </div>

      {/* Telescope — always tappable */}
      <button
        type="button"
        aria-label="The telescope"
        onClick={tapTelescope}
        className="absolute bottom-2 left-[12%] outline-none"
        style={{ zIndex: 10 }}
      >
        <div className="relative h-16 w-2 origin-bottom -rotate-[35deg] rounded-full bg-[oklch(0.45_0.03_265)]">
          <span className="absolute -top-1 left-1/2 h-4 w-5 -translate-x-1/2 rounded-sm bg-[oklch(0.55_0.04_265)]" />
        </div>
        <div className="mx-auto h-6 w-1.5 bg-[oklch(0.4_0.03_265)]" />
        <div className="mx-auto h-1 w-8 rounded bg-[oklch(0.4_0.03_265)]" />
      </button>

      {/* Night owl — always tappable */}
      <button
        type="button"
        aria-label="The night owl"
        onClick={tapOwl}
        className="absolute bottom-2 right-[14%] outline-none"
        style={{ zIndex: 10 }}
      >
        <motion.div
          className="relative h-8 w-7 rounded-t-full bg-[oklch(0.3_0.03_275)]"
          animate={owlBlink ? { rotate: [-2, 2, -1, 0] } : {}}
          transition={{ duration: 0.3 }}
        >
          <span className="absolute left-1 top-2 h-2 w-2 rounded-full bg-[oklch(0.9_0.13_85)]" style={{ opacity: owlBlink ? 0.05 : 1, transition: 'opacity 0.1s' }} />
          <span className="absolute right-1 top-2 h-2 w-2 rounded-full bg-[oklch(0.9_0.13_85)]" style={{ opacity: owlBlink ? 0.05 : 1, transition: 'opacity 0.1s' }} />
          <span className="absolute left-1/2 top-3 h-2 w-1.5 -translate-x-1/2 rounded-b bg-[oklch(0.7_0.12_60)]" />
        </motion.div>
      </button>

      {/* Ambient murmur overlay */}
      <AnimatePresence>
        {ambientMurmur && (
          <motion.div
            key={ambientMurmur}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="pointer-events-none absolute bottom-[28%] left-1/2 w-[80%] -translate-x-1/2 rounded-lg bg-[oklch(0.14_0.05_275/80%)] px-3 py-2 text-center font-serif text-xs italic text-[oklch(0.82_0.08_90)]"
          >
            {ambientMurmur}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shooting star animation */}
      <AnimatePresence>
        {shootingStar && (
          <motion.span
            initial={{ opacity: 0, x: '80%', y: '10%' }}
            animate={{ opacity: [0, 1, 0], x: '10%', y: '45%' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="pointer-events-none absolute h-1 w-16 rounded-full bg-[linear-gradient(90deg,transparent,oklch(0.95_0.05_90))]"
            style={{ boxShadow: '0 0 12px 3px oklch(0.9 0.08 90 / 60%)' }}
          />
        )}
      </AnimatePresence>

      {/* Secrets hint on unlock */}
      <AnimatePresence>
        {unlocked && foundSecrets.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="pointer-events-none absolute bottom-[28%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[oklch(0.14_0.05_275/80%)] px-3 py-1 text-xs text-[oklch(0.82_0.1_85)]"
          >
            The sky has secrets. Poke around.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secret counter */}
      {unlocked && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-[oklch(0.16_0.05_275/70%)] px-3 py-1 text-xs font-medium text-[oklch(0.85_0.1_85)]">
          {foundSecrets.length} of {SECRETS.length} secrets found
        </div>
      )}
    </div>
  )
}

export const STARGAZER_SECRET_COUNT = SECRETS.length

const STATIC_STARS = [
  { x: 8, y: 12, r: 2, o: 0.7 },
  { x: 22, y: 8, r: 1.5, o: 0.5 },
  { x: 44, y: 15, r: 2, o: 0.6 },
  { x: 62, y: 10, r: 1.5, o: 0.5 },
  { x: 78, y: 20, r: 2, o: 0.7 },
  { x: 92, y: 12, r: 1.5, o: 0.4 },
  { x: 14, y: 40, r: 1.5, o: 0.4 },
  { x: 88, y: 42, r: 2, o: 0.5 },
  { x: 50, y: 6, r: 1.5, o: 0.6 },
  { x: 30, y: 22, r: 1.5, o: 0.4 },
]

const TWINKLE_STARS = Array.from({ length: 22 }).map((_, i) => ({
  x: (i * 37) % 100,
  y: (i * 53) % 46,
  d: 1.6 + ((i * 7) % 5) * 0.4,
  delay: (i % 6) * 0.3,
}))
