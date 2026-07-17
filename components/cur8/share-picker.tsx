'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CATEGORIES } from '@/lib/cur8-store'
import { useGardenNames } from '@/components/cur8/garden-names-provider'
import { Link2 } from 'lucide-react'

export default function SharePicker({
  sharedUrl,
  sharedTitle,
}: {
  sharedUrl: string
  sharedTitle: string
}) {
  const router = useRouter()
  const { displayName } = useGardenNames()

  function pick(categoryName: string) {
    // Hand off to the garden page, which reads ?share= and opens the save
    // dialog with the link pre-filled and auto-fetched.
    router.push(`/cur8/${categoryName.toLowerCase()}?share=${encodeURIComponent(sharedUrl)}`)
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        backgroundColor: '#0a1e1b',
        color: '#f5f0e8',
        padding: '28px 18px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 640 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c9a84c', margin: 0 }}>
          Save to Cur8
        </p>
        <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 26, fontWeight: 700, margin: '6px 0 14px', lineHeight: 1.2 }}>
          Which garden is this for?
        </h1>

        {/* The shared link preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, backgroundColor: 'rgba(245,240,232,0.07)', border: '1px solid rgba(245,240,232,0.1)', marginBottom: 22 }}>
          <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, backgroundColor: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Link2 size={16} color="#c9a84c" />
          </div>
          <div style={{ minWidth: 0 }}>
            {sharedTitle && <p style={{ margin: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sharedTitle}</p>}
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(245,240,232,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sharedUrl}</p>
          </div>
        </div>

        {/* Garden grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {CATEGORIES.map((c) => {
            const label = displayName(c.name)
            return (
              <button
                key={c.name}
                onClick={() => pick(c.name)}
                style={{ position: 'relative', textAlign: 'left', border: 'none', cursor: 'pointer', borderRadius: 16, overflow: 'hidden', aspectRatio: '16 / 10', padding: 0, background: '#122e29' }}
              >
                <Image src={c.tileImage} alt="" fill sizes="(max-width: 640px) 50vw, 320px" style={{ objectFit: 'cover', opacity: 0.55 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,30,27,0.92) 12%, rgba(10,30,27,0.25) 100%)' }} />
                <div style={{ position: 'absolute', left: 12, right: 12, bottom: 11 }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.hexAccent }}>{c.area}</p>
                  <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 16, fontWeight: 700, color: '#f5f0e8', lineHeight: 1.15 }}>{label}</p>
                </div>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => router.push('/cur8')}
          style={{ marginTop: 22, width: '100%', padding: '11px', borderRadius: 12, border: '1px solid rgba(245,240,232,0.15)', background: 'none', color: 'rgba(245,240,232,0.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </main>
  )
}
