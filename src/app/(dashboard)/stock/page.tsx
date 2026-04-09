'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, Warehouse as WarehouseIcon, ArrowRightLeft, FileText, Plus, RefreshCw, ExternalLink, Upload, Tags } from 'lucide-react'

export default function StockManagementPage() {
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [showCategory, setShowCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    const session = localStorage.getItem('bello_session')
    if (session) {
      const parsed = JSON.parse(session)
      setTenantId(parsed.tenantId)
      fetchData(parsed.tenantId)
    }
  }, [])

  const fetchData = async (tid: string) => {
    setLoading(true)
    try {
      const [whRes, prodRes] = await Promise.all([
        fetch(`/api/stock/warehouses?tenantId=${tid}`),
        fetch(`/api/stock/products?tenantId=${tid}`),
      ])
      if (whRes.ok) setWarehouses(await whRes.json())
      if (prodRes.ok) setProducts(await prodRes.json())
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const totalStockValue = products.reduce((sum, p) => sum + Number(p.currentStock) * Number(p.purchasePrice), 0)
  const totalProducts = products.length
  const lowStock = products.filter(p => Number(p.currentStock) > 0 && Number(p.currentStock) < Number(p.minStock)).length
  const outOfStock = products.filter(p => Number(p.currentStock) <= 0).length

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto min-h-screen bg-transparent pt-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
            Gestion de Stock
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Multi-Entrepôt</span>
          </h1>
          <p className="text-zinc-500 mt-1 font-medium">Etat des stocks, inventaires et transferts entre entrepôts.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchData(tenantId)} className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-all">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
                    <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-600/20 transition-all">
            <Upload className="w-5 h-5" /> Import CSV
          </button>
          <button onClick={() => setShowCategory(true)} className="flex items-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-600/20 transition-all">
            <Tags className="w-5 h-5" /> Categories
          </button>
          <Link href="/stock/warehouses/new" className="flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-600/20">
            <Plus className="w-5 h-5" /> Nouvel Entrepôt
          </Link>
          <Link href="/stock/transfers/new" className="flex items-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-600/20">
            <ArrowRightLeft className="w-5 h-5" /> Bon de Transfert
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2rem] p-6">
          <div className="flex items-start justify-between">
            <div className="p-3 bg-teal-500/10 rounded-xl">
              <WarehouseIcon className="w-6 h-6 text-teal-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-white mt-4">{warehouses.length}</p>
          <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mt-1">Entrepôts</p>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2rem] p-6">
          <div className="p-3 bg-emerald-500/10 rounded-xl w-fit">
            <Package className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-white mt-4">{totalProducts}</p>
          <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mt-1">Réf. Produits</p>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2rem] p-6">
          <div className="p-3 bg-amber-500/10 rounded-xl w-fit">
            <FileText className="w-6 h-6 text-amber-400" />
          </div>
          <p className="text-3xl font-black text-amber-400 mt-4">{totalStockValue.toLocaleString('fr-TN', { style: 'currency', currency: 'TND' })}</p>
          <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mt-1">Valeur Stock</p>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2rem] p-6">
          <div className="p-3 bg-red-500/10 rounded-xl w-fit">
            <Package className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-3xl font-black text-red-400 mt-4">{outOfStock}</p>
          <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mt-1">Ruptures</p>
        </div>
      </div>

      {/* Warehouses Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <WarehouseIcon className="w-5 h-5 text-teal-400" /> Entrepôts
          </h2>
          <div className="flex items-center gap-2">
            <Link href="/stock/inventory" className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest transition-all">
              Inventaire
            </Link>
            <Link href="/stock/transfers" className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest transition-all">
              Transferts
            </Link>
            <Link href="/stock/products" className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-teal-600/20">
              Produits
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-8 h-32 animate-pulse" />
            ))}
          </div>
        ) : warehouses.length === 0 ? (
          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-20 text-center">
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Aucun entrepôt configuré</p>
            <Link href="/stock/warehouses/new" className="mt-4 inline-flex items-center gap-2 text-teal-400 font-bold text-sm hover:underline">
              <Plus className="w-4 h-4" /> Créer un entrepôt
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map((wh) => {
              const whProducts = products.filter((p: any) => {
                const pw = (p as any).warehouseStock?.find((ws: any) => ws.warehouseId === wh.id)
                return pw ? Number(pw.stock) > 0 : false
              })
              const whValue = whProducts.reduce((sum: number, p: any) => {
                const pw = p.warehouseStock?.find((ws: any) => ws.warehouseId === wh.id)
                return sum + (pw ? Number(pw.stock) * Number(p.purchasePrice) : 0)
              }, 0)
              return (
                <Link key={wh.id} href={`/stock/availability/${wh.id}`} className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 hover:border-teal-500/30 rounded-[2rem] p-8 transition-all group">
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-teal-500/10 rounded-xl group-hover:scale-110 transition-transform">
                      <WarehouseIcon className="w-6 h-6 text-teal-400" />
                    </div>
                    {wh.isDefault && (
                      <span className="text-[9px] font-black text-teal-400 bg-teal-500/10 px-2 py-1 rounded-full uppercase tracking-widest">Principal</span>
                    )}
                  </div>
                  <h3 className="font-black text-white text-lg mt-4">{wh.name}</h3>
                  <p className="text-zinc-500 text-xs font-mono font-bold mt-1">Réf: {wh.code}</p>
                  {wh.address && <p className="text-zinc-600 text-xs mt-1">{wh.address}</p>}
                  <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Valeur</p>
                    <p className="font-black text-emerald-400">{whValue.toLocaleString('fr-TN', { style: 'currency', currency: 'TND' })}</p>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-teal-400 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                    Voir Stock <ExternalLink className="w-3 h-3" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2rem] p-8">
          <h3 className="text-lg font-black text-white flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-amber-400" /> Inventaire Physique
          </h3>
          <p className="text-zinc-500 text-sm font-medium mb-6">Comparaison entre le stock théorique et le stock réel. Utile pour le contrôle annuel.</p>
          <Link href="/stock/inventory" className="inline-flex items-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-600/20 transition-all">
            <Plus className="w-5 h-5" /> Nouvel Inventaire
          </Link>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2rem] p-8">
          <h3 className="text-lg font-black text-white flex items-center gap-2 mb-4">
            <ArrowRightLeft className="w-5 h-5 text-teal-400" /> Transfert de Stock
          </h3>
          <p className="text-zinc-500 text-sm font-medium mb-6">Transférer des produits entre entrepôts. Met à jour automatiquement les quantités.</p>
          <Link href="/stock/transfers/new" className="inline-flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-600/20 transition-all">
            <ArrowRightLeft className="w-5 h-5" /> Nouveau Transfert
          </Link>
        </div>
      </div>
    

      {/* Import CSV Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowImport(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white">Importer Produits (CSV/Excel)</h2>
              <button onClick={() => setShowImport(false)} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 text-center hover:border-purple-500 transition-colors">
              <Upload className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-white font-bold mb-2">Glissez ou choisissez un fichier</p>
              <p className="text-zinc-500 text-sm mb-4">CSV ou Excel (.xlsx)</p>
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" id="csvInput2" onChange={async e => {
                const file = e.target.files?.[0]
                if (!file) return
                const fd = new FormData()
                fd.append('file', file)
                fd.append('tenantId', tenantId)
                const r = await fetch('/api/stock/import', { method: 'POST', body: fd })
                if (r.ok) { setShowImport(false); fetchData(tenantId) }
                else { const d = await r.json(); alert(d.error || 'Erreur') }
              }} />
              <label htmlFor="csvInput2" className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold cursor-pointer">
                <Upload className="w-5 h-5" /> Choisir fichier
              </label>
            </div>
            <div className="mt-4 p-4 bg-zinc-800/50 rounded-xl text-xs">
              <p className="text-zinc-400 font-bold uppercase tracking-widest mb-1">Colonnes requises</p>
              <code className="text-teal-400">code, name, category, purchasePrice, salePrice, vatRate, currentStock</code>
            </div>
          </div>
        </div>
      )}

      {/* Categories Modal */}
      {showCategory && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCategory(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white">Gerer Categories</h2>
              <button onClick={() => setShowCategory(false)} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex gap-3 mb-6">
              <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Nouvelle categorie" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500" onKeyDown={e => { if (e.key === 'Enter') { const cat = newCategory.trim(); if (cat) setCategories(prev => [...prev.filter(x => x !== cat), cat]); setNewCategory('') } }} />
              <button onClick={() => { const cat = newCategory.trim(); if (cat) setCategories(prev => [...prev.filter(x => x !== cat), cat]); setNewCategory('') }} className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold">Ajouter</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => <span key={cat} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-full text-sm"><Tags className="w-3 h-3 text-amber-400" /> {cat}</span>)}
              {categories.length === 0 && <p className="text-zinc-600 text-sm">Aucune categorie</p>}
            </div>
          </div>
        </div>
      )}</div>
  )
}
