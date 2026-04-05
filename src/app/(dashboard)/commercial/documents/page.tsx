'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, FileText, Calendar, User, Download, ExternalLink, Printer, FileCode } from 'lucide-react'
import Link from 'next/link'
import { generateTEIFXml as generateTEIF } from '@/lib/teif-generator'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [tenantId, setTenantId] = useState('')

  useEffect(() => {
    const session = localStorage.getItem('bello_session')
    if (session) {
      const { tenantId } = JSON.parse(session)
      setTenantId(tenantId)
      fetchInvoices(tenantId)
    }
  }, [])

  const fetchInvoices = async (tid: string) => {
    try {
      const res = await fetch(`/api/commercial/invoices?tenantId=${tid}`)
      const data = await res.json()
      setInvoices(data)
    } catch (error) {
       console.error(error)
    } finally {
       setLoading(false)
    }
  }

  const exportTEIF = (inv: any) => {
    const xml = generateTEIF({
      invoiceNumber: inv.number,
      issueDate: new Date(inv.date).toISOString().split('T')[0],
      tenant: {
        name: inv.tenant.name,
        matriculeFiscal: inv.tenant.matriculeFiscal || '---',
        address: inv.tenant.address || '',
        city: inv.tenant.city || '',
        zipCode: inv.tenant.zipCode || '',
      },
      client: {
        name: inv.client.name,
        matriculeFiscal: inv.client.matriculeFiscal || '---',
        address: inv.client.address || '',
        city: inv.client.city || '',
      },
      items: inv.items,
      totals: {
        subtotalHT: Number(inv.subtotalHT),
        totalFodec: Number(inv.totalFodec),
        totalVAT: Number(inv.totalVAT),
        timbreFiscal: Number(inv.timbreFiscal),
        totalTTC: Number(inv.totalTTC),
        vatSummary: inv.vatSummary as any,
      }
    })

    const blob = new Blob([xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${inv.number}_TEIF.xml`
    a.click()
  }

  const filteredInvoices = Array.isArray(invoices) ? invoices.filter(inv => 
    inv.number.toLowerCase().includes(searchTerm.toLowerCase()) || 
    inv.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : []

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto min-h-screen bg-transparent pt-0 text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
           <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
              Facturation 🇹🇳
           </h1>
           <p className="text-zinc-500 mt-2 font-medium uppercase tracking-widest text-[10px] font-bold">Standard TEIF 1.8.8 / Loi de Finance 2024</p>
        </div>
        <Link 
          href="/commercial/invoices/new"
          className="flex items-center gap-2 px-6 py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl transition-all shadow-lg shadow-teal-600/20 font-black uppercase tracking-widest text-xs"
        >
          <Plus className="w-5 h-5" /> Nouvelle Facture
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative group max-w-md">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-teal-400 transition-colors" />
        <input 
          placeholder="Rechercher par numéro ou client..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 focus:border-teal-500/50 rounded-2xl pl-12 pr-4 py-4 text-white outline-none transition-all shadow-inner"
        />
      </div>

      {/* Invoices List */}
      <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-teal-500/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/50 bg-zinc-800/20">
                <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Facture</th>
                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Client</th>
                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Date / Échéance</th>
                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Total TTC</th>
                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Statut</th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-zinc-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {loading ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-zinc-500 font-bold uppercase tracking-widest text-xs">Chargement des factures...</td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-zinc-500 font-bold uppercase tracking-widest text-xs">Aucune facture enregistrée</td></tr>
              ) : filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-zinc-800/30 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center border border-zinc-700/50 group-hover:border-teal-500/30 transition-all">
                          <FileText className="w-6 h-6 text-zinc-500 group-hover:text-teal-400" />
                       </div>
                       <div>
                          <p className="font-bold text-white tracking-tight text-base font-mono uppercase">{inv.number}</p>
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Vente HT: {Number(inv.subtotalHT).toFixed(3)} DT</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2">
                       <User className="w-4 h-4 text-zinc-500" />
                       <span className="text-zinc-300 text-sm font-medium">{inv.client?.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-1">
                       <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold">
                          <Calendar className="w-3 h-3 text-zinc-600" />
                          {new Date(inv.date).toLocaleDateString()}
                       </div>
                       {inv.dueDate && (
                          <div className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">Éch: {new Date(inv.dueDate).toLocaleDateString()}</div>
                       )}
                    </div>
                  </td>
                  <td className="px-6 py-6 text-right">
                     <p className="text-sm font-black text-white tracking-wider">{Number(inv.totalTTC).toFixed(3)} DT</p>
                     <p className="text-[9px] text-zinc-500 font-bold">TVA incl: {Number(inv.totalVAT).toFixed(3)} DT</p>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                      inv.status === 'DRAFT' ? 'bg-zinc-800/80 text-zinc-500 border border-zinc-700' :
                      'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => exportTEIF(inv)}
                        className="p-3 bg-zinc-800 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 rounded-xl transition-all"
                        title="Exporter TEIF XML (TTN)"
                      >
                         <FileCode className="w-4 h-4" />
                      </button>
                      <button className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all"><Download className="w-4 h-4" /></button>
                      <button className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all"><Printer className="w-4 h-4" /></button>
                      <Link href={`/commercial/invoices/${inv.id}`} className="p-3 bg-zinc-800 hover:bg-teal-500/20 text-zinc-400 hover:text-teal-400 rounded-xl transition-all"><ExternalLink className="w-4 h-4" /></Link>
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
