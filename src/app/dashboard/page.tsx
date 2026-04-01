'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const sessionData = localStorage.getItem('bello_session')
    if (!sessionData) {
      router.push('/login')
      return
    }
    try {
      const session = JSON.parse(sessionData)
      if (session.role === 'SUPER_ADMIN') {
        router.push('/super-admin')
        return
      }
      setUser(session)
    } catch {
      localStorage.removeItem('bello_session')
      router.push('/login')
    }
  }, [router])

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Chargement...</div>
      </div>
    )
  }

  const handleLogout = () => {
    localStorage.removeItem('bello_session')
    router.push('/login')
  }

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
              <p className="text-xs text-zinc-500">Tableau de bord</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">{user.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-white mb-8">Bienvenue, {user.email} !</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">📦 Gestion de Stock</h3>
            <p className="text-zinc-400 text-sm mb-4">Gérez votre inventaire et mouvements de stock.</p>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm">Bientôt disponible</span>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">💼 Module Commercial</h3>
            <p className="text-zinc-400 text-sm mb-4">Gérez vos clients, devis, factures et commandes.</p>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm">Bientôt disponible</span>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">💰 Comptabilité</h3>
            <p className="text-zinc-400 text-sm mb-4">Tenez vos livres comptables à jour.</p>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm">Bientôt disponible</span>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">👥 GRH & Paie</h3>
            <p className="text-zinc-400 text-sm mb-4">Gestion des employés et bulletins de paie.</p>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm">Bientôt disponible</span>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">🔧 GMAO</h3>
            <p className="text-zinc-400 text-sm mb-4">Maintenance des équipements et ordres de travail.</p>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm">Bientôt disponible</span>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">🏭 GPAO</h3>
            <p className="text-zinc-400 text-sm mb-4">Planification et contrôle de la production.</p>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm">Bientôt disponible</span>
          </div>
        </div>
      </main>
    </div>
  )
}
