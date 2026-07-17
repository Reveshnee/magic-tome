import type { ReactNode } from 'react'
import FocusSoundPlayer from '@/components/cur8/widgets/focus-sound-player'

export default function Cur8Layout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <FocusSoundPlayer />
    </>
  )
}
