import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { cur8Item } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { extractDocText, blobPathnameFromUrl } from '@/lib/cur8/extract-doc-text'

export const maxDuration = 60

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })
  const userId = session.user.id

  const { itemId } = await req.json() as { itemId: string }
  if (!itemId) return new NextResponse('Missing itemId', { status: 400 })

  // Fetch the item — must belong to this user
  const [item] = await db
    .select({ id: cur8Item.id, url: cur8Item.url, fileText: cur8Item.fileText })
    .from(cur8Item)
    .where(and(eq(cur8Item.id, itemId), eq(cur8Item.userId, userId)))
    .limit(1)

  if (!item) return new NextResponse('Not found', { status: 404 })

  // Already extracted — return cached text
  if (item.fileText) return NextResponse.json({ text: item.fileText, cached: true })

  // Only process private blob files
  if (!item.url.startsWith('/api/cur8/file')) {
    return NextResponse.json({ text: null })
  }

  const pathname = blobPathnameFromUrl(item.url)
  if (!pathname) return NextResponse.json({ text: null })

  try {
    const text = await extractDocText(pathname)
    if (text) {
      await db.update(cur8Item).set({ fileText: text }).where(eq(cur8Item.id, item.id))
      return NextResponse.json({ text })
    }
    return NextResponse.json({ text: null })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ text: null, error: msg }, { status: 500 })
  }
}
