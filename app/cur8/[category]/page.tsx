import { CATEGORIES } from '@/lib/cur8-store'
import Cur8Category from '@/components/cur8/cur8-category'
import { notFound } from 'next/navigation'

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.name.toLowerCase() }))
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const matched = CATEGORIES.find(
    (c) => c.name.toLowerCase() === category.toLowerCase()
  )
  if (!matched) notFound()
  return <Cur8Category category={matched.name} />
}
