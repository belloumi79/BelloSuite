'use client'

import { useState, useEffect } from 'react'

export interface TrendData {
  period: string
  monthlyData: Array<{ month: string; revenue: number; invoices: number }>
  topProducts: Array<{ id: string; name: string; quantity: number }>
}

export function useTrendData(tenantId: string | null, period: string = '6m') {
  const [data, setData] = useState<TrendData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId) {
      setLoading(false)
      return
    }

    async function fetchTrend() {
      try {
        setLoading(true)
        const res = await fetch(`/api/dashboard/trends?tenantId=${tenantId}&period=${period}`)
        if (!res.ok) throw new Error('Failed to fetch trend data')
        const result = await res.json()
        setData(result)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTrend()
  }, [tenantId, period])

  return { data, loading, error }
}