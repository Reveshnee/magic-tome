import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { cur8Item, cur8Note } from '@/lib/db/schema'
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
        `\n\nIMPORTANT: The extracted content above IS the document — you have genuinely read it. ` +
        `Answer confidently and specifically about it. Do NOT hedge with phrases like "I only have an excerpt", ` +
        `"I can't access the full document", or "based on what was shared" — treat the content above as the complete item. ` +
        `Prioritise this item in your answer, but you may connect it to her other saves when helpful.`
    }
  }

  // Build a concise context snapshot of the user's library
  const [items, notes] = await Promise.all([
    db.select({ title: cur8Item.title, category: cur8Item.category, summary: cur8Item.summary, description: cur8Item.description, fileText: cur8Item.fileText, url: cur8Item.url })
      .from(cur8Item).where(eq(cur8Item.userId, userId)).orderBy(desc(cur8Item.savedAt)).limit(80),
    db.select({ content: cur8Note.body })
      .from(cur8Note).where(eq(cur8Note.userId, userId)).orderBy(desc(cur8Note.createdAt)).limit(20),
  ])

  const libraryContext = items.length > 0
    ? `Here is a snapshot of everything Reveshnee has saved across her havens (most recent first):\n` +
      items.map((it) => {
        const base = `[${it.category}] "${it.title}"`
        // If we have extracted file text, include a generous excerpt so the AI can
        // genuinely discuss the actual content of the document, not just its title.
        if (it.fileText) {
          return `${base}\n  Document content: ${it.fileText.slice(0, 1800)}`
        }
        if (it.summary) return `${base} — ${it.summary}`
        if (it.description) return `${base} — ${it.description.slice(0, 80)}`
        return base
      }).join('\n') +
      (notes.length > 0 ? `\n\nHer recent brain-dump notes:\n${notes.map((n) => `"${n.content.slice(0, 120)}"`).join('\n')}` : '')
    : 'She has not saved anything yet.'

  const systemPrompt = focusContext
    ? `${SYSTEM}\n\n${focusContext}\n\nFor wider context, here is the rest of her library:\n${libraryContext}`
    : `${SYSTEM}\n\n${libraryContext}`

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
