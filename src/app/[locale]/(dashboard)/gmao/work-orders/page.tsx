"use client";

import { useState, useEffect } from "react";
import { Plus, Wrench, AlertCircle, Clock, CheckCircle2, Search, Loader2 } from "lucide-react";
import { WorkOrderFormModal } from "./components/WorkOrderFormModal";

interface WorkOrder {
  id: string;
  title: string;
  type: "PREVENTIVE" | "CORRECTIVE" | "EMERGENCY";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "IN_PROGRESS" | "PAUSED" | "COMPLETED" | "CANCELLED";
  assignedTo: string | null;
  scheduledDate: string | null;
  asset: { name: string; code: string };
}

const statusColors = {
  OPEN: "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  PAUSED: "bg-stone-100 text-stone-600 border-stone-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

const priorityIcons = {
  LOW: <Clock className="w-4 h-4 text-stone-400" />,
  MEDIUM: <AlertCircle className="w-4 h-4 text-blue-500" />,
  HIGH: <AlertCircle className="w-4 h-4 text-amber-500" />,
  CRITICAL: <AlertCircle className="w-4 h-4 text-red-600" />,
};

const typeLabels = {
  PREVENTIVE: "Préventive",
  CORRECTIVE: "Corrective",
  EMERGENCY: "Urgence",
};

export default function WorkOrdersPage() {
  const [tenantId, setTenantId] = useState("");
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    try {
      const session = localStorage.getItem("bello_session");
      if (session) {
        setTenantId(JSON.parse(session).tenantId || "");
      }
    } catch {}
  }, []);

  useEffect(() => {
    const currentTenant = tenantId || "demo-tenant";
    fetchWorkOrders(currentTenant);
  }, [tenantId]);

  async function fetchWorkOrders(currentTenant: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/gmao/work-orders?tenantId=${currentTenant}`);
      if (res.ok) {
        const data = await res.json();
        setWorkOrders(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = workOrders.filter((wo) =>
    (wo.title + wo.asset.name + (wo.assignedTo || "")).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight flex items-center gap-3">
            <Wrench className="w-8 h-8 text-teal-600" />
            Ordres de Travail
          </h1>
          <p className="text-stone-500 font-medium text-sm mt-1">Gérez et suivez les interventions de maintenance.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm transition-all shadow-sm shadow-teal-500/20"
        >
          <Plus className="w-4 h-4" /> Nouvelle Intervention
        </button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input 
            type="text" 
            placeholder="Rechercher par titre, machine, technicien..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-24 px-4">
            <p className="text-stone-500 font-medium">Aucun ordre de travail trouvé.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-stone-50/50">
            {filteredOrders.map((wo) => (
              <div key={wo.id} className="bg-white border text-left border-stone-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className={`absolute top-0 left-0 w-1 h-full ${
                  wo.priority === 'CRITICAL' ? 'bg-red-500' :
                  wo.priority === 'HIGH' ? 'bg-amber-500' :
                  wo.priority === 'MEDIUM' ? 'bg-blue-500' : 'bg-stone-300'
                }`} />
                
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    {priorityIcons[wo.priority]}
                    <span className={`text-xs font-bold px-2 py-1 rounded border ${statusColors[wo.status]}`}>
                      {wo.status}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2 py-1 rounded">
                    {typeLabels[wo.type]}
                  </span>
                </div>
                
                <h3 className="font-bold text-stone-900 mb-1">{wo.title}</h3>
                <p className="text-sm font-medium text-teal-600 mb-4">{wo.asset.name} <span className="text-stone-400 text-xs font-normal">[{wo.asset.code}]</span></p>

                <div className="flex items-center justify-between text-xs font-medium text-stone-500 mt-4 pt-4 border-t border-stone-100">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{wo.assignedTo || "Non assigné"}</span>
                  </div>
                  {wo.scheduledDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(wo.scheduledDate).toLocaleDateString('fr-TN')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <WorkOrderFormModal
          tenantId={tenantId || "demo-tenant"}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchWorkOrders(tenantId || "demo-tenant");
          }}
        />
      )}
    </div>
  );
}

// Temporary internal Calendar icon since lucide-react might not be directly imported in the scope above
const Calendar = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
);
