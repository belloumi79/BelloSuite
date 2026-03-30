'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Building2, Users, Package, Settings, ChevronRight, 
  Plus, Search, MoreVertical, CheckCircle, XCircle, Edit, Trash2
} from 'lucide-react'

// Mock data - sera remplacé par les données Supabase
const mockTenants = [
  { id: '1', name: 'Société ABC', slug: 'abc-sarl', type: 'CLIENT', modules: 3, users: 12, isActive: true },
  { id: '2', name: 'Entreprise XYZ', slug: 'xyz-sa', type: 'CLIENT', modules: 5, users: 25, isActive: true },
  { id: '3', name: 'Comptoir Tunisien', slug: 'ct-sarl', type: 'CLIENT', modules: 2, users: 8, isActive: false },
]

const mockModules = [
  { id: '1', name: 'Gestion de Stock', slug: 'stock', price: 299, clients: 15, isActive: true },
  { id: '2', name: 'Module Commercial', slug: 'commercial', price: 399, clients: 12, isActive: true },
  { id: '3', name: 'Comptabilité', slug: 'comptabilite', price: 499, clients: 10, isActive: true },
  { id: '4', name: 'GRH', slug: 'grh', price: 349, clients: 8, isActive: true },
  { id: '5', name: 'GMAO', slug: 'gmao', price: 299, clients: 5, isActive: false },
  { id: '6', name: 'GPAO', slug: 'gpao', price: 599, clients: 3, isActive: true },
]

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<'clients' | 'modules'>('clients')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredTenants = mockTenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center font-bold text-white text-lg">
                BS
              </div>
              <div>
                <h1 className="text-white font-semibold">BelloSuite Admin</h1>
                <p className="text-slate-400 text-sm">belloumi.kkarim.professional@gmail.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-teal-500/20 text-teal-400 rounded-full text-sm font-medium">
                SUPER ADMIN
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard 
            icon={<Building2 className="w-6 h-6" />}
            label="Total Clients"
            value="24"
            trend="+3 ce mois"
            color="teal"
          />
          <StatCard 
            icon={<Users className="w-6 h-6" />}
            label="Utilisateurs"
            value="156"
            trend="+12 ce mois"
            color="blue"
          />
          <StatCard 
            icon={<Package className="w-6 h-6" />}
            label="Modules Actifs"
            value="5/6"
            trend="1 désactivé"
            color="amber"
          />
          <StatCard 
            icon={<CheckCircle className="w-6 h-6" />}
            label="MRR"
            value="8,450 TND"
            trend="+15%"
            color="emerald"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-800/50 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'clients'
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Clients
            </div>
          </button>
          <button
            onClick={() => setActiveTab('modules')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'modules'
                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Modules
            </div>
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'clients' ? 'Rechercher un client...' : 'Rechercher un module...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all"
            />
          </div>
          <button className="ml-4 px-5 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-teal-500/25 transition-all">
            <Plus className="w-5 h-5" />
            {activeTab === 'clients' ? 'Nouveau Client' : 'Nouveau Module'}
          </button>
        </div>

        {/* Content */}
        {activeTab === 'clients' ? (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Client</th>
                  <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Slug</th>
                  <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Modules</th>
                  <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Utilisateurs</th>
                  <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Statut</th>
                  <th className="text-right px-6 py-4 text-slate-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-semibold">
                          {tenant.name.charAt(0)}
                        </div>
                        <span className="text-white font-medium">{tenant.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-sm">{tenant.slug}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-teal-500/20 text-teal-400 rounded-full text-sm font-medium">
                        {tenant.modules} modules
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{tenant.users}</td>
                    <td className="px-6 py-4">
                      {tenant.isActive ? (
                        <span className="flex items-center gap-2 text-emerald-400">
                          <CheckCircle className="w-4 h-4" /> Actif
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-red-400">
                          <XCircle className="w-4 h-4" /> Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors">
                          <Edit className="w-4 h-4 text-slate-400" />
                        </button>
                        <button className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors">
                          <Settings className="w-4 h-4 text-slate-400" />
                        </button>
                        <button className="p-2 hover:bg-red-500/20 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockModules.map((module) => (
              <div key={module.id} className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 hover:border-teal-500/30 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Package className="w-6 h-6 text-teal-400" />
                  </div>
                  {module.isActive ? (
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                      Actif
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                      Inactif
                    </span>
                  )}
                </div>
                <h3 className="text-white font-semibold text-lg mb-1">{module.name}</h3>
                <p className="text-slate-400 text-sm mb-4">/{module.slug}</p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                  <div>
                    <span className="text-2xl font-bold text-white">{module.price} TND</span>
                    <span className="text-slate-400 text-sm">/mois</span>
                  </div>
                  <span className="text-slate-400 text-sm">{module.clients} clients</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors">
                    Modifier
                  </button>
                  <button className="flex-1 px-4 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded-xl text-sm font-medium transition-colors">
                    Voir Clients
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, trend, color }: { 
  icon: React.ReactNode
  label: string
  value: string
  trend: string
  color: 'teal' | 'blue' | 'amber' | 'emerald'
}) {
  const colors = {
    teal: 'from-teal-500/20 to-cyan-500/20 border-teal-500/30',
    blue: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
    amber: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
    emerald: 'from-emerald-500/20 to-green-500/20 border-emerald-500/30',
  }
  
  const iconColors = {
    teal: 'text-teal-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
  }

  return (
    <div className={`bg-gradient-to-br ${colors[color]} backdrop-blur-xl rounded-2xl p-6 border`}>
      <div className={`w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center mb-4 ${iconColors[color]}`}>
        {icon}
      </div>
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
      <p className="text-slate-400 text-sm mt-1">{trend}</p>
    </div>
  )
}
