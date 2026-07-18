import Image from 'next/image'

// Option B (two koi forming the 8), warm koi on the green/teal background —
// the app background is always this pond-green, so the koi stay warm (red /
// orange) to pop against it. Each combo is shown in BOTH contexts: the
// app-open icon (home screen / splash) and the in-app wordmark (header).
const COMBOS = [
  {
    id: 'duo',
    name: 'Combo 1 · Red + Orange koi',
    swatches: ['#0e2e2b', '#d13a1f', '#e8792b'],
    note: 'One deep red koi, one warm orange koi on pond-teal — the truest match to real koi and to your hero image. The 8 reads clearest here.',
    icon: '/cur8/logo-v2/icon-duo.png',
    word: '/cur8/logo-v2/word-duo.png',
  },
  {
    id: 'red',
    name: 'Combo 2 · Twin Red koi',
    swatches: ['#0e2e2b', '#d13a1f', '#f3e7d6'],
    note: 'Two vermilion-red koi on deep pond-teal. Boldest and most striking — strong red-against-green contrast.',
    icon: '/cur8/logo-v2/icon-red.png',
    word: '/cur8/logo-v2/word-red.png',
  },
  {
    id: 'orange',
    name: 'Combo 3 · Orange on Emerald',
    swatches: ['#0f3b33', '#e8792b', '#f3e7d6'],
    note: 'Warm orange koi on a slightly brighter emerald green. Softest and sunniest — glows without the red intensity.',
    icon: '/cur8/logo-v2/icon-orange.png',
    word: '/cur8/logo-v2/word-orange.png',
  },
]

export default function LogoPreviewPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#081c19',
        color: '#f5f0e8',
        fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
        padding: '32px 16px 64px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 28,
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#c9a04a', margin: '0 0 8px' }}>
          Option B · Two koi
        </p>
        <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 28, fontWeight: 700, margin: '0 0 8px', lineHeight: 1.2 }}>
          Pick a colour combo
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.6)', margin: 0, lineHeight: 1.6 }}>
          All three use the two-koi 8 you chose, coloured from your koi-pond hero image. For each one you can see the
          icon you tap to open the app, and the wordmark you see inside it. Tell me a combo (1, 2 or 3) and any tweaks.
        </p>
      </div>

      {COMBOS.map((c) => (
        <section
          key={c.id}
          style={{
            width: '100%',
            maxWidth: 480,
            backgroundColor: '#0a1e1b',
            border: '1px solid rgba(245,240,232,0.1)',
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          {/* Header row: name + swatches */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid rgba(245,240,232,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f5f0e8' }}>{c.name}</span>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {c.swatches.map((s) => (
                <span
                  key={s}
                  title={s}
                  style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: s, border: '1px solid rgba(245,240,232,0.15)' }}
                />
              ))}
            </div>
          </div>

          {/* Two contexts side by side */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, padding: 18 }}>
            {/* App-open icon */}
            <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 24,
                  overflow: 'hidden',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
                  position: 'relative',
                }}
              >
                <Image src={c.icon} alt={`Cur8 app icon, ${c.name}`} fill sizes="104px" style={{ objectFit: 'cover' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(245,240,232,0.5)', textAlign: 'center' }}>
                When you open the app
              </span>
            </div>

            {/* In-app wordmark on a header strip */}
            <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: '100%',
                  aspectRatio: '16 / 7',
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: '1px solid rgba(245,240,232,0.1)',
                  position: 'relative',
                }}
              >
                <Image src={c.word} alt={`Cur8 wordmark, ${c.name}`} fill sizes="260px" style={{ objectFit: 'cover' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(245,240,232,0.5)', textAlign: 'center' }}>
                Inside the app (header)
              </span>
            </div>
          </div>

          <p style={{ fontSize: 12.5, color: 'rgba(245,240,232,0.6)', margin: 0, padding: '0 18px 18px', lineHeight: 1.6 }}>
            {c.note}
          </p>
        </section>
      ))}
    </main>
  )
}
