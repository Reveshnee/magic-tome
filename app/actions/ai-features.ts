'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { cur8Item, cur8Note, cur8Memory, cur8Connection } from '@/lib/db/schema'
import { and, eq, ne, desc, inArray } from 'drizzle-orm'
import { headers } from 'next/headers'
import { generateText, generateObject } from 'ai'
import { z } from 'zod'
import { nanoid } from 'nanoid'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

const SYSTEM_WARM =
  'You are a warm, thoughtful companion inside Cur8 — a personal saved-content app. ' +
  'The user is called Reveshnee. She studies psychology (SACAP), works in client relations, ' +
  'is interested in nervous-system regulation, productivity, coaching, and personal growth. ' +
  'Be gentle, encouraging, insightful. Never clinical or hype-y. No emojis, no bullet-point lists ' +
  'unless specifically asked. Speak like a calm, knowledgeable friend.'

// ─── Helper: build a concise item catalogue string for prompts ───────────────
function itemCatalogue(items: { title: string; category: string; description?: string | null; summary?: string | null }[]): string {
  return items
    .map((it) => `[${it.category}] "${it.title}"${it.summary ? ` — ${it.summary}` : it.description ? ` — ${it.description}` : ''}`)
    .join('\n')
}

// ────────────────────────────────────────────────────────────────────────────
// TASK 2: Cross-Haven Memory & Connections
// ────────────────────────────────────────────────────────────────────────────

// Learn from the user's saved items and store insights in cur8_memory.
// Run after a batch of new saves, or on demand from the hub.
export async function updateMemory(): Promise<{ insights: string[] }> {
  const userId = await getUserId()

  const items = await db
    .select({ title: cur8Item.title, category: cur8Item.category, description: cur8Item.description, summary: cur8Item.summary })
    .from(cur8Item)
    .where(eq(cur8Item.userId, userId))
    .orderBy(desc(cur8Item.savedAt))
    .limit(60)

  if (items.length < 3) return { insights: [] }

  const catalogue = itemCatalogue(items)

  const { object } = await generateObject({
    model: 'google/gemini-2.5-flash',
    schema: z.object({
      insights: z.array(z.string()).max(6),
    }),
    system: SYSTEM_WARM,
    prompt:
      `Here are Reveshnee's recently saved items across her havens:\n${catalogue}\n\n` +
      'Identify 3-6 meaningful insights or patterns you notice — themes that cross multiple havens, ' +
      'recurring interests, connections between her study topics and wellbeing content, growth areas, etc. ' +
      'Each insight should be 1-2 sentences, warm and personal.',
  })

  const insightList = object.insights ?? []

  // Replace all existing memories for this user (keep it fresh, not accumulating)
  await db.delete(cur8Memory).where(eq(cur8Memory.userId, userId))

  const sources = [...new Set(items.map((i) => i.category))]
  for (const insight of insightList) {
    await db.insert(cur8Memory).values({
      id: nanoid(),
      userId,
      insight,
      sources: JSON.stringify(sources),
    })
  }

  return { insights: insightList }
}

// Fetch stored memories for display on the hub
export async function getMemories(): Promise<{ id: string; insight: string }[]> {
  const userId = await getUserId()
  const rows = await db
    .select({ id: cur8Memory.id, insight: cur8Memory.insight })
    .from(cur8Memory)
    .where(eq(cur8Memory.userId, userId))
    .orderBy(desc(cur8Memory.updatedAt))
  return rows
}

// Find items thematically related to a given item (across all havens)
export async function findConnections(itemId: string): Promise<{ item: { id: string; title: string; category: string; url: string }; reason: string }[]> {
  const userId = await getUserId()

  const [anchor] = await db.select().from(cur8Item).where(and(eq(cur8Item.id, itemId), eq(cur8Item.userId, userId)))
  if (!anchor) return []

  // Check if we have cached connections already
  const cached = await db.select({ itemBId: cur8Connection.itemBId, reason: cur8Connection.reason })
    .from(cur8Connection)
    .where(and(eq(cur8Connection.userId, userId), eq(cur8Connection.itemAId, itemId)))
    .limit(3)

  if (cached.length > 0) {
    const relatedItems = await db.select({ id: cur8Item.id, title: cur8Item.title, category: cur8Item.category, url: cur8Item.url })
      .from(cur8Item)
      .where(and(eq(cur8Item.userId, userId), inArray(cur8Item.id, cached.map((c) => c.itemBId))))
    return relatedItems.map((item) => ({ item, reason: cached.find((c) => c.itemBId === item.id)?.reason ?? '' }))
  }

  // Build connections fresh with AI
  const others = await db
    .select({ id: cur8Item.id, title: cur8Item.title, category: cur8Item.category, description: cur8Item.description, summary: cur8Item.summary, url: cur8Item.url })
    .from(cur8Item)
    .where(and(eq(cur8Item.userId, userId), ne(cur8Item.id, itemId)))
    .orderBy(desc(cur8Item.savedAt))
    .limit(40)

  if (others.length === 0) return []

  const othersList = others.map((o, i) => `${i}. [${o.category}] "${o.title}"${o.summary ? ` — ${o.summary}` : ''}`).join('\n')

  const { object } = await generateObject({
    model: 'google/gemini-2.5-flash',
    schema: z.object({
      connections: z.array(z.object({
        index: z.number(),
        reason: z.string(),
      })).max(3),
    }),
    system: SYSTEM_WARM,
    prompt:
      `Anchor item (${anchor.category}): "${anchor.title}"\n${anchor.summary || anchor.description || ''}\n\n` +
      `Other saved items:\n${othersList}\n\n` +
      'Pick up to 3 items from the list that connect meaningfully to the anchor item — shared themes, ' +
      'complementary ideas, or things that would enrich each other. For each, give a 1-sentence reason why they connect.',
  })

  const results: { item: { id: string; title: string; category: string; url: string }; reason: string }[] = []

  for (const conn of object.connections) {
    const related = others[conn.index]
    if (!related) continue
    await db.insert(cur8Connection).values({
      id: nanoid(),
      userId,
      itemAId: itemId,
      itemBId: related.id,
      reason: conn.reason,
    }).onConflictDoNothing()
    results.push({ item: { id: related.id, title: related.title, category: related.category, url: related.url }, reason: conn.reason })
  }

  return results
}

