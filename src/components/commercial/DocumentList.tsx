'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Search, Filter, Download, Plus, FileText, Calendar,
  User, Printer, ExternalLink, FileCode, Edit, Trash2,
  ChevronDown, X, RefreshCw
} from 'lucide-react'

interface DocumentListProps {
  tenantId: string
  type: string // QUOTE | ORDER | DELIVERY_NOTE | INVOICE | CREDIT_NOTE | SUPPLIER_ORDER | SUPPLIER_INVOICE
  title: string
  documentLabel: string // e.g. "Devis", "Bon de Commande"
  accentColor: string // tailwind color class e.g. "emerald"
  apiEndpoint: string // e.g. "/api/commercial/invoices"
  newHref: string
  showSupplier?: boolean
}

const STATUS_OPTIONS = ['TOUT', 'DRAFT', 'PENDING', 'CONFIRMED', 'SENT', 'PAID', 'CANCELLED']
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-stone-100 text-stone-600',
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  SENT: 'bg-purple-100 text-purple-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-600',
}

export default function DocumentList({
  tenantId, type, title, documentLabel, accentColor,
  apiEndpoint, newHref, showSupplier = false
}: DocumentListProps) {
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('TOUT')
  const [showFilters, setShowFilters] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchDocs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ tenantId })
      if (type) params.set('type', type)
      if (status !== 'TOUT') params.set('status', status)
      const res = await fetch(`${apiEndpoint}?${params}`)
      if (res.ok) setDocs(await res.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (tenantId) fetchDocs() }, [tenantId, status])

  const filtered = useMemo(() => {
    if (!search) return docs
    const q = search.toLowerCase()
    return docs.filter(d =>
      d.number?.toLowerCase().includes(q) ||
      d.client?.name?.toLowerCase().includes(q) ||
      d.supplier?.name?.toLowerCase().includes(q)
    )
  }, [docs, search])

  const stats = useMemo(() => ({
    total: filtered.length,
    totalTTC: filtered.reduce((s, d) => s + Number(d.totalTTC || 0), 0),
    paid: filtered.filter(d => d.status === 'PAID').reduce((s, d) => s + Number(d.totalTTC || 0), 0),
    unpaid: filtered.filter(d => d.status !== 'PAID' && d.status !== 'CANCELLED').reduce((s, d) => s + Number(d.totalTTC || 0), 0),
  }), [filtered])

  const color = accentColor || 'teal'
  const colorMap: Record<string, { bg: string; border: string; hover: string }> = {
    emerald: { bg: 'bg-emerald-600', border: 'border-emerald-500/50', hover: 'hover:bg-emerald-500' },
    teal: { bg: 'bg-teal-600', border: 'border-teal-500/50', hover: 'hover:bg-teal-500' },
    amber: { bg: 'bg-amber-600', border: 'border-amber-500/50', hover: 'hover:bg-amber-500' },
    blue: { bg: 'bg-blue-600', border: 'border-blue-500/50', hover: 'hover:bg-blue-500' },
    purple: { bg: 'bg-purple-600', border: 'border-purple-500/50', hover: 'hover:bg-purple-500' },
  }
  const c = colorMap[color] || colorMap.teal

  const handleDelete = async (id: string) => {
    if (!confirm(`Supprimer ce ${documentLabel.toLowerCase()} ?`)) return
    await fetch(`${apiEndpoint}/${id}`, { method: 'DELETE' })
    fetchDocs()
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">{title}</h1>
          <p className="text-stone-500 font-medium mt-1">
            {stats.total} {documentLabel}s — TTC total: {stats.totalTTC.toLocaleString('fr-TN', { maximumFractionDigits: 3 })} DT
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchDocs} className="p-2.5 border border-stone-200 rounded-xl hover:bg-stone-50 text-stone-500 transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 border border-stone-200 rounded-xl hover:bg-stone-50 text-stone-600 font-bold text-sm">
            <Download className="w-4 h-4" /> Exporter
          </button>
          <Link href={newHref}
            className={`flex items-center gap-2 px-5 py-2.5 ${c.bg} text-white rounded-xl font-bold text-sm shadow-lg ${c.hover} transition-all`}>
            <Plus className="w-4 h-4" /> Nouveau {documentLabel}
          </Link>
        </div>
      </div>

      {/* Mini Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
          <p className="text-xs font-black text-stone-500 uppercase tracking-widest">Total TTC</p>
          <p className="text-lg font-black text-stone-900 mt-1">{stats.totalTTC.toLocaleString('fr-TN', { maximumFractionDigits: 3 })} DT</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
          <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Payé</p>
          <p className="text-lg font-black text-emerald-700 mt-1">{stats.paid.toLocaleString('fr-TN', { maximumFractionDigits: 3 })} DT</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
          <p className="text-xs font-black text-amber-600 uppercase tracking-widest">En Attente</p>
          <p className="text-lg font-black text-amber-700 mt-1">{stats.unpaid.toLocaleString('fr-TN', { maximumFractionDigits: 3 })} DT</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Rechercher par ${showSupplier ? 'fournisseur' : 'client'} ou référence...`}
            className="w-full pl-11 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 outline-none" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="px-3 py-2.5 border border-stone-200 rounded-xl text-sm font-bold text-stone-600 bg-white">
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'TOUT' ? 'Tous les statuts' : s}</option>)}
          </select>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 border rounded-xl text-sm font-bold transition-all ${showFilters ? `${c.bg} text-white border-transparent` : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-stone-200 p-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs font-black text-stone-500 uppercase tracking-widest block mb-1.5">Du</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-stone-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs font-black text-stone-500 uppercase tracking-widest block mb-1.5">Au</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 border border-stone-200 rounded-lg text-sm" />
          </div>
          <button onClick={() => { setDateFrom(''); setDateTo('') }}
            className="px-3 py-2 text-xs font-bold text-stone-500 hover:text-stone-700">Réinitialiser</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100 text-[10px] font-black text-stone-500 uppercase tracking-widest">
                <th className="px-6 py-4">Référence</th>
                {showSupplier ? <th className="px-6 py-4">Fournisseur</th> : <th className="px-6 py-4">Client</th>}
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Échéance</th>
                <th className="px-6 py-4 text-right">Montant HT</th>
                <th className="px-6 py-4 text-right">TVA</th>
                <th className="px-6 py-4 text-right">Montant TTC</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr><td colSpan={10} className="px-6 py-16 text-center text-stone-400 font-bold text-sm">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-6 py-16 text-center text-stone-400 font-bold text-sm">Aucun {documentLabel.toLowerCase()} trouvé</td></tr>
              ) : filtered.map(doc => (
                <tr key={doc.id} className="hover:bg-stone-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-stone-400" />
                      </div>
                      <div>
                        <p className="font-bold text-stone-900 text-sm font-mono">{doc.number}</p>
                        <p className="text-[10px] text-stone-400 uppercase">{doc.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-600">
                    {showSupplier ? doc.supplier?.name : doc.client?.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-500">{new Date(doc.date).toLocaleDateString('fr-TN')}</td>
                  <td className="px-6 py-4 text-sm">
                    {doc.dueDate ? (
                      <span className={new Date(doc.dueDate) < new Date() ? 'text-red-600 font-bold' : 'text-stone-500'}>
                        {new Date(doc.dueDate).toLocaleDateString('fr-TN')}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-stone-700 text-sm">{Number(doc.subtotalHT || 0).toLocaleString('fr-TN', { maximumFractionDigits: 3 })}</td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-stone-500 text-sm">{Number(doc.totalVAT || 0).toLocaleString('fr-TN', { maximumFractionDigits: 3 })}</td>
                  <td className="px-6 py-4 text-right font-black text-stone-900 font-mono">{Number(doc.totalTTC || 0).toLocaleString('fr-TN', { maximumFractionDigits: 3 })} DT</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS_COLORS[doc.status] || STATUS_COLORS.DRAFT}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {doc.status !== 'PAID' && doc.status !== 'CANCELLED' && (
                        <button className="p-2 hover:bg-teal-50 text-stone-400 hover:text-teal-600 rounded-lg transition-all" title="Modifier">
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(doc.id)} className="p-2 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded-lg transition-all" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}