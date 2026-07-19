'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { cur8Item } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { generateText } from 'ai'
import { extractDocText, blobPathnameFromUrl } from '@/lib/cur8/extract-doc-text'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

// Pull readable text out of an article page. Strips scripts/styles/tags and
// collapses whitespace. Returns '' if the fetch fails or yields too little.
async function fetchArticleText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(9000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Cur8Bot/1.0)' },
    })
    if (!res.ok) return ''
    const html = await res.text()
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return text.slice(0, 6000)
  } catch {
    return ''
  }
}

function platformFromUrl(url: string): 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'article' {
  try {
    const h = new URL(url).hostname
    if (h.includes('youtube') || h.includes('youtu.be')) return 'youtube'
    if (h.includes('tiktok') || h.includes('vm.tiktok')) return 'tiktok'
    if (h.includes('instagram')) return 'instagram'
    if (h.includes('facebook') || h.includes('fb.com')) return 'facebook'
  } catch { /* noop */ }
  return 'article'
}

// Extract YouTube video ID from any YouTube URL shape.
function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0]
    return u.searchParams.get('v')
  } catch { return null }
}

// Fetch the YouTube transcript via the Timedtext API (no key needed).
// Falls back to '' if the video has no captions or the request fails.
async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  try {
    // Step 1: get the list of caption tracks from the watch page
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      signal: AbortSignal.timeout(8000),
      headers: { 'Accept-Language': 'en-US,en', 'User-Agent': 'Mozilla/5.0 (compatible; Cur8Bot/1.0)' },
    })
    if (!pageRes.ok) return ''
    const html = await pageRes.text()

    // Find the timedtext URL embedded in the page JSON
    const match = html.match(/"baseUrl":"(https:\\\/\\\/www\.youtube\.com\\\/api\\\/timedtext[^"]+)"/)
    if (!match) return ''
    const timedtextUrl = match[1].replace(/\\\//g, '/')

    const ttRes = await fetch(timedtextUrl, { signal: AbortSignal.timeout(8000) })
    if (!ttRes.ok) return ''
    const xml = await ttRes.text()

    // Strip XML tags, decode entities, collapse whitespace
    const text = xml
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ').trim()
    return text.slice(0, 8000) // generous cap — Gemini handles long context well
  } catch { return '' }
}

export interface SummarizeResult {
  summary: string
  cached: boolean
}

// Generates (and caches) a short, warm summary of a saved item. Safe to call
// repeatedly — after the first run it just returns the stored summary.
export async function summarizeItem(itemId: string, regenerate = false): Promise<SummarizeResult> {
  const userId = await getUserId()

  const [item] = await db
    .select()
    .from(cur8Item)
    .where(and(eq(cur8Item.id, itemId), eq(cur8Item.userId, userId)))

  if (!item) throw new Error('Item not found')
  if (item.summary && !regenerate) return { summary: item.summary, cached: true }

  let context = ''

  // Uploaded documents (private blob) — read the actual document text.
  if (item.url.startsWith('/api/cur8/file')) {
    let docText = item.fileText ?? ''
    if (!docText) {
      // Not extracted yet — do it now (mammoth for Word, Gemini vision for PDFs)
      const pathname = blobPathnameFromUrl(item.url)
      if (pathname) {
        try {
          const extracted = await extractDocText(pathname)
          if (extracted) {
            docText = extracted
            await db.update(cur8Item).set({ fileText: extracted }).where(eq(cur8Item.id, itemId))
          }
        } catch { /* fall through to title/notes */ }
      }
    }
    const body = docText || [item.title, item.description].filter(Boolean).join('. ')
    context = `This is a document the person saved, titled "${item.title}".\n\nDocument content:\n${body}`

    const { text } = await generateText({
      model: 'google/gemini-2.5-flash',
      system:
        'You are a warm, calming companion inside a personal saved-content app. ' +
        'Write a gentle 2-3 sentence summary of this document so the person can remember what it holds at a glance. ' +
        'Be soothing and encouraging, never clinical. Speak plainly and kindly. No emojis, headings, or bullet points. ' +
        'Base the summary on the actual document content provided.',
      prompt: context,
    })
    const summary = text.trim()
    await db.update(cur8Item).set({ summary }).where(and(eq(cur8Item.id, itemId), eq(cur8Item.userId, userId)))
    return { summary, cached: false }
  }

  const platform = platformFromUrl(item.url)

  if (platform === 'youtube') {
    const videoId = extractYouTubeId(item.url)
    const transcript = videoId ? await fetchYouTubeTranscript(videoId) : ''
    if (transcript) {
      context = `This is a YouTube video titled "${item.title}".\n\nTranscript:\n${transcript}`
    } else {
      context = `This is a YouTube video titled "${item.title}". Description: ${item.description || 'none'}.`
    }
  } else if (platform === 'tiktok') {
    context = `This is a TikTok video titled "${item.title}". Description: ${item.description || 'none'}. Summarise based on what the title and description suggest — note it's a short-form video.`
  } else if (platform === 'instagram') {
    context = `This is an Instagram post titled "${item.title}". Caption: ${item.description || 'none'}.`
  } else if (platform === 'facebook') {
    context = `This is a Facebook post titled "${item.title}". Description: ${item.description || 'none'}.`
  } else {
    // Article / web page — fetch real text
    const articleText = await fetchArticleText(item.url)
    const body = articleText || [item.title, item.description].filter(Boolean).join('. ')
    context = `Article title: "${item.title}".\n\nContent:\n${body}`
  }

  const { text } = await generateText({
    model: 'google/gemini-2.5-flash',
    system:
      'You are a warm, calming companion inside a personal saved-content app. ' +
      'Write a gentle 2-3 sentence summary of what the person saved, so they can remember it at a glance. ' +
      'Be soothing and encouraging, never clinical or hype-y. Speak plainly and kindly, like a thoughtful friend. ' +
      'Do not use emojis, headings, or bullet points. ' +
      'For videos, highlight what makes the content worth watching. ' +
      'If the content is thin, summarise what it appears to be about without inventing specifics.',
    prompt: context,
  })

  const summary = text.trim()

  await db
    .update(cur8Item)
    .set({ summary })
    .where(and(eq(cur8Item.id, itemId), eq(cur8Item.userId, userId)))

  return { summary, cached: false }
}
