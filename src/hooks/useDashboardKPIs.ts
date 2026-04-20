'use client'

import { useState, useEffect } from 'react'

export interface DashboardKPIs {
  totalRevenue: number
  currentMonthRevenue: number
  lastMonthRevenue: number
  revenueChange: number
  pendingRevenue: number
  overdueAmount: number
  totalInvoices: number
  paidInvoices: number
  pendingInvoices: number
  overdueInvoices: number
  invoicesThisMonth: number
  dso: number
  totalProducts: number
  totalStockValue: number
  lowStockProducts: number
  outOfStock: number
  totalClients: number
  totalEmployees: number
  topProducts: Array<{ productId: string; name: string; quantity: number }>
  recentMovements: Array<{ id: string; type: string; quantity: number; productName: string; createdAt: Date }>
}

export function useDashboardKPIs(tenantId: string | null) {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId) {
      setLoading(false)
      return
    }

    async function fetchKPIs() {
      try {
        setLoading(true)
        const res = await fetch(`/api/dashboard/kpis?tenantId=${tenantId}`)
        if (!res.ok) throw new Error('Failed to fetch KPIs')
        const data = await res.json()
        setKpis(data)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchKPIs()
  }, [tenantId])

  return { kpis, loading, error }
}