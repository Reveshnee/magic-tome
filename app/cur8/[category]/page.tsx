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
  const matched = CATEGORIES.find(
    (c) => c.name.toLowerCase() === category.toLowerCase()
  )
  if (!matched) notFound()
  return <Cur8Category category={matched.name} />
}
