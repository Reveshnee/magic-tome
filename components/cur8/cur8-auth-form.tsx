'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

const KOI: React.CSSProperties = {
  '--c-bg':      '#f2f5f2',
  '--c-surface': '#ffffff',
  '--c-teal':    '#0d3d3a',
  '--c-coral':   '#c85a40',
  '--c-sage':    '#5a9e84',
  '--c-text':    '#1a2e2b',
  '--c-muted':   '#6b8884',
  '--c-border':  'rgba(13,61,58,0.10)',
} as React.CSSProperties

export function Cur8AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === 'sign-up'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message ?? 'Something went wrong')
      return
    }

    router.push('/cur8')
    router.refresh()
  }

  return (
    <div style={{ ...KOI, backgroundColor: 'var(--c-bg)', color: 'var(--c-text)', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif' }}>

      {/* Hero strip */}
      <div style={{ position: 'relative', height: 180, overflow: 'hidden', flexShrink: 0 }}>
        <Image src="/cur8/koi-pond.jpg" alt="Koi pond" fill style={{ objectFit: 'cover', objectPosition: 'center 40%' }} priority sizes="100vw" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,61,58,0.2) 0%, rgba(242,245,242,1) 100%)' }} />
        <div style={{ position: 'absolute', top: 18, left: 20, display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>
            <Image src="/cur8/logo-v2/icon-duo.png" alt="Cur8 koi logo" width={34} height={34} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 17, fontWeight: 700, color: '#f5f0e8', textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}>cur8</span>
        </div>
      </div>

      {/* Form area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '0 20px 40px' }}>
        <div style={{ width: '100%', maxWidth: 360, marginTop: -24 }}>

          {/* Card */}
          <div style={{ backgroundColor: 'var(--c-surface)', borderRadius: 24, padding: 24, boxShadow: '0 4px 24px rgba(13,61,58,0.10)', border: '1.5px solid var(--c-border)' }}>
            <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 22, fontWeight: 700, color: 'var(--c-teal)', marginBottom: 4 }}>
              {isSignUp ? "Create your haven" : "Welcome back"}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--c-muted)', marginBottom: 20 }}>
              {isSignUp ? "Your private space to curate everything you love." : "Sign in to return to your haven."}
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {isSignUp && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label htmlFor="name" style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your name</label>
                  <input
                    id="name" value={name} onChange={(e) => setName(e.target.value)}
                    required autoComplete="name"
                    style={{ padding: '10px 14px', borderRadius: 12, border: '1.5px solid var(--c-border)', backgroundColor: '#f2f5f2', color: 'var(--c-text)', fontSize: 13, outline: 'none' }}
                  />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="email" style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                <input
                  id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required autoComplete="email"
                  style={{ padding: '10px 14px', borderRadius: 12, border: '1.5px solid var(--c-border)', backgroundColor: '#f2f5f2', color: 'var(--c-text)', fontSize: 13, outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="password" style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
                <input
                  id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required minLength={8}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  style={{ padding: '10px 14px', borderRadius: 12, border: '1.5px solid var(--c-border)', backgroundColor: '#f2f5f2', color: 'var(--c-text)', fontSize: 13, outline: 'none' }}
                />
                {isSignUp && <p style={{ fontSize: 11, color: 'var(--c-muted)' }}>At least 8 characters</p>}
              </div>

              {error && <p style={{ fontSize: 12, color: '#c85a40' }} role="alert">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                style={{ marginTop: 4, padding: '12px', borderRadius: 50, backgroundColor: 'var(--c-teal)', color: '#f5f0e8', fontSize: 13, fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.65 : 1 }}
              >
                {loading ? 'Please wait...' : isSignUp ? 'Create my haven' : 'Enter my haven'}
              </button>
            </form>
          </div>

          <p style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--c-muted)' }}>
            {isSignUp ? 'Already have a haven? ' : "Don't have a haven yet? "}
            <Link href={isSignUp ? '/cur8/sign-in' : '/cur8/sign-up'}
              style={{ color: 'var(--c-teal)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              {isSignUp ? 'Sign in' : 'Create one'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
