'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

// Fixed positions for the 5 stars that form the constellation (percentages of the scene box).
const STAR_POINTS = [
  { x: 18, y: 62 },
  { x: 34, y: 34 },
  { x: 52, y: 55 },
  { x: 70, y: 30 },
  { x: 86, y: 58 },
]

type Secret = {
  id: string
  label: string
}

const SECRETS: Secret[] = [
  { id: 'moon', label: 'the moon' },
  { id: 'telescope', label: 'the telescope' },
  { id: 'star', label: 'a wishing star' },
  { id: 'sky', label: 'the open sky' },
  { id: 'owl', label: 'the night owl' },
]

export function StargazerScene({
  completedCount,
  unlocked,
  foundSecrets,
  onFoundSecret,
}: {
  completedCount: number
  unlocked: boolean
  foundSecrets: string[]
  onFoundSecret: (id: string) => void
}) {
  const [shootingStar, setShootingStar] = useState(false)
  const [owlBlink, setOwlBlink] = useState(false)
  const [moonPulse, setMoonPulse] = useState(false)
  const [wishText, setWishText] = useState<string | null>(null)

  const litStars = completedCount

  function discover(id: string) {
    if (!unlocked) return
    onFoundSecret(id)
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-[oklch(0.4_0.06_265/40%)]">
      {/* Night sky gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.32_0.08_265)_0%,oklch(0.2_0.07_270)_45%,oklch(0.14_0.05_275)_100%)]" />

      {/* Distant static starfield */}
      {STATIC_STARS.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-[oklch(0.95_0.02_90)]"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.r,
            height: s.r,
            opacity: s.o,
          }}
        />
      ))}

      {/* Twinkling background stars */}
      {TWINKLE_STARS.map((s, i) => (
        <motion.span
          key={`tw-${i}`}
          className="absolute rounded-full bg-[oklch(0.92_0.05_90)]"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: 2, height: 2 }}
          animate={{ opacity: [0.2, 0.9, 0.2] }}
          transition={{ duration: s.d, repeat: Infinity, delay: s.delay }}
        />
      ))}

      {/* Moon (brightens at task 3, clickable secret after unlock) */}
      <motion.button
        type="button"
        aria-label={unlocked ? 'The moon' : undefined}
        disabled={!unlocked}
        onClick={() => {
          setMoonPulse(true)
          window.setTimeout(() => setMoonPulse(false), 900)
          discover('moon')
        }}
        className="absolute right-[10%] top-[14%] h-14 w-14 rounded-full outline-none"
        style={{ cursor: unlocked ? 'pointer' : 'default' }}
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

      {/* Aurora ribbon (appears at task 4) */}
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

      {/* Constellation lines connecting lit stars */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {STAR_POINTS.slice(0, Math.max(0, litStars - 1)).map((p, i) => {
          const next = STAR_POINTS[i + 1]
          return (
            <motion.line
              key={`line-${i}`}
              x1={p.x}
              y1={p.y}
              x2={next.x}
              y2={next.y}
              stroke="oklch(0.85 0.12 85 / 70%)"
              strokeWidth={0.4}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: unlocked ? 1 : 0.8 }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
            />
          )
        })}
      </svg>

      {/* The five constellation stars */}
      {STAR_POINTS.map((p, i) => {
        const lit = i < litStars
        const isSecretStar = i === 2 // middle star doubles as the wishing-star secret
        return (
          <motion.button
            key={`star-${i}`}
            type="button"
            aria-label={lit ? `Star ${i + 1} of 5, lit` : `Star ${i + 1} of 5, dark`}
            disabled={!(unlocked && isSecretStar)}
            onClick={() => {
              if (unlocked && isSecretStar) {
                setWishText(WISHES[Math.floor(Math.random() * WISHES.length)])
                window.setTimeout(() => setWishText(null), 2600)
                discover('star')
              }
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 outline-none"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              cursor: unlocked && isSecretStar ? 'pointer' : 'default',
            }}
            animate={{
              scale: lit ? (unlocked ? [1, 1.15, 1] : 1) : 0.5,
              opacity: lit ? 1 : 0.18,
            }}
            transition={
              unlocked
                ? { duration: 2.4, repeat: Infinity, delay: i * 0.2 }
                : { duration: 0.5 }
            }
          >
            <span
              className="block rounded-full"
              style={{
                width: 14,
                height: 14,
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

      {/* Wish whisper from the wishing star */}
      <AnimatePresence>
        {wishText && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute left-1/2 top-[46%] w-3/4 -translate-x-1/2 rounded-lg bg-[oklch(0.16_0.05_275/85%)] px-3 py-2 text-center font-serif text-sm text-[oklch(0.92_0.05_90)]"
          >
            {wishText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating light orb (drifts in after task 4, mirrors library's orb idea but distinct) */}
      <AnimatePresence>
        {completedCount >= 4 && (
          <motion.span
            key="orb"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 0.8,
              x: ['0%', '40%', '10%', '0%'],
              y: ['0%', '-30%', '20%', '0%'],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute left-[24%] top-[70%] h-3 w-3 rounded-full bg-[oklch(0.85_0.12_180)]"
            style={{ boxShadow: '0 0 18px 6px oklch(0.85 0.12 180 / 55%)' }}
          />
        )}
      </AnimatePresence>

      {/* Observatory silhouette: telescope + owl on the horizon */}
      <div className="absolute inset-x-0 bottom-0 h-[26%]">
        <div className="absolute inset-0 bg-[linear-gradient(to_top,oklch(0.1_0.04_275)_20%,transparent)]" />

        {/* Telescope */}
        <button
          type="button"
          aria-label={unlocked ? 'The telescope' : undefined}
          disabled={!unlocked}
          onClick={() => {
            setShootingStar(true)
            window.setTimeout(() => setShootingStar(false), 1100)
            discover('telescope')
          }}
          className="absolute bottom-2 left-[12%] outline-none"
          style={{ cursor: unlocked ? 'pointer' : 'default' }}
        >
          <div className="relative h-16 w-2 origin-bottom -rotate-[35deg] rounded-full bg-[oklch(0.45_0.03_265)]">
            <span className="absolute -top-1 left-1/2 h-4 w-5 -translate-x-1/2 rounded-sm bg-[oklch(0.55_0.04_265)]" />
          </div>
          <div className="mx-auto h-6 w-1.5 bg-[oklch(0.4_0.03_265)]" />
          <div className="mx-auto h-1 w-8 rounded bg-[oklch(0.4_0.03_265)]" />
        </button>

        {/* Night owl (peeks, blinks when tapped) */}
        <button
          type="button"
          aria-label={unlocked ? 'The night owl' : undefined}
          disabled={!unlocked}
          onClick={() => {
            setOwlBlink(true)
            window.setTimeout(() => setOwlBlink(false), 500)
            discover('owl')
          }}
          className="absolute bottom-2 right-[14%] outline-none"
          style={{ cursor: unlocked ? 'pointer' : 'default' }}
        >
          <div className="relative h-8 w-7 rounded-t-full bg-[oklch(0.3_0.03_275)]">
            <span className="absolute left-1 top-2 h-2 w-2 rounded-full bg-[oklch(0.9_0.13_85)]" style={{ opacity: owlBlink ? 0.1 : 1 }} />
            <span className="absolute right-1 top-2 h-2 w-2 rounded-full bg-[oklch(0.9_0.13_85)]" style={{ opacity: owlBlink ? 0.1 : 1 }} />
            <span className="absolute left-1/2 top-3 h-2 w-1.5 -translate-x-1/2 rounded-b bg-[oklch(0.7_0.12_60)]" />
          </div>
        </button>

        {/* Clickable open sky zone for a shooting star */}
        <button
          type="button"
          aria-label={unlocked ? 'The open sky' : undefined}
          disabled={!unlocked}
          onClick={() => {
            setShootingStar(true)
            window.setTimeout(() => setShootingStar(false), 1100)
            discover('sky')
          }}
          className="absolute -top-24 left-1/2 h-20 w-1/3 -translate-x-1/2"
          style={{ cursor: unlocked ? 'pointer' : 'default' }}
        />
      </div>

      {/* Shooting star animation */}
      <AnimatePresence>
        {shootingStar && (
          <motion.span
            initial={{ opacity: 0, x: '80%', y: '10%' }}
            animate={{ opacity: [0, 1, 0], x: '10%', y: '45%' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute h-1 w-16 rounded-full bg-[linear-gradient(90deg,transparent,oklch(0.95_0.05_90))]"
            style={{ boxShadow: '0 0 12px 3px oklch(0.9 0.08 90 / 60%)' }}
          />
        )}
      </AnimatePresence>

      {/* Secret counter, only after unlock */}
      {unlocked && (
        <div className="absolute left-3 top-3 rounded-full bg-[oklch(0.16_0.05_275/70%)] px-3 py-1 text-xs font-medium text-[oklch(0.85_0.1_85)]">
          {foundSecrets.length} of {SECRETS.length} secrets found
        </div>
      )}
    </div>
  )
}

export const STARGAZER_SECRET_COUNT = SECRETS.length

const WISHES = [
  'Make a wish. You earned this one.',
  'Rest is also progress.',
  'You showed up. That counted.',
]

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
