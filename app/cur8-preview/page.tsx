'use client'

import Image from 'next/image'
import { useState } from 'react'
import {
  Search, Bell, LogOut, Plus, Leaf, Waves, Flame, BookOpen,
  Video, Wind, Archive, Flower2, ChevronRight, Clock, Star,
} from 'lucide-react'

/* ── Palette extracted from the koi pond image ──────────────────────── */
const C = {
  // backgrounds
  deepTeal:    '#0d3d3a',
  midTeal:     '#1a5c56',
  // cards / frosted surfaces
  glassLight:  'rgba(255,255,255,0.10)',
  glassMid:    'rgba(255,255,255,0.14)',
  glassDark:   'rgba(13,61,58,0.55)',
  // text
  cream:       '#f5f0e8',
  softWhite:   'rgba(245,240,232,0.85)',
  mutedCream:  'rgba(245,240,232,0.55)',
  // accents
  coral:       '#e8735a',
  blush:       '#f0a898',
  sage:        '#7ab8a0',
  gold:        '#d4a843',
  forestGreen: '#2d6e52',
  seafoam:     '#a8d8c8',
}

/* ── Tile definitions ──────────────────────────────────────────────── */
const TILES = [
  {
    id: 'grove',
    name: 'The Grove',
    subtitle: 'Studies & learning',
    icon: Leaf,
    image: '/cur8/tile-grove.png',
    accent: C.sage,
    count: 12,
    size: 'tall',       // spans 2 rows
  },
  {
    id: 'bloom',
    name: 'Bloom',
    subtitle: 'Inspiration & beauty',
    icon: Flower2,
    image: '/cur8/tile-bloom.png',
    accent: C.blush,
    count: 28,
    size: 'normal',
  },
  {
    id: 'tide',
    name: 'The Tide',
    subtitle: 'Videos & media',
    icon: Waves,
    image: '/cur8/tile-tide.png',
    accent: C.seafoam,
    count: 34,
    size: 'wide',       // spans 2 cols
  },
  {
    id: 'sanctuary',
    name: 'Sanctuary',
    subtitle: 'Wellness & calm',
    icon: Wind,
    image: '/cur8/tile-sanctuary.png',
    accent: '#b8d4c0',
    count: 9,
    size: 'normal',
  },
  {
    id: 'greenhouse',
    name: 'Greenhouse',
    subtitle: 'Work & projects',
    icon: BookOpen,
    image: '/cur8/tile-greenhouse.png',
    accent: C.forestGreen,
    count: 17,
    size: 'normal',
  },
  {
    id: 'current',
    name: 'Current',
    subtitle: 'News & articles',
    icon: Video,
    image: '/cur8/tile-current.png',
    accent: C.seafoam,
    count: 22,
    size: 'tall',
  },
  {
    id: 'archive',
    name: 'The Archive',
    subtitle: 'Documents & notes',
    icon: Archive,
    image: '/cur8/tile-archive.png',
    accent: C.gold,
    count: 41,
    size: 'wide',
  },
  {
    id: 'ember',
    name: 'Ember',
    subtitle: 'Entertainment & joy',
    icon: Flame,
    image: '/cur8/tile-ember.png',
    accent: C.coral,
    count: 15,
    size: 'normal',
  },
]

const RECENT = [
  { title: 'How to Build Deep Focus', category: 'The Grove', thumb: '/cur8/tile-grove.png', time: '2h ago' },
  { title: 'Coastal Meditation Series', category: 'Sanctuary', thumb: '/cur8/tile-sanctuary.png', time: '5h ago' },
  { title: 'Autumn Colour Palettes', category: 'Bloom', thumb: '/cur8/tile-bloom.png', time: '1d ago' },
  { title: 'Deep Work by Cal Newport', category: 'The Archive', thumb: '/cur8/tile-archive.png', time: '2d ago' },
]

