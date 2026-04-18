"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Settings, AlertTriangle, Wrench, Search, Loader2 } from "lucide-react";
import { AssetFormModal } from "./components/AssetFormModal";

interface Asset {
  id: string;
  code: string;
  name: string;
  category: string | null;
  location: string | null;
  status: "ACTIVE" | "IN_MAINTENANCE" | "BROKEN" | "RETIRED";
  _count?: {
    workOrders: number;
  };
}

const statusColors = {
  ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  IN_MAINTENANCE: "bg-amber-100 text-amber-800 border-amber-200",
  BROKEN: "bg-red-100 text-red-800 border-red-200",
  RETIRED: "bg-stone-100 text-stone-500 border-stone-200",
};

const statusLabels = {
  ACTIVE: "En Service",
  IN_MAINTENANCE: "En Maintenance",
  BROKEN: "En Panne",
  RETIRED: "Hors Service",
};

export default function AssetsPage() {
  const [tenantId, setTenantId] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    try {
      const session = localStorage.getItem("bello_session");
      if (session) {
        const parsed = JSON.parse(session);
        setTenantId(parsed.tenantId || "");
      }
    } catch {}
  }, []);

  useEffect(() => {
    const currentTenant = tenantId || "demo-tenant";
    fetchAssets(currentTenant);
  }, [tenantId]);

  async function fetchAssets(currentTenant: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/gmao/assets?tenantId=${currentTenant}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const filteredAssets = assets.filter((asset) =>
    (asset.name + asset.code + (asset.location || "")).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight flex items-center gap-3">
            <Settings className="w-8 h-8 text-teal-600" />
            Équipements & Machines
          </h1>
          <p className="text-stone-500 font-medium text-sm mt-1">Gérez le parc matériel de votre entreprise</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm transition-all shadow-sm shadow-teal-500/20"
          >
            <Plus className="w-4 h-4" /> Nouvel Équipement
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input 
            type="text" 
            placeholder="Rechercher par nom, code, emplacement..." 
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
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-24 px-4">
            <p className="text-stone-500 font-medium">Aucun équipement trouvé.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="px-6 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">Équipement</th>
                  <th className="px-6 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">Emplacement</th>
                  <th className="px-6 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-stone-500 uppercase tracking-wider">Interventions</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-stone-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-bold text-stone-700 bg-stone-100 px-2 py-1 rounded">
                        {asset.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-black text-stone-900">{asset.name}</p>
                      <p className="text-xs text-stone-500 font-medium">{asset.category || "—"}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600 font-medium">
                      {asset.location || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[asset.status]}`}>
                        {statusLabels[asset.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 text-stone-700 rounded-full text-xs font-bold">
                        <Wrench className="w-3 h-3" />
                        {asset._count?.workOrders || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* Action buttons */}
                      <Link 
                        href={`/gmao/assets/${asset.id}`} 
                        className="text-teal-600 hover:text-teal-700 font-semibold text-sm mr-4"
                      >
                        Détails
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <AssetFormModal
          tenantId={tenantId || "demo-tenant"}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchAssets(tenantId || "demo-tenant");
          }}
        />
      )}
    </div>
  );
}
