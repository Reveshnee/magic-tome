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
export interface Cur8Settings {
  emailTo: string
  memEmail: string
  autoEmail: boolean
}

export async function getSettings(): Promise<Cur8Settings> {
  const userId = await getUserId()
  const [setting] = await db
    .select()
    .from(cur8Setting)
    .where(eq(cur8Setting.userId, userId))
  return {
    emailTo: setting?.emailTo ?? '',
    memEmail: setting?.memEmail ?? 'save@mem.ai',
    autoEmail: setting?.autoEmail ?? false,
  }
}

export async function saveSettings(s: Cur8Settings) {
  const userId = await getUserId()
  const updatedAt = new Date()
  const values = {
    emailTo: s.emailTo.trim() || null,
    memEmail: s.memEmail.trim() || 'save@mem.ai',
    autoEmail: s.autoEmail,
  }
  await db
    .insert(cur8Setting)
    .values({ userId, ...values, updatedAt })
    .onConflictDoUpdate({
      target: cur8Setting.userId,
      set: { ...values, updatedAt },
    })
}
