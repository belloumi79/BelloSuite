"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Boxes, Search, Loader2, Layers } from "lucide-react";
import { BOMFormModal } from "./components/BOMFormModal";

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface BOMItem {
  id: string;
  productId: string;
  quantity: string;
}

interface BOM {
  id: string;
  productId: string;
  version: string;
  isActive: boolean;
  items: BOMItem[];
  _count?: {
    items: number;
  };
}

export default function BOMsPage() {
  const [tenantId, setTenantId] = useState("");
  const [boms, setBoms] = useState<BOM[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    try {
      const session = localStorage.getItem("bello_session");
      if (session) {
        const tId = JSON.parse(session).tenantId || "";
        setTenantId(tId);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const currentTenant = tenantId || "demo-tenant";
    fetchBOMsAndProducts(currentTenant);
  }, [tenantId]);

  async function fetchBOMsAndProducts(currentTenant: string) {
    setLoading(true);
    try {
      // Parallel requests
      const [bomRes, curRes] = await Promise.all([
        fetch(`/api/gpao/boms?tenantId=${currentTenant}`),
        fetch(`/api/stock/products?tenantId=${currentTenant}`)
      ]);

      if (bomRes.ok && curRes.ok) {
        const bData = await bomRes.json();
        const pData = await curRes.json();
        
        const pMap: Record<string, Product> = {};
        pData.forEach((p: Product) => {
          pMap[p.id] = p;
        });

        setProductsMap(pMap);
        setBoms(bData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const filteredBoms = boms.filter((bom) => {
    const pName = productsMap[bom.productId]?.name || "";
    return pName.toLowerCase().includes(searchQuery.toLowerCase()) || bom.version.includes(searchQuery);
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight flex items-center gap-3">
            <Boxes className="w-8 h-8 text-indigo-700" />
            Nomenclatures (BOM)
          </h1>
          <p className="text-stone-500 font-medium text-sm mt-1">Gérez les recettes de fabrication et les assemblages.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm shadow-indigo-900/20"
        >
          <Plus className="w-4 h-4" /> Nouvelle BOM
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
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-700" />
          </div>
        ) : filteredBoms.length === 0 ? (
          <div className="text-center py-24 px-4">
            <p className="text-stone-500 font-medium">Aucune nomenclature trouvée.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-stone-50/50">
            {filteredBoms.map((bom) => {
              const product = productsMap[bom.productId];
              
              return (
                <div key={bom.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Layers className="w-5 h-5" />
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded border ${bom.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-50 text-stone-500 border-stone-200'}`}>
                      v{bom.version}
                    </span>
                  </div>
                  
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Produit de base</p>
                  <h3 className="font-bold text-stone-900 text-lg mb-4 line-clamp-2" title={product?.name || "Produit inconnu"}>
                    {product?.name || "Produit Inconnu"}
                  </h3>

                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs text-stone-500 font-semibold mb-1">COMPOSANTS INCLUS</p>
                        <p className="font-black text-2xl text-stone-800">{bom._count?.items || 0}</p>
                      </div>
                      <Layers className="w-8 h-8 text-stone-200" />
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-end">
                    <Link href={`/gpao/boms/${bom.id}`} className="text-sm font-bold text-indigo-600 hover:text-indigo-800">
                      Voir détails &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <BOMFormModal
          tenantId={tenantId || "demo-tenant"}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchBOMsAndProducts(tenantId || "demo-tenant");
          }}
        />
      )}
    </div>
  );
}
