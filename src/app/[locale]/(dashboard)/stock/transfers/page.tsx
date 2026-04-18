'use client'
import { useState, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { ArrowLeftRight, Package, MapPin, Calendar, RefreshCw } from 'lucide-react'

export default function TransfersPage() {
  const t = useTranslations()
  const [transfers, setTransfers] = useState<any[]>([])
  const [tenantId, setTenantId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const s = localStorage.getItem('bello_session')
    if (s) {
      const { tenantId } = JSON.parse(s)
      setTenantId(tenantId)
      fetchTransfers(tenantId)
    }
  }, [])

  const fetchTransfers = async (tid: string) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/stock/transfers?tenantId=${tid}`)
      const d = await r.json()
      setTransfers(Array.isArray(d) ? d : [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto min-h-screen bg-transparent pt-0 font-sans">
      <div className="flex items-center justify-between">
        <div className="text-start">
          <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
            <ArrowLeftRight className="w-8 h-8 text-amber-500" />
            {t('Stock.transfers_title')}
          </h1>
          <p className="text-zinc-500 mt-1 font-medium">{t('Stock.transfers_description')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchTransfers(tenantId)} className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-all">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/stock/transfers/new" className="px-5 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-600/20 transition-all">
            <span className="flex items-center gap-2 tracking-tight">
               <ArrowLeftRight className="w-5 h-5" /> {t('Stock.new_transfer')}
            </span>
          </Link>
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] overflow-hidden">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="border-b border-zinc-800/50 bg-zinc-800/20">
              <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-start">{t('Stock.ref')}</th>
              <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-start">{t('Stock.from')}</th>
              <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-start">{t('Stock.to')}</th>
              <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-start">{t('Stock.date')}</th>
              <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-start">{t('Stock.statut')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/30">
            {loading ? (
              <tr><td colSpan={5} className="px-8 py-20 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">{t('Stock.loading')}</td></tr>
            ) : transfers.length === 0 ? (
              <tr><td colSpan={5} className="px-8 py-20 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">{t('Stock.no_transfer_found')}</td></tr>
            ) : transfers.map(tr => (
              <tr key={tr.id} className="hover:bg-zinc-800/30 group transition-colors">
                <td className="px-8 py-5 font-mono font-bold text-white text-sm">{tr.reference}</td>
                <td className="px-6 py-5 text-zinc-400 text-sm">{tr.fromWarehouse?.name}</td>
                <td className="px-6 py-5 text-zinc-400 text-sm">{tr.toWarehouse?.name}</td>
                <td className="px-6 py-5 text-zinc-500 text-sm">{new Date(tr.date).toLocaleDateString()}</td>
                <td className="px-6 py-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${tr.status === 'TRANSFERRED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                    {tr.status === 'TRANSFERRED' ? t('Stock.status_transferred') : t('Stock.draft')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
