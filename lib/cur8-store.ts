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
  pinned?: boolean
  sortOrder?: number
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
  summary?: string
  whySaved?: string
  savedAt: string
  favicon?: string
  openedAt?: string
}

export const CATEGORIES: {
  name: Category
  slug: string         // URL slug — garden-name based (e.g. "koi-pond")
  displayName: string  // garden name shown large on the tile
  area: string         // life area shown below the garden name
  lucideIcon: string
  accent: string
  tileFrom: string
  tileTo: string
  border: string
  pill: string
  description: string
  tileImage: string    // hero image whose theme matches the garden name
  hexAccent: string    // solid accent used across tiles & category pages
}[] = [
  {
    name: 'YouTube',
    slug: 'koi-pond',
    displayName: 'The Koi Pond',
    area: 'SACAP',
    lucideIcon: 'graduation-cap',
    accent: 'text-rose-400',
    tileFrom: 'from-rose-50',
    tileTo: 'to-pink-50',
    border: 'border-rose-100',
    pill: 'bg-rose-100 text-rose-500',
    description: 'Lectures, modules & research reads',
    tileImage: '/cur8/tile-grove.png',
    hexAccent: '#c85a40',
  },
  {
    name: 'TikTok',
    slug: 'the-current',
    displayName: 'The Current',
    area: 'Work',
    lucideIcon: 'briefcase',
    accent: 'text-purple-400',
    tileFrom: 'from-purple-50',
    tileTo: 'to-violet-50',
    border: 'border-purple-100',
    pill: 'bg-purple-100 text-purple-500',
    description: 'Client research, saves & work tools',
    tileImage: '/cur8/tile-bloom.png',
    hexAccent: '#c97a7a',
  },
  {
    name: 'Instagram',
    slug: 'greenhouse',
    displayName: 'The Greenhouse',
    area: 'Fashion & Style',
    lucideIcon: 'shirt',
    accent: 'text-pink-400',
    tileFrom: 'from-pink-50',
    tileTo: 'to-fuchsia-50',
    border: 'border-pink-100',
    pill: 'bg-pink-100 text-pink-500',
    description: 'Looks, lookbooks & style inspiration',
    tileImage: '/cur8/tile-greenhouse.png',
    hexAccent: '#b06a9c',
  },
  {
    name: 'Facebook',
    slug: 'sanctuary',
    displayName: 'Sanctuary',
    area: 'Wellness',
    lucideIcon: 'heart',
    accent: 'text-sky-400',
    tileFrom: 'from-sky-50',
    tileTo: 'to-blue-50',
    border: 'border-sky-100',
    pill: 'bg-sky-100 text-sky-500',
    description: 'Meditation, nervous system & health',
    tileImage: '/cur8/tile-current.png',
    hexAccent: '#4a6d78',
  },
  {
    name: 'Articles',
    slug: 'the-grove',
    displayName: 'The Grove',
    area: 'Psychology',
    lucideIcon: 'brain',
    accent: 'text-violet-400',
    tileFrom: 'from-violet-50',
    tileTo: 'to-indigo-50',
    border: 'border-violet-100',
    pill: 'bg-violet-100 text-violet-500',
    description: 'Research, talks & books you\'re studying',
    tileImage: '/cur8/tile-archive.png',
    hexAccent: '#b8892a',
  },
  {
    name: 'Images',
    slug: 'ember',
    displayName: 'Ember',
    area: 'Inspiration',
    lucideIcon: 'sparkles',
    accent: 'text-teal-400',
    tileFrom: 'from-teal-50',
    tileTo: 'to-cyan-50',
    border: 'border-teal-100',
    pill: 'bg-teal-100 text-teal-500',
    description: 'Mood, quotes & things that spark',
    tileImage: '/cur8/tile-sanctuary.png',
    hexAccent: '#5a9e84',
  },
  {
    name: 'Documents',
    slug: 'bloom',
    displayName: 'Bloom',
    area: 'Entertainment',
    lucideIcon: 'clapperboard',
    accent: 'text-indigo-400',
    tileFrom: 'from-indigo-50',
    tileTo: 'to-purple-50',
    border: 'border-indigo-100',
    pill: 'bg-indigo-100 text-indigo-500',
    description: 'Music, shows & pure fun',
    tileImage: '/cur8/tile-tide.png',
    hexAccent: '#3a6b8c',
  },
  {
    name: 'Web',
    slug: 'the-tide',
    displayName: 'The Tide',
    area: 'Document Hub',
    lucideIcon: 'folder-open',
    accent: 'text-fuchsia-400',
    tileFrom: 'from-fuchsia-50',
    tileTo: 'to-rose-50',
    border: 'border-fuchsia-100',
    pill: 'bg-fuchsia-100 text-fuchsia-500',
    description: 'SOPs, docs & everything else',
    tileImage: '/cur8/tile-ember.png',
    hexAccent: '#c9843c',
  },
]

/** Get the URL slug for a given category DB name (e.g. 'Instagram' → 'greenhouse') */
export function slugFromCategory(category: string): string {
  return CATEGORIES.find((c) => c.name === category)?.slug ?? category.toLowerCase()
}

/** Get the Category DB name from a URL slug (e.g. 'greenhouse' → 'Instagram') */
export function categoryFromSlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug)?.name
}

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
