'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { FileText, Plus, Search, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function InventoryListPage() {
  const t = useTranslations()
  const [inventories, setInventories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [tenantId, setTenantId] = useState('')

  useEffect(() => {
    async function checkSession() { try { const res = await fetch('/api/auth/session'); if (res.ok) { const sessionData = await res.json(); setTenantId(sessionData.tenantId || ''); } } catch (err) { console.error('Session check failed:', err); } } checkSession(); /* const session = null
    if (session) {
      const { tenantId } = JSON.parse(session)
      setTenantId(tenantId)
      fetchData(tenantId)
    }
  }, [])

  const fetchData = async (tid: string) => {
    setLoading(true)
    try {
      const url = `/api/stock/inventory?tenantId=${tid}${statusFilter ? `&status=${statusFilter}` : ''}`
      const res = await fetch(url)
      if (res.ok) setInventories(await res.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const filtered = inventories.filter(i =>
    i.reference.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const statusBadge = (s: string) => {
    switch (s) {
      case 'VALIDATED': return <span className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest"><CheckCircle className="w-3 h-3" /> {t('Stock.validated')}</span>
      case 'CANCELLED': return <span className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 rounded-full text-[9px] font-black uppercase tracking-widest"><XCircle className="w-3 h-3" /> {t('Stock.cancelled')}</span>
      default: return <span className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-400 rounded-full text-[9px] font-black uppercase tracking-widest"><Clock className="w-3 h-3" /> {t('Stock.draft')}</span>
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto min-h-screen bg-transparent pt-0 font-sans">
      <div className="flex items-center justify-between">
        <div className="text-start">
          <h1 className="text-3xl font-black text-white tracking-tight">{t('Stock.inventory_title')}</h1>
          <p className="text-zinc-500 font-medium text-sm mt-1">{t('Stock.inventory_description')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchData(tenantId)} className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-all">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/stock/inventory/new" className="flex items-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-600/20">
            <Plus className="w-5 h-5" /> {t('Stock.new_inventory')}
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-5 h-5 absolute inset-inline-start-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t('Search.placeholder')} className="w-full bg-zinc-900/40 border border-zinc-800 rounded-xl ps-10 pe-4 py-3 text-white text-sm outline-none focus:border-amber-500/50" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); fetchData(tenantId) }} className="bg-zinc-900/40 border border-zinc-800 text-zinc-400 rounded-xl px-3 py-3 text-sm outline-none">
          <option value="">{t('Stock.all')}</option>
          <option value="DRAFT">{t('Stock.draft')}</option>
          <option value="VALIDATED">{t('Stock.validated')}</option>
          <option value="CANCELLED">{t('Stock.cancelled')}</option>
        </select>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] overflow-hidden">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="border-b border-zinc-800/50 bg-zinc-800/20">
              <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-start">{t('Stock.ref')}</th>
              <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-start">{t('Stock.date')}</th>
              <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-start">{t('Stock.warehouse')}</th>
              <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-start">{t('Stock.statut')}</th>
              <th className="px-8 py-5 text-end text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('Stock.ecart')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/30">
            {loading ? (
              <tr><td colSpan={5} className="px-8 py-20 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">{t('Stock.loading')}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-8 py-20 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">{t('Stock.no_inventory')}</td></tr>
            ) : filtered.map(inv => {
              const totalVariance = inv.items?.reduce((sum: number, item: any) => sum + Number(item.variance || 0), 0) || 0
              return (
                <tr key={inv.id} className="hover:bg-zinc-800/30 group transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 rounded-lg"><FileText className="w-4 h-4 text-amber-400" /></div>
                      <span className="font-bold text-white text-sm font-mono">{inv.reference}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-zinc-400 text-sm text-start">{new Date(inv.date).toLocaleDateString()}</td>
                  <td className="px-6 py-5 text-zinc-400 text-sm text-start">{inv.warehouse?.name || '-'}</td>
                  <td className="px-6 py-5 text-start">{statusBadge(inv.status)}</td>
                  <td className="px-8 py-5 text-end">
                    <span className={`font-black text-sm ${totalVariance > 0 ? 'text-emerald-400' : totalVariance < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                      {totalVariance > 0 ? '+' : ''}{totalVariance}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}