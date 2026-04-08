'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Package, ArrowLeft, Edit2, AlertTriangle, TrendingUp, TrendingDown, Archive, Image } from 'lucide-react'

type Movement = { id: string; type: string; quantity: string; unitPrice: string; reference: string; notes: string; createdAt: string; warehouse: { name: string } | null; product: { name: string } }
type WarehouseStock = { warehouse: { id: string; name: string; code: string }; stock: string }

export default function ProductDetailPage() {
  const { id } = useParams()
  const [product, setProduct] = useState<any>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState('')

  useEffect(() => {
    const session = localStorage.getItem('bello_session')
    if (session) {
      const { tenantId: tid } = JSON.parse(session)
      setTenantId(tid)
      fetch(`/api/stock/products/${id}?tenantId=${tid}`)
        .then(r => r.json())
        .then(d => { setProduct(d); setMovements(d.movements || []) })
        .finally(() => setLoading(false))
    }
  }, [id])

  if (loading) return <div className="p-8 text-zinc-500 font-bold">Chargement...</div>
  if (!product) return <div className="p-8 text-red-400 font-bold">Produit introuvable</div>

  const stock = Number(product.currentStock)
  const min = Number(product.minStock)
  const isOut = stock <= 0
  const isLow = stock > 0 && stock < min
  const stockValue = stock * Number(product.purchasePrice)
  const saleValue = stock * Number(product.salePrice)

  const typeLabel: Record<string, { cls: string; icon: any }> = {
    ENTRY: { cls: 'bg-emerald-500/10 text-emerald-400', icon: TrendingUp },
    EXIT: { cls: 'bg-red-500/10 text-red-400', icon: TrendingDown },
    ADJUSTMENT: { cls: 'bg-amber-500/10 text-amber-400', icon: Archive },
    TRANSFER: { cls: 'bg-blue-500/10 text-blue-400', icon: Archive },
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto min-h-screen bg-transparent pt-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/stock/products" className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-all"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-white tracking-tight">{product.name}</h1>
              <span className="text-zinc-500 text-sm font-mono">{product.code}</span>
            </div>
            <p className="text-zinc-500 text-sm mt-1">{product.category || 'Sans catégorie'} {product.barcode ? `· ${product.barcode}` : ''}</p>
          </div>
        </div>
        <Link href={`/stock/products/${id}/edit`} className="flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-600/20"><Edit2 className="w-5 h-5" /> Modifier</Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-6">
          <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Stock Actuel</p>
          <p className={`text-3xl font-black mt-2 ${isOut ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-white'}`}>{stock}</p>
          {isLow && <AlertTriangle className="w-4 h-4 text-amber-400 mt-1" />}
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-6">
          <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Valeur Achat</p>
          <p className="text-2xl font-black text-white mt-2">{stockValue.toFixed(3)} TND</p>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-6">
          <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Valeur Vente</p>
          <p className="text-2xl font-black text-emerald-400 mt-2">{saleValue.toFixed(3)} TND</p>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-6">
          <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Marge</p>
          <p className="text-2xl font-black text-teal-400 mt-2">{Number(product.purchasePrice) > 0 ? (((Number(product.salePrice) - Number(product.purchasePrice)) / Number(product.purchasePrice)) * 100).toFixed(1) : 0}%</p>
        </div>
      </div>

      {/* Info produit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-8">
          <h2 className="text-lg font-black text-white mb-4">Détails</h2>
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-zinc-500 text-sm">Prix Achat</span><span className="text-white font-mono text-sm">{Number(product.purchasePrice).toFixed(3)} TND</span></div>
            <div className="flex justify-between"><span className="text-zinc-500 text-sm">Prix Vente HT</span><span className="text-emerald-400 font-mono text-sm font-bold">{Number(product.salePrice).toFixed(3)} TND</span></div>
            <div className="flex justify-between"><span className="text-zinc-500 text-sm">TVA</span><span className="text-white font-mono text-sm">{product.vatRate}%</span></div>
            <div className="flex justify-between"><span className="text-zinc-500 text-sm">Stock Min</span><span className="text-amber-400 font-mono text-sm">{min}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500 text-sm">Unité</span><span className="text-white font-mono text-sm">{product.unit}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500 text-sm">FODEC</span><span className="text-white font-mono text-sm">{product.fodec ? 'Oui' : 'Non'}</span></div>
            {product.supplierId && <div className="flex justify-between"><span className="text-zinc-500 text-sm">Fournisseur</span><span className="text-white text-sm">{product.supplierId}</span></div>}
          </div>
          {product.description && <div className="mt-4 pt-4 border-t border-zinc-800"><p className="text-zinc-400 text-xs">{product.description}</p></div>}
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-8">
          <h2 className="text-lg font-black text-white mb-4">Entrepôts</h2>
          {product.warehouseStock && product.warehouseStock.length > 0 ? (
            <div className="space-y-3">
              {product.warehouseStock.map((ws: WarehouseStock) => (
                <div key={ws.warehouse.id} className="flex items-center justify-between bg-zinc-800/50 rounded-xl px-4 py-3">
                  <div><p className="font-bold text-white text-sm">{ws.warehouse.name}</p><p className="text-zinc-600 text-xs font-mono">{ws.warehouse.code}</p></div>
                  <span className="font-black text-lg text-white">{Number(ws.stock)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-zinc-500 text-sm">Aucun entrepôt configuré</p>}
        </div>
      </div>

      {/* Historique mouvements */}
      <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] overflow-hidden">
        <div className="px-8 py-5 border-b border-zinc-800/50">
          <h2 className="text-lg font-black text-white">Derniers Mouvements</h2>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-zinc-800/20">
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Date</th>
              <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Type</th>
              <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Qté</th>
              <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Entrepôt</th>
              <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Référence</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/30">
            {movements.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">Aucun mouvement</td></tr>
            ) : movements.map(m => {
              const t = typeLabel[m.type] || typeLabel.ADJUSTMENT
              const Icon = t.icon
              return (
                <tr key={m.id} className="hover:bg-zinc-800/30">
                  <td className="px-6 py-4 text-zinc-400 text-xs">{new Date(m.createdAt).toLocaleDateString('fr-TN')}</td>
                  <td className="px-4 py-4"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${t.cls}`}><Icon className="w-3 h-3" />{m.type}</span></td>
                  <td className="px-4 py-4 font-black text-sm">{m.type === 'EXIT' ? '-' : '+'}{m.quantity}</td>
                  <td className="px-4 py-4 text-zinc-400 text-xs">{m.warehouse?.name || '—'}</td>
                  <td className="px-4 py-4 text-zinc-500 text-xs font-mono">{m.reference || '—'}</td>
                  <td className="px-6 py-4 text-zinc-500 text-xs">{m.notes || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
