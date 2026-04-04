'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  tenantId: string
}

export default function ProductModal({ isOpen, onClose, onSuccess, tenantId }: ProductModalProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    unit: 'unité',
    purchasePrice: 0,
    salePrice: 0,
    minStock: 0,
    initialStock: 0,
  })
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/stock/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tenantId }),
      })
      if (res.ok) {
        onSuccess()
        onClose()
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-stone-200">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-bold text-stone-900">Nouveau Produit</h3>
          <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">Code SKU</label>
              <input 
                required
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                value={formData.code}
                onChange={e => setFormData({...formData, code: e.target.value})}
                placeholder="PROD-001"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">Catégorie</label>
              <input 
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                placeholder="Fournitures"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700">Nom du produit</label>
            <input 
              required
              className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Ex: Ramette Papier A4"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">Prix Achat</label>
              <input 
                type="number"
                step="0.001"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                value={formData.purchasePrice}
                onChange={e => setFormData({...formData, purchasePrice: parseFloat(e.target.value)})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">Prix Vente</label>
              <input 
                type="number"
                step="0.001"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono text-teal-600 font-bold"
                value={formData.salePrice}
                onChange={e => setFormData({...formData, salePrice: parseFloat(e.target.value)})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">Minimum Stock</label>
              <input 
                type="number"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                value={formData.minStock}
                onChange={e => setFormData({...formData, minStock: parseFloat(e.target.value)})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">Stock Initial</label>
              <input 
                type="number"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-stone-50"
                value={formData.initialStock}
                onChange={e => setFormData({...formData, initialStock: parseFloat(e.target.value)})}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 mt-4 shadow-lg shadow-teal-500/20"
          >
            {loading ? 'Création...' : 'Valider le produit'}
          </button>
        </form>
      </div>
    </div>
  )
}
