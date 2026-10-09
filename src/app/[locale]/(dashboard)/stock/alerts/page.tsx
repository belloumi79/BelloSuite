'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Download, Printer, AlertTriangle, PackageX, ShoppingCart } from 'lucide-react'
import { PoFromAlertsButton } from '@/components/purchases/PurchasesUI'
import { StockPage, StockNav, PageHeader, Card, Loading, EmptyState, Badge, Alert, KpiCard, cls, useStockFormat, api, downloadCsv } from '@/components/stock/ui'

type Base = { productId: string; code: string; name: string; category: string | null; unit: string; stock: number; minStock: number; reorderPoint: number; unitCost: number }
type Alerts = {
  lowStock: Array<Base & { threshold: number; outOfStock: boolean }>
  toOrder: Array<Base & { suggestedQty: number; estimatedCost: number }>
  depotAlerts: Array<Base & { warehouseId: string; warehouseCode: string; warehouseName: string; depotStock: number; depotMinStock: number }>
  totals: { lowStock: number; outOfStock: number; toOrderValue: number }
}

export default function AlertsPage() {
  const t = useTranslations('StockMod')
  const f = useStockFormat()
  const [data, setData] = useState<Alerts | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const r = await api<Alerts>('/api/stock/alerts')
    if (r.ok) setData(r.data); else setError(r.error || t('error_generic'))
  }, [t])
  useEffect(() => { load() }, [load])

  function exportOrders() {
    if (!data) return
    downloadCsv('a-commander.csv', [
      [t('code'), t('product'), t('category'), t('unit'), t('stock'), t('min_stock'), t('reorder_point'), t('suggested_qty'), t('unit_cost'), t('estimated_cost')],
      ...data.toOrder.map(r => [r.code, r.name, r.category ?? '', r.unit, r.stock, r.minStock, r.reorderPoint, r.suggestedQty, r.unitCost, r.estimatedCost]),
    ])
  }

  return (
    <StockPage>
      <PageHeader title={t('alerts_title')} description={t('alerts_desc')}
        actions={<>
          <button onClick={() => window.print()} className={cls.btnSecondary}><Printer className="w-4 h-4" /> {t('print')}</button>
          <button onClick={exportOrders} className={cls.btnPrimary}><Download className="w-4 h-4" /> {t('export_to_order')}</button>
        </>} />
      <StockNav />
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      {!data ? <Loading /> : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label={t('kpi_low_stock')} value={f.qty(data.totals.lowStock)} icon={AlertTriangle} tone="amber" />
            <KpiCard label={t('out_of_stock')} value={f.qty(data.totals.outOfStock)} icon={PackageX} tone="red" />
            <KpiCard label={t('to_order_value')} value={f.money(data.totals.toOrderValue)} icon={ShoppingCart} tone="teal" />
          </div>

          <Card title={t('to_order')} bodyClassName="p-0" actions={data.toOrder.length > 0 ? <PoFromAlertsButton items={data.toOrder} /> : undefined}>
            {data.toOrder.length === 0 ? <EmptyState title={t('nothing_to_order')} /> : (
              <div className="overflow-x-auto">
                <table className={cls.table}>
                  <thead className="bg-zinc-50"><tr>
                    <th className={cls.th}>{t('product')}</th>
                    <th className={`${cls.th} text-end`}>{t('stock')}</th>
                    <th className={`${cls.th} text-end`}>{t('min_stock')}</th>
                    <th className={`${cls.th} text-end`}>{t('reorder_point')}</th>
                    <th className={`${cls.th} text-end`}>{t('suggested_qty')}</th>
                    <th className={`${cls.th} text-end`}>{t('estimated_cost')}</th>
                  </tr></thead>
                  <tbody className="divide-y divide-zinc-100">
                    {data.toOrder.map(r => (
                      <tr key={r.productId} className="hover:bg-zinc-50">
                        <td className={cls.td}>
                          <Link href={`/stock/products/${r.productId}`} className="font-medium text-zinc-900 hover:text-teal-700">{r.name}</Link>
                          <span className="ms-2 text-xs text-zinc-400 font-mono">{r.code}</span>
                          {r.stock <= 0 && <span className="ms-2"><Badge tone="red">{t('out_of_stock')}</Badge></span>}
                        </td>
                        <td className={`${cls.tdNum} ${r.stock <= 0 ? 'text-red-700 font-semibold' : 'text-amber-700 font-semibold'}`}>{f.qty(r.stock)} <span className="text-xs text-zinc-400">{r.unit}</span></td>
                        <td className={cls.tdNum}>{f.qty(r.minStock)}</td>
                        <td className={cls.tdNum}>{r.reorderPoint ? f.qty(r.reorderPoint) : '—'}</td>
                        <td className={`${cls.tdNum} font-semibold text-teal-700`}>{f.qty(r.suggestedQty)}</td>
                        <td className={cls.tdNum}>{f.money(r.estimatedCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title={t('depot_alerts')} bodyClassName="p-0">
            {data.depotAlerts.length === 0 ? <EmptyState title={t('no_depot_alert')} /> : (
              <div className="overflow-x-auto">
                <table className={cls.table}>
                  <thead className="bg-zinc-50"><tr>
                    <th className={cls.th}>{t('warehouse')}</th>
                    <th className={cls.th}>{t('product')}</th>
                    <th className={`${cls.th} text-end`}>{t('stock')}</th>
                    <th className={`${cls.th} text-end`}>{t('depot_min')}</th>
                  </tr></thead>
                  <tbody className="divide-y divide-zinc-100">
                    {data.depotAlerts.map(r => (
                      <tr key={`${r.warehouseId}-${r.productId}`} className="hover:bg-zinc-50">
                        <td className={cls.td}><Link href={`/stock/availability/${r.warehouseId}`} className="hover:text-teal-700">{r.warehouseName}</Link></td>
                        <td className={cls.td}><Link href={`/stock/products/${r.productId}`} className="font-medium text-zinc-900 hover:text-teal-700">{r.name}</Link></td>
                        <td className={`${cls.tdNum} text-amber-700 font-semibold`}>{f.qty(r.depotStock)} <span className="text-xs text-zinc-400">{r.unit}</span></td>
                        <td className={cls.tdNum}>{f.qty(r.depotMinStock)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <p className="text-xs text-zinc-500 text-start">{t('alerts_rule')}</p>
        </div>
      )}
    </StockPage>
  )
}
