'use client'
import { useState, useEffect } from 'react'
import { RefreshCw, TrendingUp, Clock, AlertTriangle, DollarSign, Users, BarChart2 } from 'lucide-react'

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub: string; icon: any; color: string }) {
  const colorMap: Record<string, string> = {
    red: 'bg-red-50 border-red-200 text-red-600',
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    teal: 'bg-teal-50 border-teal-200 text-teal-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-600',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    stone: 'bg-stone-50 border-stone-200 text-stone-600',
  }
  return (
    <div className={`rounded-2xl border p-5 ${colorMap[color] || colorMap.stone}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</span>
        <Icon className="w-4 h-4 opacity-60" />
      </div>
      <p className="text-2xl font-black">{value}</p>
      {sub && <p className="text-xs font-medium mt-1 opacity-70">{sub}</p>}
    </div>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="w-full bg-stone-100 rounded-full h-2">
      <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function TreasuryPage() {
  const [tenantId, setTenantId] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = localStorage.getItem('bello_session')
    if (session) {
      const { tenantId: tid } = JSON.parse(session)
      setTenantId(tid)
      fetchTreasury(tid)
    }
  }, [])

  const fetchTreasury = async (tid: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/commercial/treasury?tenantId=${tid}`)
      if (res.ok) setData(await res.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fmt = (n: number) => n.toLocaleString('fr-TN', { maximumFractionDigits: 0 }) + ' DT'
  const fmtK = (n: number) => {
    if (n >= 1000) return (n / 1000).toFixed(1) + ' K DT'
    return fmt(n)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-stone-500 font-bold">Chargement du dashboard trésorerie...</div>
      </div>
    )
  }

  const kpis = data?.kpis || {}
  const maxDebt = data?.topDebtors?.[0]?.totalDue || 1

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight flex items-center gap-3">
            💰 Dashboard Trésorerie
          </h1>
          <p className="text-stone-500 font-medium mt-1">Vue consolidée des encaissements et santé financière client</p>
        </div>
        <button onClick={() => fetchTreasury(tenantId)} className="p-2.5 border border-stone-200 rounded-xl hover:bg-stone-50 text-stone-500">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total à Recevoir" value={fmtK(kpis.totalReceivable)} sub={`${kpis.totalReceivableCount || 0} factures`} icon={DollarSign} color="teal" />
        <StatCard label="En Retard" value={fmtK(kpis.totalOverdue)} sub={`${kpis.overdueCount || 0} factures échues`} icon={AlertTriangle} color="red" />
        <StatCard label="À Échoir" value={fmtK(kpis.totalDue)} sub="Échéance proche" icon={Clock} color="blue" />
        <StatCard label="DMP" value={`${kpis.dmp || 0}j`} sub="Délai moyen de paiement" icon={TrendingUp} color="emerald" />
        <StatCard label="Taux Encaissement" value={`${kpis.collectionRate || 0}%`} sub="Ce mois" icon={BarChart2} color="amber" />
      </div>

      {/* Sub KPIs - overdue breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-orange-50 rounded-2xl border border-orange-200 p-4">
          <p className="text-xs font-black text-orange-600 uppercase tracking-widest">1–30j de retard</p>
          <p className="text-xl font-black text-orange-700 mt-1">{fmtK(kpis.overdue30 || 0)}</p>
          <MiniBar value={kpis.overdue30 || 0} max={maxDebt} color="bg-orange-400" />
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-200 p-4">
          <p className="text-xs font-black text-red-600 uppercase tracking-widest">31–60j de retard</p>
          <p className="text-xl font-black text-red-700 mt-1">{fmtK(kpis.overdue60 || 0)}</p>
          <MiniBar value={kpis.overdue60 || 0} max={maxDebt} color="bg-red-500" />
        </div>
        <div className="bg-red-100 rounded-2xl border border-red-300 p-4">
          <p className="text-xs font-black text-red-800 uppercase tracking-widest">90j+ de retard</p>
          <p className="text-xl font-black text-red-900 mt-1">{fmtK(kpis.overdue90plus || 0)}</p>
          <MiniBar value={kpis.overdue90plus || 0} max={maxDebt} color="bg-red-700" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Debtors */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-black text-stone-900 flex items-center gap-2"><Users className="w-5 h-5" /> Top 10 Débiteurs</h2>
            <span className="text-xs font-bold text-stone-400">{data?.topDebtors?.length || 0} clients</span>
          </div>
          <div className="divide-y divide-stone-100">
            {(data?.topDebtors || []).length === 0 ? (
              <div className="px-6 py-12 text-center text-stone-400 font-bold text-sm">Aucun impayé 🎉</div>
            ) : (
              data.topDebtors.map((d: any, i: number) => (
                <div key={d.clientId} className="px-6 py-4 flex items-center gap-4 hover:bg-stone-50/60 transition-colors">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${i === 0 ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-500'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-900 text-sm truncate">{d.clientName}</p>
                    <p className="text-[10px] text-stone-400">{d.invoiceCount} facture{d.invoiceCount > 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-stone-900 font-mono text-sm">{fmt(d.totalDue)}</p>
                    {d.daysOverdue > 0 && <p className="text-[10px] text-red-500 font-black">-{d.daysOverdue}j</p>}
                  </div>
                  <div className="w-20 shrink-0">
                    <MiniBar value={d.totalDue} max={maxDebt} color={i === 0 ? 'bg-red-500' : 'bg-teal-500'} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cash Flow Projection */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100">
            <h2 className="font-black text-stone-900 flex items-center gap-2"><BarChart2 className="w-5 h-5" /> Projection Trésorerie (3 mois)</h2>
          </div>
          <div className="p-6 space-y-6">
            {(data?.cashFlowProjection || []).length === 0 ? (
              <div className="text-center text-stone-400 font-bold py-12">Pas de données</div>
            ) : (
              data.cashFlowProjection.map((cf: any, i: number) => {
                const maxR = Math.max(...data.cashFlowProjection.map((c: any) => c.receivables), 1)
                return (
                  <div key={cf.month} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-stone-700">{cf.month}</span>
                      <span className="font-black text-stone-900 font-mono">{fmt(cf.receivables)}</span>
                    </div>
                    <div className="h-8 bg-stone-100 rounded-xl overflow-hidden flex">
                      <div className={`h-full flex items-center justify-center text-[10px] font-black text-white transition-all ${i === 0 ? 'bg-teal-500' : i === 1 ? 'bg-teal-400' : 'bg-teal-300'}`}
                        style={{ width: `${Math.max(4, (cf.receivables / maxR) * 100)}%` }}>
                        {cf.receivables > 0 ? fmt(cf.receivables) : ''}
                      </div>
                      <div className="flex-1 bg-stone-50" />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="font-black text-stone-900 flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Tendance Mensuelle (6 mois)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50 text-[10px] font-black text-stone-500 uppercase tracking-widest">
                <th className="px-6 py-4">Mois</th>
                <th className="px-6 py-4 text-right">Facturé (DT)</th>
                <th className="px-6 py-4 text-right">Encaissé (DT)</th>
                <th className="px-6 py-4 text-right">En Retard (DT)</th>
                <th className="px-6 py-4 text-right">Taux encaissement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {(data?.monthlyTrend || []).map((mt: any) => {
                const rate = mt.invoiced > 0 ? Math.round((mt.collected / mt.invoiced) * 100) : 0
                return (
                  <tr key={mt.month} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-6 py-4 font-bold text-stone-700">{mt.month}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-stone-600">{fmt(mt.invoiced)}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">{fmt(mt.collected)}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-red-600">{fmt(mt.overdue)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-stone-100 rounded-full h-2">
                          <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-xs font-black text-stone-700 w-10">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
