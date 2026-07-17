import { get } from '@vercel/blob'
import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  // Only allow authenticated users to fetch their own uploaded files
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pathname = request.nextUrl.searchParams.get('pathname')
  if (!pathname) {
    return NextResponse.json({ error: 'Missing pathname' }, { status: 400 })
  }

  try {
    const ifNoneMatch = request.headers.get('if-none-match') ?? undefined

    // get() streams the private blob directly — no external signed-URL fetch needed
    const result = await get(pathname, {
      access: 'private',
      ...(ifNoneMatch ? { ifNoneMatch } : {}),
    })

    if (!result) {
      return new NextResponse('Not found', { status: 404 })
    }

    // 304 — blob unchanged, client can use its cache
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          'Cache-Control': 'private, no-cache',
        },
      })
    }

    const filename = pathname.split('/').pop() ?? 'file'

    return new NextResponse(result.stream, {
      status: 200,
      headers: {
        'Content-Type': result.blob.contentType,
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[v0] cur8/file error:', msg)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}
