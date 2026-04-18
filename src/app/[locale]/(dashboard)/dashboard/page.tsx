'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, Link } from '@/i18n/routing'
import { useTranslations, useLocale } from 'next-intl'
import { 
  Package, 
  ShoppingCart, 
  Wallet, 
  Users, 
  Wrench, 
  Factory,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Target
} from 'lucide-react'
import { RealtimeDashboard } from '@/components/ui/RealtimeDashboard'

export default function DashboardSummary() {
  const t = useTranslations()
  const locale = useLocale()
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
      setUser(session)
    } catch {
      localStorage.removeItem('bello_session')
      router.push('/login')
    }
  }, [router])

  if (!user) return null

  const modules = [
    { 
      name: t('Home.modules.stock.title'), 
      icon: Package, 
      path: '/stock', 
      color: 'emerald', 
      description: t('Home.modules.stock.desc'),
      stats: '150 ' + t('Dashboard.items')
    },
    { 
      name: t('Home.modules.commercial.title'), 
      icon: ShoppingCart, 
      path: '/commercial', 
      color: 'amber', 
      description: t('Home.modules.commercial.desc'),
      stats: t('Dashboard.soon'),
      disabled: true
    },
    { 
      name: t('Home.modules.accounting.title'), 
      icon: Wallet, 
      path: '/accounting', 
      color: 'purple', 
      description: t('Home.modules.accounting.desc'),
      stats: t('Dashboard.soon'),
      disabled: true
    },
    { 
      name: t('Home.modules.hr.title'), 
      icon: Users, 
      path: '/hr', 
      color: 'blue', 
      description: t('Home.modules.hr.desc'),
      stats: t('Dashboard.soon'),
      disabled: true 
    },
    { 
      name: t('Home.modules.maintenance.title'), 
      icon: Wrench, 
      path: '/gmao', 
      color: 'red', 
      description: t('Home.modules.maintenance.desc'),
      stats: t('Dashboard.soon'),
      disabled: true
    },
    { 
      name: t('Home.modules.production.title'), 
      icon: Factory, 
      path: '/gpao', 
      color: 'zinc', 
      description: t('Home.modules.production.desc'),
      stats: t('Dashboard.soon'),
      disabled: true
    },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-stone-900 tracking-tight">
            {t('Dashboard.greeting')}, {user.email?.split('@')[0]}
          </h1>
          <p className="text-stone-500 mt-2 font-medium">{t('Dashboard.welcome_back')}</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-stone-200 shadow-sm">
          <div className="px-4 py-2 bg-stone-100 rounded-xl text-stone-600 font-bold text-xs uppercase tracking-widest">{t('Dashboard.today')}</div>
          <div className="text-sm font-black text-stone-900 px-2">
            {new Date().toLocaleDateString(locale === 'ar' ? 'ar-TN' : (locale === 'fr' ? 'fr-FR' : 'en-US'), { 
              weekday: 'long', day: 'numeric', month: 'long' 
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[32px] p-8 text-white shadow-2xl shadow-emerald-500/20 relative overflow-hidden group">
           <TrendingUp className="w-24 h-24 absolute -right-6 -bottom-6 text-white/10 group-hover:scale-110 transition-transform duration-700 rtl:-left-6 rtl:right-auto rtl:rotate-180" />
           <div className="relative z-10">
             <p className="text-emerald-100 font-bold text-sm uppercase tracking-widest mb-2">{t('Dashboard.performance')}</p>
             <h3 className="text-4xl font-black mb-4">+12.5% <span className="text-lg font-bold text-emerald-200/50 block">{t('Dashboard.processing_speed')}</span></h3>
             <button className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-5 py-2 rounded-xl text-sm font-bold transition-all">{t('Dashboard.view_analysis')}</button>
           </div>
        </div>

        <div className="bg-white rounded-[32px] p-8 border border-stone-200 shadow-xl shadow-stone-200/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 bg-stone-100 rounded-2xl"><Target className="w-6 h-6 text-stone-600" /></div>
              <span className="text-[10px] bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">{t('Dashboard.goals')}</span>
            </div>
            <p className="text-stone-400 text-sm font-bold uppercase tracking-widest mb-1">{t('Dashboard.critical_stock')}</p>
            <p className="text-3xl font-black text-stone-900">12 {t('Dashboard.items')}</p>
          </div>
           <p className="text-xs text-stone-400 font-medium mt-4 italic">{t('Dashboard.total_references', { count: 180 })}</p>
        </div>

        <div className="bg-stone-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
          <CreditCard className="w-20 h-20 absolute -right-4 -bottom-4 text-stone-700 group-hover:scale-110 transition-transform duration-700 rtl:-left-4 rtl:right-auto" />
          <div className="relative z-10">
            <p className="text-stone-500 font-bold text-sm uppercase tracking-widest mb-2">{t('Dashboard.treasury')}</p>
            <h3 className="text-3xl font-black mb-4">42 850<span className="text-lg font-bold text-stone-500 mx-1">TND</span></h3>
             <div className="h-1.5 bg-stone-800 rounded-full w-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[65%]" />
             </div>
             <p className="text-[10px] text-stone-500 mt-2 font-bold uppercase">{t('Dashboard.budget_reached', { percent: 65 })}</p>
          </div>
        </div>
      </div>

      {/* ── TEMPS RÉEL: Supabase Realtime Dashboard ── */}
      {user.tenantId && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <h2 className="text-xl font-black text-stone-900 tracking-tight">{t('Dashboard.realtime_view')}</h2>
          </div>
          <RealtimeDashboard tenantId={user.tenantId} />
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">{t('Dashboard.active_modules')}</h2>
           <Link href="/settings" className="text-stone-400 hover:text-teal-600 transition-all font-bold text-sm flex items-center gap-1 group">
             {t('Dashboard.manage_modules')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
           </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod) => (
            <Link 
              key={mod.name}
              href={mod.disabled ? '#' : mod.path}
              className={`group bg-white rounded-[40px] p-8 border border-stone-200 shadow-sm hover:shadow-2xl transition-all duration-500 relative flex flex-col justify-between overflow-hidden ${
                mod.disabled ? 'opacity-60 grayscale' : 'hover:-translate-y-2'
              }`}
            >
              <div>
                <div className={`w-16 h-16 rounded-3xl mb-6 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${
                  mod.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                  mod.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                  mod.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                  mod.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                  mod.color === 'red' ? 'bg-red-100 text-red-600' : 'bg-stone-100 text-stone-600'
                }`}>
                  <mod.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-stone-900 mb-2">{mod.name}</h3>
                <p className="text-stone-500 text-sm font-medium line-clamp-2 mb-6">
                  {mod.description}
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-stone-50">
                <span className="text-xs font-black text-stone-400 uppercase tracking-widest">{mod.stats}</span>
                {!mod.disabled && <ArrowRight className="w-5 h-5 text-emerald-600 -translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500 rtl:rotate-180 rtl:translate-x-4 rtl:group-hover:translate-x-0" />}
              </div>
              
              {mod.disabled && (
                <div className="absolute top-4 inset-inline-end-4 text-[10px] font-black uppercase tracking-widest bg-stone-900 text-white px-3 py-1 rounded-full">
                  {t('Dashboard.soon')}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
