'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Truck, Mail, Phone, MapPin, Edit, Trash2, Building2 } from 'lucide-react'
import SupplierModal from '@/components/commercial/SupplierModal'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [tenantId, setTenantId] = useState('')

  useEffect(() => {
    const session = localStorage.getItem('bello_session')
    if (session) {
      const { tenantId } = JSON.parse(session)
      setTenantId(tenantId)
      fetchSuppliers(tenantId)
    }
  }, [])

  const fetchSuppliers = async (tid: string) => {
    try {
      const res = await fetch(`/api/commercial/suppliers?tenantId=${tid}`)
      const data = await res.json()
      setSuppliers(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer ce fournisseur ?')) {
      await fetch(`/api/commercial/suppliers/${id}`, { method: 'DELETE' })
      fetchSuppliers(tenantId)
    }
  }

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.matriculeFiscal?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto min-h-screen bg-transparent pt-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
           <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
              Fournisseurs
           </h1>
           <p className="text-zinc-500 mt-2 font-medium">Gestion des relations d'approvisionnement et partenaires achats.</p>
        </div>
        <button 
          onClick={() => { setSelectedSupplier(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-6 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl transition-all shadow-lg shadow-amber-600/20 font-black uppercase tracking-widest text-xs"
        >
          <Plus className="w-5 h-5" /> Nouveau Fournisseur
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative group max-w-md">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-400 transition-colors" />
        <input 
          placeholder="Rechercher par nom ou matricule..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 focus:border-amber-500/50 rounded-2xl pl-12 pr-4 py-4 text-white outline-none transition-all shadow-inner"
        />
      </div>

      <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-amber-500/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/50 bg-zinc-800/20">
                <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Fournisseur</th>
                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Matricule Fiscal</th>
                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ville</th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-zinc-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-zinc-500 font-bold uppercase tracking-widest text-xs">Chargement...</td></tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-zinc-500 font-bold uppercase tracking-widest text-xs">Aucun fournisseur trouvé</td></tr>
              ) : filteredSuppliers.map((sup) => (
                <tr key={sup.id} className="hover:bg-zinc-800/30 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-white border border-zinc-700/50 group-hover:border-amber-500/30 transition-all">
                          <Truck className="w-6 h-6 text-zinc-500 group-hover:text-amber-400" />
                       </div>
                       <div>
                          <p className="font-bold text-white tracking-tight text-base">{sup.name}</p>
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{sup.code}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 font-mono text-zinc-200 text-xs font-bold">{sup.matriculeFiscal || '---'}</td>
                  <td className="px-6 py-6">
                    <div className="space-y-1">
                       <p className="text-zinc-300 text-sm font-medium flex items-center gap-2"><Mail className="w-3 h-3 text-zinc-500" /> {sup.email || '---'}</p>
                       <p className="text-zinc-500 text-xs font-bold flex items-center gap-2"><Phone className="w-3 h-3 text-amber-500/50" /> {sup.phone || '---'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-zinc-400 text-sm font-medium">{sup.city || '---'}</td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => { setSelectedSupplier(sup); setIsModalOpen(true); }}
                        className="p-3 bg-zinc-800 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-400 rounded-xl transition-all"
                      >
                         <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(sup.id)}
                        className="p-3 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-xl transition-all"
                      >
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

      <SupplierModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchSuppliers(tenantId)}
        tenantId={tenantId}
        supplier={selectedSupplier}
      />
    </div>
  )
}
