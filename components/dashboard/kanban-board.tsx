'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Client, Status } from '@/lib/dashboard-data'
import { STATUS_COLORS, STATUS_ORDER } from '@/lib/dashboard-data'

interface KanbanBoardProps {
  clients: Client[]
  onStatusChange: (id: string, status: Status) => void
  onSelectClient: (id: string) => void
}

const COLUMNS: { status: Status; label: string; description: string }[] = [
  { status: 'At Risk',  label: 'At Risk',   description: 'Needs immediate attention' },
  { status: 'Watch',    label: 'Watch',     description: 'Monitor closely' },
  { status: 'On Track', label: 'On Track',  description: 'Running smoothly' },
  { status: 'Done',     label: 'Done',      description: 'Closed this month' },
  { status: 'New',      label: 'New',       description: 'Just started' },
]

export function KanbanBoard({ clients, onStatusChange, onSelectClient }: KanbanBoardProps) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<Status | null>(null)
  const dragStatus = useRef<Status | null>(null)

  function handleDragStart(e: React.DragEvent, client: Client) {
    setDragId(client.id)
    dragStatus.current = client.status
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, status: Status) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverCol(status)
  }

  function handleDrop(e: React.DragEvent, status: Status) {
    e.preventDefault()
    if (dragId && status !== dragStatus.current) {
      onStatusChange(dragId, status)
    }
    setDragId(null)
    setOverCol(null)
    dragStatus.current = null
  }

  function handleDragEnd() {
    setDragId(null)
    setOverCol(null)
    dragStatus.current = null
  }

  const grouped = Object.fromEntries(
    STATUS_ORDER.map((s) => [s, clients.filter((c) => c.status === s)])
  ) as Record<Status, Client[]>

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '420px' }}>
      {COLUMNS.map((col) => {
        const colClients = grouped[col.status] ?? []
        const colors = STATUS_COLORS[col.status]
        const isOver = overCol === col.status

        return (
          <div
            key={col.status}
            className="flex shrink-0 flex-col gap-2"
            style={{ width: '220px' }}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDrop={(e) => handleDrop(e, col.status)}
            onDragLeave={() => setOverCol(null)}
          >
            {/* Column header */}
            <div
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${colors.bg} ${colors.border}`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                <span className={`text-xs font-semibold tracking-wide ${colors.text}`}>
                  {col.label}
                </span>
              </div>
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${colors.text} bg-white/10`}>
                {colClients.length}
              </span>
            </div>

            {/* Drop zone */}
            <div
              className={`flex flex-1 flex-col gap-2 rounded-xl border-2 p-2 transition-colors duration-150 ${
                isOver
                  ? `${colors.border} bg-white/5`
                  : 'border-transparent'
              }`}
              style={{ minHeight: '300px' }}
            >
              <AnimatePresence>
                {colClients.map((client) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    isDragging={dragId === client.id}
                    onSelect={() => onSelectClient(client.id)}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </AnimatePresence>

              {colClients.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-white/10 py-6">
                  <span className="text-center text-xs text-muted-foreground">{col.description}</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface ClientCardProps {
  client: Client
  isDragging: boolean
  onSelect: () => void
  onDragStart: (e: React.DragEvent, client: Client) => void
  onDragEnd: () => void
}

function ClientCard({ client, isDragging, onSelect, onDragStart, onDragEnd }: ClientCardProps) {
  const colors = STATUS_COLORS[client.status]
  const hasUrgent = client.venuActions.some((a) => !a.resolved)
  const openActions = client.venuActions.filter((a) => !a.resolved).length

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isDragging ? 0.4 : 1, scale: isDragging ? 0.97 : 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      draggable
      onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, client)}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={`group cursor-pointer select-none rounded-xl border p-3 transition-all duration-150 hover:ring-1 hover:ring-white/20 active:scale-95 ${colors.bg} ${colors.border}`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm font-semibold leading-snug text-foreground">{client.name}</span>
        {hasUrgent && (
          <span className="mt-0.5 shrink-0 rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
            {openActions}
          </span>
        )}
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {client.thisMonth}
      </p>
      {client.whatINeed && client.whatINeed !== 'None' && client.whatINeed !== 'None urgent' && (
        <div className={`mt-2 rounded-lg border px-2 py-1 ${colors.border} bg-white/5`}>
          <p className={`text-[10px] font-medium ${colors.text}`}>
            Need from Venu: {client.whatINeed}
          </p>
        </div>
      )}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          Drag to move · tap to open
        </span>
      </div>
    </motion.div>
  )
}
