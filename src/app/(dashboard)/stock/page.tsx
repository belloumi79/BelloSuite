'use client'

import { Package, TrendingUp, TrendingDown, AlertTriangle, Plus, Search, Filter, Download, ArrowRightLeft, RefreshCcw } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import ProductModal from '@/components/stock/ProductModal'
import MovementModal from '@/components/stock/MovementModal'

interface Product {
  id: string
  code: string
  name: string
  category: string
  currentStock: number
  minStock: number
  unit: string
  purchasePrice: number
  salePrice: number
}

const StatusBadge = ({ count, min }: { count: number, min: number }) => {
  if (count <= 0) return <span className="px-2.5 py-1 text-xs font-bold rounded-full border bg-red-100 text-red-700 border-red-200 shadow-sm shadow-red-100">Rupture</span>
  if (count < min) return <span className="px-2.5 py-1 text-xs font-bold rounded-full border bg-amber-100 text-amber-700 border-amber-200 shadow-sm shadow-amber-100">Stock Bas</span>
  return <span className="px-2.5 py-1 text-xs font-bold rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100">Normal</span>
}

export default function StockDashboard() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [tenantId, setTenantId] = useState<string | null>(null)
  
  // Modal states
  const [isProductModalOpen, setProductModalOpen] = useState(false)
  const [isMovementModalOpen, setMovementModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const fetchProducts = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stock/products?tenantId=${id}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const session = localStorage.getItem('bello_session')
    if (session) {
      const { tenantId } = JSON.parse(session)
      setTenantId(tenantId)
      fetchProducts(tenantId)
    }
  }, [fetchProducts])

  const stats = {
    totalProducts: products.length,
    totalValue: products.reduce((acc, p) => acc + (Number(p.currentStock) * Number(p.purchasePrice)), 0),
    lowStock: products.filter(p => Number(p.currentStock) < Number(p.minStock) && Number(p.currentStock) > 0).length,
    outOfStock: products.filter(p => Number(p.currentStock) <= 0).length
  }

  const handleOpenMovement = (product: Product) => {
    setSelectedProduct(product)
    setMovementModalOpen(true)
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            Tableau de Bord Stock
            <RefreshCcw 
              onClick={() => tenantId && fetchProducts(tenantId)}
              className={`w-5 h-5 text-stone-300 hover:text-teal-600 cursor-pointer transition-all ${loading ? 'animate-spin' : ''}`} 
            />
          </h1>
          <p className="text-stone-500 mt-1 font-medium">Vue d'ensemble de votre inventaire en temps réel</p>
        </div>
        <button 
          onClick={() => setProductModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xl shadow-teal-500/20 font-bold text-sm transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          Ajouter un Produit
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="flex items-start justify-between relative z-10">
            <div className="p-3 bg-stone-100 rounded-xl group-hover:bg-teal-50 transition-colors">
              <Package className="w-6 h-6 text-stone-600 group-hover:text-teal-600" />
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              Actifs
            </div>
          </div>
          <p className="text-3xl font-black text-stone-900 mt-5">{stats.totalProducts}</p>
          <p className="text-sm text-stone-500 mt-1 font-semibold uppercase tracking-wider">Total Produits</p>
          <div className="absolute top-0 right-0 w-32 h-32 bg-stone-50 rounded-full -mr-16 -mt-16 group-hover:bg-teal-50/50 transition-all" />
        </div>

        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="p-3 bg-stone-100 rounded-xl group-hover:bg-teal-50 transition-colors relative z-10 w-fit">
            <TrendingUp className="w-6 h-6 text-stone-600 group-hover:text-teal-600" />
          </div>
          <p className="text-3xl font-black text-stone-900 mt-5">{stats.totalValue.toLocaleString('fr-TN', { style: 'currency', currency: 'TND' })}</p>
          <p className="text-sm text-stone-500 mt-1 font-semibold uppercase tracking-wider">Valeur Totale Stock</p>
          <div className="absolute top-0 right-0 w-32 h-32 bg-stone-50 rounded-full -mr-16 -mt-16 group-hover:bg-teal-50/50 transition-all" />
        </div>

        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="p-3 bg-amber-100 rounded-xl group-hover:bg-amber-200 transition-colors relative z-10 w-fit">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-amber-600 mt-5">{stats.lowStock}</p>
          <p className="text-sm text-stone-500 mt-1 font-semibold uppercase tracking-wider">Alertes Stock Bas</p>
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16" />
        </div>

        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="p-3 bg-red-100 rounded-xl group-hover:bg-red-200 transition-colors relative z-10 w-fit">
            <Package className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-3xl font-black text-red-600 mt-5">{stats.outOfStock}</p>
          <p className="text-sm text-stone-500 mt-1 font-semibold uppercase tracking-wider">Ruptures de Stock</p>
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16" />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden mt-8">
        <div className="p-6 border-b border-stone-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-stone-50/50">
          <div>
            <h2 className="font-black text-stone-900 text-xl tracking-tight">Inventaire des Produits</h2>
            <p className="text-stone-500 text-sm font-medium">Gérez vos articles et ajustez les stocks</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input 
                type="text"
                placeholder="Rechercher (Nom, Code)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-4 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 w-full sm:w-64 transition-all"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 border border-stone-200 rounded-xl hover:bg-white text-stone-600 font-bold text-sm shadow-sm transition-all">
              <Filter className="w-4 h-4" />
              Filtres
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 border border-stone-200 rounded-xl hover:bg-white text-stone-600 font-bold text-sm shadow-sm transition-all">
              <Download className="w-4 h-4" />
              Exporter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-stone-50/80">
                <th className="text-left px-6 py-4 text-xs font-black text-stone-500 uppercase tracking-widest border-b border-stone-100">Produit</th>
                <th className="text-left px-6 py-4 text-xs font-black text-stone-500 uppercase tracking-widest border-b border-stone-100">Catégorie</th>
                <th className="text-right px-6 py-4 text-xs font-black text-stone-500 uppercase tracking-widest border-b border-stone-100">Quantité</th>
                <th className="text-right px-6 py-4 text-xs font-black text-stone-500 uppercase tracking-widest border-b border-stone-100">P.U Achat</th>
                <th className="text-center px-6 py-4 text-xs font-black text-stone-500 uppercase tracking-widest border-b border-stone-100">Statut</th>
                <th className="text-right px-6 py-4 text-xs font-black text-stone-500 uppercase tracking-widest border-b border-stone-100">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-8"><div className="h-6 bg-stone-100 rounded-lg w-full" /></td>
                  </tr>
                ))
              ) : products.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.code.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => (
                <tr key={item.id} className="group hover:bg-teal-50/30 transition-all">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center group-hover:bg-white transition-colors border border-transparent group-hover:border-teal-100">
                        <Package className="w-5 h-5 text-stone-400 group-hover:text-teal-600" />
                      </div>
                      <div>
                        <p className="font-bold text-stone-900 group-hover:text-teal-900">{item.name}</p>
                        <p className="text-[10px] font-black text-stone-400 mt-0.5 tracking-tighter uppercase">{item.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-lg">{item.category || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="inline-block text-right">
                      <p className={`text-lg font-black ${Number(item.currentStock) < Number(item.minStock) ? 'text-amber-600' : 'text-stone-900'}`}>
                        {item.currentStock}
                      </p>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{item.unit}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right font-mono font-bold text-stone-600">
                    {item.purchasePrice.toLocaleString('fr-TN')} <span className="text-[10px] ml-0.5">TND</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <StatusBadge count={Number(item.currentStock)} min={Number(item.minStock)} />
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                        onClick={() => handleOpenMovement(item)}
                        title="Ajuster le stock"
                        className="p-2.5 text-stone-400 hover:text-teal-600 hover:bg-white rounded-xl border border-transparent hover:border-teal-100 transition-all"
                      >
                        <ArrowRightLeft className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && products.length === 0 && (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-stone-300" />
              </div>
              <h3 className="font-black text-stone-900 text-lg">Aucun produit trouvé</h3>
              <p className="text-stone-500 font-medium">Commencez par ajouter votre premier produit à l'inventaire.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {tenantId && (
        <>
          <ProductModal 
            isOpen={isProductModalOpen} 
            onClose={() => setProductModalOpen(false)} 
            onSuccess={() => fetchProducts(tenantId)}
            tenantId={tenantId}
          />
          <MovementModal
            isOpen={isMovementModalOpen}
            onClose={() => {
              setMovementModalOpen(false)
              setSelectedProduct(null)
            }}
            onSuccess={() => fetchProducts(tenantId)}
            tenantId={tenantId}
            productId={selectedProduct?.id}
            productName={selectedProduct?.name}
          />
        </>
      )}
    </div>
  )
}
