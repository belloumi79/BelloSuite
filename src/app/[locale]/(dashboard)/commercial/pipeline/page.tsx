'use client'
import { useState, useEffect } from 'react'
import { ArrowRight, TrendingUp, CheckCircle, Clock, AlertTriangle, FileText, RefreshCw, ExternalLink, X } from 'lucide-react'

const TYPE_COLORS: Record<string, string> = {
  QUOTE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  ORDER: 'bg-blue-100 text-blue-700 border-blue-200',
}
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-stone-100 text-stone-600',
  SENT: 'bg-purple-100 text-purple-700',
  CONFIRMED: 'bg-teal-100 text-teal-700',
  PENDING: 'bg-amber-100 text-amber-700',
  INVOICED: 'bg-emerald-100 text-emerald-700',
  EXPIRED: 'bg-red-100 text-red-600',
}

function PipelineColumn({ title, items, color, icon }: { title: string; items: any[]; color: string; icon: any }) {
  const Icon = icon
  return (
    <div className="flex-1 min-w-[280px] max-w-[340px]">
      <div className={`flex items-center gap-2 px-4 py-3 rounded-t-2xl border-t-2 ${color}`}>
        <Icon className="w-4 h-4" />
        <span className="font-black text-sm">{title}</span>
        <span className="ml-auto px-2 py-0.5 bg-white/30 rounded-full text-xs font-black">{items.length}</span>
      </div>
      <div className="bg-white border-x border-b border-stone-200 rounded-b-2xl p-4 space-y-3 min-h-[200px]">
        {items.length === 0 ? (
          <p className="text-stone-400 text-xs font-bold text-center py-8">Aucun document</p>
        ) : items.map(item => (
          <DocumentCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

function DocumentCard({ item }: { item: any }) {
  const [expanded, setExpanded] = useState(false)
  const daysColor = item.daysUntilDue === null ? '' : item.daysUntilDue < 0 ? 'text-red-600' : item.daysUntilDue <= 3 ? 'text-amber-600' : 'text-stone-500'
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group"
         onClick={() => setExpanded(!expanded)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-black text-stone-900 text-xs font-mono">{item.number}</p>
          <p className="text-stone-500 text-[10px] font-bold mt-0.5">{item.clientName}</p>
        </div>
        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${TYPE_COLORS[item.type] || TYPE_COLORS.QUOTE}`}>
          {item.type}
        </span>
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-sm font-black text-stone-900">{item.totalTTC.toLocaleString('fr-TN', { maximumFractionDigits: 3 })} DT</span>
        {item.daysUntilDue !== null && (
          <span className={`text-[10px] font-black ${daysColor}`}>
            {item.daysUntilDue < 0 ? `${Math.abs(item.daysUntilDue)}j retard` : item.daysUntilDue === 0 ? 'Échéance aujourd\'hui' : `${item.daysUntilDue}j`}
          </span>
        )}
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-stone-200 space-y-1">
          <div className="flex justify-between text-[10px]"><span className="text-stone-500">Date</span><span className="font-bold text-stone-700">{item.date}</span></div>
          {item.dueDate && <div className="flex justify-between text-[10px]"><span className="text-stone-500">Échéance</span><span className="font-bold text-stone-700">{item.dueDate}</span></div>}
          <div className="flex justify-between text-[10px]"><span className="text-stone-500">Statut</span><span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${STATUS_COLORS[item.status] || STATUS_COLORS.DRAFT}`}>{item.status}</span></div>
        </div>
      )}
    </div>
  )
}

export default function PipelinePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState('')
  const [converting, setConverting] = useState<string | null>(null)
  const [filter, setFilter] = useState<'QUOTE' | 'ORDER' | 'ALL'>('ALL')

  useEffect(() => {
    const session = localStorage.getItem('bello_session')
    if (session) {
      const { tenantId } = JSON.parse(session)
      setTenantId(tenantId)
      fetchPipeline(tenantId)
    }
  }, [])

  const fetchPipeline = async (tid: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/commercial/pipeline?tenantId=${tid}`)
      if (res.ok) setData(await res.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleConvert = async (id: string, targetType: string) => {
    if (!confirm(`Convertir en ${targetType} ?`)) return
    setConverting(id)
    try {
      const res = await fetch(`/api/commercial/documents/convert/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, targetType }),
      })
      if (res.ok) {
        await fetchPipeline(tenantId)
      }
    } finally { setConverting(null) }
  }

  const items = data?.pipelineItems || []
  const filtered = filter === 'ALL' ? items : items.filter((i: any) => i.type === filter)

  const quoteItems = filtered.filter((i: any) => i.type === 'QUOTE')
  const orderItems = filtered.filter((i: any) => i.type === 'ORDER')
  const quoteColumns = [
    { title: 'Brouillons', key: 'DRAFT', items: quoteItems.filter((i: any) => i.status === 'DRAFT'), color: 'border-stone-400 bg-stone-50', icon: FileText },
    { title: 'Envoyés', key: 'SENT', items: quoteItems.filter((i: any) => i.status === 'SENT'), color: 'border-purple-400 bg-purple-50', icon: Clock },
    { title: 'Confirmés', key: 'CONFIRMED', items: quoteItems.filter((i: any) => i.status === 'CONFIRMED'), color: 'border-teal-400 bg-teal-50', icon: CheckCircle },
    { title: 'Expirés', key: 'EXPIRED', items: quoteItems.filter((i: any) => i.status === 'EXPIRED'), color: 'border-red-400 bg-red-50', icon: AlertTriangle },
  ]
  const orderColumns = [
    { title: 'En attente', key: 'PENDING', items: orderItems.filter((i: any) => i.status === 'PENDING'), color: 'border-amber-400 bg-amber-50', icon: Clock },
    { title: 'Confirmés', key: 'CONFIRMED', items: orderItems.filter((i: any) => i.status === 'CONFIRMED'), color: 'border-teal-400 bg-teal-50', icon: CheckCircle },
    { title: 'Facturés', key: 'INVOICED', items: orderItems.filter((i: any) => i.status === 'INVOICED'), color: 'border-emerald-400 bg-emerald-50', icon: FileText },
  ]

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">Pipeline Commercial 📋</h1>
          <p className="text-stone-500 font-medium mt-1">Devis → Commandes → Factures — Conversion funnel</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-stone-100 p-1 rounded-xl">
            {(['ALL', 'QUOTE', 'ORDER'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${filter === f ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}>
                {f === 'ALL' ? 'Tout' : f === 'QUOTE' ? 'Devis' : 'Commandes'}
              </button>
            ))}
          </div>
          <button onClick={() => fetchPipeline(tenantId)} className="p-2.5 border border-stone-200 rounded-xl hover:bg-stone-50 text-stone-500 transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Devis', value: data.quoteStats.total, sub: `${data.quoteStats.totalValue.toLocaleString('fr-TN', { maximumFractionDigits: 0 })} DT` },
            { label: 'Devis Confirmés', value: data.quoteStats.confirmed, sub: `${Math.round((data.quoteStats.confirmed / Math.max(data.quoteStats.total, 1)) * 100)}%` },
            { label: 'Taux Conversion', value: `${data.conversionRate}%`, sub: 'devis → commande' },
            { label: 'Total Commandes', value: data.orderStats.total, sub: `${data.orderStats.totalValue.toLocaleString('fr-TN', { maximumFractionDigits: 0 })} DT` },
            { label: 'Commandes Facturées', value: data.orderStats.invoiced, sub: `${Math.round((data.orderStats.invoiced / Math.max(data.orderStats.total, 1)) * 100)}%` },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-stone-200 p-4">
              <p className="text-xs font-black text-stone-500 uppercase tracking-widest">{s.label}</p>
              <p className="text-2xl font-black text-stone-900 mt-1">{s.value}</p>
              <p className="text-xs font-medium text-stone-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-stone-400 font-bold">Chargement du pipeline...</div>
      ) : data ? (
        <>
          {/* Devis Kanban */}
          <div className="space-y-2">
            <h2 className="text-sm font-black text-stone-500 uppercase tracking-widest flex items-center gap-2">
              📋 Devis <span className="text-xs font-normal normal-case tracking-normal">({quoteItems.length})</span>
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {quoteColumns.map(({ key, ...col }) => (
                <PipelineColumn key={key} {...col} />
              ))}
            </div>
          </div>

          {/* Commandes Kanban */}
          <div className="space-y-2">
            <h2 className="text-sm font-black text-stone-500 uppercase tracking-widest flex items-center gap-2">
              📦 Commandes <span className="text-xs font-normal normal-case tracking-normal">({orderItems.length})</span>
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {orderColumns.map(({ key, ...col }) => (
                <PipelineColumn key={key} {...col} />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-stone-400 font-bold">Aucune donnée disponible</div>
      )}
    </div>
  )
}
