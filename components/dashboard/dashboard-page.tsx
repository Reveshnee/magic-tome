'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { KanbanBoard } from './kanban-board'
import { ClientDrawer } from './client-drawer'
import { FinancialTab } from './financial-tab'
import {
  INITIAL_CLIENTS,
  WINS_THIS_MONTH,
  STATUS_COLORS,
  STATUS_ORDER,
  type Client,
  type Status,
  type Financials,
  type VenuAction,
} from '@/lib/dashboard-data'

type Tab = 'kanban' | 'financial' | 'wins'

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS)
  const [activeTab, setActiveTab] = useState<Tab>('kanban')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<Status | null>(null)

  const selectedClient = clients.find((c) => c.id === selectedId) ?? null

  const updateStatus = useCallback((id: string, status: Status) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
  }, [])

  const toggleAction = useCallback((clientId: string, actionId: string) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? {
              ...c,
              venuActions: c.venuActions.map((a) =>
                a.id === actionId ? { ...a, resolved: !a.resolved } : a
              ),
            }
          : c
      )
    )
  }, [])

  const addAction = useCallback((clientId: string, text: string) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? {
              ...c,
              venuActions: [
                ...c.venuActions,
                { id: `${clientId}-${Date.now()}`, text, resolved: false } satisfies VenuAction,
              ],
            }
          : c
      )
    )
  }, [])

  const updateNotes = useCallback((clientId: string, notes: string) => {
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, notes } : c)))
  }, [])

  const updateFinancials = useCallback((clientId: string, financials: Financials) => {
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, financials } : c)))
  }, [])

  const visibleClients = filterStatus
    ? clients.filter((c) => c.status === filterStatus)
    : clients

  const openActions = clients.flatMap((c) => c.venuActions.filter((a) => !a.resolved))
  const atRiskCount = clients.filter((c) => c.status === 'At Risk').length
  const onTrackCount = clients.filter((c) => c.status === 'On Track').length

  const TABS: { id: Tab; label: string }[] = [
    { id: 'kanban', label: 'Portfolio Board' },
    { id: 'financial', label: 'Financials' },
    { id: 'wins', label: 'Wins' },
  ]

  return (
    <div className="min-h-screen bg-[oklch(0.16_0.04_270)] font-sans text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[oklch(0.16_0.04_270/95%)] backdrop-blur-md">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              aria-label="Back to home"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <div>
              <h1 className="font-serif text-lg font-bold leading-none text-foreground">
                LFI Dashboard
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Reveshnee · Strategic Accounts · June 2026
              </p>
            </div>
          </div>

          {/* Stat pills */}
          <div className="hidden gap-2 sm:flex">
            <StatPill label="clients" value={clients.length} color="text-foreground" />
            <StatPill label="at risk" value={atRiskCount} color="text-rose-300" />
            <StatPill label="on track" value={onTrackCount} color="text-teal-300" />
            <StatPill label="Venu actions" value={openActions.length} color="text-[oklch(0.82_0.13_82)]" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-t border-white/5 px-4 sm:px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`relative shrink-0 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              {activeTab === t.id && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[oklch(0.82_0.13_82)]"
                />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">

        {/* Filter bar — kanban tab only */}
        {activeTab === 'kanban' && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setFilterStatus(null)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                filterStatus === null
                  ? 'border-white/30 bg-white/10 text-foreground'
                  : 'border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground'
              }`}
            >
              All ({clients.length})
            </button>
            {STATUS_ORDER.map((s) => {
              const count = clients.filter((c) => c.status === s).length
              const colors = STATUS_COLORS[s]
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(filterStatus === s ? null : s)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                    filterStatus === s
                      ? `${colors.bg} ${colors.text} ${colors.border}`
                      : 'border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground'
                  }`}
                >
                  {s} ({count})
                </button>
              )
            })}
          </div>
        )}

        {/* Kanban board */}
        {activeTab === 'kanban' && (
          <KanbanBoard
            clients={visibleClients}
            onStatusChange={updateStatus}
            onSelectClient={setSelectedId}
          />
        )}

        {/* Financial tab */}
        {activeTab === 'financial' && (
          <FinancialTab clients={clients} onUpdateFinancials={updateFinancials} />
        )}

        {/* Wins tab */}
        {activeTab === 'wins' && (
          <div className="space-y-3 max-w-2xl">
            <h2 className="font-serif text-2xl font-bold text-foreground">Wins This Month</h2>
            <p className="text-sm text-muted-foreground mb-6">
              The things that moved. Worth remembering.
            </p>
            {WINS_THIS_MONTH.map((win, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 px-5 py-4"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-xs font-bold text-teal-300">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-foreground/90">{win}</p>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Client drawer */}
      <ClientDrawer
        client={selectedClient}
        onClose={() => setSelectedId(null)}
        onStatusChange={updateStatus}
        onToggleAction={toggleAction}
        onAddAction={addAction}
        onUpdateNotes={updateNotes}
      />
    </div>
  )
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
      <span className={`text-sm font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
