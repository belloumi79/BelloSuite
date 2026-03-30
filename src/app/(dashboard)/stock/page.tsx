'use client'

import { Package, TrendingUp, TrendingDown, AlertTriangle, Plus, Search, Filter, Download, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface StockItem {
  id: string
  code: string
  name: string
  category: string
  quantity: number
  minStock: number
  unit: string
  location: string
  status: 'critical' | 'low' | 'normal' | 'overstock'
}

const kpis = {
  totalProducts: 1247,
  totalValue: 458900,
  lowStockAlerts: 23,
  outOfStock: 8,
}

const stockItems: StockItem[] = [
  { id: '1', code: 'SKU-001', name: 'Ramette Papier A4', category: 'Fournitures', quantity: 250, minStock: 100, unit: 'ramette', location: 'A-12-3', status: 'normal' },
  { id: '2', code: 'SKU-002', name: 'Cartouche HP 304 Noir', category: 'Consommables', quantity: 12, minStock: 20, unit: 'unité', location: 'B-04-1', status: 'low' },
  { id: '3', code: 'SKU-003', name: 'Vis TF 4x40mm (Bx100)', category: 'Quincaillerie', quantity: 0, minStock: 50, unit: 'boîte', location: 'C-08-2', status: 'critical' },
  { id: '4', code: 'SKU-004', name: 'Câble HDMI 2m', category: 'Électronique', quantity: 85, minStock: 30, unit: 'unité', location: 'D-02-4', status: 'overstock' },
  { id: '5', code: 'SKU-005', name: 'Stylo Bille Bleu (Bx50)', category: 'Fournitures', quantity: 45, minStock: 25, unit: 'boîte', location: 'A-01-2', status: 'normal' },
]

const StatusBadge = ({ status }: { status: StockItem['status'] }) => {
  const styles = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    low: 'bg-amber-100 text-amber-700 border-amber-200',
    normal: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    overstock: 'bg-blue-100 text-blue-700 border-blue-200',
  }
  const labels = { critical: 'Rupture', low: 'Stock Bas', normal: 'Normal', overstock: 'Surstock' }
  return <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${styles[status]}`}>{labels[status]}</span>
}

export default function StockDashboard() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Tableau de Bord Stock</h1>
          <p className="text-stone-500 mt-1">Vue d'ensemble de votre inventaire en temps réel</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium text-sm transition-colors">
          <Plus className="w-4 h-4" />
          Nouveau Produit
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-stone-200 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="p-2.5 bg-stone-100 rounded-lg">
              <Package className="w-5 h-5 text-stone-600" />
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <TrendingUp className="w-3 h-3" /> 8%
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-900 mt-4">{kpis.totalProducts.toLocaleString()}</p>
          <p className="text-sm text-stone-500 mt-0.5">Total Produits</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-stone-200 hover:shadow-lg transition-shadow">
          <div className="p-2.5 bg-stone-100 rounded-lg">
            <TrendingUp className="w-5 h-5 text-stone-600" />
          </div>
          <p className="text-2xl font-bold text-stone-900 mt-4">{kpis.totalValue.toLocaleString()}</p>
          <p className="text-sm text-stone-500 mt-0.5">Valeur Stock (TND)</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-stone-200 hover:shadow-lg transition-shadow">
          <div className="p-2.5 bg-amber-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-4">{kpis.lowStockAlerts}</p>
          <p className="text-sm text-stone-500 mt-0.5">Alertes Stock Bas</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-stone-200 hover:shadow-lg transition-shadow">
          <div className="p-2.5 bg-red-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600 mt-4">{kpis.outOfStock}</p>
          <p className="text-sm text-stone-500 mt-0.5">Ruptures</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-semibold text-stone-900">Produits</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input 
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 w-48"
              />
            </div>
            <button className="p-2 border border-stone-200 rounded-lg hover:bg-stone-50">
              <Filter className="w-4 h-4 text-stone-600" />
            </button>
            <button className="p-2 border border-stone-200 rounded-lg hover:bg-stone-50">
              <Download className="w-4 h-4 text-stone-600" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-stone-600 uppercase">Produit</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-stone-600 uppercase">Catégorie</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-stone-600 uppercase">Quantité</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-stone-600 uppercase">Statut</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-stone-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {stockItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.code.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => (
                <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-stone-900">{item.name}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{item.code} • {item.location}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-stone-600">{item.category}</td>
                  <td className="px-5 py-4 text-right font-semibold text-stone-900">
                    {item.quantity} <span className="text-stone-400 font-normal">{item.unit}</span>
                  </td>
                  <td className="px-5 py-4 text-center"><StatusBadge status={item.status} /></td>
                  <td className="px-5 py-4 text-right">
                    <button className="p-1.5 hover:bg-stone-100 rounded-lg">
                      <ChevronRight className="w-4 h-4 text-stone-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
