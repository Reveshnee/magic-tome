import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import SharePicker from '@/components/cur8/share-picker'

// Landing page for the PWA share target. A shared link arrives as ?url= or,
// on some apps, embedded in ?text=. We pull out the first URL and let the
// user pick which garden it belongs in, then hand off to that garden's page.
export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; text?: string; title?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/cur8/sign-in')

  const sp = await searchParams
  const raw = sp.url || sp.text || ''
  const match = raw.match(/https?:\/\/[^\s]+/i)
  const sharedUrl = match ? match[0] : raw.trim()

  if (!sharedUrl) redirect('/cur8')

  return <SharePicker sharedUrl={sharedUrl} sharedTitle={sp.title ?? ''} />
}
