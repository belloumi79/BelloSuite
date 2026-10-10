'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Download, Printer, Search } from 'lucide-react'
import { StockPage, StockNav, PageHeader, Card, Loading, EmptyState, Alert, KpiCard, Badge, cls, useStockFormat, api, downloadCsv } from '@/components/stock/ui'

type Row = { productId: string; code: string; name: string; category: string | null; unit: string; perWarehouse: Record<string, number>; unassigned: number; qty: number; unitCost: number; value: number }
type Valuation = { warehouses: Array<{ id: string; code: string; name: string; isActive: boolean; qty: number; value: number }>; rows: Row[]; totalQty: number; totalValue: number }

export default function ValuationPage() {
  const t = useTranslations('StockMod')
  const f = useStockFormat()
  const [warehouseId, setWarehouseId] = useState('')
  const [data, setData] = useState<Valuation | null>(null)
  const [error, setError] = useState('')
  const [failed, setFailed] = useState(false)
  const [q, setQ] = useState('')
  const [hideZero, setHideZero] = useState(true)

  const load = useCallback(async () => {
    setData(null)
    const r = await api<Valuation>(`/api/stock/valuation${warehouseId ? `?warehouseId=${warehouseId}` : ''}`)
    if (r.ok) setData(r.data); else { setFailed(true); setError(r.error || t('error_generic')) }
  }, [warehouseId, t])
  useEffect(() => { load() }, [load])

  const rows = useMemo(() => (data?.rows ?? []).filter(r => (!hideZero || r.qty !== 0) && (!q || `${r.code} ${r.name} ${r.category ?? ''}`.toLowerCase().includes(q.toLowerCase()))), [data, q, hideZero])
  const activeWh = data?.warehouses.filter(w => w.isActive || w.qty !== 0) ?? []
  const byCategory = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows) m.set(r.category || '—', (m.get(r.category || '—') || 0) + r.value)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [rows])

  function exportCsv() {
    if (!data) return
    const whCols = warehouseId ? [] : activeWh
    downloadCsv(`valorisation-stock${warehouseId ? '-' + (data.warehouses.find(w => w.id === warehouseId)?.code ?? '') : ''}.csv`, [
      [t('code'), t('product'), t('category'), t('unit'), ...whCols.map(w => w.name), t('quantity'), t('cmup'), t('value')],
      ...rows.map(r => [r.code, r.name, r.category ?? '', r.unit, ...whCols.map(w => r.perWarehouse[w.id] ?? 0), r.qty, r.unitCost, r.value]),
      [],
      [t('total'), '', '', '', ...whCols.map(w => w.value), data.totalQty, '', data.totalValue],
    ])
  }

  return (
    <StockPage>
      <PageHeader title={t('valuation_title')} description={t('valuation_desc')}
        actions={<>
          <select className={`${cls.input} w-56`} value={warehouseId} onChange={e => setWarehouseId(e.target.value)} aria-label={t('warehouse')}>
            <option value="">{t('all_warehouses')}</option>
            {data?.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <button onClick={() => window.print()} className={cls.btnSecondary}><Printer className="w-4 h-4" /> {t('print')}</button>
          <button onClick={exportCsv} className={cls.btnPrimary}><Download className="w-4 h-4" /> CSV</button>
        </>} />
      <StockNav />
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      {!data ? (failed ? <EmptyState title={t('error_generic')} /> : <Loading />) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label={t('kpi_total_value')} value={f.money(data.totalValue)} sub={t('valuation_method')} tone="teal" />
            {(warehouseId ? data.warehouses.filter(w => w.id === warehouseId) : activeWh).slice(0, 3).map(w => (
              <KpiCard key={w.id} plainLabel label={w.name} value={f.money(w.value)} sub={!w.isActive ? t('archived') : undefined} tone="zinc" href={`/stock/availability/${w.id}`} />
            ))}
          </div>

          {byCategory.length > 1 && (
            <Card title={t('value_by_category')}>
              <div className="flex flex-wrap gap-2">
                {byCategory.map(([c, v]) => <Badge key={c} tone="zinc">{c} · {f.money(v)}</Badge>)}
              </div>
            </Card>
          )}

          <Card title={t('valuation_by_product')}
            actions={<>
              <label className="hidden sm:flex items-center gap-2 text-sm text-zinc-600"><input type="checkbox" className="accent-teal-600" checked={hideZero} onChange={e => setHideZero(e.target.checked)} /> {t('only_in_stock')}</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('search_product')} className={`${cls.input} ps-9 w-56`} />
              </div>
            </>}
            bodyClassName="p-0">
            {rows.length === 0 ? <EmptyState title={t('no_product')} /> : (
              <div className="overflow-x-auto">
                <table className={cls.table}>
                  <thead className="bg-zinc-50"><tr>
                    <th className={cls.th}>{t('code')}</th>
                    <th className={cls.th}>{t('product')}</th>
                    {!warehouseId && activeWh.map(w => <th key={w.id} title={w.code} className={`${cls.th} text-end normal-case tracking-normal`}>{w.name}</th>)}
                    <th className={`${cls.th} text-end`}>{t('quantity')}</th>
                    <th className={`${cls.th} text-end`}>{t('cmup')}</th>
                    <th className={`${cls.th} text-end`}>{t('value')}</th>
                  </tr></thead>
                  <tbody className="divide-y divide-zinc-100">
                    {rows.map(r => (
                      <tr key={r.productId} className="hover:bg-zinc-50">
                        <td className={`${cls.td} font-mono text-xs whitespace-nowrap`} dir="ltr">{r.code}</td>
                        <td className={cls.td}><Link href={`/stock/products/${r.productId}`} className="font-medium text-zinc-900 hover:text-teal-700">{r.name}</Link><span className="block text-xs text-zinc-400">{r.category ?? ''}</span></td>
                        {!warehouseId && activeWh.map(w => <td key={w.id} className={`${cls.tdNum} text-zinc-500`}>{r.perWarehouse[w.id] ? f.qty(r.perWarehouse[w.id]) : '—'}</td>)}
                        <td className={`${cls.tdNum} ${r.qty < 0 ? 'text-red-700' : ''}`}>{f.qty(r.qty)} <span className="text-xs text-zinc-400">{r.unit}</span></td>
                        <td className={cls.tdNum}>{f.money(r.unitCost)}</td>
                        <td className={`${cls.tdNum} font-semibold`}>{f.money(r.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-zinc-50 font-semibold">
                    <tr>
                      <td className={cls.td} colSpan={2}>{t('total')}</td>
                      {!warehouseId && activeWh.map(w => <td key={w.id} className={cls.tdNum}>{f.money(w.value)}</td>)}
                      <td className={cls.tdNum}>{f.qty(data.totalQty)}</td>
                      <td className={cls.tdNum}></td>
                      <td className={cls.tdNum}>{f.money(data.totalValue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </StockPage>
  )
}
