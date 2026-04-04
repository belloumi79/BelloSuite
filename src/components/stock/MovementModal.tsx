'use client'

import { useState } from 'react'
import { X, ArrowRightLeft } from 'lucide-react'

interface MovementModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  tenantId: string
  productId?: string
  productName?: string
}

export default function MovementModal({ isOpen, onClose, onSuccess, tenantId, productId, productName }: MovementModalProps) {
  const [formData, setFormData] = useState({
    type: 'ENTRY',
    quantity: 0,
    unitPrice: 0,
    reference: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/stock/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tenantId, productId }),
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
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-stone-900">Mouvement de Stock</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-stone-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl mb-4 text-sm text-teal-800">
            <strong>Produit:</strong> {productName || 'Chargement...'}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700">Type de mouvement</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'ENTRY'})}
                className={`py-2 rounded-lg border text-sm font-bold transition-all ${
                  formData.type === 'ENTRY' 
                  ? 'bg-emerald-600 text-white border-emerald-600' 
                  : 'bg-white text-stone-500 border-stone-200 hover:border-emerald-300'
                }`}
              >
                ENTRÉE (+)
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'EXIT'})}
                className={`py-2 rounded-lg border text-sm font-bold transition-all ${
                  formData.type === 'EXIT' 
                  ? 'bg-red-600 text-white border-red-600' 
                  : 'bg-white text-stone-500 border-stone-200 hover:border-red-300'
                }`}
              >
                SORTIE (-)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">Quantité</label>
              <input 
                required
                type="number"
                min="0.001"
                step="any"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-lg font-bold"
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">P.U {formData.type === 'ENTRY' ? "(Achat)" : "(Vente)"}</label>
              <input 
                type="number"
                step="0.001"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                value={formData.unitPrice}
                onChange={e => setFormData({...formData, unitPrice: parseFloat(e.target.value)})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700">Référence (N° Facture / BL)</label>
            <input 
              className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              value={formData.reference}
              onChange={e => setFormData({...formData, reference: e.target.value})}
              placeholder="Ex: BL-2026-001"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700">Notes</label>
            <textarea 
              rows={2}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              placeholder="..."
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-bold transition-all disabled:opacity-50 mt-4 text-white shadow-lg ${
              formData.type === 'ENTRY' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading ? 'Validation...' : 'Confirmer le mouvement'}
          </button>
        </form>
      </div>
    </div>
  )
}
