'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { cur8Item } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { generateText } from 'ai'

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

function platformFromUrl(url: string): string | null {
  try {
    const h = new URL(url).hostname
    if (h.includes('youtube') || h.includes('youtu.be')) return 'YouTube video'
    if (h.includes('tiktok')) return 'TikTok video'
    if (h.includes('instagram')) return 'Instagram post'
    if (h.includes('facebook')) return 'Facebook post'
  } catch { /* noop */ }
  return null
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

  const platform = platformFromUrl(item.url)
  let source = ''

  // For articles/web pages we read the real text; for video/social we lean on
  // the title + description since we can't read the media itself.
  if (!platform) {
    source = await fetchArticleText(item.url)
  }
  if (!source) {
    source = [item.title, item.description].filter(Boolean).join('. ')
  }

  const context = platform
    ? `This is a ${platform} titled "${item.title}". Notes: ${item.description || 'none'}.`
    : `Article title: "${item.title}". Content: ${source}`

  const { text } = await generateText({
    model: 'google/gemini-2.5-flash',
    system:
      'You are a warm, calming companion inside a personal saved-content app. ' +
      'Write a gentle 2-3 sentence summary of what the person saved, so they can remember it at a glance. ' +
      'Be soothing and encouraging, never clinical or hype-y. Speak plainly and kindly, like a thoughtful friend. ' +
      'Do not use emojis, headings, or bullet points. If the content is thin, summarise what it appears to be about without inventing specifics.',
    prompt: context,
  })

  const summary = text.trim()

  await db
    .update(cur8Item)
    .set({ summary })
    .where(and(eq(cur8Item.id, itemId), eq(cur8Item.userId, userId)))

  return { summary, cached: false }
}
