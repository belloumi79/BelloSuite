'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Package, Plus, Search, RefreshCw, Filter, Trash2, Edit2, Eye, AlertTriangle, Image, X, ChevronDown, Upload, Tags, Download } from 'lucide-react'

type Product = {
  id: string
  code: string
  barcode: string | null
  name: string
  description: string | null
  category: string | null
  unit: string
  purchasePrice: string | number
  salePrice: string | number
  vatRate: string | number
  minStock: string | number
  currentStock: string | number
  isActive: boolean
  images: string[]
  variants: ProductVariant[]
  supplierId: string | null
  createdAt: string
}

type ProductVariant = {
  id: string
  name: string
  sku: string
  price: string | number
  stock: string | number
  attributes: Record<string, string>
}

export default function ProductsListPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [showCategory, setShowCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<{created:number, errors:number}|null>(null)

  const handleFileUpload = async (file: File) => {
    setImportLoading(true)
    setImportResult(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch(`/api/stock/import?tenantId=${tenantId}`, { method: 'POST', body: formData })
      const data = await res.json()
      setImportResult(data)
      if (res.ok) { fetchProducts(tenantId); setTimeout(() => setShowImport(false), 1500) }
    } catch { setImportResult({ created: 0, errors: 1 }) }
    setImportLoading(false)
  }

  const fetchProducts = useCallback(async (tid: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stock/products?tenantId=${tid}`)
      if (res.ok) setProducts(await res.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => {
    const session = localStorage.getItem('bello_session')
    if (session) {
      const { tenantId: tid } = JSON.parse(session)
      setTenantId(tid)
      fetchProducts(tid)
    }
  }, [fetchProducts])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return
    const res = await fetch(`/api/stock/products/${id}?tenantId=${tenantId}`, { method: 'DELETE' })
    if (res.ok) {
      setProducts(p => p.filter(x => x.id !== id))
      setDeleteId(null)
    }
  }

  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search))
    const matchCat = !categoryFilter || p.category === categoryFilter
    const stock = Number(p.currentStock)
    const matchStock = stockFilter === 'all' || (stockFilter === 'low' && stock > 0 && stock < Number(p.minStock)) || (stockFilter === 'out' && stock <= 0) || (!stockFilter)
    return matchSearch && matchCat && matchStock
  })

  const cats = [...new Set(products.map(p => p.category).filter(Boolean))] as string[]
  const outStock = products.filter(p => Number(p.currentStock) <= 0).length
  const lowStock = products.filter(p => { const s = Number(p.currentStock); return s > 0 && s < Number(p.minStock) }).length

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto min-h-screen bg-transparent pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Produits</h1>
          <p className="text-zinc-500 font-medium text-sm mt-1">{products.length} références — {outStock} ruptures, {lowStock} stock faible</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchProducts(tenantId)} className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-600/20 transition-all">
            <Upload className="w-5 h-5" /> Importer CSV
          </button>
          <button onClick={() => setShowCategory(true)} className="flex items-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-600/20 transition-all">
            <Tags className="w-5 h-5" /> Categories
          </button>
          <Link href="/stock/products/new" className="flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-600/20"><Plus className="w-5 h-5" /> Nouveau Produit</Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Recherche nom, code, barcode..." className="w-full bg-zinc-900/40 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-teal-500/50" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-bold"><Filter className="w-4 h-4" /> Filtres {showFilters ? <ChevronDown className="w-4 h-4 rotate-180" /> : <ChevronDown className="w-4 h-4" />}</button>
        {categories.length > 0 && (
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-zinc-900/40 border border-zinc-800 text-zinc-400 rounded-xl px-3 py-3 text-sm outline-none">
            <option value="">Toutes catégories</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} className="bg-zinc-900/40 border border-zinc-800 text-zinc-400 rounded-xl px-3 py-3 text-sm outline-none">
          <option value="">Tous les stocks</option>
          <option value="all">Avec stock</option>
          <option value="low">Stock faible</option>
          <option value="out">En rupture</option>
        </select>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-zinc-800/50 bg-zinc-800/20">
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Produit</th>
              <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Catégorie</th>
              <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">P. Achat</th>
              <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">P. Vente</th>
              <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Stock</th>
              <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Statut</th>
              <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/30">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-20 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">Chargement...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-20 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">Aucun produit trouvé</td></tr>
            ) : filtered.map(p => {
              const stock = Number(p.currentStock)
              const min = Number(p.minStock)
              const isOut = stock <= 0
              const isLow = stock > 0 && stock < min
              return (
                <tr key={p.id} className="hover:bg-zinc-800/30 group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center overflow-hidden">
                        {p.images && p.images[0] ? <img src={p.images[0]} className="w-full h-full object-cover" alt="" /> : <Package className="w-5 h-5 text-zinc-600" />}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{p.name}</p>
                        <p className="text-zinc-500 text-xs font-mono">{p.code} {p.barcode ? `· ${p.barcode}` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4"><span className="text-zinc-400 text-xs font-bold px-2 py-1 bg-zinc-800 rounded-lg">{p.category || '—'}</span></td>
                  <td className="px-4 py-4 text-right text-zinc-300 text-sm font-mono">{Number(p.purchasePrice).toFixed(3)} TND</td>
                  <td className="px-4 py-4 text-right text-emerald-400 text-sm font-black font-mono">{Number(p.salePrice).toFixed(3)} TND</td>
                  <td className="px-4 py-4 text-center">
                    <span className={`font-black text-sm ${isOut ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-zinc-300'}`}>{stock}</span>
                    {isLow && <AlertTriangle className="w-3 h-3 text-amber-400 inline ml-1" />}
                    {isOut && <AlertTriangle className="w-3 h-3 text-red-400 inline ml-1" />}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {isOut ? <span className="text-[9px] font-black text-red-400 bg-red-500/10 px-2 py-1 rounded-full uppercase tracking-widest">Rupture</span> : isLow ? <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full uppercase tracking-widest">Faible</span> : <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full uppercase tracking-widest">OK</span>}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/stock/products/${p.id}`} className="p-2 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-all"><Eye className="w-4 h-4" /></Link>
                      <Link href={`/stock/products/${p.id}/edit`} className="p-2 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-all"><Edit2 className="w-4 h-4" /></Link>
                      <button onClick={() => setDeleteId(p.id)} className="p-2 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-black text-white">Supprimer le produit ?</h3>
            <p className="text-zinc-400 text-sm mt-2">Cette action est irréversible. Les mouvements de stock seront conservés.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold text-sm">Annuler</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    

      {showImport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-white flex items-center gap-2"><Upload className="w-5 h-5 text-purple-400" /> Importer CSV / Excel</h3>
              <button onClick={() => setShowImport(false)} className="p-2 hover:bg-zinc-800 text-zinc-400 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-zinc-400 text-xs mb-4">Colonne requises: <code className="text-teal-400">code, name, category, unit, purchasePrice, salePrice, vatRate, currentStock</code></p>
            <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-8 text-center hover:border-purple-500/50 transition-all cursor-pointer"
              onClick={() => document.getElementById('csvFileInput')?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const file = e.dataTransfer.files[0]
                if (file) handleFileUpload(file)
              }}>
              <Upload className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-white font-bold text-sm">Glissez votre fichier ici</p>
              <p className="text-zinc-500 text-xs mt-1">ou cliquez pour parcourir</p>
              <p className="text-zinc-600 text-[10px] mt-2">CSV, XLSX, XLS — max 5MB</p>
            </div>
            <input id="csvFileInput" type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
            {importLoading && <p className="text-purple-400 text-xs text-center mt-4 animate-pulse">Import en cours...</p>}
            {importResult && (
              <div className={`mt-4 p-4 rounded-xl text-xs font-bold ${importResult.errors === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                {importResult.created} créés, {importResult.errors} erreurs
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowImport(false)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold text-sm">Fermer</button>
              <a href="/stock/import" className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Modèle CSV</a>
            </div>
          </div>
        </div>
      )}
</div>
  )
}
