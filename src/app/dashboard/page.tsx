'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

const MODULES = [
  { name: 'Stock', icon: '📦', href: '/stock', color: 'emerald' },
  { name: 'Commercial', icon: '💼', href: '/commercial', color: 'blue' },
  { name: 'Comptabilité', icon: '📊', href: '/accounting', color: 'purple' },
  { name: 'GRH', icon: '👥', href: '/hr', color: 'orange' },
  { name: 'Paie', icon: '💰', href: '/payroll', color: 'green' },
  { name: 'GMAO', icon: '🔧', href: '/maintenance', color: 'red' },
  { name: 'GPAO', icon: '🏭', href: '/production', color: 'yellow' },
  { name: 'GQAO', icon: '✅', href: '/quality', color: 'cyan' },
]

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)
      setLoading(false)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">
              Bello<span className="text-emerald-400">Suite</span>
            </h1>
            <p className="text-sm text-zinc-400">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Tableau de bord</h2>
          <p className="text-zinc-400">Sélectionnez un module pour commencer</p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {MODULES.map((module) => (
            <Link
              key={module.name}
              href={module.href}
              className="group bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-emerald-500/50 hover:bg-zinc-800/50 transition-all"
            >
              <div className="text-4xl mb-3">{module.icon}</div>
              <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">
                {module.name}
              </h3>
              <p className="text-sm text-zinc-500 mt-1">Accéder au module →</p>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <p className="text-sm text-zinc-400 mb-1">Utilisateurs actifs</p>
            <p className="text-3xl font-bold text-white">1</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <p className="text-sm text-zinc-400 mb-1">Modules actifs</p>
            <p className="text-3xl font-bold text-white">8</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <p className="text-sm text-zinc-400 mb-1">Statut</p>
            <p className="text-xl font-bold text-emerald-400">Opérationnel</p>
          </div>
        </div>
      </main>
    </div>
  )
}
