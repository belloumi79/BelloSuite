"use client";

import { useState, useEffect } from "react";
import { X, Save, Calendar, FileText, Settings, Flag, Loader2 } from "lucide-react";

interface ProductionOrderFormModalProps {
  onClose: () => void;
  onSave: () => void;
  tenantId: string;
}

export function ProductionOrderFormModal({ onClose, onSave, tenantId }: ProductionOrderFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [workstations, setWorkstations] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    productId: "",
    workStationId: "",
    quantity: "1",
    status: "PENDING",
    plannedStartDate: "",
    plannedEndDate: "",
    notes: ""
  });

  useEffect(() => {
    // Fetch products and workstations for selects
    Promise.all([
      fetch(`/api/stock/products?tenantId=${tenantId}`).then(res => res.json()),
      fetch(`/api/gpao/workstations?tenantId=${tenantId}`).then(res => res.json())
    ])
    .then(([prods, stations]) => {
      setProducts(prods);
      setWorkstations(stations);
    })
    .catch(console.error);
  }, [tenantId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Filter out empty date strings to pass null implicitly
    const payload = { ...formData, tenantId };
    if (!payload.plannedStartDate) delete (payload as any).plannedStartDate;
    if (!payload.plannedEndDate) delete (payload as any).plannedEndDate;

    try {
      const res = await fetch("/api/gpao/production-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erreur création OF");
      }

      onSave();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between bg-emerald-50/50">
          <div>
            <h2 className="text-2xl font-black text-stone-900">Nouvel Ordre de Fabrication (OF)</h2>
            <p className="text-sm font-medium text-emerald-800 mt-1">Planifier une production sur poste</p>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form id="of-form" onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-stone-700">Produit à Fabriquer <span className="text-red-500">*</span></label>
                <select required name="productId" value={formData.productId} onChange={handleChange} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                  <option value="">Sélectionner un produit...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700">Quantité Cible <span className="text-red-500">*</span></label>
                <input required type="number" step="0.1" name="quantity" value={formData.quantity} onChange={handleChange} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700">Poste de Charge (Optionnel)</label>
                <select name="workStationId" value={formData.workStationId} onChange={handleChange} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                  <option value="">(Non assigné)</option>
                  {workstations.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.name} ({ws.code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700 flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> Début Planifié</label>
                <input type="datetime-local" name="plannedStartDate" value={formData.plannedStartDate} onChange={handleChange} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700 flex items-center gap-1"><Flag className="w-3.5 h-3.5"/> Fin Planifiée</label>
                <input type="datetime-local" name="plannedEndDate" value={formData.plannedEndDate} onChange={handleChange} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-stone-700 flex items-center gap-1"><FileText className="w-3.5 h-3.5"/> Notes et Instructions</label>
                <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="Détails de production..."/>
              </div>

            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-stone-100 bg-stone-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-sm text-stone-600 bg-white border border-stone-200 hover:bg-stone-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="of-form"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lancer l'OF
          </button>
        </div>
      </div>
    </div>
  );
}
