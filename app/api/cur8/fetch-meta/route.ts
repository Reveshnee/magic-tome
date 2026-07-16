import { NextRequest, NextResponse } from 'next/server'

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname
    const favicon = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`

    // --- YouTube: extract thumbnail directly from video ID ---
    const ytId = extractYouTubeId(url)
    if (ytId) {
      // Try maxresdefault first, fall back to hqdefault
      const thumbnail = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`
      // Fetch oEmbed for the title (YouTube allows this without auth)
      let title = ''
      try {
        const oEmbed = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
          { signal: AbortSignal.timeout(5000) }
        )
        if (oEmbed.ok) {
          const data = await oEmbed.json()
          title = data.title ?? ''
        }
      } catch { /* oEmbed failed, leave title blank */ }
      return NextResponse.json({ title, description: '', thumbnail, favicon })
    }

    // --- TikTok / Instagram: no reliable server-side thumbnail, return favicon only ---
    if (hostname.includes('tiktok.com') || hostname.includes('instagram.com')) {
      return NextResponse.json({
        title: url,
        description: '',
        thumbnail: '',
        favicon,
        note: 'Thumbnail not available for this platform',
      })
    }

    // --- General websites: scrape og:image / og:title ---
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Cur8Bot/1.0)' },
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

    const rawThumb =
      get(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      get(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      ''

    const origin = parsedUrl.origin
    const thumbnail =
      rawThumb.startsWith('http') ? rawThumb :
      rawThumb.startsWith('//') ? `https:${rawThumb}` :
      rawThumb ? `${origin}${rawThumb}` : ''

    return NextResponse.json({ title, description, thumbnail, favicon })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
