'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import gsap from 'gsap'
import { 
  Users, 
  Building2, 
  LayoutGrid, 
  TrendingUp, 
  ShieldCheck, 
  Search, 
  Filter, 
  ChevronRight, 
  MoreVertical,
  Activity,
  Globe,
  Plus,
  Mail,
  Zap,
  Settings2
} from 'lucide-react'
import ModuleManagementModal from '@/components/super-admin/ModuleManagementModal'
import { getSuperAdminStats } from './actions'
import Header from './Header'

// Sub-components for better organization
function StatCard({ label, value, trend, icon: Icon, color, delay }: any) {
  const cardRef = useRef(null)

  useEffect(() => {
    gsap.fromTo(cardRef.current, 
      { y: 20, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.8, delay, ease: 'back.out(1.7)' }
    )
  }, [delay])

  return (
    <div ref={cardRef} className="bg-zinc-900/40 backdrop-blur-xl rounded-[2rem] p-6 border border-zinc-800/50 hover:border-emerald-500/30 transition-all group overflow-hidden relative">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-${color}-500/10 transition-all`} />
      <div className="flex justify-between items-start relative z-10">
        <div className={`p-3 rounded-2xl bg-${color}-500/10 border border-${color}-500/20`}>
          <Icon className={`w-6 h-6 text-${color}-400`} />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full uppercase">
            +{trend}% <TrendingUp className="w-3 h-3" />
          </span>
        )}
      </div>
      <div className="mt-6 relative z-10">
        <p className="text-3xl font-black text-white tracking-tight">{value}</p>
        <p className="text-sm font-bold text-zinc-500 mt-1 uppercase tracking-widest">{label}</p>
      </div>
    </div>
  )
}

function TenantRow({ tenant, index, onAction }: any) {
  const rowRef = useRef(null)

  useEffect(() => {
    gsap.fromTo(rowRef.current, 
      { x: -20, opacity: 0 }, 
      { x: 0, opacity: 1, duration: 0.5, delay: 0.2 + index * 0.05, ease: 'power2.out' }
    )
  }, [index])

  return (
    <tr ref={rowRef} className="group hover:bg-white/5 transition-all">
      <td className="px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-white font-black text-lg shadow-lg border border-zinc-600/30 group-hover:scale-110 transition-transform">
            {tenant.name.charAt(0)}
          </div>
          <div>
            <p className="text-white font-bold tracking-tight">{tenant.name}</p>
            <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase font-black">
              <Globe className="w-3 h-3 text-emerald-500" />
              {tenant.subdomain}.bellosuite.tn
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-1.5">
          {tenant.activeModuleIds.map((mid: string, i: number) => (
             <div key={mid} className={`w-2 h-2 rounded-full bg-${i % 2 === 0 ? 'emerald' : 'blue'}-500 shadow-sm shadow-${i % 2 === 0 ? 'emerald' : 'blue'}-500/50`} />
          ))}
          <span className="text-xs font-bold text-zinc-400 ml-1">{tenant.activeModuleIds.length} Modules</span>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-3">
             {[1,2,3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-zinc-950 bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                  U
                </div>
             ))}
          </div>
          <span className="text-xs font-black text-zinc-500">+{tenant.userCount}</span>
        </div>
      </td>
      <td className="px-6 py-5">
        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter ${
          tenant.isActive 
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
          : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {tenant.isActive ? 'Actif' : 'Inactif'}
        </span>
      </td>
      <td className="px-6 py-5 text-right">
        <div className="flex items-center justify-end gap-2">
           <button 
             onClick={() => onAction(tenant)}
             className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-all hover:text-emerald-500 border border-transparent hover:border-zinc-700 font-bold text-[10px] flex items-center gap-2 uppercase tracking-tighter"
           >
             <Settings2 className="w-4 h-4" />
             Modules
           </button>
           <button className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-all hover:text-white border border-transparent hover:border-zinc-700">
             <MoreVertical className="w-5 h-5" />
           </button>
        </div>
      </td>
    </tr>
  )
}

export default function SuperAdminDashboardClient({ stats: initialStats, initialTenants, initialUsers, modules }: any) {
  const [search, setSearch] = useState('')
  const [tenants, setTenants] = useState(initialTenants)
  const [stats, setStats] = useState(initialStats)
  const [selectedTenant, setSelectedTenant] = useState<any>(null)
  const [isModuleModalOpen, setModuleModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const headerRef = useRef(null)

  const refreshData = async () => {
    try {
      const data = await getSuperAdminStats()
      setTenants(data.tenants)
      setStats(data.stats)
    } catch (e) {
      console.error(e)
    }
  }

  const handleOpenModules = (tenant: any) => {
    setSelectedTenant(tenant)
    setModuleModalOpen(true)
  }

  useEffect(() => {
    gsap.fromTo(headerRef.current, { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out' })
  }, [])

  const filteredTenants = tenants.filter((t: any) => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.subdomain.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-stone-100 selection:bg-emerald-500/20">
      {/* Glow effect */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-emerald-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <Header title="Super Admin" subtitle="Control Panel v2.0" />

      <main className="max-w-7xl mx-auto px-8 py-10 relative z-10">
        
        {/* Page title & Description */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
               <Activity className="w-5 h-5 text-emerald-500" />
               <span className="text-xs font-black uppercase tracking-widest text-emerald-500/80">Real-time Analytics</span>
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter">Performance Hub</h2>
            <p className="text-zinc-500 font-medium mt-2 max-w-md">Overview of all active tenants, revenue metrics and infrastructure health for the Tunisian SME market.</p>
          </div>
          <div className="flex gap-3">
             <button className="px-6 py-3 bg-zinc-900 rounded-2xl border border-zinc-800 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">Export Report</button>
             <button className="px-6 py-3 bg-white text-zinc-950 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-50 transition-all">New Client</button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <StatCard label="Active Clients" value={stats.totalTenants} trend={12} icon={Building2} color="emerald" delay={0.1} />
          <StatCard label="Avg Revenue (MRR)" value={new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(stats.mrr)} trend={8} icon={TrendingUp} color="blue" delay={0.2} />
          <StatCard label="Total Users" value={stats.totalUsers} trend={24} icon={Users} color="purple" delay={0.3} />
          <StatCard label="Modules Deployed" value={stats.activeModules} icon={Zap} color="amber" delay={0.4} />
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Tenant List Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-black text-white tracking-tight">Active Tenants</h3>
              <div className="flex items-center gap-4">
                 <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input 
                      type="text" 
                      placeholder="Filter enterprises..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-white outline-none focus:border-emerald-500 transition-all"
                    />
                 </div>
                 <button className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all">
                    <Filter className="w-4 h-4" />
                 </button>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-zinc-800/30 text-left">
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Enterprise</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Inventory / Apps</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Population</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Health</th>
                    <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredTenants.map((t: any, i: number) => (
                    <TenantRow key={t.id} tenant={t} index={i} onAction={handleOpenModules} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side Panels */}
          <div className="space-y-8">
            
            {/* System Status */}
            <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 rounded-[2.5rem] border border-emerald-500/20 p-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
               </div>
               <h3 className="text-xl font-black text-white mb-2">Systems Online</h3>
               <p className="text-emerald-100 text-sm font-medium mb-6">Database, Auth and Edge functions are performing optimally in EU-WEST (Supabase).</p>
               <div className="space-y-4">
                 {[
                   { label: 'DB Latency', value: '12ms', progress: 95 },
                   { label: 'Cloud API', value: 'Healthy', progress: 100 },
                   { label: 'Storage', value: '45.2 GB', progress: 30 }
                 ].map(s => (
                    <div key={s.label}>
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-emerald-200/50 mb-1.5">
                        <span>{s.label}</span>
                        <span>{s.value}</span>
                      </div>
                      <div className="h-1 bg-emerald-950 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${s.progress}%` }} />
                      </div>
                    </div>
                 ))}
               </div>
            </div>

            {/* Recent Users Activity */}
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] p-8">
               <h3 className="text-xl font-black text-white mb-6">Recent Signups</h3>
               <div className="space-y-6">
                  {initialUsers.slice(0, 5).map((u: any) => (
                    <div key={u.id} className="flex items-center gap-4 group cursor-pointer">
                       <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-zinc-700/50 flex items-center justify-center text-[10px] font-black text-white group-hover:border-emerald-500 transition-all">
                          {u.firstName.charAt(0)}
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{u.firstName} {u.lastName}</p>
                          <p className="text-[10px] text-zinc-500 font-medium truncate">{u.email}</p>
                       </div>
                       <div className="text-[10px] font-black text-zinc-600 group-hover:text-emerald-500 transition-all uppercase">
                          {new Date(u.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                       </div>
                    </div>
                  ))}
               </div>
               <button className="w-full mt-8 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all">View All Users</button>
            </div>

          </div>

        </div>

      </main>

      <ModuleManagementModal 
        isOpen={isModuleModalOpen}
        onClose={() => {
          setModuleModalOpen(false)
          setSelectedTenant(null)
        }}
        tenant={selectedTenant}
        allModules={modules}
        onUpdate={refreshData}
      />
    </div>
  )
}
