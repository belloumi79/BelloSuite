"use client";

import { useState, useEffect } from "react";
import { Plus, CheckCircle2, Clock, XCircle, Search, Settings, AlertCircle, PlayCircle, CalendarClock } from "lucide-react";
import { ProductionOrderFormModal } from "./components/ProductionOrderFormModal";

interface ProductionOrder {
  id: string;
  productId: string;
  quantity: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  plannedStartDate: string | null;
  workStationId: string | null;
  workStation?: { name: string; code: string };
}

export default function ProductionOrdersPage() {
  const [tenantId, setTenantId] = useState("");
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, {name: string, sku: string}>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const statusConfig = {
    PENDING: { label: "En attente", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
    IN_PROGRESS: { label: "En cours", color: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: PlayCircle },
    COMPLETED: { label: "Terminé", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    CANCELLED: { label: "Annulé", color: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
  };

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
    fetchOrdersAndProducts(currentTenant);
  }, [tenantId]);

  async function fetchOrdersAndProducts(currentTenant: string) {
    setLoading(true);
    try {
      const [ordRes, curRes] = await Promise.all([
        fetch(`/api/gpao/production-orders?tenantId=${currentTenant}`),
        fetch(`/api/stock/products?tenantId=${currentTenant}`)
      ]);

      if (ordRes.ok && curRes.ok) {
        const oData = await ordRes.json();
        const pData = await curRes.json();
        
        const pMap: Record<string, any> = {};
        pData.forEach((p: any) => {
          pMap[p.id] = p;
        });

        setProductsMap(pMap);
        setOrders(oData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/gpao/production-orders/${id}?tenantId=${tenantId || "demo-tenant"}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenantId || "demo-tenant", status })
      });
      fetchOrdersAndProducts(tenantId || "demo-tenant");
    } catch(err) {
      console.error(err);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const pName = productsMap[order.productId]?.name || "";
    return pName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight flex items-center gap-3">
            <Settings className="w-8 h-8 text-emerald-600" />
            Ordres de Fabrication (OF)
          </h1>
          <p className="text-stone-500 font-medium text-sm mt-1">Pilotez et suivez vos lancements en production.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm shadow-emerald-900/20"
        >
          <Plus className="w-4 h-4" /> Nouvel OF
        </button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input 
            type="text" 
            placeholder="Rechercher par produit..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="text-emerald-600 animate-spin"><Settings className="w-8 h-8"/></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-24 px-4 bg-white rounded-2xl border border-stone-200 shadow-sm mt-8">
          <p className="text-stone-500 font-medium">Aucun ordre de fabrication trouvé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => {
            const product = productsMap[order.productId];
            const StatusIcon = statusConfig[order.status]?.icon || AlertCircle;
            const statusStyle = statusConfig[order.status];

            return (
              <div key={order.id} className="bg-white border border-stone-200 rounded-2xl p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                {/* Decorative background element based on status */}
                <div className={`absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-20 transition-all ${
                  order.status === 'COMPLETED' ? 'bg-emerald-500' : 
                  order.status === 'IN_PROGRESS' ? 'bg-yellow-500' : 
                  order.status === 'CANCELLED' ? 'bg-red-500' : 'bg-blue-500'
                }`} />

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold ${statusStyle.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {statusStyle.label}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-stone-400 font-bold tracking-wider uppercase">CIBLE</p>
                    <p className="font-black text-xl text-stone-800">{order.quantity} x</p>
                  </div>
                </div>

                <div className="relative z-10 mb-5 flex-1">
                  <h3 className="font-bold text-stone-900 text-lg line-clamp-2 leading-tight mb-2" title={product?.name}>
                    {product?.name || "Produit Inconnu"}
                  </h3>
                  <p className="text-xs font-mono font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded inline-block">
                    {product?.sku || "N/A"}
                  </p>
                </div>

                <div className="space-y-2 mb-6 relative z-10 p-3 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="flex items-center gap-2 text-xs font-medium text-stone-600">
                    <Settings className="w-3.5 h-3.5 text-stone-400" />
                    <span className="truncate">{order.workStation?.name || "Aucun Poste Assigné"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-stone-600">
                    <CalendarClock className="w-3.5 h-3.5 text-stone-400" />
                    <span>{order.plannedStartDate ? new Date(order.plannedStartDate).toLocaleDateString() : "Non planifié"}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-stone-100 flex items-center justify-between relative z-10 gap-2">
                  <div className="flex bg-stone-100 rounded-lg p-1">
                    {order.status !== "PENDING" && (
                      <button onClick={() => updateStatus(order.id, "PENDING")} className="px-2 py-1 text-xs font-bold text-stone-500 hover:text-blue-600 hover:bg-white rounded transition-all">
                        Attente
                      </button>
                    )}
                    {order.status !== "IN_PROGRESS" && order.status !== "COMPLETED" && (
                      <button onClick={() => updateStatus(order.id, "IN_PROGRESS")} className="px-2 py-1 text-xs font-bold text-stone-500 hover:text-yellow-600 hover:bg-white rounded transition-all">
                        Lancer
                      </button>
                    )}
                    {order.status === "IN_PROGRESS" && (
                      <button onClick={() => updateStatus(order.id, "COMPLETED")} className="px-2 py-1 text-xs font-bold text-emerald-600 hover:bg-white rounded transition-all">
                        Terminer!
                      </button>
                    )}
                  </div>
                  {(order.status === "PENDING" || order.status === "IN_PROGRESS") && (
                    <button onClick={() => updateStatus(order.id, "CANCELLED")} className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Annuler l'OF">
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ProductionOrderFormModal
          tenantId={tenantId || "demo-tenant"}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchOrdersAndProducts(tenantId || "demo-tenant");
          }}
        />
      )}
    </div>
  );
}
