import type { MetadataRoute } from 'next'

// PWA manifest. The `share_target` entry is the important bit: once Cur8 is
// added to a phone's home screen, it appears in the native Share sheet of
// YouTube, TikTok, Instagram, the browser, etc. Sharing a link sends it
// straight to /cur8/share (GET), so there's no copy/paste round-trip.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cur8 — your saved-content hub',
    short_name: 'Cur8',
    description: 'Curate everything you save — videos, links, images and docs — into one calm, visual home.',
    start_url: '/cur8',
    scope: '/cur8',
    display: 'standalone',
    background_color: '#0e2e2b',
    theme_color: '#0e2e2b',
    icons: [
      // The ?v=2 tag forces phones to re-download the icon after an update
      // (PWA home-screen icons are cached very aggressively, especially on Android).
      { src: '/cur8/app-icon.png?v=2', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
      { src: '/cur8/app-icon.png?v=2', sizes: '1024x1024', type: 'image/png', purpose: 'maskable' },
    ],
    share_target: {
      action: '/cur8/share',
      method: 'GET',
      enctype: 'application/x-www-form-urlencoded',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
      },
    },
  }
}