// ────────────────────────────────────────────────────────────────────────────
// TASK 3: Brain Dump AI Cleanup
// ────────────────────────────────────────────────────────────────────────────

export interface CleanupResult {
  tidy: string          // Clean, readable version
  bullets: string[]     // Key points
  actions: string[]     // Action items extracted
}

export async function cleanupBrainDump(rawText: string): Promise<CleanupResult> {
  await getUserId()

  const { object } = await generateObject({
    model: 'google/gemini-2.5-flash',
    schema: z.object({
      tidy: z.string(),
      bullets: z.array(z.string()).max(6),
      actions: z.array(z.string()).max(5),
    }),
    system: SYSTEM_WARM,
    prompt:
      `Here is a raw brain dump from Reveshnee:\n"${rawText}"\n\n` +
      'Please:\n' +
      '1. "tidy": rewrite it as clear, flowing sentences (keep her voice, just clean it up).\n' +
      '2. "bullets": extract the key points or ideas as short bullet strings (no dashes/asterisks, just the text).\n' +
      '3. "actions": pull out any action items or things she needs to do (empty array if none).',
  })

  return object
}

// ────────────────────────────────────────────────────────────────────────────
// TASK 4: Auto-tag & Folder Suggestions
// ────────────────────────────────────────────────────────────────────────────

export interface TagSuggestion {
  haven: string       // category slug
  reason: string
  tags: string[]      // 2-4 descriptive tags
  folderName?: string // suggested folder name if applicable
}

export async function suggestTagsAndFolder(
  url: string,
  title: string,
  description: string,
): Promise<TagSuggestion> {
  await getUserId()

  const HAVENS = [
    { slug: 'youtube', label: 'YouTube videos' },
    { slug: 'tiktok', label: 'TikTok videos' },
    { slug: 'instagram', label: 'Instagram' },
    { slug: 'facebook', label: 'Facebook' },
    { slug: 'articles', label: 'Articles (The Koi Pond / study content)' },
    { slug: 'images', label: 'Images (The Greenhouse / style)' },
    { slug: 'documents', label: 'Documents (The Tide / SOPs & docs)' },
    { slug: 'web', label: 'Web saves (general)' },
  ]

  const { object } = await generateObject({
    model: 'google/gemini-2.5-flash',
    schema: z.object({
      haven: z.string(),
      reason: z.string(),
      tags: z.array(z.string()).min(1).max(4),
      folderName: z.string().optional(),
    }),
    system: SYSTEM_WARM,
    prompt:
      `Reveshnee just saved this:\nURL: ${url}\nTitle: ${title}\nDescription: ${description}\n\n` +
      `Her 8 havens are:\n${HAVENS.map((h) => `- ${h.slug}: ${h.label}`).join('\n')}\n\n` +
      'Suggest: (1) which haven slug best fits this save, (2) a 1-sentence reason, ' +
      '(3) 2-4 short descriptive tags (plain text, no #), ' +
      '(4) optionally a folder name if it clearly belongs in one (e.g. "SACAP Lectures", "Nervous System").',
  })

  return object
}

// ────────────────────────────────────────────────────────────────────────────
// TASK 5: Weekly AI Digest
// ────────────────────────────────────────────────────────────────────────────

export interface DigestResult {
  digest: string        // Full rich digest text
  headline: string      // One-line summary for preview
  highlights: string[]  // 3-5 standout saves
}

