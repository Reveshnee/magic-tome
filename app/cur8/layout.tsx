import type { ReactNode } from 'react'
import FocusSoundPlayer from '@/components/cur8/widgets/focus-sound-player'
import BrainDump from '@/components/cur8/brain-dump'
import GlobalReflect from '@/components/cur8/global-reflect'
import { GardenNamesProvider } from '@/components/cur8/garden-names-provider'

export default function Cur8Layout({ children }: { children: ReactNode }) {
  return (
    <GardenNamesProvider>
      {children}
      <BrainDump />
      <GlobalReflect />
      <FocusSoundPlayer />
    </GardenNamesProvider>
  )
}
