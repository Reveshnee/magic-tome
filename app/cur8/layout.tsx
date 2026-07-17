import type { ReactNode } from 'react'
import FocusSoundPlayer from '@/components/cur8/widgets/focus-sound-player'
import BrainDump from '@/components/cur8/brain-dump'

export default function Cur8Layout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <BrainDump />
      <FocusSoundPlayer />
    </>
  )
}
