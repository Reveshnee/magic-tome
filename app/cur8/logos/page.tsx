import Image from 'next/image'

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
        gap: 28,
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
          Have a look at both, then tell me which one you&apos;d like: Option 1 or Option 2.
        </p>
      </div>

      {/* Option 1 — Koi + wordmark */}
      <section
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
          Option 1 · Koi + wordmark
        </div>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9' }}>
          <Image src="/cur8/logo-koi.png" alt="Cur8 logo option 1: golden koi beside the Cur8 name" fill style={{ objectFit: 'contain' }} />
        </div>
      </section>

      {/* Option 2 — Abstract ripple 8 + wordmark */}
      <section
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
          Option 2 · Abstract ripple 8 + wordmark
        </div>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9' }}>
          <Image
            src="/cur8/logo-abstract.png"
            alt="Cur8 logo option 2: golden concentric-ripple infinity mark beside the Cur8 name"
            fill
            style={{ objectFit: 'contain' }}
          />
        </div>
      </section>
    </main>
  )
}
