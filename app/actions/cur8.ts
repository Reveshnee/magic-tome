'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { cur8Item, cur8Folder, cur8Reflection } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { randomUUID } from 'crypto'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export interface Cur8ItemDTO {
  id: string
  category: string
  folderId?: string
  url: string
  title: string
  description?: string
  thumbnail?: string
  favicon?: string
  savedAt: string
  openedAt?: string
}

export interface Cur8FolderDTO {
  id: string
  category: string
  name: string
  createdAt: string
}

// ─── Read everything for the signed-in user ───
export async function getCur8Data(): Promise<{
  items: Cur8ItemDTO[]
  folders: Cur8FolderDTO[]
}> {
  const userId = await getUserId()

  const [items, folders] = await Promise.all([
    db.select().from(cur8Item).where(eq(cur8Item.userId, userId)).orderBy(desc(cur8Item.savedAt)),
    db.select().from(cur8Folder).where(eq(cur8Folder.userId, userId)).orderBy(desc(cur8Folder.createdAt)),
  ])

  return {
    items: items.map((i) => ({
      id: i.id,
      category: i.category,
      folderId: i.folderId ?? undefined,
      url: i.url,
      title: i.title,
      description: i.description ?? undefined,
      thumbnail: i.thumbnail ?? undefined,
      favicon: i.favicon ?? undefined,
      savedAt: i.savedAt.toISOString(),
      openedAt: i.openedAt ? i.openedAt.toISOString() : undefined,
    })),
    folders: folders.map((f) => ({
      id: f.id,
      category: f.category,
      name: f.name,
      createdAt: f.createdAt.toISOString(),
    })),
  }
}

// ─── Items ───
export async function createItem(input: {
  category: string
  folderId?: string
  url: string
  title: string
  description?: string
  thumbnail?: string
  favicon?: string
}): Promise<Cur8ItemDTO> {
  const userId = await getUserId()
  const id = randomUUID()
  const savedAt = new Date()

  await db.insert(cur8Item).values({
    id,
    userId,
    category: input.category,
    folderId: input.folderId ?? null,
    url: input.url,
    title: input.title,
    description: input.description ?? null,
    thumbnail: input.thumbnail ?? null,
    favicon: input.favicon ?? null,
    savedAt,
  })

  return {
    id,
    category: input.category,
    folderId: input.folderId,
    url: input.url,
    title: input.title,
    description: input.description,
    thumbnail: input.thumbnail,
    favicon: input.favicon,
    savedAt: savedAt.toISOString(),
  }
}

export async function moveItem(itemId: string, folderId: string | undefined) {
  const userId = await getUserId()
  await db
    .update(cur8Item)
    .set({ folderId: folderId ?? null })
    .where(and(eq(cur8Item.id, itemId), eq(cur8Item.userId, userId)))
}

export async function duplicateItem(itemId: string): Promise<Cur8ItemDTO | null> {
  const userId = await getUserId()
  const [original] = await db
    .select()
    .from(cur8Item)
    .where(and(eq(cur8Item.id, itemId), eq(cur8Item.userId, userId)))

  if (!original) return null

  const id = randomUUID()
  const savedAt = new Date()
  await db.insert(cur8Item).values({
    id,
    userId,
    category: original.category,
    folderId: original.folderId,
    url: original.url,
    title: original.title,
    description: original.description,
    thumbnail: original.thumbnail,
    favicon: original.favicon,
    savedAt,
  })

  return {
    id,
    category: original.category,
    folderId: original.folderId ?? undefined,
    url: original.url,
    title: original.title,
    description: original.description ?? undefined,
    thumbnail: original.thumbnail ?? undefined,
    favicon: original.favicon ?? undefined,
    savedAt: savedAt.toISOString(),
  }
}

export async function deleteItem(itemId: string) {
  const userId = await getUserId()
  await db.delete(cur8Item).where(and(eq(cur8Item.id, itemId), eq(cur8Item.userId, userId)))
}

// ─── Folders ───
export async function createFolder(category: string, name: string): Promise<Cur8FolderDTO> {
  const userId = await getUserId()
  const id = randomUUID()
  const createdAt = new Date()

  await db.insert(cur8Folder).values({ id, userId, category, name, createdAt })

  return { id, category, name, createdAt: createdAt.toISOString() }
}

export async function deleteFolder(folderId: string) {
  const userId = await getUserId()
  // Unassign items in this folder, then delete the folder
  await db
    .update(cur8Item)
    .set({ folderId: null })
    .where(and(eq(cur8Item.folderId, folderId), eq(cur8Item.userId, userId)))
  await db.delete(cur8Folder).where(and(eq(cur8Folder.id, folderId), eq(cur8Folder.userId, userId)))
}

// ─── Track access (for "not yet opened" stats) ───
export async function markItemOpened(itemId: string) {
  const userId = await getUserId()
  await db
    .update(cur8Item)
    .set({ openedAt: new Date() })
    .where(and(eq(cur8Item.id, itemId), eq(cur8Item.userId, userId)))
}

// ─── Reflections (category-tied) ───
export interface ReflectionDTO {
  id: string
  category: string
  body: string
  createdAt: string
}

export async function getReflections(category: string): Promise<ReflectionDTO[]> {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(cur8Reflection)
    .where(and(eq(cur8Reflection.userId, userId), eq(cur8Reflection.category, category)))
    .orderBy(desc(cur8Reflection.createdAt))
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
  }))
}

export async function createReflection(category: string, body: string): Promise<ReflectionDTO | null> {
  const userId = await getUserId()
  const trimmed = body.trim()
  if (!trimmed) return null
  const id = randomUUID()
  const createdAt = new Date()
  await db.insert(cur8Reflection).values({ id, userId, category, body: trimmed, createdAt })
  return { id, category, body: trimmed, createdAt: createdAt.toISOString() }
}

export async function deleteReflection(id: string) {
  const userId = await getUserId()
  await db.delete(cur8Reflection).where(and(eq(cur8Reflection.id, id), eq(cur8Reflection.userId, userId)))
}
