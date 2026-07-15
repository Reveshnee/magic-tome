'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'

export type SecretId = 'shelf' | 'candle' | 'orb' | 'moon' | 'cat'

type LibrarySceneProps = {
  completedCount: number
  allDone: boolean
  secretsUnlocked: boolean
  foundSecrets: Set<SecretId>
  onDiscoverSecret: (id: SecretId) => void
}

// Warm leather-tone books, each a little different for variety.
const BOOK_STYLES = [
  { spine: '#8a3b2e', accent: '#e9c46a', h: 120, w: 30 },
  { spine: '#2f5d50', accent: '#d9b26f', h: 138, w: 34 },
  { spine: '#7a3b6b', accent: '#e6c76a', h: 108, w: 28 },
  { spine: '#334e7a', accent: '#e9c46a', h: 132, w: 32 },
  { spine: '#5a3921', accent: '#f0d896', h: 146, w: 36 },
]

export function LibraryScene({
  completedCount,
  allDone,
  secretsUnlocked,
  foundSecrets,
  onDiscoverSecret,
}: LibrarySceneProps) {
  // Deterministic dust/star positions so they don't jump on re-render.
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

  const candleLit = completedCount >= 3
  const orbVisible = completedCount >= 4
  const glowIntense = completedCount >= 5

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
      {/* floating dust motes / faint stars */}
      {dust.map((d, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.size,
            height: d.size,
            background: 'oklch(0.85 0.08 90)',
          }}
          animate={{ opacity: [0.1, 0.6, 0.1], y: [0, -6, 0] }}
          transition={{ duration: 4 + (i % 4), repeat: Infinity, delay: d.delay }}
        />
      ))}

      {/* hanging candles from the ceiling */}
      <div className="absolute inset-x-0 top-0 flex justify-around px-6">
        {[0, 1, 2, 3].map((i) => (
          <HangingCandle key={i} index={i} intensity={0.5 + completedCount * 0.1} />
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
              onDiscover={() => onDiscoverSecret('shelf')}
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
            disabled={!secretsUnlocked}
            onClick={() => onDiscoverSecret('candle')}
            className="absolute bottom-4 left-3 flex flex-col items-center sm:left-6 disabled:cursor-default"
            aria-label={secretsUnlocked ? 'A reading candle — tap it' : 'A lit reading candle'}
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
            disabled={!secretsUnlocked}
            onClick={() => onDiscoverSecret('orb')}
            className="absolute right-6 top-1/2 disabled:cursor-default"
            aria-label={secretsUnlocked ? 'A drifting orb of light — tap it' : 'A drifting orb of light'}
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

      {/* hidden crescent moon in a "window" — secret */}
      {secretsUnlocked && (
        <button
          type="button"
          onClick={() => onDiscoverSecret('moon')}
          className="absolute right-4 top-4 h-9 w-9 rounded-full"
          aria-label="A crescent moon glimmers in a high window — tap it"
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
      )}

      {/* hidden library cat peeking from behind a shelf — secret */}
      {secretsUnlocked && (
        <button
          type="button"
          onClick={() => onDiscoverSecret('cat')}
          className="absolute bottom-3 left-1/2 -translate-x-1/2"
          aria-label="Something watches from the shadows — tap it"
        >
          <motion.span
            className="block text-2xl leading-none"
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
      )}
    </div>
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
      disabled={!secretsUnlocked}
      onClick={onDiscover}
      className="group relative flex flex-1 flex-col items-center justify-end disabled:cursor-default"
      style={{ maxWidth: 76 }}
      aria-label={
        secretsUnlocked
          ? `Bookshelf ${index + 1} — tap to inspect`
          : filled
            ? `Bookshelf ${index + 1}, book shelved`
            : `Bookshelf ${index + 1}, empty`
      }
    >
      {/* shelf structure */}
      <div
        className="relative w-full rounded-t-md border-x border-t"
        style={{
          height: 150,
          borderColor: 'oklch(0.35 0.04 60 / 60%)',
          background:
            'linear-gradient(180deg, oklch(0.3 0.045 60) 0%, oklch(0.24 0.04 60) 100%)',
        }}
      >
        {/* two empty inner shelf lines */}
        <div
          className="absolute inset-x-1 top-1/3 h-[3px] rounded"
          style={{ background: 'oklch(0.2 0.03 60)' }}
        />
        {/* the book that slides out and opens when completed */}
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
              {/* glow aura */}
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
              {/* open book: two covers + pages */}
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
                {/* gilt accent band */}
                <span
                  className="absolute inset-x-0 top-1/2 h-[3px]"
                  style={{ background: style.accent, opacity: 0.85 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* base plank */}
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

function HangingCandle({ index, intensity }: { index: number; intensity: number }) {
  return (
    <div className="flex flex-col items-center" style={{ marginTop: 4 + (index % 2) * 14 }}>
      {/* chain */}
      <div
        className="w-[2px]"
        style={{ height: 18 + (index % 3) * 10, background: 'oklch(0.5 0.03 60 / 60%)' }}
      />
      {/* candle body */}
      <div
        className="relative w-3 rounded-sm"
        style={{ height: 22, background: 'oklch(0.85 0.03 90)' }}
      >
        {/* flame */}
        <motion.span
          className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full"
          style={{
            width: 7,
            height: 11,
            background:
              'radial-gradient(circle at 50% 70%, oklch(0.95 0.13 85), oklch(0.7 0.16 55))',
            filter: 'blur(0.3px)',
          }}
          animate={{ scaleY: [1, 1.2, 0.95, 1.1, 1], opacity: [0.85, 1, 0.9, 1, 0.85] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
        {/* light halo */}
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
