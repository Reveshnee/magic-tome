'use client'

import { motion } from 'framer-motion'
import { PenLine, Headphones } from 'lucide-react'

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
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
            <circle cx="9" cy="7.5" r="3.5" stroke="#c9a84c" strokeWidth="1.6" />
            <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#c9a84c" strokeWidth="1.6" strokeLinecap="round" />
            <rect x="15.5" y="5" width="5" height="7" rx="1" stroke="#c9a84c" strokeWidth="1.5" />
            <line x1="17" y1="7" x2="19.5" y2="10" stroke="#c9a84c" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
          </svg>
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
