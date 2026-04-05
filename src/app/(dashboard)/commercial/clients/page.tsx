'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, User, Mail, Phone, MapPin, MoreVertical, Edit, Trash2, Building2 } from 'lucide-react'
import ClientModal from '@/components/commercial/ClientModal'

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [tenantId, setTenantId] = useState('')

  useEffect(() => {
    const session = localStorage.getItem('bello_session')
    if (session) {
      const { tenantId } = JSON.parse(session)
      setTenantId(tenantId)
      fetchClients(tenantId)
    }
  }, [])

  const fetchClients = async (tid: string) => {
    try {
      const res = await fetch(`/api/commercial/clients?tenantId=${tid}`)
      const data = await res.json()
      setClients(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer ce client ?')) {
      await fetch(`/api/commercial/clients/${id}`, { method: 'DELETE' })
      fetchClients(tenantId)
    }
  }

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.matriculeFiscal?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto min-h-screen bg-transparent pt-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
           <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
              Fichier Clients
           </h1>
           <p className="text-zinc-500 mt-2 font-medium">Bases de données des partenaires commerciaux tunisiens.</p>
        </div>
        <button 
          onClick={() => { setSelectedClient(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition-all shadow-lg shadow-emerald-600/20 font-black uppercase tracking-widest text-xs"
        >
          <Plus className="w-5 h-5" /> Nouveau Client
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative group max-w-md">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
        <input 
          placeholder="Rechercher par nom ou matricule..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 focus:border-emerald-500/50 rounded-2xl pl-12 pr-4 py-4 text-white outline-none transition-all shadow-inner"
        />
      </div>

      {/* Clients Grid/Table Area */}
      <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-emerald-500/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/50 bg-zinc-800/20">
                <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Client</th>
                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Matricule Fiscal</th>
                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Localisation</th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-zinc-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-zinc-500 font-bold uppercase tracking-widest text-xs">Chargement des données...</td></tr>
              ) : filteredClients.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-zinc-500 font-bold uppercase tracking-widest text-xs">Aucun client trouvé</td></tr>
              ) : filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-zinc-800/30 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-white border border-zinc-700/50 group-hover:border-emerald-500/30 transition-all">
                          <Building2 className="w-6 h-6 text-zinc-500 group-hover:text-emerald-400" />
                       </div>
                       <div>
                          <p className="font-bold text-white tracking-tight text-base">{client.name}</p>
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{client.code}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 font-mono text-zinc-200 text-xs font-bold">{client.matriculeFiscal || 'Non spécifié'}</td>
                  <td className="px-6 py-6">
                    <div className="space-y-1">
                       <p className="text-zinc-300 text-sm font-medium flex items-center gap-2"><Mail className="w-3 h-3 text-zinc-500" /> {client.email || '---'}</p>
                       <p className="text-zinc-500 text-xs font-bold flex items-center gap-2"><Phone className="w-3 h-3 text-emerald-500/50" /> {client.phone || '---'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2">
                       <MapPin className="w-4 h-4 text-emerald-500/30" />
                       <span className="text-zinc-400 text-sm font-medium">{client.city || 'Tunis'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => { setSelectedClient(client); setIsModalOpen(true); }}
                        className="p-3 bg-zinc-800 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 rounded-xl transition-all"
                      >
                         <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(client.id)}
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

      <ClientModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchClients(tenantId)}
        tenantId={tenantId}
        client={selectedClient}
      />
    </div>
  )
}
