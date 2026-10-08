'use client'

import { useEffect, useState, useCallback } from 'react'

export interface RealtimeStats {
  totalProducts: number
  lowStockAlerts: number
  totalInvoices: number
  pendingInvoices: number
  paidInvoices: number
  totalClients: number
  totalEmployees: number
  totalRevenue: number
  totalExpenses: number
  treasury: number
  lastUpdated: Date | null
  isConnected: boolean
}

const DEFAULT_STATS: RealtimeStats = {
  totalProducts: 0,
  lowStockAlerts: 0,
  totalInvoices: 0,
  pendingInvoices: 0,
  paidInvoices: 0,
  totalClients: 0,
  totalEmployees: 0,
  totalRevenue: 0,
  totalExpenses: 0,
  treasury: 0,
  lastUpdated: null,
  isConnected: false,
}

const REFRESH_MS = 30_000

/**
 * Statistiques du tableau de bord, lues via l'API serveur (/api/dashboard/stats, session + tenant vérifiés).
 * SÉCURITÉ : plus de lecture directe des tables avec la clé anon Supabase (bloquée par la RLS).
 * Le temps réel Supabase est remplacé par un rafraîchissement périodique.
 */
export function useRealtimeStats(tenantId: string | null) {
  const [stats, setStats] = useState<RealtimeStats>(DEFAULT_STATS)

  const fetchStats = useCallback(async () => {
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ''
      const res = await fetch(`/api/dashboard/stats${qs}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setStats({
        ...DEFAULT_STATS,
        ...data,
        totalExpenses: 0,
        treasury: 0,
        lastUpdated: new Date(),
        isConnected: true,
      })
    } catch (error) {
      console.error('Dashboard stats error:', error)
      setStats(prev => ({ ...prev, isConnected: false }))
    }
  }, [tenantId])

  useEffect(() => {
    fetchStats()
    const timer = setInterval(fetchStats, REFRESH_MS)
    return () => clearInterval(timer)
  }, [fetchStats])

  return stats
}
