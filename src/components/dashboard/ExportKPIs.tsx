'use client'

import { Download } from 'lucide-react'

interface ExportKPIsProps {
  kpis: any
  loading: boolean
}

export function ExportKPIs({ kpis, loading }: ExportKPIsProps) {
  const exportToCSV = () => {
    if (!kpis) return

    const csvData = [
      ['Métrique', 'Valeur'],
      ['Chiffre d\'affaires total', kpis.totalRevenue],
      ['CA ce mois', kpis.currentMonthRevenue],
      ['Évolution CA (%)', kpis.revenueChange],
      ['Créances clients', kpis.pendingRevenue],
      ['Factures en attente', kpis.pendingInvoices],
      ['Valeur stock', kpis.totalStockValue],
      ['Produits actifs', kpis.totalProducts],
      ['Alertes stock', (kpis.lowStockProducts || 0) + (kpis.outOfStock || 0)],
      ['Clients actifs', kpis.totalClients],
      ['Employés', kpis.totalEmployees],
      ['Factures ce mois', kpis.invoicesThisMonth],
      ['DSO (jours)', kpis.dso],
      ['Factures impayées', kpis.overdueInvoices],
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `dashboard-kpis-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading || !kpis) return null

  return (
    <button
      onClick={exportToCSV}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all"
    >
      <Download className="w-4 h-4" />
      Exporter KPIs (CSV)
    </button>
  )
}