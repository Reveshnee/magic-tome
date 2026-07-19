import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { cur8Item } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

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
  if (item.fileText) return NextResponse.json({ text: item.fileText })

  // Only process private blob files
  if (!item.url.startsWith('/api/cur8/file')) {
    return NextResponse.json({ text: null })
  }

  try {
    // Fetch the file bytes from our own file route (runs server-side, no auth needed here
    // since we're calling internally — but we pass a relative URL so we need absolute)
    const origin = req.headers.get('origin') || req.headers.get('host')
      ? `https://${req.headers.get('host')}`
      : 'http://localhost:3000'

    const fileRes = await fetch(`${origin}${item.url}`, {
      headers: { cookie: req.headers.get('cookie') ?? '' },
    })

    if (!fileRes.ok) {
      return NextResponse.json({ text: null, error: `File fetch failed: ${fileRes.status}` })
    }

    const arrayBuffer = await fileRes.arrayBuffer()
    const url = item.url.toLowerCase()

    // Detect file type from pathname param
    let pathname = ''
    try {
      const u = new URL(item.url, 'http://x')
      pathname = (u.searchParams.get('pathname') ?? '').toLowerCase()
    } catch { /* ignore */ }

    const isPdf = pathname.endsWith('.pdf') || url.includes('.pdf')
    const isDocx = pathname.endsWith('.docx') || pathname.endsWith('.doc')

    let extractedText: string | null = null

    if (isDocx) {
      // Word docs: use mammoth to convert to plain text
      const mammoth = (await import('mammoth')).default
      const result = await mammoth.extractRawText({ arrayBuffer })
      extractedText = result.value?.trim() || null
    } else if (isPdf) {
      // PDFs: use pdfjs-dist to extract text from all pages
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
      pdfjsLib.GlobalWorkerOptions.workerSrc = ''
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer), useWorkerFetch: false, useSystemFonts: true }).promise
      const pages: string[] = []
      for (let i = 1; i <= Math.min(pdf.numPages, 50); i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const pageText = content.items
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((it: any) => it.str ?? '')
          .join(' ')
          .trim()
        if (pageText) pages.push(pageText)
      }
      extractedText = pages.join('\n\n').trim() || null
    }

    if (extractedText) {
      // Truncate to 20k chars to keep DB reasonable
      const stored = extractedText.slice(0, 20000)
      await db.update(cur8Item)
        .set({ fileText: stored })
        .where(eq(cur8Item.id, item.id))
      return NextResponse.json({ text: stored })
    }

    return NextResponse.json({ text: null })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ text: null, error: msg }, { status: 500 })
  }
}
