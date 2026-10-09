'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Download, History, Search } from 'lucide-react'
import { StockPage, StockNav, PageHeader, Card, Loading, EmptyState, Badge, Alert, KpiCard, cls, useStockFormat, api, downloadCsv } from '@/components/stock/ui'

type Line = { productId: string; code: string; name: string; category: string | null; unit: string; stock: number; minStock: number | null; effectiveMin: number; unitCost: number; value: number; low: boolean }
type Detail = { id: string; code: string; name: string; address: string | null; manager: string | null; isActive: boolean; isDefault: boolean; lines: Line[]; totalQty: number; totalValue: number }

export default function WarehouseStockPage() {
  const t = useTranslations('StockMod')
  const f = useStockFormat()
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Detail | null>(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [onlyStock, setOnlyStock] = useState(true)

  const load = useCallback(async () => {
    const r = await api<Detail>(`/api/stock/warehouses/${id}`)
    if (r.ok) setData(r.data); else setError(r.error || t('error_generic'))
  }, [id, t])
  useEffect(() => { load() }, [load])

  const lines = useMemo(() => (data?.lines ?? []).filter(l =>
    (!onlyStock || l.stock !== 0) &&
    (!q || `${l.code} ${l.name} ${l.category ?? ''}`.toLowerCase().includes(q.toLowerCase()))), [data, q, onlyStock])

  function exportCsv() {
    if (!data) return
    downloadCsv(`stock-${data.code}.csv`, [
      [t('code'), t('product'), t('category'), t('unit'), t('stock'), t('threshold'), t('unit_cost'), t('value')],
      ...lines.map(l => [l.code, l.name, l.category ?? '', l.unit, l.stock, l.effectiveMin, l.unitCost, l.value]),
    ])
  }

  return (
    <StockPage>
      <PageHeader
        backHref="/stock/warehouses"
        title={data ? `${data.name} (${data.code})` : t('warehouse')}
        description={data?.address ?? undefined}
        actions={data && <>
          <Link href={`/stock/movements?warehouseId=${data.id}`} className={cls.btnSecondary}><History className="w-4 h-4" /> {t('history')}</Link>
          <button onClick={exportCsv} className={cls.btnSecondary}><Download className="w-4 h-4" /> CSV</button>
        </>}
      />
      <StockNav />
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      {!data ? <Loading /> : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label={t('stock_value')} value={f.money(data.totalValue)} tone="teal" />
            <KpiCard label={t('items')} value={f.qty(data.lines.filter(l => l.stock !== 0).length)} tone="blue" />
            <KpiCard label={t('kpi_low_stock')} value={f.qty(data.lines.filter(l => l.low).length)} tone="amber" />
          </div>
          <Card
            title={<span className="flex items-center gap-2">{t('stock_by_product')} {!data.isActive && <Badge>{t('archived')}</Badge>}</span>}
            actions={<>
              <label className="hidden sm:flex items-center gap-2 text-sm text-zinc-600"><input type="checkbox" className="accent-teal-600" checked={onlyStock} onChange={e => setOnlyStock(e.target.checked)} /> {t('only_in_stock')}</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('search_product')} className={`${cls.input} ps-9 w-56`} />
              </div>
            </>}
            bodyClassName="p-0"
          >
            {lines.length === 0 ? <EmptyState title={t('no_product')} /> : (
              <div className="overflow-x-auto">
                <table className={cls.table}>
                  <thead className="bg-zinc-50"><tr>
                    <th className={cls.th}>{t('code')}</th>
                    <th className={cls.th}>{t('product')}</th>
                    <th className={cls.th}>{t('category')}</th>
                    <th className={`${cls.th} text-end`}>{t('stock')}</th>
                    <th className={`${cls.th} text-end`}>{t('threshold')}</th>
                    <th className={`${cls.th} text-end`}>{t('unit_cost')}</th>
                    <th className={`${cls.th} text-end`}>{t('value')}</th>
                  </tr></thead>
                  <tbody className="divide-y divide-zinc-100">
                    {lines.map(l => (
                      <tr key={l.productId} className="hover:bg-zinc-50">
                        <td className={`${cls.td} font-mono text-xs`}>{l.code}</td>
                        <td className={cls.td}><Link href={`/stock/products/${l.productId}`} className="font-medium text-zinc-900 hover:text-teal-700">{l.name}</Link></td>
                        <td className={cls.td}>{l.category ?? '—'}</td>
                        <td className={`${cls.tdNum} ${l.stock < 0 ? 'text-red-700' : l.low ? 'text-amber-700 font-semibold' : ''}`}>{f.qty(l.stock)} <span className="text-xs text-zinc-400">{l.unit}</span></td>
                        <td className={cls.tdNum}>{l.effectiveMin ? f.qty(l.effectiveMin) : '—'}</td>
                        <td className={cls.tdNum}>{f.money(l.unitCost)}</td>
                        <td className={cls.tdNum}>{f.money(l.value)}</td>
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
