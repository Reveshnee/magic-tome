import { put } from '@vercel/blob'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Store uses private access — use 'private' here to match
    const blob = await put(`cur8/${Date.now()}-${file.name}`, file, {
      access: 'private',
    })

    // Return the pathname so the client can construct a /api/cur8/file?pathname=... URL
    // We also expose a proxy URL the app can use to display/download the file
    const proxyUrl = `/api/cur8/file?pathname=${encodeURIComponent(blob.pathname)}`
    return NextResponse.json({ url: proxyUrl, pathname: blob.pathname, name: file.name, type: file.type })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg || 'Upload failed' }, { status: 500 })
  }
}
