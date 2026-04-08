'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users, Truck, Package, FileText,
  TrendingUp, Clock, CheckCircle, AlertTriangle,
  ArrowRight, Plus, CreditCard, Receipt
} from 'lucide-react'

const DOC_TYPES = [
  { key: 'estimate', label: 'Devis', icon: FileText, href: '/commercial/documents/estimates', color: 'emerald', desc: 'Propositions commerciales' },
  { key: 'order', label: 'Bon de Commande', icon: Receipt, href: '/commercial/documents/client-orders', color: 'blue', desc: 'Commandes clients' },
  { key: 'delivery_note', label: 'Bon de Livraison', icon: Truck, href: '/commercial/documents/delivery-notes', color: 'purple', desc: 'Livraisons effectuées' },
  { key: 'invoice', label: 'Facture', icon: FileText, href: '/commercial/documents', color: 'teal', desc: 'Documents fiscaux TEIF' },
  { key: 'supplier_order', label: 'Commande Fournisseur', icon: Package, href: '/commercial/documents/supplier-orders', color: 'amber', desc: 'Achats & approvisionnements' },
]

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub: string; icon: any; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    teal: 'bg-teal-500/10 border-teal-500/20 text-teal-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  }
  return (
    <div className={`rounded-2xl border p-5 ${colors[color] || colors.teal}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-black uppercase tracking-widest opacity-70">{label}</span>
        <Icon className="w-4 h-4 opacity-60" />
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-medium mt-1 opacity-60">{sub}</p>
    </div>
  )
}

export default function CommercialDashboard() {
  const [tenantId, setTenantId] = useState('')
  const [stats, setStats] = useState({ totalHT: 0, totalTTC: 0, paidTTC: 0, unpaidTTC: 0, overdueTTC: 0, count: 0 })
  const [recentDocs, setRecentDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() })

  useEffect(() => {
    const s = localStorage.getItem('bello_session')
    if (s) {
      const { tenantId } = JSON.parse(s)
      setTenantId(tenantId)
      fetchData(tenantId)
    }
  }, [])

  const fetchData = async (tid: string) => {
    setLoading(true)
    try {
      const [invRes, estRes] = await Promise.all([
        fetch(`/api/commercial/invoices?tenantId=${tid}`),
        fetch(`/api/commercial/documents?tenantId=${tid}&type=QUOTE`),
      ])
      const invoices = invRes.ok ? await invRes.json() : []
      const estimates = estRes.ok ? await estRes.json() : []
      const all = [...invoices, ...estimates]

      const now = new Date()
      const paid = all.filter(d => d.status === 'PAID')
      const unpaid = all.filter(d => d.status === 'PENDING' || d.status === 'CONFIRMED' || d.status === 'SENT')
      const overdue = unpaid.filter(d => d.dueDate && new Date(d.dueDate) < now)

      setStats({
        totalHT: all.reduce((s, d) => s + Number(d.subtotalHT || 0), 0),
        totalTTC: all.reduce((s, d) => s + Number(d.totalTTC || 0), 0),
        paidTTC: paid.reduce((s, d) => s + Number(d.totalTTC || 0), 0),
        unpaidTTC: unpaid.reduce((s, d) => s + Number(d.totalTTC || 0), 0),
        overdueTTC: overdue.reduce((s, d) => s + Number(d.totalTTC || 0), 0),
        count: all.length,
      })
      setRecentDocs(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n: number) => n.toLocaleString('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 3 })

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">Module Commercial</h1>
          <p className="text-stone-500 font-medium mt-1">Gestion des ventes, achats et facturation — conforme TEIF 1.8.8</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="px-4 py-2.5 border border-stone-200 rounded-xl text-sm font-bold text-stone-600 bg-white shadow-sm"
            value={period.month}
            onChange={e => { setPeriod(p => ({ ...p, month: +e.target.value })); fetchData(tenantId) }}
          >
            {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map((m, i) => (
              <option key={i} value={i + 1}>{m} {period.year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="CA HT" value={fmt(stats.totalHT)} sub="Chiffre d'affaires HT" icon={TrendingUp} color="teal" />
        <StatCard label="Total TTC" value={fmt(stats.totalTTC)} sub="Toutes taxes comprises" icon={CreditCard} color="blue" />
        <StatCard label="Payé" value={fmt(stats.paidTTC)} sub="Factures encaissées" icon={CheckCircle} color="emerald" />
        <StatCard label="En Attente" value={fmt(stats.unpaidTTC)} sub="À recevoir" icon={Clock} color="amber" />
        <StatCard label="En Retard" value={fmt(stats.overdueTTC)} sub="Échues et impayées" icon={AlertTriangle} color="red" />
      </div>

      {/* Doc Types */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {DOC_TYPES.map(({ key, label, icon: Icon, href, color, desc }) => {
          const borders: Record<string, string> = { emerald: 'hover:border-emerald-400', blue: 'hover:border-blue-400', purple: 'hover:border-purple-400', teal: 'hover:border-teal-400', amber: 'hover:border-amber-400' }
          const icons: Record<string, string> = { emerald: 'text-emerald-500', blue: 'text-blue-500', purple: 'text-purple-500', teal: 'text-teal-500', amber: 'text-amber-500' }
          return (
            <Link key={key} href={href}
              className={`bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-lg transition-all hover:scale-[1.02] ${borders[color]}`}>
              <Icon className={`w-7 h-7 mb-3 ${icons[color]}`} />
              <p className="font-black text-stone-900 text-sm">{label}</p>
              <p className="text-xs text-stone-400 mt-0.5">{desc}</p>
            </Link>
          )
        })}
      </div>

      {/* Recent */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-black text-stone-900">Documents Récents</h2>
          <Link href="/commercial/documents" className="text-xs font-bold text-teal-600 hover:text-teal-700">Tout voir →</Link>
        </div>
        {loading ? (
          <div className="p-12 text-center text-stone-400 font-bold text-sm">Chargement...</div>
        ) : recentDocs.length === 0 ? (
          <div className="p-12 text-center text-stone-400 font-bold text-sm">Aucun document — créez votre première facture</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50 text-[10px] font-black text-stone-500 uppercase tracking-widest">
                <th className="px-6 py-3">Référence</th>
                <th className="px-6 py-3">Client</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Échéance</th>
                <th className="px-6 py-3 text-right">Montant TTC</th>
                <th className="px-6 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {recentDocs.map(doc => (
                <tr key={doc.id} className="hover:bg-teal-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-stone-400" />
                      <div>
                        <p className="font-bold text-stone-900 text-sm font-mono">{doc.number}</p>
                        <p className="text-[10px] text-stone-400 uppercase">{doc.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-600">{doc.client?.name || doc.clientName || '—'}</td>
                  <td className="px-6 py-4 text-sm text-stone-500">{new Date(doc.date).toLocaleDateString('fr-TN')}</td>
                  <td className="px-6 py-4 text-sm">{doc.dueDate ? new Date(doc.dueDate).toLocaleDateString('fr-TN') : '—'}</td>
                  <td className="px-6 py-4 text-right font-bold text-stone-900 font-mono">{fmt(Number(doc.totalTTC))}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      doc.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                      doc.status === 'DRAFT' ? 'bg-stone-100 text-stone-500' :
                      doc.status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
                      'bg-amber-100 text-amber-700'
                    }`}>{doc.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}