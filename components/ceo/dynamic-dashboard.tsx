'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CLIENTS, META, PROPOSALS, TOP_FOCUS, VENU_ITEMS, type Client, type Health } from '@/lib/july16-data'

const HEALTH_PILL: Record<Health, string> = {
  'At Risk':  'bg-red-100 text-red-700 border border-red-200',
  'Watch':    'bg-amber-100 text-amber-700 border border-amber-200',
  'On Track': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'Done':     'bg-blue-100 text-blue-700 border border-blue-200',
  'New':      'bg-purple-100 text-purple-700 border border-purple-200',
}

const HEALTH_CARD: Record<Health, string> = {
  'At Risk':  'border-l-4 border-l-red-500 bg-white hover:shadow-red-100',
  'Watch':    'border-l-4 border-l-amber-400 bg-white hover:shadow-amber-100',
  'On Track': 'border-l-4 border-l-emerald-500 bg-white hover:shadow-emerald-100',
  'Done':     'border-l-4 border-l-blue-400 bg-white hover:shadow-blue-100',
  'New':      'border-l-4 border-l-purple-400 bg-white hover:shadow-purple-100',
}

const TABS = ['Overview', 'All Clients', 'Proposals', 'Venu Actions'] as const
type Tab = (typeof TABS)[number]
const FILTERS: (Health | 'All')[] = ['All', 'At Risk', 'Watch', 'On Track', 'Done', 'New']

