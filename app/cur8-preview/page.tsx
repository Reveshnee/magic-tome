'use client'

import Image from 'next/image'
import { useState } from 'react'
import {
  Search, Bell, LogOut, Plus, Leaf, Waves, Flame, BookOpen,
  Video, Wind, Archive, Flower2, ChevronRight, Clock, Sparkles,
} from 'lucide-react'

/* ── Palette ─────────────────────────────────────────────────────────
   Extracted from the koi pond: deep teal water, sage lily pads,
   coral & blush lotus, red-orange & gold koi.
   Body is light cream — teal becomes an accent, not a wall.
──────────────────────────────────────────────────────────────────── */
const C = {
  /* hero */
  deepTeal:    '#0d3d3a',
  midTeal:     '#1a5c56',
  /* body — light, airy, koi-pond-edge cream */
  bodyBg:      '#f0ede8',
  cardBg:      '#faf8f5',
  /* text on light bg */
  ink:         '#1a2e2b',
  inkMid:      '#3d5552',
  inkSoft:     '#7a9490',
  /* accents */
  coral:       '#d4614a',
  blush:       '#eba08c',
  sage:        '#5a9e84',
  gold:        '#c4922a',
  forestGreen: '#2e6b4f',
  seafoam:     '#8ec8b4',
  dustyRose:   '#c97a7a',
  slate:       '#4a6d78',
  /* hero text */
  cream:       '#f5f0e8',
  mutedCream:  'rgba(245,240,232,0.70)',
  /* glass */
  glassDark:   'rgba(13,61,58,0.55)',
}

/* ── Tile definitions ────────────────────────────────────────────── */
const TILES = [
  {
    id: 'grove',
    name: 'The Grove',
    subtitle: 'Studies & learning',
    icon: Leaf,
    image: '/cur8/tile-grove.png',
    accent: C.forestGreen,
    accentLight: '#e8f4ee',
    count: 12,
    featured: true,    // large tile — top left, spans 2 rows
  },
  {
    id: 'bloom',
    name: 'Bloom',
    subtitle: 'Inspiration',
    icon: Flower2,
    image: '/cur8/tile-bloom.png',
    accent: C.dustyRose,
    accentLight: '#f9eded',
    count: 28,
    featured: false,
  },
  {
    id: 'tide',
    name: 'The Tide',
    subtitle: 'Videos & media',
    icon: Waves,
    image: '/cur8/tile-tide.png',
    accent: C.slate,
    accentLight: '#e8f0f4',
    count: 34,
    featured: false,
  },
  {
    id: 'sanctuary',
    name: 'Sanctuary',
    subtitle: 'Wellness & calm',
    icon: Wind,
    image: '/cur8/tile-sanctuary.png',
    accent: C.sage,
    accentLight: '#e8f4ef',
    count: 9,
    featured: false,
  },
  {
    id: 'greenhouse',
    name: 'Greenhouse',
    subtitle: 'Work & projects',
    icon: BookOpen,
    image: '/cur8/tile-greenhouse.png',
    accent: C.midTeal,
    accentLight: '#e4f0ee',
    count: 17,
    featured: true,   // second large tile — bottom right area
  },
  {
    id: 'current',
    name: 'Current',
    subtitle: 'News & articles',
    icon: Video,
    image: '/cur8/tile-current.png',
    accent: C.seafoam,
    accentLight: '#e8f6f2',
    count: 22,
    featured: false,
  },
  {
    id: 'archive',
    name: 'The Archive',
    subtitle: 'Documents & notes',
    icon: Archive,
    image: '/cur8/tile-archive.png',
    accent: C.gold,
    accentLight: '#f5ede0',
    count: 41,
    featured: false,
  },
  {
    id: 'ember',
    name: 'Ember',
    subtitle: 'Entertainment & joy',
    icon: Flame,
    image: '/cur8/tile-ember.png',
    accent: C.coral,
    accentLight: '#faecea',
    count: 15,
    featured: false,
  },
]

const RECENT = [
  { title: 'How to Build Deep Focus', category: 'The Grove', thumb: '/cur8/tile-grove.png', time: '2h ago', accent: C.forestGreen },
  { title: 'Coastal Meditation Series', category: 'Sanctuary', thumb: '/cur8/tile-sanctuary.png', time: '5h ago', accent: C.sage },
  { title: 'Autumn Colour Palettes', category: 'Bloom', thumb: '/cur8/tile-bloom.png', time: '1d ago', accent: C.dustyRose },
  { title: 'Deep Work – Cal Newport', category: 'The Archive', thumb: '/cur8/tile-archive.png', time: '2d ago', accent: C.gold },
  { title: 'Koi Pond Journaling', category: 'Sanctuary', thumb: '/cur8/tile-sanctuary.png', time: '3d ago', accent: C.sage },
]

