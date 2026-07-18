import Image from 'next/image'

const LOGOS = [
  {
    label: 'Option A · Koi forms the 8',
    src: '/cur8/logo-koi8-single.png',
    alt: 'Cur8 logo: a single golden koi curves to form the 8 in Cur8',
    note: 'One koi loops back on itself to become the 8.',
  },
  {
    label: 'Option B · Two koi form the 8',
    src: '/cur8/logo-koi8-double.png',
    alt: 'Cur8 logo: two golden koi swirl together to form the 8 in Cur8',
    note: 'Two koi chase each other into a yin-yang style 8.',
  },
  {
    label: 'Option C · Koi before the name',
    src: '/cur8/logo-koi.png',
    alt: 'Cur8 logo: a golden koi sits beside the Cur8 name',
    note: 'The original: koi sits to the left of the wordmark.',
  },
]

export default function LogoPreviewPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#0d2420',
        color: '#f5f0e8',
        fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
        padding: '32px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <h1
          style={{
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontSize: 26,
            fontWeight: 700,
            margin: '0 0 6px',
          }}
        >
          Pick your Cur8 logo
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.6)', margin: 0, lineHeight: 1.5 }}>
          Have a look, then tell me which you&apos;d like: Option A, B or C.
        </p>
      </div>

      {LOGOS.map((logo) => (
        <section
          key={logo.src}
          style={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: '#0a1e1b',
            border: '1px solid rgba(245,240,232,0.1)',
            borderRadius: 18,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 16px',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: '#c9a84c',
              borderBottom: '1px solid rgba(245,240,232,0.08)',
            }}
          >
            {logo.label}
          </div>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9' }}>
            <Image src={logo.src} alt={logo.alt} fill style={{ objectFit: 'contain' }} />
          </div>
          <p style={{ fontSize: 12, color: 'rgba(245,240,232,0.55)', margin: 0, padding: '10px 16px 14px', lineHeight: 1.5 }}>
            {logo.note}
          </p>
        </section>
      ))}
    </main>
  )
}
