"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Factory, MapPin, Activity, Search, Loader2 } from "lucide-react";
import { WorkstationFormModal } from "./components/WorkstationFormModal";

interface Workstation {
  id: string;
  code: string;
  name: string;
  description: string;
  location: string | null;
  capacity: string;
  isActive: boolean;
  _count?: {
    productionOrders: number;
  };
}

export default function WorkstationsPage() {
  const [tenantId, setTenantId] = useState("");
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
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
    fetchWorkstations(currentTenant);
  }, [tenantId]);

  async function fetchWorkstations(currentTenant: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/gpao/workstations?tenantId=${currentTenant}`);
      if (res.ok) {
        const data = await res.json();
        setWorkstations(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const filteredWorkstations = workstations.filter((ws) =>
    (ws.name + ws.code + (ws.location || "")).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight flex items-center gap-3">
            <Factory className="w-8 h-8 text-slate-700" />
            Postes de Charge
          </h1>
          <p className="text-stone-500 font-medium text-sm mt-1">Vos lignes de production et centres de frais matériels.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm shadow-slate-900/20"
        >
          <Plus className="w-4 h-4" /> Nouveau Poste
        </button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input 
            type="text" 
            placeholder="Rechercher un poste..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
          </div>
        ) : filteredWorkstations.length === 0 ? (
          <div className="text-center py-24 px-4">
            <p className="text-stone-500 font-medium">Aucun poste de charge trouvé.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-stone-50/50">
            {filteredWorkstations.map((ws) => (
              <div key={ws.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <Factory className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded border ${ws.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-50 text-stone-500 border-stone-200'}`}>
                    {ws.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                
                <h3 className="font-bold text-stone-900 text-lg mb-1">{ws.name}</h3>
                <p className="font-mono text-xs font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded inline-block mb-4">
                  {ws.code}
                </p>

                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2 text-sm text-stone-600 font-medium">
                    <MapPin className="w-4 h-4 text-stone-400" />
                    <span>{ws.location || "Non défini"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-stone-600 font-medium">
                    <Activity className="w-4 h-4 text-stone-400" />
                    <span>Capacité: {ws.capacity} un/h</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded">
                    {ws._count?.productionOrders || 0} OFs liés
                  </span>
                  <Link href={`/gpao/workstations/${ws.id}`} className="text-sm font-bold text-slate-700 hover:text-slate-900">
                    Gérer &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <WorkstationFormModal
          tenantId={tenantId || "demo-tenant"}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchWorkstations(tenantId || "demo-tenant");
          }}
        />
      )}
    </div>
  );
}
