"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertCircle, Wrench, Loader2 } from "lucide-react";
import { useTranslations } from 'next-intl'

interface WorkOrderFormModalProps {
  onClose: () => void;
  onSave: () => void;
  tenantId: string;
}

export function WorkOrderFormModal({ onClose, onSave, tenantId }: WorkOrderFormModalProps) {
  const t = useTranslations('GMAO.work_orders.form')
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    assetId: "",
    title: "",
    description: "",
    type: "PREVENTIVE",
    priority: "MEDIUM",
    status: "OPEN",
    assignedTo: "",
    scheduledDate: new Date().toISOString().split("T")[0],
    cost: "",
    notes: "",
  });

  useEffect(() => {
    // Fetch assets to populate the dropdown
    async function fetchAssets() {
      try {
        const res = await fetch(`/api/gmao/assets?tenantId=${tenantId}`);
        if (res.ok) {
          const data = await res.json();
          setAssets(data);
          if (data.length > 0) {
            setFormData(prev => ({ ...prev, assetId: data[0].id }));
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchAssets();
  }, [tenantId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/gmao/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tenantId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || t('error'));
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
        
        <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div>
            <h2 className="text-2xl font-black text-stone-900">{t('title')}</h2>
            <p className="text-sm font-medium text-stone-500 mt-1">{t('subtitle')}</p>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form id="wo-form" onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700">{t('job_title')} <span className="text-red-500">*</span></label>
              <input required name="title" value={formData.title} onChange={handleChange} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all" placeholder={t('job_placeholder')} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700">{t('asset')} <span className="text-red-500">*</span></label>
                <select required name="assetId" value={formData.assetId} onChange={handleChange} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all">
                  {assets.length === 0 && <option value="">{t('no_asset')}</option>}
                  {assets.map(asset => (
                    <option key={asset.id} value={asset.id}>[{asset.code}] {asset.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700">{t('assigned_to')}</label>
                <input name="assignedTo" value={formData.assignedTo} onChange={handleChange} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all" placeholder={t('technician_placeholder')} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700">{t('type')}</label>
                <select name="type" value={formData.type} onChange={handleChange} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all">
                  <option value="PREVENTIVE">{t('preventive')}</option>
                  <option value="CORRECTIVE">{t('corrective')}</option>
                  <option value="EMERGENCY">{t('emergency')}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700">{t('priority')}</label>
                <select name="priority" value={formData.priority} onChange={handleChange} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all">
                  <option value="LOW">{t('low')}</option>
                  <option value="MEDIUM">{t('medium')}</option>
                  <option value="HIGH">{t('high')}</option>
                  <option value="CRITICAL">{t('critical')}</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700">{t('scheduled')}</label>
                <input type="date" name="scheduledDate" value={formData.scheduledDate} onChange={handleChange} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700">{t('status')}</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all">
                  <option value="OPEN">{t('open')}</option>
                  <option value="IN_PROGRESS">{t('in_progress')}</option>
                  <option value="PAUSED">{t('paused')}</option>
                  <option value="COMPLETED">{t('completed')}</option>
                  <option value="CANCELLED">{t('cancelled')}</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700">{t('description')}</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all" />
            </div>

          </form>
        </div>

        <div className="px-8 py-5 border-t border-stone-100 bg-stone-50/50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-sm text-stone-600 bg-white border border-stone-200 hover:bg-stone-50 transition-colors">
            {t('cancel')}
          </button>
          <button type="submit" form="wo-form" disabled={loading} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('create')}
          </button>
        </div>
      </div>
    </div>
  );
}
