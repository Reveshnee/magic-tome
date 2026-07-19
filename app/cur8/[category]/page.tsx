import { CATEGORIES } from '@/lib/cur8-store'
import Cur8Category from '@/components/cur8/cur8-category'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/cur8/sign-in')

  const { category } = await params

  // Primary: match on the new garden-name slug (e.g. "koi-pond", "greenhouse")
  const matched = CATEGORIES.find((c) => c.slug === category)

  if (matched) {
    return <Cur8Category category={matched.name} />
  }

  // Legacy redirect: old content-type slugs (e.g. "instagram" → "greenhouse")
  const legacy = CATEGORIES.find(
    (c) => c.name.toLowerCase() === category.toLowerCase()
  )
  if (legacy) {
    redirect(`/cur8/${legacy.slug}`)
  }

  notFound()
}
