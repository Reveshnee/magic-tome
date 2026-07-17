'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'cur8_calm_mode'

// Calm mode reduces motion/animation for overstimulated moments.
// Defaults to the OS "prefers-reduced-motion" setting, then remembers the user's choice.
export function useCalmMode(): [boolean, (v: boolean) => void, boolean] {
  const [calm, setCalm] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let initial = false
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) initial = stored === '1'
      else if (typeof window !== 'undefined' && window.matchMedia) {
        initial = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      }
    } catch {}
    setCalm(initial)
    setReady(true)
  }, [])

  const set = useCallback((v: boolean) => {
    setCalm(v)
    try { localStorage.setItem(STORAGE_KEY, v ? '1' : '0') } catch {}
  }, [])

  return [calm, set, ready]
}
