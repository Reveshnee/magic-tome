import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Cur8Bot/1.0)',
      },
      signal: AbortSignal.timeout(8000),
    })

    const html = await res.text()

    const get = (pattern: RegExp) => {
      const match = html.match(pattern)
      return match ? match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim() : ''
    }

    const title =
      get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      get(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
      get(/<title[^>]*>([^<]+)<\/title>/i) ||
      ''

    const description =
      get(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
      get(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i) ||
      get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      ''

    const thumbnail =
      get(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      get(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      ''

    const origin = new URL(url).origin
    const favicon = `https://www.google.com/s2/favicons?sz=64&domain=${new URL(url).hostname}`

    // Resolve relative thumbnail URLs
    const resolvedThumbnail =
      thumbnail.startsWith('http') ? thumbnail :
      thumbnail.startsWith('//') ? `https:${thumbnail}` :
      thumbnail ? `${origin}${thumbnail}` : ''

    return NextResponse.json({ title, description, thumbnail: resolvedThumbnail, favicon })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