/* ── Tile card component ───────────────────────────────────────────── */
function TileCard({ tile }: { tile: typeof TILES[0] }) {
  const Icon = tile.icon
  const isWide = tile.size === 'wide'
  const isTall = tile.size === 'tall'

  return (
    <div
      className="relative overflow-hidden cursor-pointer group"
      style={{
        borderRadius: '20px',
        gridColumn: isWide ? 'span 2' : 'span 1',
        gridRow: isTall ? 'span 2' : 'span 1',
        minHeight: isTall ? '280px' : '130px',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      {/* Background image */}
      <Image
        src={tile.image}
        alt={tile.name}
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-105"
        sizes="(max-width: 768px) 50vw, 300px"
      />

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(160deg, rgba(13,61,58,0.25) 0%, rgba(13,61,58,0.75) 100%)',
        }}
      />

      {/* Frosted glass chip — icon + name */}
      <div className="absolute inset-0 flex flex-col justify-end p-4">
        <div
          className="inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 mb-2"
          style={{
            backgroundColor: 'rgba(13,61,58,0.55)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <Icon size={12} style={{ color: tile.accent }} />
          <span className="text-xs font-medium" style={{ color: C.cream, fontFamily: 'sans-serif' }}>
            {tile.count} saved
          </span>
        </div>
        <h3
          className="font-serif text-lg font-semibold leading-tight"
          style={{ color: C.cream, textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}
        >
          {tile.name}
        </h3>
        <p className="text-xs mt-0.5" style={{ color: C.mutedCream }}>{tile.subtitle}</p>
      </div>

      {/* Hover: show arrow */}
      <div
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          backgroundColor: tile.accent,
          borderRadius: '50%',
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ChevronRight size={14} color={C.deepTeal} />
      </div>
    </div>
  )
}

/* ── Main preview ──────────────────────────────────────────────────── */
export default function Cur8Preview() {
  const [search, setSearch] = useState('')
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div
      className="min-h-screen font-sans"
      style={{ backgroundColor: C.deepTeal, color: C.cream }}
    >
      {/* ── Hero header with koi pond ── */}
      <div className="relative overflow-hidden" style={{ height: '280px' }}>
        <Image
          src="/cur8/koi-pond.jpg"
          alt="Your garden"
          fill
          className="object-cover object-center"
          priority
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(13,61,58,0.3) 0%, rgba(13,61,58,0.85) 80%, rgba(13,61,58,1) 100%)',
          }}
        />

        {/* Nav bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: C.coral }}
            >
              <Leaf size={14} color={C.cream} />
            </div>
            <span className="font-serif text-base font-semibold" style={{ color: C.cream }}>
              cur8
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search pill */}
            <div
              className="flex items-center gap-2 rounded-full px-3 py-1.5 hidden sm:flex"
              style={{
                backgroundColor: C.glassMid,
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.18)',
                width: '180px',
              }}
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

            <button
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: C.glassMid, backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.18)' }}
              aria-label="Notifications"
            >
              <Bell size={14} style={{ color: C.cream }} />
            </button>

            <button
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: C.glassMid, backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.18)' }}
              aria-label="Sign out"
            >
              <LogOut size={14} style={{ color: C.cream }} />
            </button>
          </div>
        </div>

        {/* Greeting */}
        <div className="absolute bottom-6 left-5 right-5">
          <p className="text-sm" style={{ color: C.mutedCream }}>{greeting}, Reveshnee</p>
          <h1 className="font-serif text-3xl font-semibold mt-1" style={{ color: C.cream }}>
            Your Garden
          </h1>
          <p className="text-sm mt-1" style={{ color: C.mutedCream }}>
            178 things tended &nbsp;·&nbsp; 8 gardens
          </p>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 pb-10 max-w-2xl mx-auto" style={{ marginTop: '-8px' }}>

        {/* Quick add bar */}
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-6"
          style={{
            backgroundColor: C.glassMid,
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.14)',
          }}
        >
          <Plus size={16} style={{ color: C.coral }} />
          <span className="text-sm flex-1" style={{ color: C.mutedCream }}>
            Paste a link to tend your garden...
          </span>
          <div
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: C.coral, color: C.cream }}
          >
            Add
          </div>
        </div>

        {/* Recently saved strip */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-base font-semibold" style={{ color: C.cream }}>
              Recently tended
            </h2>
            <button className="text-xs" style={{ color: C.sage }}>See all</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
            {RECENT.map((item) => (
              <div
                key={item.title}
                className="flex-none rounded-2xl overflow-hidden relative cursor-pointer"
                style={{
                  width: '120px',
                  height: '80px',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <Image src={item.thumb} alt={item.title} fill className="object-cover" sizes="120px" />
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(13,61,58,0.85) 0%, transparent 50%)' }}
                />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-xs leading-tight font-medium line-clamp-2" style={{ color: C.cream, fontSize: '9px' }}>
                    {item.title}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock size={7} style={{ color: C.mutedCream }} />
                    <span style={{ color: C.mutedCream, fontSize: '8px' }}>{item.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bento tile grid */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-base font-semibold" style={{ color: C.cream }}>
            Your gardens
          </h2>
          <div className="flex items-center gap-1">
            <Star size={11} style={{ color: C.gold }} />
            <span className="text-xs" style={{ color: C.mutedCream }}>8 areas</span>
          </div>
        </div>

        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}
        >
          {TILES.map((tile) => (
            <TileCard key={tile.id} tile={tile} />
          ))}
        </div>

        {/* Preview notice */}
        <div
          className="mt-8 rounded-2xl px-5 py-4 text-center"
          style={{
            backgroundColor: 'rgba(168,216,200,0.12)',
            border: '1px solid rgba(168,216,200,0.25)',
          }}
        >
          <p className="font-serif text-sm font-medium" style={{ color: C.seafoam }}>
            This is a design preview
          </p>
          <p className="text-xs mt-1" style={{ color: C.mutedCream }}>
            Tell me what to keep, change, or throw out and we will build the real thing.
          </p>
        </div>
      </div>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