export async function generateWeeklyDigest(): Promise<DigestResult> {
  const userId = await getUserId()

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const items = await db
    .select({ title: cur8Item.title, category: cur8Item.category, url: cur8Item.url, summary: cur8Item.summary, description: cur8Item.description, savedAt: cur8Item.savedAt })
    .from(cur8Item)
    .where(and(eq(cur8Item.userId, userId)))
    .orderBy(desc(cur8Item.savedAt))
    .limit(50)

  const thisWeek = items.filter((i) => new Date(i.savedAt) >= oneWeekAgo)
  const catalogue = itemCatalogue(thisWeek.length > 0 ? thisWeek : items.slice(0, 20))

  const { object } = await generateObject({
    model: 'google/gemini-2.5-flash',
    schema: z.object({
      digest: z.string(),
      headline: z.string(),
      highlights: z.array(z.string()).min(1).max(5),
    }),
    system: SYSTEM_WARM,
    prompt:
      `Here is what Reveshnee saved ${thisWeek.length > 0 ? 'this week' : 'recently'} across her havens:\n${catalogue}\n\n` +
      'Write a warm, personal weekly digest as if from a thoughtful companion. Include:\n' +
      '- "headline": one gentle sentence summarising the week\'s saving theme\n' +
      '- "digest": 3-5 paragraphs reflecting on what she explored, any patterns or connections you notice, ' +
      'and a gentle encouragement about her learning journey\n' +
      '- "highlights": 3-5 short strings naming standout saves worth revisiting',
  })

  return object
}

// ────────────────────────────────────────────────────────────────────────────
// TASK 7: Know Yourself — personal interests profile + outside suggestions
// ────────────────────────────────────────────────────────────────────────────

export interface YouResult {
  narrative: string           // 2-3 sentence "you are someone who…" summary
  interests: string[]         // 4-8 short interest labels e.g. "Nervous system regulation"
  outside: {                  // Things outside her library she'd likely love
    title: string
    type: string              // "book" | "podcast" | "concept" | "creator" etc
    why: string
  }[]
  pattern: string             // One sentence about the shape of her curiosity
}

export async function discoverYou(): Promise<YouResult> {
  const userId = await getUserId()

  const items = await db
    .select({ title: cur8Item.title, category: cur8Item.category, summary: cur8Item.summary, description: cur8Item.description })
    .from(cur8Item)
    .where(eq(cur8Item.userId, userId))
    .orderBy(desc(cur8Item.savedAt))
    .limit(80)

  if (items.length < 3) {
    return {
      narrative: 'Save a few more things and I\'ll start building your interests profile.',
      interests: [],
      outside: [],
      pattern: '',
    }
  }

  const catalogue = itemCatalogue(items)

  const { object } = await generateObject({
    model: 'google/gemini-2.5-flash',
    schema: z.object({
      narrative: z.string(),
      interests: z.array(z.string()).min(3).max(8),
      outside: z.array(z.object({
        title: z.string(),
        type: z.string(),
        why: z.string(),
      })).min(3).max(6),
      pattern: z.string(),
    }),
    system: SYSTEM_WARM,
    prompt:
      `Here are all of Reveshnee's saved items:\n${catalogue}\n\n` +
      'Based on this collection, build her interests profile:\n' +
      '- "narrative": 2-3 warm sentences starting with "You are someone who…" describing who she is as a learner and curator\n' +
      '- "interests": 4-8 short interest labels (2-4 words each) that define her curiosity areas\n' +
      '- "outside": 3-5 things she would likely love that are NOT in her library yet — real books, podcasts, YouTube channels, concepts, frameworks, or creators. For each: title, type (book/podcast/concept/creator/film), and a 1-sentence "why" connecting it to what she already saves\n' +
      '- "pattern": one sentence describing the underlying shape of her curiosity — the thread that connects everything',
  })

  return object
}

// ────────────────────────────────────────────────────────────────────────────
// TASK 6: AI Discovery — themes and patterns across all havens
// ────────────────────────────────────────────────────────────────────────────

export interface DiscoveryResult {
  themes: { title: string; description: string; havens: string[] }[]
  surprise: string   // One surprising or delightful pattern
  nudge: string      // A gentle suggestion for what to explore next
}

export async function discoverPatterns(): Promise<DiscoveryResult> {
  const userId = await getUserId()

  const items = await db
    .select({ title: cur8Item.title, category: cur8Item.category, summary: cur8Item.summary, description: cur8Item.description })
    .from(cur8Item)
    .where(eq(cur8Item.userId, userId))
    .orderBy(desc(cur8Item.savedAt))
    .limit(80)

  if (items.length < 5) {
    return {
      themes: [],
      surprise: 'Save a few more things and I\'ll start seeing patterns across your havens.',
      nudge: 'Start by saving something that\'s been on your mind lately.',
    }
  }

  const catalogue = itemCatalogue(items)

  const { object } = await generateObject({
    model: 'google/gemini-2.5-flash',
    schema: z.object({
      themes: z.array(z.object({
        title: z.string(),
        description: z.string(),
        havens: z.array(z.string()),
      })).min(1).max(5),
      surprise: z.string(),
      nudge: z.string(),
    }),
    system: SYSTEM_WARM,
    prompt:
      `Here are all of Reveshnee's saved items across her havens:\n${catalogue}\n\n` +
      'Analyse this collection and return:\n' +
      '- "themes": 3-5 cross-haven themes you notice (title, 1-2 sentence description, list of haven slugs involved)\n' +
      '- "surprise": one surprising, delightful, or unexpected connection you spotted\n' +
      '- "nudge": a gentle, personalised suggestion for what she might explore next based on her patterns',
  })

  return object
}
