'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Client, Status, VenuAction } from '@/lib/dashboard-data'
import { STATUS_COLORS, STATUS_ORDER } from '@/lib/dashboard-data'

interface ClientDrawerProps {
  client: Client | null
  onClose: () => void
  onStatusChange: (id: string, status: Status) => void
  onToggleAction: (clientId: string, actionId: string) => void
  onAddAction: (clientId: string, text: string) => void
  onUpdateNotes: (clientId: string, notes: string) => void
}

export function ClientDrawer({
  client,
  onClose,
  onStatusChange,
  onToggleAction,
  onAddAction,
  onUpdateNotes,
}: ClientDrawerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const open = client !== null

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function submitAction() {
    if (!client || !inputRef.current) return
    const text = inputRef.current.value.trim()
    if (!text) return
    onAddAction(client.id, text)
    inputRef.current.value = ''
  }

  return (
    <AnimatePresence>
      {open && client && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-hidden border-l border-white/10 bg-[oklch(0.18_0.04_270)] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
              <div>
                <h2 className="font-serif text-xl font-bold text-foreground">{client.name}</h2>
                <StatusPicker
                  current={client.status}
                  onChange={(s) => onStatusChange(client.id, s)}
                />
              </div>
              <button
                onClick={onClose}
                className="mt-0.5 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                aria-label="Close drawer"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* This Month */}
              <section>
                <SectionLabel>This Month</SectionLabel>
                <p className="text-sm leading-relaxed text-foreground/90">{client.thisMonth}</p>
              </section>

              {/* Venu Actions */}
              <section>
                <SectionLabel>
                  Actions for Venu
                  {client.venuActions.filter(a => !a.resolved).length > 0 && (
                    <span className="ml-2 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                      {client.venuActions.filter(a => !a.resolved).length} open
                    </span>
                  )}
                </SectionLabel>

                <div className="space-y-2">
                  {client.venuActions.length === 0 && (
                    <p className="text-xs text-muted-foreground">No actions logged yet.</p>
                  )}
                  {client.venuActions.map((action) => (
                    <ActionItem
                      key={action.id}
                      action={action}
                      onToggle={() => onToggleAction(client.id, action.id)}
                    />
                  ))}
                </div>

                {/* Add action */}
                <div className="mt-3 flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Add a Venu action..."
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-[oklch(0.82_0.13_82/60%)] focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) submitAction()
                    }}
                  />
                  <button
                    onClick={submitAction}
                    className="rounded-lg bg-[oklch(0.82_0.13_82/20%)] px-3 py-2 text-xs font-medium text-[oklch(0.82_0.13_82)] transition-colors hover:bg-[oklch(0.82_0.13_82/30%)]"
                  >
                    Add
                  </button>
                </div>
              </section>

              {/* Notes */}
              <section>
                <SectionLabel>My Notes</SectionLabel>
                <textarea
                  value={client.notes}
                  onChange={(e) => onUpdateNotes(client.id, e.target.value)}
                  placeholder="Add notes about this client... only you see this."
                  rows={4}
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[oklch(0.82_0.13_82/60%)] focus:outline-none leading-relaxed"
                />
              </section>

            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </h3>
  )
}

function ActionItem({ action, onToggle }: { action: VenuAction; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
        action.resolved
          ? 'border-white/5 bg-white/3 opacity-50'
          : 'border-white/10 bg-white/5 hover:border-white/20'
      }`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] transition-colors ${
          action.resolved
            ? 'border-teal-500 bg-teal-500 text-white'
            : 'border-white/30 bg-transparent'
        }`}
      >
        {action.resolved && (
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 4.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={`text-xs leading-relaxed ${action.resolved ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
        {action.text}
      </span>
    </button>
  )
}

function StatusPicker({ current, onChange }: { current: Status; onChange: (s: Status) => void }) {
  const colors = STATUS_COLORS[current]
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {STATUS_ORDER.map((s) => {
        const sc = STATUS_COLORS[s]
        const active = s === current
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
              active
                ? `${sc.bg} ${sc.text} ${sc.border} ring-1 ring-white/20`
                : 'border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground'
            }`}
          >
            {s}
          </button>
        )
      })}
    </div>
  )
}
