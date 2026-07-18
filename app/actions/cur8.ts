'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { cur8Item, cur8Folder, cur8Reflection, cur8GardenName } from '@/lib/db/schema'
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
  summary?: string
  savedAt: string
  openedAt?: string
}

export interface Cur8FolderDTO {
  id: string
  category: string
  name: string
  pinned: boolean
  sortOrder: number
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
    db.select().from(cur8Folder).where(eq(cur8Folder.userId, userId)).orderBy(desc(cur8Folder.pinned), cur8Folder.sortOrder, desc(cur8Folder.createdAt)),
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
      summary: i.summary ?? undefined,
      savedAt: i.savedAt.toISOString(),
      openedAt: i.openedAt ? i.openedAt.toISOString() : undefined,
    })),
    folders: folders.map((f) => ({
      id: f.id,
      category: f.category,
      name: f.name,
      pinned: f.pinned,
      sortOrder: f.sortOrder,
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

// Edit a saved item's title and/or personal note (description).
export async function updateItem(
  itemId: string,
  input: { title?: string; description?: string },
): Promise<Cur8ItemDTO | null> {
  const userId = await getUserId()
  const patch: Record<string, string | null> = {}
  if (typeof input.title === 'string') {
    const t = input.title.trim()
    if (t) patch.title = t.slice(0, 300)
  }
  if (typeof input.description === 'string') {
    patch.description = input.description.trim() ? input.description.trim() : null
  }
  if (Object.keys(patch).length === 0) return null
  await db
    .update(cur8Item)
    .set(patch)
    .where(and(eq(cur8Item.id, itemId), eq(cur8Item.userId, userId)))
  const [row] = await db
    .select()
    .from(cur8Item)
    .where(and(eq(cur8Item.id, itemId), eq(cur8Item.userId, userId)))
  if (!row) return null
  return {
    id: row.id,
    category: row.category,
    folderId: row.folderId ?? undefined,
    url: row.url,
    title: row.title,
    description: row.description ?? undefined,
    thumbnail: row.thumbnail ?? undefined,
    favicon: row.favicon ?? undefined,
    summary: row.summary ?? undefined,
    savedAt: row.savedAt.toISOString(),
    openedAt: row.openedAt ? row.openedAt.toISOString() : undefined,
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

// Move an item into a different garden (category). Clears the folder since
// folders belong to a specific garden.
export async function moveItemToGarden(itemId: string, targetCategory: string) {
  const userId = await getUserId()
  await db
    .update(cur8Item)
    .set({ category: targetCategory, folderId: null })
    .where(and(eq(cur8Item.id, itemId), eq(cur8Item.userId, userId)))
}

// Copy an item into a different garden, leaving the original untouched.
export async function copyItemToGarden(itemId: string, targetCategory: string): Promise<Cur8ItemDTO | null> {
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
    category: targetCategory,
    folderId: null,
    url: original.url,
    title: original.title,
    description: original.description,
    thumbnail: original.thumbnail,
    favicon: original.favicon,
    savedAt,
  })

  return {
    id,
    category: targetCategory,
    folderId: undefined,
    url: original.url,
    title: original.title,
    description: original.description ?? undefined,
    thumbnail: original.thumbnail ?? undefined,
    favicon: original.favicon ?? undefined,
    savedAt: savedAt.toISOString(),
  }
}

// ─── Folders ───
export async function createFolder(category: string, name: string): Promise<Cur8FolderDTO> {
  const userId = await getUserId()
  const id = randomUUID()
  const createdAt = new Date()

  await db.insert(cur8Folder).values({ id, userId, category, name, createdAt })

  return { id, category, name, pinned: false, sortOrder: 0, createdAt: createdAt.toISOString() }
}

// Rename a folder
export async function renameFolder(folderId: string, name: string): Promise<boolean> {
  const userId = await getUserId()
  const trimmed = name.trim().slice(0, 60)
  if (!trimmed) return false
  await db
    .update(cur8Folder)
    .set({ name: trimmed })
    .where(and(eq(cur8Folder.id, folderId), eq(cur8Folder.userId, userId)))
  return true
}

// Pin / unpin a folder
export async function pinFolder(folderId: string, pinned: boolean) {
  const userId = await getUserId()
  await db
    .update(cur8Folder)
    .set({ pinned })
    .where(and(eq(cur8Folder.id, folderId), eq(cur8Folder.userId, userId)))
}

// Persist a new folder order. `orderedIds` is the full list in the desired order.
export async function reorderFolders(orderedIds: string[]) {
  const userId = await getUserId()
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(cur8Folder)
      .set({ sortOrder: i })
      .where(and(eq(cur8Folder.id, orderedIds[i]), eq(cur8Folder.userId, userId)))
  }
}

// Copy a folder and all its items into ANOTHER garden/haven.
export async function copyFolderToGarden(
  folderId: string,
  targetCategory: string,
): Promise<{ folder: Cur8FolderDTO; items: Cur8ItemDTO[] } | null> {
  const userId = await getUserId()
  const [original] = await db
    .select()
    .from(cur8Folder)
    .where(and(eq(cur8Folder.id, folderId), eq(cur8Folder.userId, userId)))
  if (!original) return null

  const newFolderId = randomUUID()
  const createdAt = new Date()
  await db.insert(cur8Folder).values({
    id: newFolderId,
    userId,
    category: targetCategory,
    name: original.name,
    createdAt,
  })

  const sourceItems = await db
    .select()
    .from(cur8Item)
    .where(and(eq(cur8Item.folderId, folderId), eq(cur8Item.userId, userId)))

  const copied: Cur8ItemDTO[] = []
  for (const src of sourceItems) {
    const id = randomUUID()
    const savedAt = new Date()
    await db.insert(cur8Item).values({
      id,
      userId,
      category: targetCategory,
      folderId: newFolderId,
      url: src.url,
      title: src.title,
      description: src.description,
      thumbnail: src.thumbnail,
      favicon: src.favicon,
      savedAt,
    })
    copied.push({
      id,
      category: targetCategory,
      folderId: newFolderId,
      url: src.url,
      title: src.title,
      description: src.description ?? undefined,
      thumbnail: src.thumbnail ?? undefined,
      favicon: src.favicon ?? undefined,
      savedAt: savedAt.toISOString(),
    })
  }

  return {
    folder: { id: newFolderId, category: targetCategory, name: original.name, pinned: false, sortOrder: 0, createdAt: createdAt.toISOString() },
    items: copied,
  }
}

// Duplicate a folder and every item inside it into a brand-new folder
// in the same garden. Returns the new folder plus its copied items.
export async function duplicateFolder(
  folderId: string,
): Promise<{ folder: Cur8FolderDTO; items: Cur8ItemDTO[] } | null> {
  const userId = await getUserId()

  const [original] = await db
    .select()
    .from(cur8Folder)
    .where(and(eq(cur8Folder.id, folderId), eq(cur8Folder.userId, userId)))
  if (!original) return null

  // Create the new folder
  const newFolderId = randomUUID()
  const createdAt = new Date()
  const newName = `${original.name} (copy)`.slice(0, 60)
  await db.insert(cur8Folder).values({
    id: newFolderId,
    userId,
    category: original.category,
    name: newName,
    createdAt,
  })

  // Copy every item that lived in the original folder
  const sourceItems = await db
    .select()
    .from(cur8Item)
    .where(and(eq(cur8Item.folderId, folderId), eq(cur8Item.userId, userId)))

  const copied: Cur8ItemDTO[] = []
  for (const src of sourceItems) {
    const id = randomUUID()
    const savedAt = new Date()
    await db.insert(cur8Item).values({
      id,
      userId,
      category: src.category,
      folderId: newFolderId,
      url: src.url,
      title: src.title,
      description: src.description,
      thumbnail: src.thumbnail,
      favicon: src.favicon,
      savedAt,
    })
    copied.push({
      id,
      category: src.category,
      folderId: newFolderId,
      url: src.url,
      title: src.title,
      description: src.description ?? undefined,
      thumbnail: src.thumbnail ?? undefined,
      favicon: src.favicon ?? undefined,
      savedAt: savedAt.toISOString(),
    })
  }

  return {
    folder: { id: newFolderId, category: original.category, name: newName, pinned: false, sortOrder: 0, createdAt: createdAt.toISOString() },
    items: copied,
  }
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

export async function updateReflection(id: string, body: string): Promise<ReflectionDTO | null> {
  const userId = await getUserId()
  const trimmed = body.trim()
  if (!trimmed) return null
  await db
    .update(cur8Reflection)
    .set({ body: trimmed })
    .where(and(eq(cur8Reflection.id, id), eq(cur8Reflection.userId, userId)))
  const [row] = await db
    .select()
    .from(cur8Reflection)
    .where(and(eq(cur8Reflection.id, id), eq(cur8Reflection.userId, userId)))
  if (!row) return null
  return { id: row.id, category: row.category, body: row.body, createdAt: row.createdAt.toISOString() }
}

export async function deleteReflection(id: string) {
  const userId = await getUserId()
  await db.delete(cur8Reflection).where(and(eq(cur8Reflection.id, id), eq(cur8Reflection.userId, userId)))
}

// ─── Custom garden names ───
// Returns a map of category → custom name for any gardens the user has renamed.
export async function getGardenNames(): Promise<Record<string, string>> {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(cur8GardenName)
    .where(eq(cur8GardenName.userId, userId))
  const map: Record<string, string> = {}
  for (const r of rows) map[r.category] = r.name
  return map
}

export async function renameGarden(category: string, name: string) {
  const userId = await getUserId()
  const trimmed = name.trim().slice(0, 40)
  if (!trimmed) return
  const updatedAt = new Date()
  await db
    .insert(cur8GardenName)
    .values({ userId, category, name: trimmed, updatedAt })
    .onConflictDoUpdate({
      target: [cur8GardenName.userId, cur8GardenName.category],
      set: { name: trimmed, updatedAt },
    })
}

// Remove the override so the garden reverts to its default name.
export async function resetGardenName(category: string) {
  const userId = await getUserId()
  await db
    .delete(cur8GardenName)
    .where(and(eq(cur8GardenName.userId, userId), eq(cur8GardenName.category, category)))
}
