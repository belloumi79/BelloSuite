"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Factory, Boxes, Settings, Activity, ArrowRight, Loader2, PlayCircle, CheckCircle2 } from "lucide-react";

interface DashboardData {
  metrics: {
    totalWorkstations: number;
    totalBoms: number;
    productionOrdersCount: number;
    activeOrders: number;
  };
  recentOrders: any[];
}

export default function GPAODashboardPage() {
  const [tenantId, setTenantId] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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
    fetch(`/api/gpao/dashboard?tenantId=${currentTenant}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(console.error);
  }, [tenantId]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    );
  }

  const m = data?.metrics;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* HEADER SECTION */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold mb-3 border border-purple-200">
          <Activity className="w-4 h-4" /> Systèmes de Production
        </div>
        <h1 className="text-4xl font-black text-stone-900 tracking-tight">GPAO Dashboard</h1>
        <p className="text-stone-500 font-medium text-lg mt-2">Vue d'ensemble sur vos capacités de production et ordres de fabrication (OF).</p>
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
            <Factory className="w-6 h-6" />
          </div>
          <p className="text-stone-500 font-medium text-sm">Postes de Charge (Actifs)</p>
          <div className="flex items-end gap-3 mt-1">
            <span className="text-4xl font-black text-stone-900">{m?.totalWorkstations || 0}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
            <Boxes className="w-6 h-6" />
          </div>
          <p className="text-stone-500 font-medium text-sm">Nomenclatures (BOMs)</p>
          <div className="flex items-end gap-3 mt-1">
            <span className="text-4xl font-black text-stone-900">{m?.totalBoms || 0}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
            <PlayCircle className="w-6 h-6" />
          </div>
          <p className="text-stone-500 font-medium text-sm">Ordres en cours</p>
          <div className="flex items-end gap-3 mt-1">
            <span className="text-4xl font-black text-stone-900">{m?.activeOrders || 0}</span>
            <span className="text-sm font-bold text-emerald-600 mb-1">En Prod</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
            <Settings className="w-6 h-6" />
          </div>
          <p className="text-stone-500 font-medium text-sm">Total des OFs Historisé</p>
          <div className="flex items-end gap-3 mt-1">
            <span className="text-4xl font-black text-stone-900">{m?.productionOrdersCount || 0}</span>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS & MAP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Navigation Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/gpao/workstations" className="group bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden transition-all hover:shadow-xl hover:shadow-indigo-900/20 hover:-translate-y-1">
            <Factory className="w-12 h-12 text-indigo-400 mb-6 opacity-80 group-hover:scale-110 transition-transform duration-500" />
            <h3 className="text-2xl font-black mb-2">Postes de Charge</h3>
            <p className="text-indigo-200 text-sm font-medium pr-12">Configurez la capacité de vos lignes de production et ateliers matériels.</p>
            <div className="absolute bottom-8 right-8 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
              <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link href="/gpao/boms" className="group bg-gradient-to-br from-emerald-800 to-teal-900 rounded-3xl p-8 text-white relative overflow-hidden transition-all hover:shadow-xl hover:shadow-emerald-900/20 hover:-translate-y-1">
            <Boxes className="w-12 h-12 text-emerald-400 mb-6 opacity-80 group-hover:scale-110 transition-transform duration-500" />
            <h3 className="text-2xl font-black mb-2">Nomenclatures (BOM)</h3>
            <p className="text-emerald-200 text-sm font-medium pr-12">Saisissez les recettes et les quantités de matériaux pour vos produits.</p>
            <div className="absolute bottom-8 right-8 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
              <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
          
          <Link href="/gpao/production-orders" className="md:col-span-2 group bg-stone-50 border border-stone-200 rounded-3xl p-8 relative overflow-hidden transition-all hover:shadow-xl hover:border-stone-300 hover:-translate-y-1">
            <Settings className="w-12 h-12 text-slate-700 mb-6 opacity-80 group-hover:rotate-90 transition-transform duration-500" />
            <h3 className="text-2xl font-black text-stone-900 mb-2">Ordres de Fabrication</h3>
            <p className="text-stone-500 text-sm font-medium pr-12 max-w-lg">Planifiez, allouez sur vos postes de charge et suivez l'avancement "Temps Réel" de vos productions (OFs).</p>
            <div className="absolute bottom-8 right-8 w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Recent Activity List */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-stone-900">Récents OFs</h2>
            <Link href="/gpao/production-orders" className="text-sm font-bold text-purple-600 hover:text-purple-700">Voir tout</Link>
          </div>
          
          <div className="flex-1 space-y-4">
            {data?.recentOrders && data.recentOrders.length > 0 ? (
              data.recentOrders.map((order) => (
                <div key={order.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-100">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : order.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-600' : 'bg-stone-100 text-stone-500'}`}>
                    {order.status === 'COMPLETED' ? <CheckCircle2 className="w-5 h-5" /> : order.status === 'IN_PROGRESS' ? <PlayCircle className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900 line-clamp-1">QTE Cible: {order.quantity}</p>
                    <p className="text-xs font-medium text-stone-500 mt-0.5">{order.workStation?.name || "Sans poste assigné"}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <p className="text-sm font-medium text-stone-400">Aucun historique d'ordre.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
