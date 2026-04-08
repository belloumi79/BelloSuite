'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeftRight, Package, MapPin, Calendar } from 'lucide-react'

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<any[]>([])
  const [tenantId, setTenantId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const s = localStorage.getItem('bello_session')
    if (s) { const { tenantId } = JSON.parse(s); setTenantId(tenantId); fetchTransfers(tenantId) }
  }, [])

  const fetchTransfers = async (tid: string) => {
    const r = await fetch(`/api/stock/transfers?tenantId=${tid}`)
    const d = await r.json()
    setTransfers(Array.isArray(d) ? d : [])
    setLoading(false)
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <ArrowLeftRight className="w-8 h-8 text-amber-500" />
            Transferts de Stock
          </h1>
          <p className="text-zinc-500 mt-1">Mouvements entre entrepôts</p>
        </div>
        <Link href="/stock/transfers/new" className="px-5 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm">
          + Nouveau Transfert
        </Link>
      </div>
      <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-zinc-800/50 bg-zinc-800/20">
              <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase">Réf.</th>
              <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase">De</th>
              <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase">Vers</th>
              <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase">Date</th>
              <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase">Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-8 py-16 text-center text-zinc-500">Chargement...</td></tr>
            ) : transfers.length === 0 ? (
              <tr><td colSpan={5} className="px-8 py-16 text-center text-zinc-500">Aucun transfert trouvé</td></tr>
            ) : transfers.map(t => (
              <tr key={t.id} className="border-t border-zinc-800/30 hover:bg-zinc-800/20">
                <td className="px-8 py-5 font-mono font-bold text-white">{t.reference}</td>
                <td className="px-6 py-5 text-zinc-400 text-sm">{t.fromWarehouse?.name}</td>
                <td className="px-6 py-5 text-zinc-400 text-sm">{t.toWarehouse?.name}</td>
                <td className="px-6 py-5 text-zinc-500 text-sm">{new Date(t.date).toLocaleDateString()}</td>
                <td className="px-6 py-5"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${t.status==='TRANSFERRED'?'bg-emerald-500/10 text-emerald-400':'bg-zinc-800 text-zinc-400'}`}>{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
