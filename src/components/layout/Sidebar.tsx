'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  BarChart3, 
  Package, 
  ShoppingCart, 
  Users, 
  LayoutDashboard, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Wallet,
  Wrench,
  Factory
} from 'lucide-react'
import { useState, useEffect } from 'react'

const modules = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { name: 'Stock', icon: Package, path: '/stock' },
  { name: 'Commercial', icon: ShoppingCart, path: '/commercial', disabled: true },
  { name: 'Comptabilité', icon: Wallet, path: '/accounting', disabled: true },
  { name: 'RH & Paie', icon: Users, path: '/hr', disabled: true },
  { name: 'GMAO', icon: Wrench, path: '/gmao', disabled: true },
  { name: 'GPAO', icon: Factory, path: '/gpao', disabled: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const session = localStorage.getItem('bello_session')
    if (session) {
      setUser(JSON.parse(session))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('bello_session')
    router.push('/login')
  }

  return (
    <aside 
      className={`bg-zinc-950 border-r border-zinc-800/50 flex flex-col transition-all duration-500 ease-in-out h-screen sticky top-0 z-[60] ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Brand */}
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left duration-500">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-white font-black text-xl">B</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">BelloSuite</h1>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Smart ERP</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <span className="text-white font-black text-xl">B</span>
          </div>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 transition-colors hidden sm:block"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
        {modules.map((module) => {
          const isActive = pathname === module.path
          return (
            <Link
              key={module.path}
              href={module.disabled ? '#' : module.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group relative overflow-hidden ${
                isActive 
                  ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_0_12px_rgba(52,211,153,0.1)]' 
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50'
              } ${module.disabled ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
            >
              {isActive && (
                <div className="absolute left-0 w-1.5 h-6 bg-emerald-500 rounded-full transition-all" />
              )}
              <module.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-emerald-400' : ''}`} />
              {!isCollapsed && (
                <span className="font-semibold text-sm tracking-wide grow animate-in fade-in slide-in-from-left duration-300">
                  {module.name}
                </span>
              )}
              {module.disabled && !isCollapsed && (
                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-bold">Pro</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer / User */}
      <div className="p-4 border-t border-zinc-800/50 space-y-4">
        {!isCollapsed && user && (
          <div className="bg-zinc-900/50 rounded-2xl p-4 animate-in fade-in slide-in-from-bottom duration-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-emerald-500/30 flex items-center justify-center overflow-hidden">
                 <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`} alt="Avatar" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{user.email?.split('@')[0]}</p>
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
