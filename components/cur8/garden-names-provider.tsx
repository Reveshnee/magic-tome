'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { CATEGORIES } from '@/lib/cur8-store'
import { getGardenNames, renameGarden, resetGardenName } from '@/app/actions/cur8'

// Default names come straight from the store; overrides layer on top per user.
const DEFAULTS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.name, c.displayName]),
)

interface GardenNamesContextValue {
  /** Resolve the current display name for a garden category. */
  displayName: (category: string) => string
  /** The default (built-in) name for a garden. */
  defaultName: (category: string) => string
  /** Whether this garden currently has a custom name. */
  isCustom: (category: string) => boolean
  /** Rename a garden (optimistic). */
  rename: (category: string, name: string) => Promise<void>
  /** Reset a garden back to its default name. */
  reset: (category: string) => Promise<void>
}

const GardenNamesContext = createContext<GardenNamesContextValue | null>(null)

export function GardenNamesProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  useEffect(() => {
    getGardenNames().then(setOverrides).catch(() => {})
  }, [])

  const displayName = useCallback(
    (category: string) => overrides[category] ?? DEFAULTS[category] ?? category,
    [overrides],
  )
  const defaultName = useCallback((category: string) => DEFAULTS[category] ?? category, [])
  const isCustom = useCallback((category: string) => Boolean(overrides[category]), [overrides])

  const rename = useCallback(async (category: string, name: string) => {
    const trimmed = name.trim().slice(0, 40)
    if (!trimmed) return
    setOverrides((prev) => ({ ...prev, [category]: trimmed })) // optimistic
    await renameGarden(category, trimmed).catch(() => {})
  }, [])

  const reset = useCallback(async (category: string) => {
    setOverrides((prev) => {
      const next = { ...prev }
      delete next[category]
      return next
    })
    await resetGardenName(category).catch(() => {})
  }, [])

  return (
    <GardenNamesContext.Provider value={{ displayName, defaultName, isCustom, rename, reset }}>
      {children}
    </GardenNamesContext.Provider>
  )
}

export function useGardenNames() {
  const ctx = useContext(GardenNamesContext)
  if (!ctx) {
    // Safe fallback if used outside the provider — always returns defaults.
    return {
      displayName: (c: string) => DEFAULTS[c] ?? c,
      defaultName: (c: string) => DEFAULTS[c] ?? c,
      isCustom: () => false,
      rename: async () => {},
      reset: async () => {},
    } as GardenNamesContextValue
  }
  return ctx
}
