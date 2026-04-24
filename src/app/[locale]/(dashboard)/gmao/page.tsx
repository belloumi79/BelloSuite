"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wrench, Settings, AlertTriangle, TrendingUp, Cpu, CalendarClock, ChevronRight } from "lucide-react";

interface DashboardStats {
  assets: {
    total: number;
    active: number;
    broken: number;
    maintenance: number;
  };
  workOrders: {
    total: number;
    open: number;
    inProgress: number;
    critical: number;
    corrective: number;
    preventive: number;
  };
}

export default function GMAODashboard() {
  const [tenantId, setTenantId] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session')
        if (res.ok) {
          const session = await res.json()
          setTenantId(session.tenantId || "")
        }
      } catch (err) {
        console.error('Session check failed:', err)
      }
    }
    checkSession()
  }, []);

  useEffect(() => {
    const currentTenant = tenantId || "demo-tenant";
    async function fetchStats() {
      setLoading(true);
      try {
        const res = await fetch(`/api/gmao/dashboard?tenantId=${currentTenant}`);
        if(res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!stats) return null;

  const availabilityRate = stats.assets.total > 0 
    ? Math.round((stats.assets.active / stats.assets.total) * 100) 
    : 100;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-stone-900 tracking-tight flex items-center gap-3">
          <Wrench className="w-8 h-8 text-teal-600" />
          Dashboard GMAO
        </h1>
        <p className="text-stone-500 font-medium text-sm mt-1">Vue globale sur vos équipements et interventions de maintenance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-stone-600 text-sm">Taux de Disponibilité</h3>
            <div className="p-3 bg-emerald-50 rounded-2xl">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <p className="text-4xl font-black text-stone-900">{availabilityRate}%</p>
          <p className="text-sm font-medium text-stone-500 mt-2">{stats.assets.broken} machine(s) en panne sur {stats.assets.total}</p>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-stone-600 text-sm">Équipements Actifs</h3>
            <div className="p-3 bg-teal-50 rounded-2xl">
              <Cpu className="w-6 h-6 text-teal-600" />
            </div>
          </div>
          <p className="text-4xl font-black text-stone-900">{stats.assets.total}</p>
          <p className="text-sm font-medium text-stone-500 mt-2">{stats.assets.active} en service, {stats.assets.maintenance} en maintenance</p>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-stone-600 text-sm">Interventions en cours</h3>
            <div className="p-3 bg-blue-50 rounded-2xl">
              <CalendarClock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-4xl font-black text-stone-900">{stats.workOrders.inProgress}</p>
          <p className="text-sm font-medium text-stone-500 mt-2">{stats.workOrders.open} en attente (Ouvert)</p>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-stone-600 text-sm">Interventions Critiques</h3>
            <div className="p-3 bg-red-50 rounded-2xl">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-4xl font-black text-red-600">{stats.workOrders.critical}</p>
          <p className="text-sm font-medium text-stone-500 mt-2">Nécessite une action immédiate</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Link 
          href="/gmao/assets" 
          className="group block bg-gradient-to-br from-stone-900 to-stone-800 rounded-[2.5rem] p-8 md:p-10 text-white relative overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
             <Settings className="w-48 h-48" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between min-h-[200px]">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                  <Cpu className="w-6 h-6" />
                </div>
              </div>
              <h2 className="text-2xl font-black mb-2">Parc d'Équipements</h2>
              <p className="text-stone-300 font-medium max-w-sm">
                Ajoutez, gérez et suivez l'état de toutes vos machines et installations matérielles.
              </p>
            </div>
            
            <div className="flex items-center justify-between mt-auto pt-8">
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full border-2 border-stone-800 bg-emerald-500 flex items-center justify-center font-bold text-xs" title="En service">+{stats.assets.active}</div>
                <div className="w-10 h-10 rounded-full border-2 border-stone-800 bg-amber-500 flex items-center justify-center font-bold text-xs" title="En maintenance">{stats.assets.maintenance}</div>
                <div className="w-10 h-10 rounded-full border-2 border-stone-800 bg-red-500 flex items-center justify-center font-bold text-xs" title="En panne">{stats.assets.broken}</div>
              </div>
              <div className="flex items-center gap-2 font-bold text-sm bg-white/10 px-5 py-2.5 rounded-full group-hover:bg-white group-hover:text-stone-900 transition-colors">
                Explorer <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </Link>

        <Link 
          href="/gmao/work-orders" 
          className="group block bg-gradient-to-br from-teal-600 to-emerald-600 rounded-[2.5rem] p-8 md:p-10 text-white relative overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
             <Wrench className="w-48 h-48" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between min-h-[200px]">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                  <CalendarClock className="w-6 h-6" />
                </div>
              </div>
              <h2 className="text-2xl font-black mb-2">Ordres de Travail</h2>
              <p className="text-teal-50 font-medium max-w-sm">
                Planifiez des opérations de maintenance préventive et gérez les urgences.
              </p>
            </div>
            
            <div className="flex items-center justify-between mt-auto pt-8">
              <div className="flex items-center gap-4 text-sm font-bold bg-black/10 px-5 py-2.5 rounded-2xl">
                <span>Total: {stats.workOrders.total}</span>
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                <span className="text-rose-200">{stats.workOrders.critical} critiques</span>
              </div>
              
              <div className="flex items-center gap-2 font-bold text-sm bg-black/10 px-5 py-2.5 rounded-full group-hover:bg-white group-hover:text-teal-900 transition-colors">
                Gérer <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
