import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { cur8Item, cur8Note } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
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

  const { message, history } = await req.json() as {
    message: string
    history: { role: 'user' | 'assistant'; content: string }[]
  }

  // Build a concise context snapshot of the user's library
  const [items, notes] = await Promise.all([
    db.select({ title: cur8Item.title, category: cur8Item.category, summary: cur8Item.summary, description: cur8Item.description })
      .from(cur8Item).where(eq(cur8Item.userId, userId)).orderBy(desc(cur8Item.savedAt)).limit(80),
    db.select({ content: cur8Note.content })
      .from(cur8Note).where(eq(cur8Note.userId, userId)).orderBy(desc(cur8Note.createdAt)).limit(20),
  ])

  const libraryContext = items.length > 0
    ? `Here is a snapshot of everything Reveshnee has saved across her havens (most recent first):\n` +
      items.map((it) => `[${it.category}] "${it.title}"${it.summary ? ` — ${it.summary}` : it.description ? ` — ${it.description.slice(0, 80)}` : ''}`).join('\n') +
      (notes.length > 0 ? `\n\nHer recent brain-dump notes:\n${notes.map((n) => `"${n.content.slice(0, 120)}"`).join('\n')}` : '')
    : 'She has not saved anything yet.'

  const result = streamText({
    model: 'google/gemini-2.5-flash',
    system: `${SYSTEM}\n\n${libraryContext}`,
    messages: [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user' as const, content: message },
    ],
  })

  return result.toTextStreamResponse()
}