function ClientDrawer({ client, onClose }: { client: Client; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-end bg-slate-900/40 backdrop-blur-sm sm:items-start"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl sm:h-screen"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer header */}
          <div className={`flex items-start justify-between p-6 ${
            client.health === 'At Risk' ? 'bg-red-50' :
            client.health === 'Watch' ? 'bg-amber-50' :
            client.health === 'On Track' ? 'bg-emerald-50' :
            client.health === 'Done' ? 'bg-blue-50' : 'bg-purple-50'
          }`}>
            <div>
              <h2 className="font-serif text-2xl font-bold text-slate-900">{client.name}</h2>
              <p className="mt-0.5 text-sm text-slate-500">{client.engagement}</p>
              <p className="mt-1 text-xs text-slate-400">Contact: {client.contacts}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${HEALTH_PILL[client.health]}`}>
                {client.health}
              </span>
              <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600">Close</button>
            </div>
          </div>

          <div className="space-y-5 p-6">
            {/* This week's update */}
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">This Week</h3>
              <p className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{client.update}</p>
            </div>

            {/* Venu needs to action */}
            {client.venuActions.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-red-500">Needs Venu</h3>
                <ul className="space-y-2">
                  {client.venuActions.map((a, i) => (
                    <li key={i} className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500 mt-1.5" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next actions */}
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Next Actions</h3>
              <ul className="space-y-2">
                {client.nextActions.map((a, i) => (
                  <li key={i} className="flex gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-slate-100 pt-2 text-xs text-slate-400">
              Owner: {client.owner}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function DynamicCEODashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [filter, setFilter] = useState<Health | 'All'>('All')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const filteredClients = filter === 'All'
    ? CLIENTS
    : CLIENTS.filter((c) => c.health === filter)

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">

      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Linkfields Innovations</p>
            <h1 className="font-serif text-xl font-bold text-slate-900">Portfolio Update — 16 July 2026</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">{META.owner}</span>
            <a
              href="/ceo-static"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              Print version
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex gap-0 border-b border-transparent">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
                {tab === 'Venu Actions' && (
                  <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                    {VENU_ITEMS.filter((v) => v.priority === 'critical' || v.priority === 'high').length}
                  </span>
                )}
                {activeTab === tab && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <AnimatePresence mode="wait">
          {/* ─── OVERVIEW ─── */}
          {activeTab === 'Overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Stats */}
              <div className="mb-8 grid grid-cols-3 gap-4 sm:grid-cols-6">
                {[
                  { label: 'Total', value: META.stats.active, color: 'bg-slate-800 text-white' },
                  { label: 'On Track', value: META.stats.onTrack, color: 'bg-emerald-600 text-white' },
                  { label: 'Watch', value: META.stats.watch, color: 'bg-amber-500 text-white' },
                  { label: 'At Risk', value: META.stats.atRisk, color: 'bg-red-600 text-white' },
                  { label: 'Done', value: META.stats.done, color: 'bg-blue-600 text-white' },
                  { label: 'New', value: META.stats.new, color: 'bg-purple-600 text-white' },
                ].map((s) => (
                  <div key={s.label} className={`rounded-2xl px-2 py-5 text-center ${s.color}`}>
                    <p className="text-3xl font-bold">{s.value}</p>
                    <p className="mt-0.5 whitespace-nowrap text-xs font-medium opacity-80">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Focus Areas */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Focus Areas</h2>
                  <ol className="space-y-3">
                    {TOP_FOCUS.map((item, i) => (
                      <li key={i} className="flex gap-3 text-sm text-slate-700">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{i + 1}</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* At-Risk Spotlight */}
                <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-red-500">At-Risk Spotlight</h2>
                  <div className="space-y-3">
                    {CLIENTS.filter((c) => c.health === 'At Risk').map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedClient(c)}
                        className="w-full rounded-xl border border-red-100 bg-red-50 p-4 text-left transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-800">{c.name}</p>
                          <span className="text-xs text-slate-400">Tap for detail</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{c.update}</p>
                        {c.venuActions.length > 0 && (
                          <p className="mt-2 text-xs font-semibold text-red-600">
                            Venu: {c.venuActions[0]}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Venu summary */}
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
                <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-red-600">Followups - Venu ({VENU_ITEMS.filter(v => v.priority !== 'cancelled').length} items)</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {VENU_ITEMS.map((v, i) => (
                    <div key={i} className={`flex gap-3 rounded-xl border bg-white p-4 ${v.priority === 'cancelled' ? 'border-slate-100 opacity-50' : 'border-red-100'}`}>
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        v.priority === 'critical' ? 'bg-red-600 text-white' :
                        v.priority === 'cancelled' ? 'bg-slate-300 text-slate-500' :
                        'bg-amber-500 text-white'
                      }`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className={`text-xs font-bold ${v.priority === 'cancelled' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{v.client}</p>
                        <p className={`mt-0.5 text-xs ${v.priority === 'cancelled' ? 'text-slate-400 line-through' : 'text-slate-600'}`}>{v.item}</p>
                        {v.priority === 'cancelled' && (
                          <span className="mt-1 inline-block rounded bg-slate-200 px-1.5 py-0.5 text-xs font-semibold text-slate-500">Not proceeding</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── ALL CLIENTS ─── */}
          {activeTab === 'All Clients' && (
            <motion.div key="clients" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Filter bar */}
              <div className="mb-6 flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      filter === f
                        ? 'bg-slate-800 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {f}
                    {f !== 'All' && (
                      <span className="ml-1.5 text-xs opacity-60">
                        {CLIENTS.filter((c) => c.health === f).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {filteredClients.map((c) => (
                  <motion.button
                    key={c.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setSelectedClient(c)}
                    className={`rounded-2xl border p-5 text-left shadow-sm transition-shadow hover:shadow-md ${HEALTH_CARD[c.health]}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-400">{c.engagement}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${HEALTH_PILL[c.health]}`}>
                        {c.health}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-slate-500 line-clamp-3">{c.update}</p>
                    {c.venuActions.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        <p className="text-xs font-semibold text-red-600">{c.venuActions.length} item{c.venuActions.length > 1 ? 's' : ''} need Venu</p>
                      </div>
                    )}
                    <p className="mt-2 text-right text-xs text-slate-300">Tap to expand</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── PROPOSALS ─── */}
          {activeTab === 'Proposals' && (
            <motion.div key="proposals" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-4 text-sm text-slate-500">
                {PROPOSALS.length} active opportunities across the portfolio
              </div>
              <div className="space-y-3">
                {PROPOSALS.map((p, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{p.client}</p>
                        <p className="text-sm text-slate-600">{p.opportunity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-slate-700">{p.value}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          p.stage === 'On Hold' ? 'bg-slate-100 text-slate-600' :
                          p.stage === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {p.stage}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{p.nextAction}</p>
                    <p className="mt-1 text-xs text-slate-400">Owner: {p.owner}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── VENU ACTIONS ─── */}
          {activeTab === 'Venu Actions' && (
            <motion.div key="venu" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <strong>{VENU_ITEMS.filter((v) => v.priority === 'critical').length} critical items</strong> need a decision from Venu this week.{' '}
                {VENU_ITEMS.filter((v) => v.priority === 'high').length} more are high-priority.
              </div>

              <div className="space-y-3">
                {VENU_ITEMS.map((v, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl border p-5 shadow-sm ${
                      v.priority === 'cancelled'
                        ? 'border-slate-100 bg-white opacity-50'
                        : v.priority === 'critical'
                        ? 'border-red-200 bg-white'
                        : 'border-amber-100 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        v.priority === 'critical' ? 'bg-red-600 text-white' :
                        v.priority === 'cancelled' ? 'bg-slate-300 text-slate-500' :
                        'bg-amber-500 text-white'
                      }`}>
                        {i + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold ${v.priority === 'cancelled' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{v.client}</p>
                          {v.priority === 'cancelled' ? (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-500">Not proceeding</span>
                          ) : (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                              v.priority === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {v.priority}
                            </span>
                          )}
                        </div>
                        <p className={`mt-1 text-sm ${v.priority === 'cancelled' ? 'text-slate-400 line-through' : 'text-slate-600'}`}>{v.item}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Client detail drawer */}
      {selectedClient && (
        <ClientDrawer client={selectedClient} onClose={() => setSelectedClient(null)} />
      )}
    </div>
  )
}
