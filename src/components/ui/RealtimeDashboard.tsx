'use client'

import { useEffect, useState } from 'react'
import {
  Package,
  ShoppingCart,
  Wallet,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react'
import { useRealtimeStats, type RealtimeStats } from '@/hooks/useRealtimeStats'

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: any
  trend?: 'up' | 'down' | 'neutral'
  color: string
}) {
  const colorMap: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-600',
    amber: 'from-amber-500 to-orange-600',
    blue: 'from-blue-500 to-indigo-600',
    purple: 'from-purple-500 to-violet-600',
    red: 'from-red-500 to-rose-600',
    zinc: 'from-zinc-600 to-zinc-800',
  }

  return (
    <div className="bg-white rounded-[2rem] p-6 border border-stone-200 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`p-3 rounded-2xl bg-gradient-to-br ${colorMap[color] || colorMap.zinc} text-white shadow-lg`}
        >
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
              trend === 'up'
                ? 'bg-emerald-100 text-emerald-700'
                : trend === 'down'
                ? 'bg-red-100 text-red-700'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3" />}
          </div>
        )}
      </div>
      <p className="text-3xl font-black text-stone-900 mb-1">{value}</p>
      <p className="text-sm font-semibold text-stone-500">{title}</p>
      {subtitle && (
        <p className="text-xs text-stone-400 mt-1 font-medium">{subtitle}</p>
      )}
    </div>
  )
}

function ConnectionStatus({ isConnected, lastUpdated }: { isConnected: boolean; lastUpdated: Date | null }) {
  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
        isConnected
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-red-100 text-red-700'
      }`}
    >
      {isConnected ? (
        <>
          <Wifi className="w-3 h-3" />
          <span> Temps réel actif</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Déconnecté</span>
        </>
      )}
      {lastUpdated && (
        <span className="text-emerald-500 ml-1">
          • {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      )}
    </div>
  )
}

export function RealtimeDashboard({ tenantId }: { tenantId: string }) {
  const stats = useRealtimeStats(tenantId)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const cards: Array<{
    title: string; value: string | number; subtitle: string
    icon: any; trend: 'up' | 'down' | 'neutral'; color: string
  }> = [
    {
      title: 'Chiffre d\'affaires',
      value: formatCurrency(stats.totalRevenue),
      subtitle: `${stats.paidInvoices} factures encaissées`,
      icon: DollarSign,
      trend: stats.totalRevenue > 0 ? 'up' : 'neutral' as const,
      color: 'emerald',
    },
    {
      title: 'Stock Total',
      value: stats.totalProducts.toLocaleString('fr-FR'),
      subtitle: 'articles actifs',
      icon: Package,
      trend: 'neutral' as const,
      color: 'blue',
    },
    {
      title: 'Alertes Stock',
      value: stats.lowStockAlerts,
      subtitle: 'articles sous le minimum',
      icon: AlertTriangle,
      trend: stats.lowStockAlerts > 0 ? 'down' as const : 'neutral' as const,
      color: stats.lowStockAlerts > 0 ? 'red' : 'zinc',
    },
    {
      title: 'Clients',
      value: stats.totalClients.toLocaleString('fr-FR'),
      subtitle: 'clients actifs',
      icon: ShoppingCart,
      trend: 'neutral' as const,
      color: 'purple',
    },
    {
      title: 'Employés',
      value: stats.totalEmployees.toLocaleString('fr-FR'),
      subtitle: 'collaborateurs',
      icon: Users,
      trend: 'neutral' as const,
      color: 'blue',
    },
    {
      title: 'Factures en Attente',
      value: stats.pendingInvoices,
      subtitle: `sur ${stats.totalInvoices} totales`,
      icon: Receipt,
      trend: stats.pendingInvoices > 0 ? 'down' as const : 'up' as const,
      color: stats.pendingInvoices > 0 ? 'amber' : 'zinc',
    },
  ]

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-[2rem] p-6 border border-stone-200 animate-pulse"
          >
            <div className="w-12 h-12 bg-stone-200 rounded-2xl mb-4" />
            <div className="h-8 bg-stone-200 rounded-xl mb-2 w-2/3" />
            <div className="h-4 bg-stone-100 rounded-lg w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Connection status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ConnectionStatus
            isConnected={stats.isConnected}
            lastUpdated={stats.lastUpdated}
          />
          <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-400 font-medium">
          <RefreshCw className="w-3 h-3" />
          <span>Mise à jour automatique via Supabase Realtime</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      {/* Low stock alerts */}
      {stats.lowStockAlerts > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-[2rem] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-black text-red-800 text-lg">
                {stats.lowStockAlerts} article{stats.lowStockAlerts > 1 ? 's' : ''} en rupture
              </h3>
              <p className="text-sm text-red-600 font-medium">
                Stock actuel inférieur ou égal au minimum défini
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <a
              href="/stock?filter=low-stock"
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-sm transition-all"
            >
              Voir les alertes
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
