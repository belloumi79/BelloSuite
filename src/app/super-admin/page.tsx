'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
export default function SuperAdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState({ totalClients: 0, totalUsers: 0, activeModules: 0, totalModules: 6, mrr: 0 })
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetchData() }, [])
  async function fetchData() {
    try {
      const { data: tenantsData } = await supabase.from('tenant').select('*').order('created_at', { ascending: false })
      const { data: modulesData } = await supabase.from('module').select('*')
      const { count: usersCount } = await supabase.from('user').select('*', { count: 'exact', head: true })
      const { data: tenantModulesData } = await supabase.from('tenant_module').select('*, module:module(*)')
      setTenants(tenantsData || [])
      const activeModuleIds = new Set((tenantModulesData || []).filter((tm: any) => tm.is_enabled).map((tm: any) => tm.module_id))
      let mrr = 0
      for (const tm of (tenantModulesData || []) as any[]) { if (tm.is_enabled && tm.module) mrr += tm.module.monthly_price || 0 }
      setStats({ totalClients: tenantsData?.length || 0, totalUsers: usersCount || 0, activeModules: activeModuleIds.size, totalModules: modulesData?.length || 6, mrr })
    } catch (error) { console.error('Error:', error) } finally { setLoading(false) }
  }
  async function handleLogout() { await supabase.auth.signOut(); router.push('/login') }
  const formatCurrency = (n: number) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 0 }).format(n)
  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="animate-pulse text-zinc-400">Chargement...</div></div>
  const defaultModules = [
    { name: 'stock', display_name: 'Gestion de Stock', monthly_price: 99 },
    { name: 'commercial', display_name: 'Module Commercial', monthly_price: 149 },
    { name: 'accounting', display_name: 'Comptabilite', monthly_price: 199 },
    { name: 'hr', display_name: 'GRH & Paie', monthly_price: 179 },
    { name: 'gmao', display_name: 'GMAO', monthly_price: 129 },
    { name: 'gpao', display_name: 'GPAO', monthly_price: 249 },
  ]
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center"><span className="text-white font-bold text-lg">B</span></div>
            <div><h1 className="text-xl font-semibold text-white">BelloSuite</h1><p className="text-xs text-zinc-500">Administration</p></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">belloumi.kkarim.professional@gmail.com</span>
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center"><span className="text-emerald-400 text-sm font-medium">BK</span></div>
            <button onClick={handleLogout} className="ml-4 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Deconnexion
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard label="Total Clients" value={stats.totalClients} color="emerald" icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          <StatCard label="Utilisateurs" value={stats.totalUsers} color="blue" icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          <StatCard label="Modules Actifs" value={`${stats.activeModules}/${stats.totalModules}`} color="purple" icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          <StatCard label="MRR" value={formatCurrency(stats.mrr)} color="amber" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </div>
        <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800/50 overflow-hidden">
          <div className="border-b border-zinc-800/50 p-4 flex gap-1">
            <button className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm font-medium">Clients</button>
            <button className="px-4 py-2 rounded-lg text-zinc-400 text-sm font-medium hover:bg-zinc-800/50">Modules</button>
            <button className="px-4 py-2 rounded-lg text-zinc-400 text-sm font-medium hover:bg-zinc-800/50">Parametres</button>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-semibold text-white">Gestion des Clients</h2></div>
            <table className="w-full">
              <thead><tr className="text-left text-xs text-zinc-500 uppercase tracking-wider mb-4"><th className="pb-4 font-medium">Entreprise</th><th className="pb-4 font-medium">Slug</th><th className="pb-4 font-medium">Modules</th><th className="pb-4 font-medium">Utilisateurs</th><th className="pb-4 font-medium">Statut</th><th className="pb-4 font-medium">Actions</th></tr></thead>
              <tbody className="divide-y divide-zinc-800/50">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="text-sm">
                    <td className="py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center"><span className="text-white font-semibold">{tenant.name?.charAt(0) || 'C'}</span></div><span className="text-white font-medium">{tenant.name}</span></div></td>
                    <td className="py-4 text-zinc-400 font-mono text-xs">{tenant.subdomain}</td>
                    <td className="py-4"><span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded-lg text-xs font-medium">{stats.activeModules} modules</span></td>
                    <td className="py-4"><span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium">{Math.floor(Math.random() * 20) + 5} users</span></td>
                    <td className="py-4"><span className={`px-2 py-1 rounded-lg text-xs font-medium ${tenant.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{tenant.is_active ? 'Actif' : 'Inactif'}</span></td>
                    <td className="py-4"><button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"><svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button></td>
                  </tr>
                ))}
                {tenants.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-zinc-500">Aucun client pour le moment</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-6">Modules Disponibles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {defaultModules.map((mod, i) => (
              <div key={mod.name} className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-6 hover:border-zinc-700/50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${i % 2 === 0 ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
                    <span className={`text-xl ${i % 2 === 0 ? 'text-emerald-400' : 'text-blue-400'}`}>{mod.name === 'stock' ? '📦' : mod.name === 'commercial' ? '💼' : mod.name === 'accounting' ? '💰' : mod.name === 'hr' ? '👥' : mod.name === 'gmao' ? '🔧' : '🏭'}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${i < 4 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>{i < 4 ? 'Actif' : 'Inactif'}</span>
                </div>
                <h3 className="text-white font-semibold mb-1">{mod.display_name}</h3>
                <p className="text-zinc-500 text-sm mb-4">Module</p>
                <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                  <div><p className="text-2xl font-bold text-white">{mod.monthly_price} TND</p><p className="text-zinc-500 text-xs">/mois</p></div>
                  <div className="text-right"><p className="text-white font-medium">{Math.floor(Math.random() * 15) + 1}</p><p className="text-zinc-500 text-xs">clients</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
function StatCard({ label, value, color, icon }: { label: string, value: string | number, color: string, icon: string }) {
  const colors: Record<string, string> = { emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20', blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/20', purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/20', amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/20' }
  const icons: Record<string, string> = { emerald: 'text-emerald-400', blue: 'text-blue-400', purple: 'text-purple-400', amber: 'text-amber-400' }
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-6 border backdrop-blur-xl`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-zinc-400 text-sm">{label}</span>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color].split(' ')[0]} flex items-center justify-center`}>
          <svg className={`w-5 h-5 ${icons[color]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} /></svg>
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  )
}
