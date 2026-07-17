'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { cur8Note, cur8Setting } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { randomUUID } from 'crypto'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export interface NoteDTO {
  id: string
  body: string
  pinned: boolean
  createdAt: string
}

export async function getNotes(): Promise<NoteDTO[]> {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(cur8Note)
    .where(eq(cur8Note.userId, userId))
    .orderBy(desc(cur8Note.pinned), desc(cur8Note.createdAt))
  return rows.map((n) => ({
    id: n.id,
    body: n.body,
    pinned: n.pinned,
    createdAt: n.createdAt.toISOString(),
  }))
}

export async function createNote(body: string): Promise<NoteDTO> {
  const userId = await getUserId()
  const trimmed = body.trim()
  if (!trimmed) throw new Error('Empty note')
  const id = randomUUID()
  const createdAt = new Date()
  await db.insert(cur8Note).values({ id, userId, body: trimmed, pinned: false, createdAt })

  // Fire-and-forget forward to Zapier if the user has configured a webhook
  try {
    const [setting] = await db
      .select()
      .from(cur8Setting)
      .where(eq(cur8Setting.userId, userId))
    if (setting?.zapierWebhookUrl) {
      await fetch(setting.zapierWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: trimmed, source: 'Cur8 Brain Dump', createdAt: createdAt.toISOString() }),
      }).catch(() => {})
    }
  } catch {
    // Never let a Zapier failure block saving the note
  }

  return { id, body: trimmed, pinned: false, createdAt: createdAt.toISOString() }
}

export async function togglePinNote(id: string, pinned: boolean) {
  const userId = await getUserId()
  await db
    .update(cur8Note)
    .set({ pinned })
    .where(and(eq(cur8Note.id, id), eq(cur8Note.userId, userId)))
}

export async function deleteNote(id: string) {
  const userId = await getUserId()
  await db.delete(cur8Note).where(and(eq(cur8Note.id, id), eq(cur8Note.userId, userId)))
}

// ─── Settings ───
export async function getZapierWebhook(): Promise<string | null> {
  const userId = await getUserId()
  const [setting] = await db
    .select()
    .from(cur8Setting)
    .where(eq(cur8Setting.userId, userId))
  return setting?.zapierWebhookUrl ?? null
}

export async function setZapierWebhook(url: string) {
  const userId = await getUserId()
  const clean = url.trim() || null
  const updatedAt = new Date()
  await db
    .insert(cur8Setting)
    .values({ userId, zapierWebhookUrl: clean, updatedAt })
    .onConflictDoUpdate({
      target: cur8Setting.userId,
      set: { zapierWebhookUrl: clean, updatedAt },
    })
}
