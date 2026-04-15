"use client";

import { useState, useEffect } from "react";
import { X, Save, Plus, Trash2, PackageSearch, Loader2 } from "lucide-react";

interface BOMFormModalProps {
  onClose: () => void;
  onSave: () => void;
  tenantId: string;
}

export function BOMFormModal({ onClose, onSave, tenantId }: BOMFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Lists
  const [products, setProducts] = useState<any[]>([]);
  const [items, setItems] = useState<{ productId: string; quantity: string }[]>([]);

  const [formData, setFormData] = useState({
    productId: "",
    version: "1.0",
    isActive: true,
  });

  useEffect(() => {
    // Fetch products catalog for the select dropdowns
    fetch(`/api/stock/products?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(console.error);
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError("Une nomenclature doit contenir au moins un composant.");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/gpao/boms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tenantId,
          items: items.map(i => ({ productId: i.productId, quantity: Number(i.quantity) }))
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Une erreur est survenue lors de la création.");
      }

      onSave();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addItemRow = () => {
    setItems([...items, { productId: "", quantity: "1" }]);
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div>
            <h2 className="text-2xl font-black text-stone-900">Nouvelle Nomenclature (BOM)</h2>
            <p className="text-sm font-medium text-stone-500 mt-1">Définissez la recette de fabrication d'un produit</p>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form id="bom-form" onSubmit={handleSubmit} className="space-y-8">
            
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            {/* Information Principale */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Produit Final</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700">Produit à Fabriquer <span className="text-red-500">*</span></label>
                  <select 
                    required 
                    value={formData.productId} 
                    onChange={e => setFormData({...formData, productId: e.target.value})}
                    className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none transition-all"
                  >
                    <option value="">Sélectionner un produit...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700">Version de Nomenclature <span className="text-red-500">*</span></label>
                  <input required value={formData.version} onChange={e => setFormData({...formData, version: e.target.value})} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none transition-all" placeholder="v1.0" />
                </div>
              </div>
            </div>

            {/* Composants (BOM Items) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Composants (Matières premières)</h3>
                <button type="button" onClick={addItemRow} className="text-sm font-bold text-slate-700 flex items-center gap-1 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg">
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </div>

              {items.length === 0 ? (
                <div className="border-2 border-dashed border-stone-200 rounded-xl p-8 text-center bg-stone-50/50">
                  <PackageSearch className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                  <p className="text-stone-500 font-medium">Ajoutez les matières nécessaires pour fabriquer ce produit.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                      <div className="flex-1">
                        <select 
                          required 
                          value={item.productId} 
                          onChange={e => handleItemChange(index, "productId", e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm"
                        >
                          <option value="">Sélectionner une M.P...</option>
                          {products.map(p => (
                            <option key={`item-${p.id}`} value={p.id}>{p.name} ({p.sku})</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-32">
                        <input 
                          type="number" step="0.01" required min="0.01"
                          value={item.quantity} 
                          placeholder="Qté"
                          onChange={e => handleItemChange(index, "quantity", e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm"
                        />
                      </div>
                      <button type="button" onClick={() => removeItemRow(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex items-center gap-3">
              <input type="checkbox" id="isActiveB" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5 accent-slate-600 rounded" />
              <label htmlFor="isActiveB" className="text-sm font-semibold text-stone-700 cursor-pointer">
                Nomenclature Active
              </label>
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
            form="bom-form"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-slate-700 hover:bg-slate-600 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