/* ── Large featured tile ─────────────────────────────────────────── */
function FeaturedTile({ tile }: { tile: typeof TILES[0] }) {
  const Icon = tile.icon
  return (
    <div
      className="relative overflow-hidden cursor-pointer group"
      style={{
        borderRadius: '24px',
        height: '280px',
        gridRow: 'span 2',
        boxShadow: '0 4px 24px rgba(13,61,58,0.12)',
        border: `1.5px solid ${tile.accentLight}`,
      }}
    >
      <Image src={tile.image} alt={tile.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="200px" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(170deg, rgba(0,0,0,0.05) 0%, rgba(13,61,58,0.72) 100%)' }} />

      <div className="absolute inset-0 flex flex-col justify-between p-5">
        {/* top badge */}
        <div
          className="inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1"
          style={{ backgroundColor: tile.accent, backdropFilter: 'blur(8px)' }}
        >
          <Icon size={11} color="#fff" />
          <span className="text-xs font-semibold" style={{ color: '#fff', letterSpacing: '0.02em' }}>
            {tile.count} saved
          </span>
        </div>

        {/* bottom info */}
        <div>
          <h3 className="font-serif text-2xl font-bold leading-tight" style={{ color: C.cream, textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>
            {tile.name}
          </h3>
          <p className="text-sm mt-1" style={{ color: C.mutedCream }}>{tile.subtitle}</p>
          <div
            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)', color: C.cream, border: '1px solid rgba(255,255,255,0.25)' }}
          >
            Open garden <ChevronRight size={11} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Small tile ──────────────────────────────────────────────────── */
function SmallTile({ tile }: { tile: typeof TILES[0] }) {
  const Icon = tile.icon
  return (
    <div
      className="relative overflow-hidden cursor-pointer group flex flex-col"
      style={{
        borderRadius: '20px',
        height: '128px',
        backgroundColor: C.cardBg,
        boxShadow: '0 2px 12px rgba(13,61,58,0.07)',
        border: `1.5px solid ${tile.accentLight}`,
      }}
    >
      {/* Image strip — top 60% */}
      <div className="relative flex-1 overflow-hidden" style={{ borderRadius: '18px 18px 0 0' }}>
        <Image src={tile.image} alt={tile.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="160px" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(250,248,245,0.9) 100%)' }} />
      </div>

      {/* Bottom label */}
      <div className="px-3 py-2 flex items-center justify-between" style={{ backgroundColor: C.cardBg }}>
        <div>
          <h3 className="text-sm font-semibold leading-tight" style={{ color: C.ink, fontFamily: 'serif' }}>
            {tile.name}
          </h3>
          <p className="text-xs" style={{ color: C.inkSoft }}>{tile.count} saved</p>
        </div>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: tile.accentLight }}
        >
          <Icon size={13} style={{ color: tile.accent }} />
        </div>
      </div>
    </div>
  )
}

/* ── Main preview ────────────────────────────────────────────────── */
export default function Cur8Preview() {
  const [search, setSearch] = useState('')
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const featuredTiles = TILES.filter((t) => t.featured)
  const smallTiles = TILES.filter((t) => !t.featured)

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.bodyBg, color: C.ink }}>

      {/* ── Hero — koi pond fills full bleed ─────────────────────── */}
      <div className="relative overflow-hidden" style={{ height: '300px' }}>
        <Image src="/cur8/koi-pond.jpg" alt="Phoenix's garden" fill className="object-cover object-center" priority />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(13,61,58,0.25) 0%, rgba(240,237,232,0.0) 55%, rgba(240,237,232,1) 100%)' }}
        />

        {/* Nav */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: C.coral }}>
              <Leaf size={14} color="#fff" />
            </div>
            <span className="font-serif text-base font-bold" style={{ color: C.cream, textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}>cur8</span>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="items-center gap-2 rounded-full px-3 py-1.5 hidden sm:flex"
              style={{ backgroundColor: 'rgba(13,61,58,0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.22)', width: '170px' }}
            >
              <Search size={12} style={{ color: C.mutedCream }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your garden..."
                className="bg-transparent outline-none text-xs w-full"
                style={{ color: C.cream }}
              />
            </div>
            <button className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(13,61,58,0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.22)' }} aria-label="Notifications">
              <Bell size={14} style={{ color: C.cream }} />
            </button>
            <button className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(13,61,58,0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.22)' }} aria-label="Sign out">
              <LogOut size={14} style={{ color: C.cream }} />
            </button>
          </div>
        </div>

        {/* Greeting — sits low, fades into body */}
        <div className="absolute bottom-4 left-5">
          <p className="text-sm font-medium" style={{ color: C.ink, textShadow: '0 1px 4px rgba(240,237,232,0.8)' }}>
            {greeting}, Phoenix
          </p>
          <h1 className="font-serif text-3xl font-bold leading-tight" style={{ color: C.ink, textShadow: '0 2px 8px rgba(240,237,232,0.8)' }}>
            {"Phoenix's Garden"}
          </h1>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="px-4 pb-12 max-w-2xl mx-auto" style={{ marginTop: '-4px' }}>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-5">
          <span className="text-sm" style={{ color: C.inkMid }}>178 things tended</span>
          <span style={{ color: C.inkSoft }}>·</span>
          <span className="text-sm" style={{ color: C.inkMid }}>8 gardens</span>
          <span style={{ color: C.inkSoft }}>·</span>
          <div className="flex items-center gap-1">
            <Sparkles size={12} style={{ color: C.gold }} />
            <span className="text-sm" style={{ color: C.inkMid }}>3 new saves</span>
          </div>
        </div>

        {/* Quick add */}
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-7"
          style={{ backgroundColor: C.cardBg, border: `1.5px solid rgba(13,61,58,0.1)`, boxShadow: '0 2px 12px rgba(13,61,58,0.06)' }}
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C.coral }}>
            <Plus size={14} color="#fff" />
          </div>
          <span className="text-sm flex-1" style={{ color: C.inkSoft }}>Paste a link to tend your garden...</span>
          <div className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: C.deepTeal, color: C.cream }}>
            Add
          </div>
        </div>

        {/* Recently tended */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg font-semibold" style={{ color: C.ink }}>Recently tended</h2>
            <button className="text-xs font-medium" style={{ color: C.sage }}>See all</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {RECENT.map((item) => (
              <div
                key={item.title}
                className="flex-none rounded-2xl overflow-hidden relative cursor-pointer"
                style={{ width: '130px', height: '85px', border: '1.5px solid rgba(13,61,58,0.07)', boxShadow: '0 2px 8px rgba(13,61,58,0.08)' }}
              >
                <Image src={item.thumb} alt={item.title} fill className="object-cover" sizes="130px" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(13,61,58,0.82) 0%, transparent 55%)' }} />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="font-medium leading-tight line-clamp-2" style={{ color: C.cream, fontSize: '9px' }}>{item.title}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock size={7} style={{ color: C.mutedCream }} />
                    <span style={{ color: C.mutedCream, fontSize: '8px' }}>{item.time}</span>
                  </div>
                </div>
                {/* accent dot */}
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: item.accent }} />
              </div>
            ))}
          </div>
        </div>

        {/* Gardens section header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg font-semibold" style={{ color: C.ink }}>Your gardens</h2>
          <span className="text-xs" style={{ color: C.inkSoft }}>8 areas</span>
        </div>

        {/* Bento grid — 2 featured (tall, left col) + 6 small (right area) */}
        <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>

          {/* Row 1: featured left, two small stacked right */}
          <div style={{ gridRow: 'span 2' }}>
            <FeaturedTile tile={featuredTiles[0]} />
          </div>
          <SmallTile tile={smallTiles[0]} />
          <SmallTile tile={smallTiles[1]} />

          {/* Row 2: two small left, featured right */}
          <SmallTile tile={smallTiles[2]} />
          <div style={{ gridRow: 'span 2' }}>
            <FeaturedTile tile={featuredTiles[1]} />
          </div>

          {/* Row 3: fill remaining */}
          <SmallTile tile={smallTiles[3]} />

          {/* Row 4: two small full width */}
          <SmallTile tile={smallTiles[4]} />
          <SmallTile tile={smallTiles[5]} />
        </div>

        {/* Preview notice */}
        <div
          className="mt-8 rounded-2xl px-5 py-4 text-center"
          style={{ backgroundColor: C.cardBg, border: `1.5px solid rgba(13,61,58,0.1)` }}
        >
          <p className="font-serif text-sm font-semibold" style={{ color: C.ink }}>Design preview</p>
          <p className="text-xs mt-1" style={{ color: C.inkSoft }}>
            Tell me what to keep, change, or throw out and we will build the real thing.
          </p>
        </div>
      </div>
    </div>
  )
}
