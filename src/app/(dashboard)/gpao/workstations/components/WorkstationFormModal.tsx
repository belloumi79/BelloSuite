"use client";

import { useState } from "react";
import { X, Save, Settings, MapPin, Activity, Loader2 } from "lucide-react";

interface WorkstationFormModalProps {
  onClose: () => void;
  onSave: () => void;
  tenantId: string;
}

export function WorkstationFormModal({ onClose, onSave, tenantId }: WorkstationFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    location: "",
    capacity: "1",
    isActive: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/gpao/workstations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tenantId,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div>
            <h2 className="text-2xl font-black text-stone-900">Nouveau Poste de Charge</h2>
            <p className="text-sm font-medium text-stone-500 mt-1">Centre de frais ou Ligne de production</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form id="workstation-form" onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700">Code <span className="text-red-500">*</span></label>
                <input required name="code" value={formData.code} onChange={handleChange} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none transition-all" placeholder="ex: PC-001" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700">Nom <span className="text-red-500">*</span></label>
                <input required name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none transition-all" placeholder="Ligne d'assemblage A" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-stone-700">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={2} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700 flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> Localisation</label>
                <input name="location" value={formData.location} onChange={handleChange} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none transition-all" placeholder="Atelier principal" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700 flex items-center gap-1"><Activity className="w-3.5 h-3.5"/> Capacité (unités/h)</label>
                <input type="number" step="0.1" name="capacity" value={formData.capacity} onChange={handleChange} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none transition-all" />
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center gap-3">
              <input type="checkbox" id="isActive" name="isActive" checked={formData.isActive} onChange={handleChange} className="w-5 h-5 accent-slate-600 rounded" />
              <label htmlFor="isActive" className="text-sm font-semibold text-stone-700 cursor-pointer">
                Poste opérationnel / Actif
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
            form="workstation-form"
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
