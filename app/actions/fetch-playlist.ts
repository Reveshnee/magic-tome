'use server'

/**
 * fetch-playlist.ts
 *
 * YouTube playlists: uses the YouTube Data API v3 (YOUTUBE_API_KEY env var).
 *   - Free quota: 10,000 units/day. Reading a playlist costs ~1 unit per 50 videos.
 *   - Without the key, returns a clear message asking the user to add one.
 *
 * TikTok: no public playlist API — accepts pasted URLs (one per line).
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
  needsApiKey?: boolean
}

// ── YouTube ────────────────────────────────────────────────────────────────

function extractYouTubePlaylistId(input: string): string | null {
  try {
    const u = new URL(input)
    return u.searchParams.get('list')
  } catch { return null }
}

async function fetchYouTubePlaylist(playlistId: string): Promise<PlaylistResult> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return {
      platform: 'youtube',
      title: '',
      items: [],
      needsApiKey: true,
      error: 'A YouTube API key is required to import playlists. Add YOUTUBE_API_KEY in your project settings (Settings → Vars), then try again.',
    }
  }

  const items: PlaylistItem[] = []
  let playlistTitle = 'YouTube Playlist'
  let pageToken: string | undefined

  // First, get the playlist title
  try {
    const metaRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${encodeURIComponent(playlistId)}&key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (metaRes.ok) {
      const meta = await metaRes.json() as { items?: Array<{ snippet?: { title?: string } }> }
      const title = meta.items?.[0]?.snippet?.title
      if (title) playlistTitle = title
    }
  } catch { /* title stays as default */ }

  // Paginate through playlist items (max 50 per page)
  do {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems')
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('playlistId', playlistId)
    url.searchParams.set('maxResults', '50')
    url.searchParams.set('key', apiKey)
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string; errors?: Array<{ reason?: string }> } }
      const reason = err?.error?.errors?.[0]?.reason
      // Map common YouTube API errors to plain-language messages
      if (reason === 'playlistNotFound' || res.status === 404) {
        throw new Error('That playlist could not be found. Make sure the link is a public YouTube playlist and try copying it again.')
      }
      if (reason === 'quotaExceeded') {
        throw new Error('The daily YouTube import limit has been reached. Please try again tomorrow.')
      }
      if (reason === 'keyInvalid' || reason === 'badRequest' || res.status === 400) {
        throw new Error('The YouTube API key looks invalid. Double-check YOUTUBE_API_KEY in Settings → Vars.')
      }
      // Strip any HTML tags from the raw API message before showing it
      const raw = (err?.error?.message ?? `YouTube API error ${res.status}`).replace(/<[^>]+>/g, '')
      throw new Error(raw)
    }

    const data = await res.json() as {
      nextPageToken?: string
      items?: Array<{
        snippet?: {
          title?: string
          resourceId?: { videoId?: string }
          thumbnails?: { medium?: { url?: string }; default?: { url?: string } }
          videoOwnerChannelTitle?: string
        }
      }>
    }

    for (const item of data.items ?? []) {
      const s = item.snippet
      const videoId = s?.resourceId?.videoId
      if (!videoId || videoId === 'deleted video') continue
      const thumb = s?.thumbnails?.medium?.url ?? s?.thumbnails?.default?.url
      items.push({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title: s?.title ?? videoId,
        thumbnail: thumb,
        channelName: s?.videoOwnerChannelTitle,
      })
    }

    pageToken = data.nextPageToken
  } while (pageToken && items.length < 200) // cap at 200

  if (items.length === 0) {
    return {
      platform: 'youtube',
      title: playlistTitle,
      items: [],
      error: 'No videos found in this playlist — it may be private, empty, or the URL is incorrect.',
    }
  }

  return { platform: 'youtube', title: playlistTitle, items }
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

  // TikTok bulk-paste mode
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
