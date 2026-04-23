'use client'
import { useState, useEffect } from 'react'
import { TrendingUp, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface KpiData {
  totalHT: number; totalTTC: number; paidTTC: number
  unpaidTTC: number; overdueTTC: number; count: number
}

export default function CommercialKpiWidget() {
  const [kpi, setKpi] = useState<KpiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string>('')

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => {
        if (data?.tenantId) setTenantId(data.tenantId)
      })
      .catch(() => {})
  }, [])

  const fetchKpi = async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const res = await fetch('/api/commercial/treasury?tenantId=' + tenantId)
      if (res.ok) setKpi(await res.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (tenantId) fetchKpi() }, [tenantId])

  const fmt = (n: number) => n.toLocaleString('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 3 })

  if (loading || !kpi) return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 animate-pulse">
      <div className="h-4 bg-stone-200 rounded w-1/2 mb-4" />
      <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-stone-100 rounded-xl" />)}</div>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-stone-900 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600" />Apercu Commercial
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">Periode courante</p>
        </div>
        <button onClick={fetchKpi} className="p-1.5 hover:bg-stone-100 rounded-lg transition-all">
          <RefreshCw className="w-3.5 h-3.5 text-stone-400" />
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-stone-100 p-3">
          <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">CA HT</p>
          <p className="text-base font-black text-stone-900 mt-1">{fmt(kpi.totalHT)}</p>
        </div>
        <div className="rounded-xl border border-stone-100 p-3">
          <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Encaissements</p>
          <p className="text-base font-black text-emerald-600 mt-1">{fmt(kpi.paidTTC)}</p>
        </div>
        <div className="rounded-xl border border-stone-100 p-3">
          <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">En attente</p>
          <p className="text-base font-black text-amber-600 mt-1">{fmt(kpi.unpaidTTC)}</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50 p-3">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">En retard</p>
          <p className="text-base font-black text-red-600 mt-1">{fmt(kpi.overdueTTC)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-stone-100">
        <div className="flex gap-2">
          <Link href="/commercial/treasury" className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">Tresorerie</Link>
          <Link href="/commercial/payments" className="text-xs font-bold text-stone-400 hover:text-stone-600 flex items-center gap-1">Relances</Link>
        </div>
        <Link href="/commercial/pipeline" className="text-xs font-bold text-stone-400 hover:text-stone-600 flex items-center gap-1">Pipeline</Link>
      </div>
    </div>
  )
}
