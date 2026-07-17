export type Category =
  | 'YouTube'
  | 'TikTok'
  | 'Instagram'
  | 'Facebook'
  | 'Articles'
  | 'Images'
  | 'Documents'
  | 'Web'

export interface Cur8Folder {
  id: string
  category: Category
  name: string
  createdAt: string
}

export interface Cur8Item {
  id: string
  category: Category
  folderId?: string   // undefined = "All" / uncategorised
  url: string
  title: string
  description?: string
  thumbnail?: string
  savedAt: string
  favicon?: string
}

export const CATEGORIES: {
  name: Category
  displayName: string  // garden-themed tile label shown in the UI
  lucideIcon: string
  accent: string
  tileFrom: string
  tileTo: string
  border: string
  pill: string
  description: string
}[] = [
  {
    name: 'YouTube',
    displayName: 'The Grove',
    lucideIcon: 'play',
    accent: 'text-rose-400',
    tileFrom: 'from-rose-50',
    tileTo: 'to-pink-50',
    border: 'border-rose-100',
    pill: 'bg-rose-100 text-rose-500',
    description: 'Videos & channels',
  },
  {
    name: 'TikTok',
    displayName: 'Bloom',
    lucideIcon: 'music',
    accent: 'text-purple-400',
    tileFrom: 'from-purple-50',
    tileTo: 'to-violet-50',
    border: 'border-purple-100',
    pill: 'bg-purple-100 text-purple-500',
    description: 'Short-form videos',
  },
  {
    name: 'Instagram',
    displayName: 'The Greenhouse',
    lucideIcon: 'camera',
    accent: 'text-pink-400',
    tileFrom: 'from-pink-50',
    tileTo: 'to-fuchsia-50',
    border: 'border-pink-100',
    pill: 'bg-pink-100 text-pink-500',
    description: 'Posts & reels',
  },
  {
    name: 'Facebook',
    displayName: 'The Current',
    lucideIcon: 'users',
    accent: 'text-sky-400',
    tileFrom: 'from-sky-50',
    tileTo: 'to-blue-50',
    border: 'border-sky-100',
    pill: 'bg-sky-100 text-sky-500',
    description: 'Posts & groups',
  },
  {
    name: 'Articles',
    displayName: 'The Archive',
    lucideIcon: 'newspaper',
    accent: 'text-violet-400',
    tileFrom: 'from-violet-50',
    tileTo: 'to-indigo-50',
    border: 'border-violet-100',
    pill: 'bg-violet-100 text-violet-500',
    description: 'Reads & research',
  },
  {
    name: 'Images',
    displayName: 'Sanctuary',
    lucideIcon: 'image-icon',
    accent: 'text-teal-400',
    tileFrom: 'from-teal-50',
    tileTo: 'to-cyan-50',
    border: 'border-teal-100',
    pill: 'bg-teal-100 text-teal-500',
    description: 'Inspiration & visuals',
  },
  {
    name: 'Documents',
    displayName: 'The Tide',
    lucideIcon: 'file-text',
    accent: 'text-indigo-400',
    tileFrom: 'from-indigo-50',
    tileTo: 'to-purple-50',
    border: 'border-indigo-100',
    pill: 'bg-indigo-100 text-indigo-500',
    description: 'Files & PDFs',
  },
  {
    name: 'Web',
    displayName: 'Ember',
    lucideIcon: 'globe',
    accent: 'text-fuchsia-400',
    tileFrom: 'from-fuchsia-50',
    tileTo: 'to-rose-50',
    border: 'border-fuchsia-100',
    pill: 'bg-fuchsia-100 text-fuchsia-500',
    description: 'Tools & websites',
  },
]

export const SEED_ITEMS: Cur8Item[] = []
export const SEED_FOLDERS: Cur8Folder[] = []

// ── localStorage helpers ──────────────────────────────────────────────
export function loadItems(): Cur8Item[] {
  if (typeof window === 'undefined') return SEED_ITEMS
  try {
    const s = localStorage.getItem('cur8_items')
    return s ? JSON.parse(s) : SEED_ITEMS
  } catch { return SEED_ITEMS }
}

export function saveItems(items: Cur8Item[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem('cur8_items', JSON.stringify(items))
}

export function loadFolders(): Cur8Folder[] {
  if (typeof window === 'undefined') return SEED_FOLDERS
  try {
    const s = localStorage.getItem('cur8_folders')
    return s ? JSON.parse(s) : SEED_FOLDERS
  } catch { return SEED_FOLDERS }
}

export function saveFolders(folders: Cur8Folder[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem('cur8_folders', JSON.stringify(folders))
}
