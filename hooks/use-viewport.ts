'use client'

import { useState, useEffect } from 'react'

/**
 * Returns responsive breakpoint booleans that update on window resize.
 * isMobile  : < 640px  (phones)
 * isTablet  : 640–1023px
 * isDesktop : >= 1024px
 * Defaults to desktop during SSR so the first paint matches large screens,
 * then corrects on mount.
 */
export function useViewport() {
  const [width, setWidth] = useState<number>(1280)

  useEffect(() => {
    function update() {
      setWidth(window.innerWidth)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return {
    width,
    isMobile: width < 640,
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024,
  }
}
