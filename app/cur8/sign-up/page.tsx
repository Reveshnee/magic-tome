import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Cur8AuthForm } from '@/components/cur8/cur8-auth-form'

export default async function Cur8SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/cur8')
  return <Cur8AuthForm mode="sign-up" />
}
