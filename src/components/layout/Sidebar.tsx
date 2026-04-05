'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Package,
  ShoppingCart,
  Users,
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Wrench,
  Factory,
  Lock,
  BarChart3
} from 'lucide-react'

// The master module registry — keys MUST match the `name` field in the Module table.
const MODULE_REGISTRY: Record<string, { name: string; icon: any; path: string; alwaysVisible?: boolean }> = {
  dashboard:   { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', alwaysVisible: true },
  stock:       { name: 'Stock', icon: Package, path: '/stock' },
  commercial:  { name: 'Commercial', icon: ShoppingCart, path: '/commercial' },
  accounting:  { name: 'Comptabilité', icon: Wallet, path: '/accounting/chart' },
  hr:          { name: 'RH & Paie', icon: Users, path: '/hr' },
  gmao:        { name: 'GMAO', icon: Wrench, path: '/gmao' },
  gpao:        { name: 'GPAO', icon: Factory, path: '/gpao' },
}

// Display order in the sidebar (must match MODULE_REGISTRY keys)
const MODULE_ORDER = ['dashboard', 'stock', 'commercial', 'accounting', 'hr', 'gmao', 'gpao']

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [enabledModuleNames, setEnabledModuleNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = localStorage.getItem('bello_session')
    if (!session) return

    const parsed = JSON.parse(session)
    setUser(parsed)

    const tenantId = parsed.tenantId
    if (!tenantId) {
      setLoading(false)
      return
    }

    fetch(`/api/tenant/modules?tenantId=${tenantId}`)
      .then(r => r.json())
      .then((names: string[]) => {
        setEnabledModuleNames(names)
      })
      .catch(() => setEnabledModuleNames([]))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('bello_session')
    router.push('/login')
  }

  // Build the final list: always show 'dashboard' + only tenant's active modules
  const sidebarItems = MODULE_ORDER.map(key => {
    const config = MODULE_REGISTRY[key]
    const isEnabled = config.alwaysVisible || enabledModuleNames.includes(key)
    return { ...config, key, isEnabled }
  }).filter(m => m.isEnabled || m.alwaysVisible === true)

  // Items NOT enabled = locked (shown greyed out with a lock)
  const lockedItems = MODULE_ORDER
    .filter(key => !MODULE_REGISTRY[key].alwaysVisible && !enabledModuleNames.includes(key))
    .map(key => MODULE_REGISTRY[key])

  return (
    <aside
      className={`bg-zinc-950 border-r border-zinc-800/50 flex flex-col transition-all duration-500 ease-in-out h-screen sticky top-0 z-[60] ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Brand */}
      <div className="p-6 flex items-center justify-between shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left duration-500">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <span className="text-white font-black text-xl">B</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">BelloSuite</h1>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Smart ERP</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mx-auto shadow-lg shadow-teal-500/20">
            <span className="text-white font-black text-xl">B</span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 transition-colors hidden sm:block ml-2"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {loading ? (
          // Skeleton while loading
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`h-12 bg-zinc-900 rounded-2xl animate-pulse opacity-30 ${isCollapsed ? 'w-12 mx-auto' : ''}`} />
          ))
        ) : (
          <>
            {/* Enabled modules */}
            {sidebarItems.map((module) => {
              const isActive = pathname === module.path || (module.path !== '/dashboard' && pathname.startsWith(module.path))
              return (
                <Link
                  key={module.key}
                  href={module.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group relative overflow-hidden ${
                    isActive
                      ? 'bg-teal-500/10 text-teal-400 shadow-[inset_0_0_12px_rgba(20,184,166,0.1)]'
                      : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 w-1.5 h-6 bg-teal-500 rounded-r-full transition-all" />
                  )}
                  <module.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-teal-400' : ''}`} />
                  {!isCollapsed && (
                    <span className="font-semibold text-sm tracking-wide grow animate-in fade-in slide-in-from-left duration-300">
                      {module.name}
                    </span>
                  )}
                </Link>
              )
            })}

            {/* Separator + locked modules */}
            {lockedItems.length > 0 && !isCollapsed && (
              <div className="pt-3">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-700 px-4 mb-2">Non abonné</p>
                {lockedItems.map((module) => (
                  <div
                    key={module.path}
                    title={`Module ${module.name} — Non activé`}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-zinc-700 opacity-50 cursor-not-allowed select-none"
                  >
                    <module.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-semibold text-sm tracking-wide grow">{module.name}</span>
                    <Lock className="w-3 h-3 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
            {isCollapsed && lockedItems.length > 0 && (
              <div className="pt-2 border-t border-zinc-800/30 mt-2 space-y-1">
                {lockedItems.map((module) => (
                  <div
                    key={module.path}
                    title={`${module.name} — Non activé`}
                    className="flex items-center justify-center p-3 rounded-2xl text-zinc-800 cursor-not-allowed"
                  >
                    <module.icon className="w-5 h-5" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </nav>

      {/* Footer / User */}
      <div className="p-4 border-t border-zinc-800/50 space-y-4 shrink-0">
        {!isCollapsed && user && (
          <div className="bg-zinc-900/50 rounded-2xl p-4 animate-in fade-in slide-in-from-bottom duration-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-teal-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`} alt="Avatar" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{user.firstName || user.email?.split('@')[0]}</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">{user.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 rounded-xl transition-all font-bold text-xs"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        )}
        {isCollapsed && (
          <button
            onClick={handleLogout}
            className="w-10 h-10 mx-auto flex items-center justify-center bg-zinc-900 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  )
}
