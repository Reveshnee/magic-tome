import { get } from '@vercel/blob'
import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

// Files uploaded from Android / Google Drive often arrive with a missing or
// generic MIME type (application/octet-stream). When we then serve them back
// with that generic type, browsers refuse to render PDFs inline and the iframe
// shows blank. Infer a correct type from the extension so PDFs, Office docs and
// media always open properly.
const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain', csv: 'text/csv', md: 'text/markdown',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', m4v: 'video/mp4',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac',
}

function resolveContentType(pathname: string, stored?: string): string {
  const s = (stored ?? '').toLowerCase()
  if (s && s !== 'application/octet-stream' && s !== 'binary/octet-stream') return stored as string
  const ext = pathname.split('.').pop()?.toLowerCase() ?? ''
  return EXT_MIME[ext] ?? stored ?? 'application/octet-stream'
}

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
    const contentType = resolveContentType(pathname, result.blob.contentType)
    // ?download=1 forces a "Save as" download instead of opening inline
    const forceDownload = request.nextUrl.searchParams.get('download') === '1'
    const disposition = forceDownload ? 'attachment' : 'inline'

    return new NextResponse(result.stream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
        'Content-Disposition': `${disposition}; filename="${filename}"`,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[v0] cur8/file error:', msg)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}
