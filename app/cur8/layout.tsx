import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import FocusSoundPlayer from '@/components/cur8/widgets/focus-sound-player'
import BrainDump from '@/components/cur8/brain-dump'
import GlobalReflect from '@/components/cur8/global-reflect'
import { GardenNamesProvider } from '@/components/cur8/garden-names-provider'

// Koi logo as the tab favicon + iOS home-screen (Apple touch) icon.
export const metadata: Metadata = {
  title: 'Cur8 — your saved-content hub',
  description: 'Curate everything you save — videos, links, images and docs — into one calm, visual home.',
  icons: {
    icon: '/cur8/app-icon.png',
    apple: '/cur8/app-icon.png',
  },
}

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
