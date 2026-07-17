import { head } from '@vercel/blob'
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
    // Get the blob metadata (includes the direct URL with a short-lived token)
    const blob = await head(pathname)
    if (!blob) {
      return new NextResponse('Not found', { status: 404 })
    }

    // Fetch the actual file from the signed Blob URL (server-to-server, token is in the URL)
    const upstream = await fetch(blob.downloadUrl, {
      headers: {
        'If-None-Match': request.headers.get('if-none-match') ?? '',
      },
    })

    if (upstream.status === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: upstream.headers.get('etag') ?? '',
          'Cache-Control': 'private, no-cache',
        },
      })
    }

    if (!upstream.ok) {
      return new NextResponse('Failed to fetch file', { status: 502 })
    }

    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
    const etag = upstream.headers.get('etag') ?? ''
    const filename = pathname.split('/').pop() ?? 'file'

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        ...(etag ? { ETag: etag } : {}),
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
