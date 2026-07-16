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
  lucideIcon: string   // icon name to display (we render inline SVG per category)
  accent: string       // tailwind text colour
  tileFrom: string     // gradient start
  tileTo: string       // gradient end
  border: string
  pill: string         // badge bg
  description: string
}[] = [
  {
    name: 'YouTube',
    lucideIcon: 'play',
    accent: 'text-rose-500',
    tileFrom: 'from-rose-50',
    tileTo: 'to-orange-50',
    border: 'border-rose-100',
    pill: 'bg-rose-100 text-rose-600',
    description: 'Videos & channels',
  },
  {
    name: 'TikTok',
    lucideIcon: 'music',
    accent: 'text-slate-700',
    tileFrom: 'from-slate-50',
    tileTo: 'to-zinc-50',
    border: 'border-slate-200',
    pill: 'bg-slate-100 text-slate-600',
    description: 'Short-form videos',
  },
  {
    name: 'Instagram',
    lucideIcon: 'camera',
    accent: 'text-fuchsia-500',
    tileFrom: 'from-fuchsia-50',
    tileTo: 'to-pink-50',
    border: 'border-fuchsia-100',
    pill: 'bg-fuchsia-100 text-fuchsia-600',
    description: 'Posts & reels',
  },
  {
    name: 'Facebook',
    lucideIcon: 'users',
    accent: 'text-blue-500',
    tileFrom: 'from-blue-50',
    tileTo: 'to-sky-50',
    border: 'border-blue-100',
    pill: 'bg-blue-100 text-blue-600',
    description: 'Posts & groups',
  },
  {
    name: 'Articles',
    lucideIcon: 'newspaper',
    accent: 'text-amber-600',
    tileFrom: 'from-amber-50',
    tileTo: 'to-yellow-50',
    border: 'border-amber-100',
    pill: 'bg-amber-100 text-amber-700',
    description: 'Reads & research',
  },
  {
    name: 'Images',
    lucideIcon: 'image-icon',
    accent: 'text-teal-500',
    tileFrom: 'from-teal-50',
    tileTo: 'to-cyan-50',
    border: 'border-teal-100',
    pill: 'bg-teal-100 text-teal-600',
    description: 'Inspiration & visuals',
  },
  {
    name: 'Documents',
    lucideIcon: 'file-text',
    accent: 'text-indigo-500',
    tileFrom: 'from-indigo-50',
    tileTo: 'to-violet-50',
    border: 'border-indigo-100',
    pill: 'bg-indigo-100 text-indigo-600',
    description: 'Files & PDFs',
  },
  {
    name: 'Web',
    lucideIcon: 'globe',
    accent: 'text-emerald-500',
    tileFrom: 'from-emerald-50',
    tileTo: 'to-teal-50',
    border: 'border-emerald-100',
    pill: 'bg-emerald-100 text-emerald-600',
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
