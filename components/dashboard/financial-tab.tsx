'use client'

import type { Client, Financials } from '@/lib/dashboard-data'

interface FinancialTabProps {
  clients: Client[]
  onUpdateFinancials: (clientId: string, financials: Financials) => void
}

function fmt(n: number | null) {
  if (n === null || n === 0) return ''
  return n.toLocaleString('en-ZA')
}

function parse(s: string): number | null {
  const n = parseFloat(s.replace(/[^0-9.]/g, ''))
  return isNaN(n) ? null : n
}

function calcRevenue(f: Financials): number | null {
  if (f.hoursUtilised === null || f.ratePerHour === null) return null
  return f.hoursUtilised * f.ratePerHour
}

function calcOutstanding(f: Financials): number | null {
  const rev = calcRevenue(f)
  if (rev === null) return null
  return rev - (f.paid ?? 0)
}

export function FinancialTab({ clients, onUpdateFinancials }: FinancialTabProps) {
  function update(clientId: string, field: keyof Financials, raw: string) {
    const client = clients.find((c) => c.id === clientId)
    if (!client) return
    onUpdateFinancials(clientId, { ...client.financials, [field]: parse(raw) })
  }

  const totals = clients.reduce(
    (acc, c) => {
      const rev = calcRevenue(c.financials) ?? 0
      acc.revenue += rev
      acc.invoiced += c.financials.invoiced ?? 0
      acc.paid += c.financials.paid ?? 0
      acc.outstanding += calcOutstanding(c.financials) ?? 0
      return acc
    },
    { revenue: 0, invoiced: 0, paid: 0, outstanding: 0 }
  )

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Revenue Recognised" value={totals.revenue} color="text-teal-300" />
        <SummaryCard label="Invoiced" value={totals.invoiced} color="text-[oklch(0.82_0.13_82)]" />
        <SummaryCard label="Paid" value={totals.paid} color="text-violet-300" />
        <SummaryCard label="Outstanding" value={totals.outstanding} color="text-rose-300" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Client</th>
              <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Hours</th>
              <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Rate (ZAR)</th>
              <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Revenue</th>
              <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Invoiced</th>
              <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Paid</th>
              <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client, i) => {
              const f = client.financials
              const rev = calcRevenue(f)
              const out = calcOutstanding(f)
              return (
                <tr
                  key={client.id}
                  className={`border-b border-white/5 transition-colors hover:bg-white/5 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}
                >
                  <td className="px-4 py-3 font-medium text-foreground">{client.name}</td>
                  <FinanceCell clientId={client.id} field="hoursUtilised" value={f.hoursUtilised} onUpdate={update} suffix="" />
                  <FinanceCell clientId={client.id} field="ratePerHour" value={f.ratePerHour} onUpdate={update} prefix="R" />
                  <td className="px-3 py-3 text-right text-teal-300">
                    {rev !== null ? `R${rev.toLocaleString('en-ZA')}` : <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <FinanceCell clientId={client.id} field="invoiced" value={f.invoiced} onUpdate={update} prefix="R" highlight="text-[oklch(0.82_0.13_82)]" />
                  <FinanceCell clientId={client.id} field="paid" value={f.paid} onUpdate={update} prefix="R" highlight="text-violet-300" />
                  <td className={`px-3 py-3 text-right font-medium ${out !== null && out > 0 ? 'text-rose-300' : out !== null ? 'text-teal-300' : 'text-muted-foreground/40'}`}>
                    {out !== null ? `R${out.toLocaleString('en-ZA')}` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/20 bg-white/5 font-bold">
              <td className="px-4 py-3 text-foreground" colSpan={3}>Total</td>
              <td className="px-3 py-3 text-right text-teal-300">R{totals.revenue.toLocaleString('en-ZA')}</td>
              <td className="px-3 py-3 text-right text-[oklch(0.82_0.13_82)]">R{totals.invoiced.toLocaleString('en-ZA')}</td>
              <td className="px-3 py-3 text-right text-violet-300">R{totals.paid.toLocaleString('en-ZA')}</td>
              <td className="px-3 py-3 text-right text-rose-300">R{totals.outstanding.toLocaleString('en-ZA')}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        All cells are editable. Revenue and Outstanding calculate automatically from Hours x Rate.
      </p>
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1.5 text-xl font-bold tabular-nums ${color}`}>
        {value > 0 ? `R${value.toLocaleString('en-ZA')}` : <span className="text-muted-foreground/40">R0</span>}
      </p>
    </div>
  )
}

interface FinanceCellProps {
  clientId: string
  field: keyof Financials
  value: number | null
  onUpdate: (id: string, field: keyof Financials, raw: string) => void
  prefix?: string
  suffix?: string
  highlight?: string
}

function FinanceCell({ clientId, field, value, onUpdate, prefix = '', suffix = '', highlight = 'text-foreground' }: FinanceCellProps) {
  return (
    <td className="px-3 py-2 text-right">
      <div className="relative inline-flex items-center">
        {prefix && value !== null && (
          <span className="pointer-events-none absolute left-2 text-xs text-muted-foreground">{prefix}</span>
        )}
        <input
          type="text"
          inputMode="decimal"
          defaultValue={fmt(value)}
          onBlur={(e) => onUpdate(clientId, field, e.target.value)}
          placeholder="—"
          className={`w-24 rounded-md border border-transparent bg-transparent px-2 py-1 text-right text-sm tabular-nums placeholder:text-muted-foreground/30 transition-colors focus:border-white/20 focus:bg-white/5 focus:outline-none ${value !== null ? highlight : 'text-muted-foreground/40'}`}
        />
      </div>
    </td>
  )
}
