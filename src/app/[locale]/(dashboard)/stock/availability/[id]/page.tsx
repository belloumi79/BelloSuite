'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Package, Search } from 'lucide-react'

export default function WarehouseAvailabilityPage() {
  const t = useTranslations()
  const params = useParams()
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const s = localStorage.getItem('bello_session')
    if (s) {
      const { tenantId } = JSON.parse(s)
      fetch(`/api/stock/availability?tenantId=${tenantId}&warehouseId=${params.id}`)
        .then(r => r.json())
        .then(d => { setProducts(d.data || []); setLoading(false) })
    }
  }, [params.id])

  const filtered = products.filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-8 space-y-6 font-sans">
      <div className="text-start">
        <h1 className="text-3xl font-black text-white tracking-tight">{t('Stock.warehouse_availability_title')}</h1>
        <p className="text-zinc-500 mt-1">{t('Stock.warehouse_availability_description')}</p>
      </div>
      <div className="relative max-w-sm">
        <Search className="w-5 h-5 absolute inset-inline-start-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Stock.search_product_placeholder')} className="w-full bg-zinc-900/40 border border-zinc-800 rounded-xl ps-12 pe-4 py-3 text-white outline-none focus:border-teal-500/50 transition-all" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-zinc-500 col-span-3 text-start font-bold">{t('Stock.loading')}</p>
        ) : filtered.length === 0 ? (
          <p className="text-zinc-500 col-span-3 text-start font-bold">{t('Stock.no_product')}</p>
        ) : filtered.map((p: any) => (
          <div key={p.id} className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 hover:bg-zinc-900/60 transition-colors">
            <div className="flex items-center gap-3 mb-3 rtl:flex-row-reverse text-start">
              <Package className="w-6 h-6 text-zinc-500" />
              <div>
                <p className="font-bold text-white">{p.name}</p>
                <p className="text-[10px] font-mono text-zinc-500">{p.code}</p>
              </div>
            </div>
            <div className="flex justify-between items-end rtl:flex-row-reverse text-start">
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('Stock.inventory')}</p>
                <p className={`text-2xl font-black ${Number(p.stock) < Number(p.minStock) ? 'text-amber-500' : 'text-white'}`}>{p.stock}</p>
              </div>
              <p className="text-xs text-zinc-500 font-medium">{p.warehouse}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
