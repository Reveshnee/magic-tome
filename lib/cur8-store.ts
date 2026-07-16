export type Category =
  | 'YouTube'
  | 'TikTok'
  | 'Instagram'
  | 'Facebook'
  | 'Articles'
  | 'Images'
  | 'Documents'
  | 'Web'

export interface Cur8Item {
  id: string
  category: Category
  url: string
  title: string
  description?: string
  thumbnail?: string
  savedAt: string
  favicon?: string
}

export const CATEGORIES: {
  name: Category
  color: string
  bg: string
  icon: string
  description: string
}[] = [
  {
    name: 'YouTube',
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-100',
    icon: '▶',
    description: 'Videos & playlists',
  },
  {
    name: 'TikTok',
    color: 'text-slate-800',
    bg: 'bg-slate-50 border-slate-100',
    icon: '♪',
    description: 'Short videos',
  },
  {
    name: 'Instagram',
    color: 'text-pink-600',
    bg: 'bg-pink-50 border-pink-100',
    icon: '◈',
    description: 'Posts & reels',
  },
  {
    name: 'Facebook',
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-100',
    icon: '⬡',
    description: 'Posts & groups',
  },
  {
    name: 'Articles',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-100',
    icon: '◉',
    description: 'Reads & research',
  },
  {
    name: 'Images',
    color: 'text-teal-600',
    bg: 'bg-teal-50 border-teal-100',
    icon: '▣',
    description: 'Inspiration & visuals',
  },
  {
    name: 'Documents',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 border-indigo-100',
    icon: '▤',
    description: 'Files & PDFs',
  },
  {
    name: 'Web',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-100',
    icon: '◎',
    description: 'Tools & websites',
  },
]

// Sample seed items so the app looks populated on first open
export const SEED_ITEMS: Cur8Item[] = [
  {
    id: '1',
    category: 'YouTube',
    url: 'https://youtube.com',
    title: 'Your first saved video will appear here',
    description: 'Paste any YouTube link to get started',
    thumbnail: '',
    savedAt: new Date().toISOString(),
  },
  {
    id: '2',
    category: 'Articles',
    url: 'https://example.com',
    title: 'Your first article will appear here',
    description: 'Paste any article link to get started',
    thumbnail: '',
    savedAt: new Date().toISOString(),
  },
]
