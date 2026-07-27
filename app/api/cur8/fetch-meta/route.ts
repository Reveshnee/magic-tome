import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

// TikTok/Instagram CDN thumbnail URLs are signed and expire after a while.
// Download the image once and store it in our own Blob so the thumbnail keeps
// working forever. Returns our proxy URL, or the original URL if caching fails.
async function cacheThumbnail(src: string): Promise<string> {
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return src
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    const buf = await res.arrayBuffer()
    const blob = await put(`cur8/thumbs/ext-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`, buf, {
      access: 'private',
      contentType,
    })
    return `/api/cur8/file?pathname=${encodeURIComponent(blob.pathname)}`
  } catch {
    return src
  }
}

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
  const raw = req.nextUrl.searchParams.get('url')
  if (!raw) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

  // Normalise — add https:// if no protocol present so new URL() doesn't throw
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname
    const favicon = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`

    // --- YouTube: extract thumbnail directly from video ID — never fails ---
    const ytId = extractYouTubeId(url)
    if (ytId) {
      const thumbnail = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
      let title = ''
      let authorName = ''
      // oEmbed is best-effort — if it fails we still return the thumbnail
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 4000)
        const oEmbed = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`,
          { signal: controller.signal }
        )
        clearTimeout(timer)
        if (oEmbed.ok) {
          const data = await oEmbed.json()
          title = data.title ?? ''
          authorName = data.author_name ?? ''
        }
      } catch { /* oEmbed failed — title will stay blank, thumbnail is still valid */ }
      return NextResponse.json({
        title: title || `YouTube – ${ytId}`,
        description: authorName ? `by ${authorName}` : '',
        thumbnail,
        favicon,
      })
    }

    // --- TikTok: use the public oEmbed endpoint for a real thumbnail + title ---
    // Works for full /video/ links AND short vm.tiktok.com / /t/ links, since
    // TikTok resolves the redirect server-side for us.
    if (hostname.includes('tiktok.com')) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 6000)
        const oEmbed = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Cur8Bot/1.0)' },
        })
        clearTimeout(timer)
        if (oEmbed.ok) {
          const data = await oEmbed.json()
          const thumbnail = data.thumbnail_url ? await cacheThumbnail(data.thumbnail_url) : ''
          // The video id is exposed even for short (vm.tiktok.com) links, since
          // TikTok resolves the redirect. Build a canonical /video/<id> URL and
          // return it as resolvedUrl so the app can embed & play it inline.
          const videoId: string | undefined =
            data.embed_product_id ||
            (data.html?.match(/data-video-id="(\d+)"/)?.[1]) ||
            (data.html?.match(/\/video\/(\d+)/)?.[1])
          const author = data.author_unique_id || (data.author_url?.match(/@([^/?]+)/)?.[1])
          const resolvedUrl = videoId
            ? `https://www.tiktok.com/@${author || 'tiktok'}/video/${videoId}`
            : undefined
          return NextResponse.json({
            title: data.title || 'TikTok video',
            description: data.author_name ? `by ${data.author_name}` : '',
            thumbnail,
            favicon,
            resolvedUrl,
          })
        }
      } catch { /* fall through to favicon-only */ }
      return NextResponse.json({ title: 'TikTok video', description: '', thumbnail: '', favicon })
    }

    // --- Pinterest: use oEmbed API for real title + thumbnail ---
    if (hostname.includes('pinterest.')) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 6000)
        const oEmbed = await fetch(
          `https://www.pinterest.com/oembed/?url=${encodeURIComponent(url)}`,
          { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Cur8Bot/1.0)' } }
        )
        clearTimeout(timer)
        if (oEmbed.ok) {
          const data = await oEmbed.json()
          const thumbnail = data.thumbnail_url ? await cacheThumbnail(data.thumbnail_url) : ''
          return NextResponse.json({
            title: data.title || 'Pinterest pin',
            description: data.author_name ? `by ${data.author_name}` : '',
            thumbnail,
            favicon,
            platform: 'pinterest',
          })
        }
      } catch { /* fall through to og scrape */ }
    }

    // --- Instagram: scrape with a realistic UA — Instagram does serve og tags ---
    // --- Facebook: same approach ---
    const isSocial = hostname.includes('instagram.com') || hostname.includes('facebook.com') || hostname.includes('fb.com')

    // --- General websites (incl. Instagram): scrape og:image / og:title ---
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
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

    const rawThumb =
      get(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      get(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      ''

    const origin = parsedUrl.origin
    let thumbnail =
      rawThumb.startsWith('http') ? rawThumb :
      rawThumb.startsWith('//') ? `https:${rawThumb}` :
      rawThumb ? `${origin}${rawThumb}` : ''

    // Social CDN images (Instagram/Facebook/Pinterest) are signed and expire — cache them.
    if (thumbnail && /instagram|fbcdn|cdninstagram|facebook|pinimg/.test(hostname + thumbnail)) {
      thumbnail = await cacheThumbnail(thumbnail)
    }

    // Return a platform hint so the client knows not to try iframing these
    const platform = hostname.includes('instagram.com') ? 'instagram'
      : hostname.includes('facebook.com') || hostname.includes('fb.com') ? 'facebook'
      : hostname.includes('pinterest.') ? 'pinterest'
      : undefined

    return NextResponse.json({ title, description, thumbnail, favicon, ...(platform ? { platform } : {}) })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
