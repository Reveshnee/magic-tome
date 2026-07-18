import Image from 'next/image'

const OPTIONS = [
  {
    id: 'A',
    label: 'Option A — warm burnt orange',
    note: 'Classic koi, amber scales, cream belly, leaping upward with a tail splash. Balanced and friendly.',
    src: '/cur8/koi-options/option-a.png',
  },
  {
    id: 'B',
    label: 'Option B — rust / terracotta, flowing fins',
    note: 'Deeper muted rust tone with long flowing pale fins, graceful arc. Most elegant and understated.',
    src: '/cur8/koi-options/option-b.png',
  },
  {
    id: 'C',
    label: 'Option C — rich amber with splashes',
    note: 'Warm amber-orange with white head patches and a bubbly water-splash trail. Most detailed and playful.',
    src: '/cur8/koi-options/option-c.png',
  },
]

export default function KoiOptionsPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#0e2e2b',
        color: '#f5f0e8',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        padding: '32px 20px 64px',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#e8a04d', margin: 0 }}>
          Cur8 · Choose your koi
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '8px 0 6px', textWrap: 'balance' }}>
          Which burnt-orange koi should leap?
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(245,240,232,0.7)', margin: '0 0 28px', maxWidth: 620 }}>
          Here are the three options on the same pond background the animation uses. Tell me the letter you like
          best (A, B, or C) and I&apos;ll set it — noticeably smaller, as you asked.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 20,
          }}
        >
          {OPTIONS.map((o) => (
            <div
              key={o.id}
              style={{
                borderRadius: 18,
                border: '1px solid rgba(245,240,232,0.14)',
                backgroundColor: '#0a2320',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  aspectRatio: '1 / 1',
                  background: 'radial-gradient(circle at 50% 120%, #14403a 0%, #0e2e2b 55%, #0a2320 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image
                  src={o.src || "/placeholder.svg"}
                  alt={o.label}
                  width={320}
                  height={320}
                  style={{ width: '82%', height: '82%', objectFit: 'contain' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    backgroundColor: '#e8a04d',
                    color: '#0e2e2b',
                    fontWeight: 800,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {o.id}
                </span>
              </div>
              <div style={{ padding: '14px 16px 18px' }}>
                <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px' }}>{o.label}</p>
                <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'rgba(245,240,232,0.65)', margin: 0 }}>{o.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
