'use client'

import { motion } from 'framer-motion'
import { PenLine, Lightbulb, Headphones } from 'lucide-react'

const ACCENT = '#c9a84c'

export default function HomeQuickActions() {
  return (
    <>
      {/* ── Three action buttons in a row ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>

        {/* Brain Dump trigger — opens the global BrainDump panel via custom event */}
        <motion.button
          onClick={() => window.dispatchEvent(new Event('cur8:openBrainDump'))}
          whileTap={{ scale: 0.95 }}
          style={{
            flex: 1, minWidth: 120,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px 18px', borderRadius: 16, cursor: 'pointer',
            backgroundColor: 'rgba(200,90,64,0.15)', border: '1px solid rgba(200,90,64,0.3)',
            color: '#f5f0e8', fontSize: 13, fontWeight: 700,
          }}
        >
          <PenLine size={15} color="#c85a40" />
          Brain Dump
        </motion.button>

        {/* Reflect trigger — opens the global GlobalReflect panel via custom event */}
        <motion.button
          onClick={() => window.dispatchEvent(new Event('cur8:openReflect'))}
          whileTap={{ scale: 0.95 }}
          style={{
            flex: 1, minWidth: 120,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px 18px', borderRadius: 16, cursor: 'pointer',
            backgroundColor: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)',
            color: '#f5f0e8', fontSize: 13, fontWeight: 700,
          }}
        >
          <Lightbulb size={15} color={ACCENT} />
          Reflect
        </motion.button>

        {/* Focus Sounds trigger — opens the global FocusSoundPlayer panel via custom event */}
        <motion.button
          onClick={() => window.dispatchEvent(new Event('cur8:openFocusSounds'))}
          whileTap={{ scale: 0.95 }}
          style={{
            flex: 1, minWidth: 120,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px 18px', borderRadius: 16, cursor: 'pointer',
            backgroundColor: 'rgba(90,158,132,0.1)', border: '1px solid rgba(90,158,132,0.25)',
            color: '#f5f0e8', fontSize: 13, fontWeight: 700,
          }}
        >
          <Headphones size={15} color="#5a9e84" />
          Focus Sounds
        </motion.button>
      </div>
    </>
  )
}
