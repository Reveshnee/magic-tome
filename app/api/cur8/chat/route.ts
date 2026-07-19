import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { cur8Item, cur8Note, cur8Discussion } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { headers } from 'next/headers'
import { streamText } from 'ai'

export const maxDuration = 60

const SYSTEM =
  'You are Cur8 — a warm, intelligent companion inside a personal content curation app. ' +
  'You have access to everything this person has saved: YouTube videos, TikToks, articles, ' +
  'documents, images, and more, organised across 8 "havens". ' +
  'The user is called Reveshnee. She studies psychology (SACAP), works in client relations, ' +
  'is interested in nervous-system regulation, productivity, coaching, and personal growth. ' +
  'When answering, draw on her actual saves — reference specific titles, themes, or patterns you notice. ' +
  'Be warm, thoughtful, and conversational — like a brilliant friend who has read everything she\'s saved. ' +
  'Never clinical or hype-y. No emojis. Speak in flowing sentences, not bullet points, unless she asks for a list.'

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  const userId = session.user.id

  const { message, history, focusItemId } = await req.json() as {
    message: string
    history: { role: 'user' | 'assistant'; content: string }[]
    focusItemId?: string | null
  }

  // If the conversation is focused on a specific item, load its full content so
  // the AI can answer deeply and confidently about that one item.
  let focusContext = ''
  if (focusItemId) {
    const [focus] = await db
      .select({ title: cur8Item.title, category: cur8Item.category, summary: cur8Item.summary, description: cur8Item.description, fileText: cur8Item.fileText, url: cur8Item.url })
      .from(cur8Item)
      .where(and(eq(cur8Item.id, focusItemId), eq(cur8Item.userId, userId)))
    if (focus) {
      const parts = [`This conversation is focused on ONE saved item that Reveshnee is looking at right now:`]
      parts.push(`Title: "${focus.title}" (in her ${focus.category} haven)`)
      if (focus.description) parts.push(`Her own note on it: ${focus.description}`)
      if (focus.fileText && focus.fileText.trim()) {
        // Give the model the full extracted text (generous cap) so it truly reads the document.
        parts.push(`Full extracted content of this item:\n${focus.fileText.slice(0, 12000)}`)
      } else if (focus.summary) {
        parts.push(`Summary: ${focus.summary}`)
      }
      focusContext =
        parts.join('\n') +
        `\n\nIMPORTANT — how to talk about this item:\n` +
        `• The extracted content above is the COMPLETE document, not a snapshot, preview, or excerpt. You have genuinely read the whole thing.\n` +
        `• NEVER say things like "the snapshot I have", "sometimes these are excerpts", "the text I'm able to access", "based on what was shared", "beyond the segment I have", or "I only have an excerpt". These are false — you have the full document.\n` +
        `• Answer directly and specifically, quoting or naming the actual concepts, sections, and terms from the content above.\n` +
        `• Before saying something "isn't in" the document, scan the full content above carefully — the answer is very likely present, possibly under different wording (for example, "four categories of moves" may appear as a named list of moves).\n` +
        `• If something truly isn't covered, say so plainly and briefly, without blaming your access to the document.\n` +
        `Prioritise this item in your answer, but you may connect it to her other saves when helpful.`
    }
  }

  // Build a concise context snapshot of the user's library
  const [allItems, notes, discussions] = await Promise.all([
    db.select({ id: cur8Item.id, title: cur8Item.title, category: cur8Item.category, summary: cur8Item.summary, description: cur8Item.description, fileText: cur8Item.fileText, url: cur8Item.url })
      .from(cur8Item).where(eq(cur8Item.userId, userId)).orderBy(desc(cur8Item.savedAt)).limit(80),
    db.select({ content: cur8Note.body })
      .from(cur8Note).where(eq(cur8Note.userId, userId)).orderBy(desc(cur8Note.createdAt)).limit(20),
    db.select({ title: cur8Discussion.title, category: cur8Discussion.category, messages: cur8Discussion.messages, updatedAt: cur8Discussion.updatedAt })
      .from(cur8Discussion).where(eq(cur8Discussion.userId, userId)).orderBy(desc(cur8Discussion.updatedAt)).limit(12),
  ])

  // Summarise recent AI discussions so the companion has continuity — it can
  // remember what Reveshnee has already asked and explored, across every haven.
  const discussionsContext = discussions.length > 0
    ? `Here are recent AI conversations you have already had with Reveshnee (most recent first). ` +
      `Use them for continuity — you can refer back to what she asked and what you discussed, ` +
      `and avoid repeating yourself:\n` +
      discussions.map((d) => {
        let firstQ = ''
        let lastA = ''
        try {
          const msgs = JSON.parse(d.messages) as { role: string; content: string }[]
          firstQ = msgs.find((m) => m.role === 'user')?.content ?? ''
          lastA = [...msgs].reverse().find((m) => m.role === 'assistant')?.content ?? ''
        } catch { /* ignore malformed */ }
        const scope = d.category ? `[${d.category}] ` : ''
        const parts = [`${scope}"${d.title}"`]
        if (firstQ) parts.push(`  She asked: ${firstQ.slice(0, 160)}`)
        if (lastA) parts.push(`  You replied (excerpt): ${lastA.slice(0, 220)}`)
        return parts.join('\n')
      }).join('\n')
    : ''

  // When focused on one item, drop it from the library snapshot so it is never
  // duplicated as a truncated excerpt (that is what made the model think it only
  // had a "snapshot" of the document and hedge). The focus block already holds
  // the full text.
  const items = focusItemId ? allItems.filter((it) => it.id !== focusItemId) : allItems

  const libraryContext = items.length > 0
    ? `Here is a snapshot of everything Reveshnee has saved across her havens (most recent first):\n` +
      items.map((it) => {
        const base = `[${it.category}] "${it.title}"`
        // When focused on a single item, keep the wider library short (title +
        // summary only) so there are no misleading truncated document bodies.
        if (focusItemId) {
          if (it.summary) return `${base} — ${it.summary}`
          if (it.description) return `${base} — ${it.description.slice(0, 80)}`
          return base
        }
        // Otherwise, include a generous excerpt so the AI can genuinely discuss
        // the actual content of each document, not just its title.
        if (it.fileText) {
          return `${base}\n  Document content: ${it.fileText.slice(0, 1800)}`
        }
        if (it.summary) return `${base} — ${it.summary}`
        if (it.description) return `${base} — ${it.description.slice(0, 80)}`
        return base
      }).join('\n') +
      (notes.length > 0 ? `\n\nHer recent brain-dump notes:\n${notes.map((n) => `"${n.content.slice(0, 120)}"`).join('\n')}` : '')
    : 'She has not saved anything yet.'

  const base = focusContext
    ? `${SYSTEM}\n\n${focusContext}\n\nFor wider context, here are the TITLES of her other saves (do not treat these as the focused document):\n${libraryContext}`
    : `${SYSTEM}\n\n${libraryContext}`
  const systemPrompt = discussionsContext ? `${base}\n\n${discussionsContext}` : base

  const result = streamText({
    model: 'google/gemini-2.5-flash',
    system: systemPrompt,
    messages: [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user' as const, content: message },
    ],
  })

  return result.toTextStreamResponse()
}
