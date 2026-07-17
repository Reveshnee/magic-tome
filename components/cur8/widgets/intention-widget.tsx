'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Sparkles } from 'lucide-react'

const AFFIRMATIONS = [
  { text: "Your ADHD brain is not broken. It is wired for wonder.", tag: "self-compassion" },
  { text: "You do not have to do everything today. One thing, tended well.", tag: "focus" },
  { text: "Rest is not the opposite of productivity. It is the source of it.", tag: "rest" },
  { text: "Your curiosity is your superpower. Lean into it.", tag: "strength" },
  { text: "You are allowed to start small. Seeds become forests.", tag: "growth" },
  { text: "Regulation first, then action. Your nervous system deserves care.", tag: "nervous system" },
  { text: "Every time you return to what matters, you are winning.", tag: "consistency" },
  { text: "You are not behind. You are exactly where you need to be.", tag: "self-compassion" },
  { text: "The scattered mind also sees things the focused mind misses.", tag: "perspective" },
  { text: "Give yourself the same grace you give others.", tag: "compassion" },
  { text: "Overwhelm is a signal, not a verdict. Breathe, then choose one step.", tag: "nervous system" },
  { text: "Your garden grows at its own pace. That pace is perfect.", tag: "patience" },
  { text: "You are curating a life, not just content. Keep going.", tag: "purpose" },
  { text: "Interest, not willpower, is your real fuel. Follow what lights you up.", tag: "adhd" },
  { text: "Progress is not always visible. The roots deepen before the bloom.", tag: "growth" },
]

const TAG_COLORS: Record<string, string> = {
  'self-compassion': '#c85a40',
  'focus': '#5a9e84',
  'rest': '#8ec8b4',
  'strength': '#c9a84c',
  'growth': '#5a9e84',
  'nervous system': '#8ec8b4',
  'consistency': '#c9a84c',
  'perspective': '#c85a40',
  'compassion': '#c85a40',
  'patience': '#5a9e84',
  'purpose': '#c9a84c',
  'adhd': '#c85a40',
}

export default function IntentionWidget() {
  const [idx, setIdx] = useState(0)
  const [key, setKey] = useState(0)

  useEffect(() => {
    const dayIdx = Math.floor(Date.now() / 86400000) % AFFIRMATIONS.length
    setIdx(dayIdx)
  }, [])

  function shuffle() {
    setIdx((i) => (i + 1) % AFFIRMATIONS.length)
    setKey((k) => k + 1)
  }

  const aff = AFFIRMATIONS[idx]
  const tagColor = TAG_COLORS[aff.tag] ?? '#5a9e84'

  return (
    <div style={{ backgroundColor: 'rgba(13,36,32,0.7)', backdropFilter: 'blur(16px)', borderRadius: 20, padding: '18px 20px', border: '1px solid rgba(245,240,232,0.10)', width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)', margin: 0 }}>Today</p>
          <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 14, fontWeight: 600, color: '#f5f0e8', margin: 0 }}>Intention</p>
        </div>
        <button onClick={shuffle}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.35)', display: 'flex', padding: 4 }}
          title="New intention">
          <RefreshCw size={13} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={key}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Sparkles size={13} color={tagColor} style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 13, color: '#f5f0e8', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
              &ldquo;{aff.text}&rdquo;
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 9px', borderRadius: 50, backgroundColor: `${tagColor}22`, color: tagColor, alignSelf: 'flex-start', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {aff.tag}
      </span>
    </div>
  )
}
