'use client'

/**
 * KoiLeap — an orange koi leaps out of the pond, arcs across the screen and
 * dives into the haven the user just chose, with a water splash at launch and
 * landing. It's a small piece of delight, but it carries meaning for Reveshnee:
 * the fish returning to open water — being in its element — each time she steps
 * into one of her havens.
 *
 * The parent captures the click point (the tile) as `origin`, then navigates
 * when `onComplete` fires (mid-dive, so the splash covers the page transition).
 */

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

export interface KoiLeapProps {
  active: boolean
  origin: { x: number; y: number } | null
  onComplete: () => void
}

const TOTAL = 1.05 // seconds — full leap
const NAV_AT = 0.72 // fraction of TOTAL when we hand off to navigation

export default function KoiLeap({ active, origin, onComplete }: KoiLeapProps) {
  const [vp, setVp] = useState({ w: 0, h: 0 })
  const firedRef = useRef(false)

  useEffect(() => {
    if (!active) return
    setVp({ w: window.innerWidth, h: window.innerHeight })
    firedRef.current = false
    const t = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true
        onComplete()
      }
    }, TOTAL * NAV_AT * 1000)
    return () => clearTimeout(t)
  }, [active, onComplete])

  if (!active || !origin || vp.w === 0) return null

  const koiSize = vp.w < 640 ? 92 : 129
  // Launch from the bottom (the pond surface), roughly under the chosen tile.
  const startX = Math.min(Math.max(origin.x, koiSize / 2), vp.w - koiSize / 2)
  const startY = vp.h + koiSize * 0.5
  // Dive into the chosen tile.
  const endX = origin.x
  const endY = origin.y
  // Peak of the arc — high enough to feel like a real leap.
  const peakY = Math.max(40, Math.min(startY, endY) - vp.h * 0.32)
  const midX = (startX + endX) / 2

  return (
    <div
      aria-hidden
      style={{ position: 'fixed', inset: 0, zIndex: 200, pointerEvents: 'none', overflow: 'hidden' }}
    >
      {/* Launch splash — at the pond surface (bottom) */}
      <Splash x={startX} y={vp.h} delay={0} scale={vp.w < 640 ? 1 : 1.35} />

      {/* Landing splash — where the koi dives into the tile */}
      <Splash x={endX} y={endY} delay={TOTAL * 0.62} scale={vp.w < 640 ? 0.85 : 1.1} />

      {/* The koi */}
      <motion.img
        src="/cur8/koi-leap.png"
        alt=""
        initial={{ x: startX - koiSize / 2, y: startY - koiSize / 2, rotate: 18, scale: 0.72, opacity: 0 }}
        animate={{
          x: [startX - koiSize / 2, midX - koiSize / 2, endX - koiSize / 2],
          y: [startY - koiSize / 2, peakY - koiSize / 2, endY - koiSize / 2],
          rotate: [18, -8, 46],
          scale: [0.72, 1, 0.8],
          opacity: [0, 1, 1, 0.15],
        }}
        transition={{
          duration: TOTAL,
          ease: [0.33, 0, 0.35, 1],
          times: [0, 0.5, 1],
          opacity: { duration: TOTAL, times: [0, 0.12, 0.82, 1] },
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: koiSize,
          height: koiSize,
          objectFit: 'contain',
          filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.45))',
          willChange: 'transform',
        }}
      />
    </div>
  )
}

/** A water splash — expanding rings plus a few droplets that arc and fall. */
function Splash({ x, y, delay, scale }: { x: number; y: number; delay: number; scale: number }) {
  const rings = [0, 0.08, 0.16]
  const droplets = [-70, -40, -12, 18, 46, 72]
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)' }}>
      {/* Expanding ripple rings */}
      {rings.map((d, i) => (
        <motion.span
          key={`r${i}`}
          initial={{ width: 0, height: 0, opacity: 0 }}
          animate={{ width: [0, 120 * scale], height: [0, 44 * scale], opacity: [0, 0.5, 0] }}
          transition={{ duration: 0.7, delay: delay + d, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: '2px solid rgba(200,235,222,0.85)',
            boxSizing: 'border-box',
          }}
        />
      ))}
      {/* Droplets */}
      {droplets.map((dx, i) => (
        <motion.span
          key={`d${i}`}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.6 }}
          animate={{
            x: dx * scale,
            y: [0, -46 * scale - Math.abs(dx) * 0.3, 10 * scale],
            opacity: [0, 1, 0],
            scale: [0.6, 1, 0.5],
          }}
          transition={{ duration: 0.6, delay: delay + 0.02 * i, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 7 * scale,
            height: 7 * scale,
            borderRadius: '50%',
            backgroundColor: 'rgba(214,240,229,0.95)',
            boxShadow: '0 0 6px rgba(142,200,180,0.6)',
          }}
        />
      ))}
    </div>
  )
}
