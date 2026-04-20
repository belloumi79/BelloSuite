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
  TrendingDown,
  CreditCard,
  AlertTriangle,
  DollarSign,
  FileText,
  Clock
} from 'lucide-react'
import { useDashboardKPIs } from '@/hooks/useDashboardKPIs'
import { QuickActions } from '@/components/dashboard/QuickActions'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 0,
  }).format(value)
}

function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  color 
}: { 
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  color: string
}) {
  return (
    <div className="bg-white rounded-[2rem] p-6 border border-stone-200 shadow-sm hover:shadow-xl transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl bg-${color}-50 text-${color}-600`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
            trend === 'up' ? 'bg-emerald-100 text-emerald-700' :
            trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-600'
          }`}>
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3" />}
            {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-stone-900">{value}</p>
      <p className="text-sm font-semibold text-stone-500">{title}</p>
      {subtitle && <p className="text-xs text-stone-400 mt-1">{subtitle}</p>}
    </div>
  )
}

export default function DashboardSummary() {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const { kpis, loading } = useDashboardKPIs(user?.tenantId)

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

      {/* KPI Cards with real data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Chiffre d'affaires"
          value={loading ? '...' : formatCurrency(kpis?.totalRevenue || 0)}
          subtitle={kpis ? `${kpis.revenueChange > 0 ? '+' : ''}${kpis.revenueChange}% ce mois` : undefined}
          icon={DollarSign}
          trend={kpis?.revenueChange ? (kpis.revenueChange > 0 ? 'up' : 'down') : 'neutral'}
          color="emerald"
        />
        <KPICard
          title="Créances clients"
          value={loading ? '...' : formatCurrency(kpis?.pendingRevenue || 0)}
          subtitle={`${kpis?.pendingInvoices || 0} factures en attente`}
          icon={CreditCard}
          trend={kpis?.pendingInvoices ? 'down' : 'neutral'}
          color="amber"
        />
        <KPICard
          title="Valeur stock"
          value={loading ? '...' : formatCurrency(kpis?.totalStockValue || 0)}
          subtitle={`${kpis?.totalProducts || 0} produits`}
          icon={Package}
          color="blue"
        />
        <KPICard
          title="Alertes stock"
          value={loading ? '...' : (kpis?.lowStockProducts || 0) + (kpis?.outOfStock || 0)}
          subtitle={kpis?.lowStockProducts ? 'articles critiques' : undefined}
          icon={AlertTriangle}
          trend={kpis?.lowStockProducts ? 'down' : 'neutral'}
          color={kpis?.lowStockProducts ? 'red' : 'emerald'}
        />
      </div>

      {/* Quick Actions and More Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <QuickActions userRole={user?.role} />
        </div>
        <div className="bg-white rounded-[2rem] p-6 border border-stone-200 shadow-sm">
          <h3 className="font-black text-stone-900 mb-4">Résumé</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-stone-500 font-medium">Clients actifs</span>
              <span className="font-black text-stone-900">{loading ? '...' : kpis?.totalClients || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500 font-medium">Employés</span>
              <span className="font-black text-stone-900">{loading ? '...' : kpis?.totalEmployees || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500 font-medium">Factures ce mois</span>
              <span className="font-black text-stone-900">{loading ? '...' : kpis?.invoicesThisMonth || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500 font-medium">DSO (jours)</span>
              <span className="font-black text-stone-900">{loading ? '...' : kpis?.dso || 0}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-stone-100">
              <span className="text-stone-500 font-medium">Factures impayées</span>
              <span className="font-black text-red-600">{loading ? '...' : kpis?.overdueInvoices || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Products */}
      {kpis && kpis.topProducts.length > 0 && (
        <div className="bg-white rounded-[2rem] p-6 border border-stone-200 shadow-sm">
          <h3 className="font-black text-stone-900 mb-4">Produits les plus vendus</h3>
          <div className="space-y-3">
            {kpis.topProducts.map((product, idx) => (
              <div key={product.productId} className="flex items-center gap-4 p-3 bg-stone-50 rounded-xl">
                <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 font-black text-sm flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="flex-1 font-medium text-stone-700">{product.name}</span>
                <span className="font-black text-emerald-600">{product.quantity} unités</span>
              </div>
            ))}
          </div>
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
