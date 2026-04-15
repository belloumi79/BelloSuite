'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

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

export function useRealtimeStats(tenantId: string | null) {
  const [stats, setStats] = useState<RealtimeStats>(DEFAULT_STATS)

  const fetchStats = useCallback(async () => {
    if (!tenantId) return

    try {
      const [
        productsResult,
        invoicesResult,
        clientsResult,
        employeesResult,
      ] = await Promise.all([
        // Products + low stock
        supabase
          .from('Product')
          .select('id, currentStock, minStock')
          .eq('tenantId', tenantId)
          .eq('isActive', true),
        // Invoices by status
        supabase
          .from('Invoice')
          .select('status, totalTTC')
          .eq('tenantId', tenantId),
        // Clients count
        supabase
          .from('Client')
          .select('id', { count: 'exact' })
          .eq('tenantId', tenantId)
          .eq('isActive', true),
        // Employees count
        supabase
          .from('Employee')
          .select('id', { count: 'exact' })
          .eq('tenantId', tenantId)
          .eq('isActive', true),
      ])

      const lowStock =
        (productsResult.data ?? []).filter(
          (p: any) => Number(p.currentStock) <= Number(p.minStock)
        ).length

      const invoices = invoicesResult.data ?? []
      const pendingInvoices = invoices.filter(
        (i: any) => i.status === 'SUBMITTED' || i.status === 'DRAFT'
      ).length
      const paidInvoices = invoices.filter(
        (i: any) => i.status === 'ACCEPTED'
      ).length
      const totalRevenue = invoices
        .filter((i: any) => i.status === 'ACCEPTED')
        .reduce((sum: number, i: any) => sum + Number(i.totalTTC || 0), 0)

      setStats({
        totalProducts: (productsResult.data ?? []).length,
        lowStockAlerts: lowStock,
        totalInvoices: invoices.length,
        pendingInvoices,
        paidInvoices,
        totalClients: clientsResult.count ?? 0,
        totalEmployees: employeesResult.count ?? 0,
        totalRevenue,
        totalExpenses: 0,
        treasury: 0,
        lastUpdated: new Date(),
        isConnected: true,
      })
    } catch (error) {
      console.error('Realtime stats error:', error)
      setStats(prev => ({ ...prev, isConnected: false }))
    }
  }, [tenantId])

  useEffect(() => {
    if (!tenantId) return

    fetchStats()

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`tenant-${tenantId}-realtime`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Product' },
        () => fetchStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Invoice' },
        () => fetchStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Client' },
        () => fetchStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Employee' },
        () => fetchStats()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, fetchStats])

  return stats
}
