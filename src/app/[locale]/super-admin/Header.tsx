'use client'

import { useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, Activity, Users, Building2, LayoutGrid, LogOut, ChevronLeft, ArrowLeft } from 'lucide-react'
import gsap from 'gsap'

export default function Header({ title, subtitle }: { title: string, subtitle: string }) {
  const headerRef = useRef(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    gsap.fromTo(headerRef.current, 
      { y: -50, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 1, ease: 'expo.out' }
    )
  }, [])

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => window.location.reload())
    router.push('/login')
  }

  const navItems = [
    { label: 'Vue d\'ensemble', path: '/super-admin', icon: Activity },
    { label: 'Clients', path: '/super-admin', icon: Building2 }, // Multiple paths pointing to same page for now
    { label: 'Utilisateurs', path: '/super-admin/users', icon: Users },
    { label: 'Modules', path: '/super-admin', icon: LayoutGrid },
  ]

  return (
    <header ref={headerRef} className="relative z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-2xl">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/20">
            <span className="text-white font-black text-2xl">B</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
               {pathname !== '/super-admin' && (
                  <button onClick={() => router.back()} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all mr-1">
                     <ArrowLeft className="w-4 h-4" />
                  </button>
               )}
               <h1 className="text-2xl font-black text-white tracking-tight">{title}</h1>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-0.5">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
           {/* Desktop Nav */}
           <nav className="hidden lg:flex items-center gap-2">
              {navItems.map(item => {
                const isActive = pathname === item.path
                return (
                  <Link 
                    key={item.label}
                    href={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                       isActive 
                       ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                       : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                )
              })}
           </nav>

           <div className="h-8 w-px bg-zinc-800/50 hidden lg:block" />

           <div className="flex items-center gap-4">
              <button 
                onClick={handleLogout}
                className="p-3 bg-zinc-900 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-2xl border border-zinc-800 hover:border-red-500/20 shadow-lg shadow-black/20 transition-all active:scale-95"
                title="Déconnexion"
              >
                 <LogOut className="w-5 h-5" />
              </button>
              <button className="p-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
                 <Plus className="w-6 h-6" />
              </button>
           </div>
        </div>
      </div>
    </header>
  )
}
