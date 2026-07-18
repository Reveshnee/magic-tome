'use server'

/**
 * fetch-playlist.ts
 * Extracts video URLs from a YouTube playlist page without needing an API key.
 * Works by scraping the initial page JSON that YouTube embeds in the HTML.
 *
 * TikTok has no public playlist API — we accept a block of pasted TikTok URLs
 * (one per line) and normalise them, returning them as-is for the multi-save flow.
 */

export interface PlaylistItem {
  url: string
  title: string
  thumbnail?: string
  channelName?: string
}

export interface PlaylistResult {
  platform: 'youtube' | 'tiktok'
  title: string
  items: PlaylistItem[]
  error?: string
}

// ── YouTube ────────────────────────────────────────────────────────────────

function extractYouTubePlaylistId(input: string): string | null {
  try {
    const u = new URL(input)
    return u.searchParams.get('list')
  } catch { return null }
}

async function fetchYouTubePlaylist(playlistId: string): Promise<PlaylistResult> {
  const pageUrl = `https://www.youtube.com/playlist?list=${playlistId}`
  const res = await fetch(pageUrl, {
    signal: AbortSignal.timeout(15000),
    headers: {
      // Must look like a real browser — YouTube returns a bot-limited page for non-browser UAs
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    },
  })
  if (!res.ok) throw new Error(`YouTube returned ${res.status}`)
  const html = await res.text()

  // YouTube embeds all page data in ytInitialData = {...}
  // We must extract the full JSON blob — simple regexes cut off too early on large payloads.
  // Strategy: find the start of the object, then walk forward counting braces until balanced.
  function extractYtInitialData(src: string): Record<string, unknown> | null {
    // Match any variant of the assignment
    const assignRx = /(?:var\s+ytInitialData|window\["ytInitialData"\]|ytInitialData)\s*=\s*(\{)/
    const m = assignRx.exec(src)
    if (!m || m.index === -1) return null
    const start = m.index + m[0].length - 1 // position of the opening `{`
    let depth = 0
    let i = start
    const len = src.length
    while (i < len) {
      const ch = src[i]
      if (ch === '{') depth++
      else if (ch === '}') { depth--; if (depth === 0) break }
      i++
    }
    const jsonStr = src.slice(start, i + 1)
    try { return JSON.parse(jsonStr) as Record<string, unknown> } catch { return null }
  }

  const data = extractYtInitialData(html)
  if (!data) throw new Error('Could not read playlist data from YouTube')

  // Walk the deeply nested structure to find video renderers
  const items: PlaylistItem[] = []
  const playlistTitle = extractDeep(data, 'title', 'metadata') as string | undefined

  function walk(obj: unknown) {
    if (!obj || typeof obj !== 'object') return
    if (Array.isArray(obj)) { obj.forEach(walk); return }
    const o = obj as Record<string, unknown>
    if ('playlistVideoRenderer' in o) {
      const r = o['playlistVideoRenderer'] as Record<string, unknown>
      const videoId = r['videoId'] as string | undefined
      if (!videoId) return
      const titleRuns = (r['title'] as Record<string, unknown>)?.['runs'] as Array<{ text: string }> | undefined
      const title = titleRuns?.[0]?.text ?? videoId
      const thumb = ((r['thumbnail'] as Record<string, unknown>)?.['thumbnails'] as Array<{ url: string }>)?.[0]?.url
      items.push({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title,
        thumbnail: thumb ? thumb.replace(/=w\d+-h\d+.*$/, '=w320-h180-c-k-c0x00ffffff-no-rj') : undefined,
      })
      return
    }
    Object.values(o).forEach(walk)
  }
  walk(data)

  if (items.length === 0) throw new Error('No videos found in this playlist — it may be private or empty.')

  return {
    platform: 'youtube',
    title: (playlistTitle as string) || 'YouTube Playlist',
    items: items.slice(0, 200), // cap at 200 to avoid runaway saves
  }
}

// Small helper — not a full deep search, just for the playlist title
function extractDeep(obj: unknown, ...keys: string[]): unknown {
  if (!obj || typeof obj !== 'object') return undefined
  const o = obj as Record<string, unknown>
  for (const k of keys) { if (k in o) return (o[k] as Record<string, unknown>)?.['simpleText'] ?? extractDeep(o[k], ...keys.slice(1)) }
  return undefined
}

// ── TikTok ─────────────────────────────────────────────────────────────────
// TikTok has no public playlist API. We accept pasted URLs and normalise them.

function parseTikTokUrls(raw: string): PlaylistItem[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.includes('tiktok.com') || s.includes('vm.tiktok'))
    .map((url) => ({ url, title: 'TikTok video' }))
}

// ── Public action ──────────────────────────────────────────────────────────

export async function fetchPlaylist(input: string): Promise<PlaylistResult> {
  const trimmed = input.trim()

  // TikTok bulk-paste mode: multiple lines containing tiktok.com
  const tiktokUrls = parseTikTokUrls(trimmed)
  if (tiktokUrls.length > 0) {
    return { platform: 'tiktok', title: `${tiktokUrls.length} TikTok videos`, items: tiktokUrls }
  }

  // YouTube playlist URL
  const playlistId = extractYouTubePlaylistId(trimmed)
  if (playlistId) {
    try {
      return await fetchYouTubePlaylist(playlistId)
    } catch (e) {
      return {
        platform: 'youtube',
        title: 'YouTube Playlist',
        items: [],
        error: e instanceof Error ? e.message : 'Could not load playlist',
      }
    }
  }

  return {
    platform: 'youtube',
    title: '',
    items: [],
    error: 'Paste a YouTube playlist URL (youtube.com/playlist?list=…) or a block of TikTok video links.',
  }
}
