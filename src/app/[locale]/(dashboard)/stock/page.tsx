'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Coins, Package, AlertTriangle, ArrowRightLeft, ClipboardList, Warehouse as WarehouseIcon, Plus, RefreshCw, PackageX } from 'lucide-react'
import { StockPage, StockNav, PageHeader, KpiCard, Card, Loading, EmptyState, MovementBadge, Alert, cls, useStockFormat, api } from '@/components/stock/ui'

type Dashboard = {
  kpis: { totalValue: number; products: number; itemsInStock: number; lowStock: number; outOfStock: number; openTransfers: number; openInventories: number }
  warehouses: Array<{ id: string; code: string; name: string; qty: number; value: number }>
  lowStock: Array<{ productId: string; code: string; name: string; unit: string; stock: number; threshold: number; outOfStock: boolean }>
  recentMovements: Array<{ id: string; type: string; quantity: string; reference: string | null; createdAt: string; product: { id: string; code: string; name: string; unit: string }; warehouse: { code: string; name: string } | null }>
}

export default function StockDashboardPage() {
  const t = useTranslations('StockMod')
  const f = useStockFormat()
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api<Dashboard>('/api/stock/dashboard')
    if (r.ok) { setData(r.data); setError('') } else setError(r.error || t('error_generic'))
    setLoading(false)
  }, [t])

  useEffect(() => { load() }, [load])

  const maxValue = Math.max(1, ...(data?.warehouses.map(w => w.value) ?? [1]))

  return (
    <StockPage>
      <PageHeader
        title={t('dashboard_title')}
        description={t('dashboard_desc')}
        actions={<>
          <button onClick={load} className={cls.btnSecondary} aria-label={t('refresh')}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <Link href="/stock/movements?new=ENTRY" className={cls.btnSecondary}><Plus className="w-4 h-4" /> {t('new_movement')}</Link>
          <Link href="/stock/transfers/new" className={cls.btnSecondary}><ArrowRightLeft className="w-4 h-4 rtl:rotate-180" /> {t('new_transfer')}</Link>
          <Link href="/stock/inventory?new=1" className={cls.btnPrimary}><ClipboardList className="w-4 h-4" /> {t('new_inventory')}</Link>
        </>}
      />
      <StockNav />
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}

      {loading && !data ? <Loading /> : data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label={t('kpi_total_value')} value={f.money(data.kpis.totalValue)} sub={t('kpi_total_value_sub')} icon={Coins} tone="teal" href="/stock/valuation" />
            <KpiCard label={t('kpi_items')} value={f.qty(data.kpis.itemsInStock)} sub={t('kpi_items_sub', { total: data.kpis.products })} icon={Package} tone="blue" href="/stock/products" />
            <KpiCard label={t('kpi_low_stock')} value={f.qty(data.kpis.lowStock)} sub={t('kpi_out_of_stock_sub', { count: data.kpis.outOfStock })} icon={AlertTriangle} tone={data.kpis.lowStock ? 'amber' : 'emerald'} href="/stock/alerts" />
            <KpiCard label={t('kpi_open_ops')} value={f.qty(data.kpis.openTransfers + data.kpis.openInventories)} sub={t('kpi_open_ops_sub', { transfers: data.kpis.openTransfers, inventories: data.kpis.openInventories })} icon={ClipboardList} tone="zinc" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title={t('value_by_warehouse')} actions={<Link href="/stock/warehouses" className={cls.btnGhost}>{t('see_all')}</Link>} className="lg:col-span-1">
              {data.warehouses.length === 0 ? (
                <EmptyState title={t('no_warehouse')} action={<Link href="/stock/warehouses?new=1" className={cls.btnPrimary}><Plus className="w-4 h-4" /> {t('create_warehouse')}</Link>} />
              ) : (
                <ul className="space-y-4">
                  {data.warehouses.map(w => (
                    <li key={w.id}>
                      <Link href={`/stock/availability/${w.id}`} className="block group">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex items-center gap-2 font-medium text-zinc-800 group-hover:text-teal-700 min-w-0">
                            <WarehouseIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                            <span className="truncate">{w.name}</span>
                            <span className="text-xs text-zinc-400 font-mono">{w.code}</span>
                          </span>
                          <span className="font-semibold tabular-nums text-zinc-900">{f.money(w.value)}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-zinc-100 overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.max(2, (w.value / maxValue) * 100)}%` }} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title={t('low_stock_widget')} actions={<Link href="/stock/alerts" className={cls.btnGhost}>{t('see_all')}</Link>} className="lg:col-span-2" bodyClassName="p-0">
              {data.lowStock.length === 0 ? <EmptyState title={t('no_low_stock')} /> : (
                <div className="overflow-x-auto">
                  <table className={cls.table}>
                    <thead className="bg-zinc-50"><tr>
                      <th className={cls.th}>{t('product')}</th>
                      <th className={`${cls.th} text-end`}>{t('stock')}</th>
                      <th className={`${cls.th} text-end`}>{t('threshold')}</th>
                    </tr></thead>
                    <tbody className="divide-y divide-zinc-100">
                      {data.lowStock.map(p => (
                        <tr key={p.productId} className="hover:bg-zinc-50">
                          <td className={cls.td}>
                            <Link href={`/stock/products/${p.productId}`} className="font-medium text-zinc-900 hover:text-teal-700">{p.name}</Link>
                            <span className="ms-2 text-xs text-zinc-400 font-mono">{p.code}</span>
                          </td>
                          <td className={`${cls.tdNum} ${p.outOfStock ? 'text-red-700 font-semibold' : 'text-amber-700 font-semibold'}`}>
                            {p.outOfStock && <PackageX className="inline w-4 h-4 me-1 -mt-0.5" />}{f.qty(p.stock)} <span className="text-xs text-zinc-400">{p.unit}</span>
                          </td>
                          <td className={cls.tdNum}>{f.qty(p.threshold)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <Card title={t('last_movements')} actions={<Link href="/stock/movements" className={cls.btnGhost}>{t('see_all')}</Link>} bodyClassName="p-0">
            {data.recentMovements.length === 0 ? <EmptyState title={t('no_movement')} /> : (
              <div className="overflow-x-auto">
                <table className={cls.table}>
                  <thead className="bg-zinc-50"><tr>
                    <th className={cls.th}>{t('date')}</th>
                    <th className={cls.th}>{t('type')}</th>
                    <th className={cls.th}>{t('product')}</th>
                    <th className={cls.th}>{t('warehouse')}</th>
                    <th className={cls.th}>{t('reference')}</th>
                    <th className={`${cls.th} text-end`}>{t('quantity')}</th>
                  </tr></thead>
                  <tbody className="divide-y divide-zinc-100">
                    {data.recentMovements.map(m => (
                      <tr key={m.id} className="hover:bg-zinc-50">
                        <td className={`${cls.td} whitespace-nowrap text-zinc-500`}>{f.dateTime(m.createdAt)}</td>
                        <td className={cls.td}><MovementBadge type={m.type} /></td>
                        <td className={cls.td}><Link href={`/stock/products/${m.product.id}`} className="font-medium text-zinc-900 hover:text-teal-700">{m.product.name}</Link></td>
                        <td className={cls.td}>{m.warehouse?.name ?? '—'}</td>
                        <td className={`${cls.td} font-mono text-xs`}>{m.reference ?? '—'}</td>
                        <td className={cls.tdNum}>{f.signedQty(m.type === 'EXIT' ? -Math.abs(Number(m.quantity)) : m.type === 'ENTRY' ? Math.abs(Number(m.quantity)) : m.quantity)} <span className="text-xs text-zinc-400">{m.product.unit}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </StockPage>
  )
}
