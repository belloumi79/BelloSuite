import { getSuperAdminStats } from './actions'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function StatCard({ label, value, color, icon }: { label: string, value: string | number, color: string, icon: string }) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/20',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/20',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/20'
  }
  const icons: Record<string, string> = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400'
  }
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

function ModuleBadge({ moduleId, modules }: { moduleId: string, modules: any[] }) {
  const mod = modules.find(m => m.id === moduleId)
  if (!mod) return null
  const colors: Record<string, string> = {
    stock: 'bg-emerald-500/10 text-emerald-400',
    commercial: 'bg-blue-500/10 text-blue-400',
    accounting: 'bg-amber-500/10 text-amber-400',
    hr: 'bg-purple-500/10 text-purple-400',
    gmao: 'bg-orange-500/10 text-orange-400',
    gpao: 'bg-cyan-500/10 text-cyan-400'
  }
  const color = colors[mod.name] || 'bg-zinc-500/10 text-zinc-400'
  return <span className={`px-2 py-1 rounded-lg text-xs font-medium ${color}`}>{mod.displayName}</span>
}

export default async function SuperAdminDashboard() {
  let data
  try {
    data = await getSuperAdminStats()
  } catch (e) {
    redirect('/login')
  }

  const { stats, tenants, modules, recentUsers } = data
  const formatCurrency = (n: number) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 0 }).format(n)

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">BelloSuite</h1>
              <p className="text-xs text-zinc-500">Super Administration</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium transition-colors">
              ← Retour au site
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard label="Total Clients" value={stats.totalTenants} color="emerald" icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          <StatCard label="Utilisateurs" value={stats.totalUsers} color="blue" icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          <StatCard label="Modules Actifs" value={`${stats.activeModules}/${stats.totalModules}`} color="purple" icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          <StatCard label="MRR" value={formatCurrency(stats.mrr)} color="amber" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
            <p className="text-zinc-500 text-xs mb-1">Produits</p>
            <p className="text-2xl font-bold text-white">{stats.totalProducts}</p>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
            <p className="text-zinc-500 text-xs mb-1">Employés</p>
            <p className="text-2xl font-bold text-white">{stats.totalEmployees}</p>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
            <p className="text-zinc-500 text-xs mb-1">Factures</p>
            <p className="text-2xl font-bold text-white">{stats.totalInvoices}</p>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
            <p className="text-zinc-500 text-xs mb-1">Tenants actifs</p>
            <p className="text-2xl font-bold text-white">{tenants.filter(t => t.isActive).length}</p>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800/50 overflow-hidden mb-8">
          <div className="border-b border-zinc-800/50 p-4">
            <h2 className="text-lg font-semibold text-white">Gestion des Clients</h2>
            <p className="text-sm text-zinc-500">Tous les tenants inscrits sur la plateforme</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800/50">
                  <th className="px-6 py-4 font-medium">Entreprise</th>
                  <th className="px-6 py-4 font-medium">Slug</th>
                  <th className="px-6 py-4 font-medium">Modules</th>
                  <th className="px-6 py-4 font-medium">Utilisateurs</th>
                  <th className="px-6 py-4 font-medium">Inscription</th>
                  <th className="px-6 py-4 font-medium">Statut</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="text-sm hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                          <span className="text-white font-semibold">{tenant.name?.charAt(0) || 'C'}</span>
                        </div>
                        <span className="text-white font-medium">{tenant.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-zinc-400 font-mono text-xs">{tenant.subdomain}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {tenant.activeModuleIds.slice(0, 3).map(modId => (
                          <ModuleBadge key={modId} moduleId={modId} modules={modules} />
                        ))}
                        {tenant.activeModuleIds.length > 3 && (
                          <span className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded-lg text-xs">+{tenant.activeModuleIds.length - 3}</span>
                        )}
                        {tenant.activeModuleIds.length === 0 && (
                          <span className="px-2 py-1 bg-zinc-800 text-zinc-500 rounded-lg text-xs">Aucun</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium">{tenant.userCount} users</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-zinc-500 text-xs">{new Date(tenant.createdAt).toLocaleDateString('fr-FR')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${tenant.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {tenant.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link href={`/super-admin/tenant/${tenant.id}`} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors" title="Voir détails">
                          <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </Link>
                        <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors" title="Modifier">
                          <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                      Aucun client pour le moment
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800/50 overflow-hidden">
          <div className="border-b border-zinc-800/50 p-4">
            <h2 className="text-lg font-semibold text-white">Derniers Utilisateurs</h2>
            <p className="text-sm text-zinc-500">Inscriptions récentes sur la plateforme</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">{user.firstName?.charAt(0) || 'U'}{user.lastName?.charAt(0) || ''}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{user.firstName} {user.lastName}</p>
                    <p className="text-zinc-500 text-xs truncate">{user.email}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${user.role === 'SUPER_ADMIN' ? 'bg-red-500/10 text-red-400' : user.role === 'ADMIN' ? 'bg-amber-500/10 text-amber-400' : 'bg-zinc-700 text-zinc-300'}`}>
                    {user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'ADMIN' ? 'Admin' : 'User'}
                  </span>
                </div>
              ))}
              {recentUsers.length === 0 && (
                <p className="col-span-full text-center text-zinc-500 py-8">Aucun utilisateur pour le moment</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
