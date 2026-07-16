'use client'

import { CLIENTS, META, PROPOSALS, TOP_FOCUS, VENU_ITEMS } from '@/lib/july16-data'

const HEALTH_STYLE: Record<string, string> = {
  'At Risk': 'bg-red-100 text-red-700 border border-red-200',
  'Watch':   'bg-amber-100 text-amber-700 border border-amber-200',
  'On Track':'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'Done':    'bg-blue-100 text-blue-700 border border-blue-200',
  'New':     'bg-purple-100 text-purple-700 border border-purple-200',
}

export default function StaticCEODashboard() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 print:text-sm">
      {/* Print button — hidden when printing */}
      <div className="flex justify-end px-8 pt-6 print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="mx-auto max-w-5xl px-8 pb-16 pt-4 print:px-0 print:pt-0">

        {/* Header */}
        <div className="mb-8 border-b border-slate-200 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Linkfields Innovations</p>
              <h1 className="font-serif text-3xl font-bold text-slate-900">Portfolio Update</h1>
              <p className="mt-1 text-sm text-slate-500">{META.week.split(' ').slice(-3).join(' ')} &middot; {META.owner} &middot; {META.division}</p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mb-8 grid grid-cols-6 gap-3">
          {[
            { label: 'Total Clients', value: META.stats.active, color: 'bg-slate-50 border-slate-200' },
            { label: 'On Track', value: META.stats.onTrack, color: 'bg-emerald-50 border-emerald-200' },
            { label: 'Watch', value: META.stats.watch, color: 'bg-amber-50 border-amber-200' },
            { label: 'At Risk', value: META.stats.atRisk, color: 'bg-red-50 border-red-200' },
            { label: 'Done', value: META.stats.done, color: 'bg-blue-50 border-blue-200' },
            { label: 'New', value: META.stats.new, color: 'bg-purple-50 border-purple-200' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Focus Areas */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Focus Areas</h2>
          <ol className="space-y-2">
            {TOP_FOCUS.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-slate-700">{i + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Followups - Venu */}
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-red-600">Followups - Venu</h2>
          <ol className="space-y-2">
            {VENU_ITEMS.map((v, i) => (
              <li key={i} className={`flex gap-2 text-sm ${v.priority === 'cancelled' ? 'opacity-50' : ''}`}>
                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  v.priority === 'critical' ? 'bg-red-600 text-white' :
                  v.priority === 'cancelled' ? 'bg-slate-300 text-slate-500' :
                  'bg-amber-500 text-white'
                }`}>
                  {i + 1}
                </span>
                <span>
                  <span className={`font-semibold ${v.priority === 'cancelled' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{v.client}: </span>
                  <span className={v.priority === 'cancelled' ? 'text-slate-400 line-through' : 'text-slate-600'}>{v.item}</span>
                  {v.priority === 'cancelled' && (
                    <span className="ml-2 inline-block rounded bg-slate-200 px-1.5 py-0.5 text-xs font-semibold text-slate-500">Not proceeding</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Client table */}
        <div className="mb-8">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">All Clients — Status & Updates</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Engagement</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">This Week</th>
                  <th className="px-4 py-3">Next Actions</th>
                </tr>
              </thead>
              <tbody>
                {CLIENTS.map((c, i) => (
                  <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 font-semibold text-slate-800 align-top">{c.name}</td>
                    <td className="px-4 py-3 text-slate-500 align-top">{c.engagement}</td>
                    <td className="px-4 py-3 align-top">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${HEALTH_STYLE[c.health]}`}>
                        {c.health}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 align-top max-w-xs">{c.update}</td>
                    <td className="px-4 py-3 align-top">
                      <ul className="space-y-1">
                        {c.venuActions.length > 0 && c.venuActions.map((a, j) => (
                          <li key={j} className="text-xs font-semibold text-red-700">Venu: {a}</li>
                        ))}
                        {c.nextActions.map((a, j) => (
                          <li key={`n${j}`} className="text-xs text-slate-500">{a}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Proposals Pipeline */}
        <div className="mb-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Proposals Pipeline</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Opportunity</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Next Action</th>
                </tr>
              </thead>
              <tbody>
                {PROPOSALS.map((p, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 font-semibold text-slate-800 align-top">{p.client}</td>
                    <td className="px-4 py-3 text-slate-600 align-top">{p.opportunity}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 align-top">{p.value}</td>
                    <td className="px-4 py-3 align-top">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        p.stage === 'On Hold' ? 'bg-slate-100 text-slate-600' :
                        p.stage === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {p.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 align-top">{p.nextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
          Linkfields Innovations &mdash; Confidential &mdash; {META.week}
        </div>
      </div>
    </div>
  )
}
