'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Sparkles } from 'lucide-react'

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
    <div className="cur8 relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>

      {/* Ambient orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #c4a0e8, transparent 70%)' }} />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f0a0bf, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl shadow-sm"
            style={{ background: 'linear-gradient(135deg, var(--cur8-lilac), var(--cur8-rose))' }}>
            <Sparkles size={26} className="text-white" />
          </div>
          <div className="mt-3 flex items-baseline gap-0.5">
            <h1 className="font-serif text-3xl font-bold" style={{ color: 'var(--foreground)' }}>Cur</h1>
            <span className="font-serif text-3xl font-bold"
              style={{ background: 'linear-gradient(135deg, var(--cur8-lilac), var(--cur8-rose))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              8
            </span>
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {isSignUp ? 'Create your personal space' : 'Welcome back to your space'}
          </p>
        </div>

        <form onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-3xl border p-6 shadow-sm"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>

          {isSignUp && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                Your name
              </label>
              <input
                id="name" value={name} onChange={(e) => setName(e.target.value)}
                required autoComplete="name"
                className="rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              Email
            </label>
            <input
              id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email"
              className="rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              Password
            </label>
            <input
              id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={8}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              className="rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}
            />
            {isSignUp && (
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                At least 8 characters
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-500" role="alert">{error}</p>
          )}

          <button type="submit" disabled={loading}
            className="mt-1 rounded-full py-2.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, var(--cur8-lilac), var(--cur8-rose))' }}>
            {loading ? 'Please wait...' : isSignUp ? 'Create my space' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {isSignUp ? 'Already have a space? ' : "Don't have a space yet? "}
          <Link href={isSignUp ? '/cur8/sign-in' : '/cur8/sign-up'}
            className="font-semibold underline-offset-4 hover:underline"
            style={{ color: 'var(--primary)' }}>
            {isSignUp ? 'Sign in' : 'Create one'}
          </Link>
        </p>
      </div>
    </div>
  )
}
