'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Pencil, Plus, History, Save, Package } from 'lucide-react'
import { StockPage, StockNav, PageHeader, Card, Loading, EmptyState, MovementBadge, Badge, Alert, KpiCard, CodeTag, cls, useStockFormat, api } from '@/components/stock/ui'
import MovementFormModal, { useReasonLabel, type ProductOption, type WarehouseOption } from '@/components/stock/MovementFormModal'
import { isLowStock, valuationCost } from '@/lib/stock-logic'

type Movement = { id: string; type: string; quantity: string; unitPrice: string | null; reference: string | null; reason: string | null; notes: string | null; balanceAfter: string | null; costAfter: string | null; createdAt: string; warehouse: { id: string; code: string; name: string } | null }
type Product = {
  id: string; code: string; barcode: string | null; name: string; description: string | null; category: string | null; unit: string
  purchasePrice: string; salePrice: string; averageCost: string; minStock: string; reorderPoint: string; reorderQty: string; currentStock: string; isActive: boolean; images: string[]
  movements: Movement[]
  warehouseStock: Array<{ warehouseId: string; stock: string; minStock: string | null; warehouse: { id: string; code: string; name: string; isActive: boolean } }>
}

export default function ProductDetailPage() {
  const t = useTranslations('StockMod')
  const f = useStockFormat()
  const reasonLabel = useReasonLabel()
  const { id } = useParams<{ id: string }>()
  const [p, setP] = useState<Product | null>(null)
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState(false)
  const [mins, setMins] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const [r, w] = await Promise.all([api<Product>(`/api/stock/products/${id}`), api<WarehouseOption[]>('/api/stock/warehouses')])
    if (!r.ok) { setError(r.error || t('error_generic')); return }
    setP(r.data)
    if (w.ok) setWarehouses(w.data)
    setMins(Object.fromEntries(r.data.warehouseStock.map(ws => [ws.warehouseId, ws.minStock === null ? '' : String(Number(ws.minStock))])))
  }, [id, t])
  useEffect(() => { load() }, [load])

  async function saveMins() {
    if (!p) return
    const warehouseMinStock = Object.entries(mins).map(([warehouseId, v]) => ({ warehouseId, minStock: v === '' ? null : Number(v) }))
    const r = await api(`/api/stock/products/${id}`, { method: 'PUT', body: JSON.stringify({ warehouseMinStock }) })
    if (r.ok) { setNotice(t('saved')); load() } else setError(r.error || t('error_generic'))
  }

  const stock = Number(p?.currentStock ?? 0)
  const cost = p ? valuationCost(Number(p.averageCost), Number(p.purchasePrice)) : 0
  const low = p ? isLowStock(stock, Number(p.minStock), Number(p.reorderPoint)) : false
  const depots = warehouses.map(w => ({ w, ws: p?.warehouseStock.find(x => x.warehouseId === w.id) }))
  const productOption: ProductOption[] = p ? [{ id: p.id, code: p.code, name: p.name, unit: p.unit, barcode: p.barcode, averageCost: p.averageCost, purchasePrice: p.purchasePrice, warehouseStock: p.warehouseStock }] : []

  return (
    <StockPage>
      <PageHeader
        backHref="/stock/products"
        title={p ? p.name : t('product')}
        description={p ? [p.code, p.barcode, p.category].filter(Boolean).join(' · ') : undefined}
        actions={p && <>
          <Link href={`/stock/movements?productId=${p.id}`} className={cls.btnSecondary}><History className="w-4 h-4" /> {t('full_history')}</Link>
          <Link href={`/stock/products/${p.id}/edit`} className={cls.btnSecondary}><Pencil className="w-4 h-4" /> {t('edit')}</Link>
          <button onClick={() => setModal(true)} className={cls.btnPrimary}><Plus className="w-4 h-4" /> {t('new_movement')}</button>
        </>}
      />
      <StockNav />
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert tone="green" onClose={() => setNotice('')}>{notice}</Alert>}
      {!p ? (error ? null : <Loading />) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label={t('stock')} value={<span className={stock <= 0 ? 'text-red-700' : low ? 'text-amber-700' : ''}>{f.qty(stock)} <span className="text-sm text-zinc-400">{p.unit}</span></span>}
              sub={stock <= 0 ? t('out_of_stock') : low ? t('below_threshold') : t('threshold_value', { value: f.qty(Math.max(Number(p.minStock), Number(p.reorderPoint))) })} icon={Package} tone={stock <= 0 ? 'red' : low ? 'amber' : 'teal'} />
            <KpiCard label={t('cmup')} value={f.money(cost)} sub={t('purchase_price_value', { value: f.money(p.purchasePrice) })} tone="blue" />
            <KpiCard label={t('stock_value')} value={f.money(stock * cost)} tone="emerald" />
            <KpiCard label={t('sale_price')} value={f.money(p.salePrice)} sub={!p.isActive ? t('inactive') : undefined} tone="zinc" />
          </div>

          <Card title={t('stock_by_warehouse')} actions={<button onClick={saveMins} className={cls.btnSecondary}><Save className="w-4 h-4" /> {t('save_thresholds')}</button>} bodyClassName="p-0">
            {depots.length === 0 ? <EmptyState title={t('no_warehouse')} /> : (
              <table className={cls.table}>
                <thead className="bg-zinc-50"><tr>
                  <th className={cls.th}>{t('warehouse')}</th>
                  <th className={`${cls.th} text-end`}>{t('stock')}</th>
                  <th className={`${cls.th} text-end`}>{t('value')}</th>
                  <th className={`${cls.th} text-end w-44`}>{t('depot_min')}</th>
                </tr></thead>
                <tbody className="divide-y divide-zinc-100">
                  {depots.map(({ w, ws }) => {
                    const q = Number(ws?.stock ?? 0)
                    const m = mins[w.id] ?? ''
                    const depotLow = m !== '' && isLowStock(q, Number(m))
                    return (
                      <tr key={w.id}>
                        <td className={cls.td}><Link href={`/stock/availability/${w.id}`} className="font-medium hover:text-teal-700">{w.name}</Link> <CodeTag code={w.code} /></td>
                        <td className={`${cls.tdNum} ${q < 0 ? 'text-red-700' : depotLow ? 'text-amber-700 font-semibold' : ''}`}>{f.qty(q)} {depotLow && <Badge tone="amber">{t('low')}</Badge>}</td>
                        <td className={cls.tdNum}>{f.money(q * cost)}</td>
                        <td className={cls.td}><input type="number" min="0" step="any" className={`${cls.input} text-end`} placeholder={t('use_product_threshold')} value={m} onChange={e => setMins(s => ({ ...s, [w.id]: e.target.value }))} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </Card>

          <Card title={t('last_movements')} actions={<Link href={`/stock/movements?productId=${p.id}`} className={cls.btnGhost}>{t('see_all')}</Link>} bodyClassName="p-0">
            {p.movements.length === 0 ? <EmptyState title={t('no_movement')} /> : (
              <div className="overflow-x-auto">
                <table className={cls.table}>
                  <thead className="bg-zinc-50"><tr>
                    <th className={cls.th}>{t('date')}</th>
                    <th className={cls.th}>{t('type')}</th>
                    <th className={cls.th}>{t('warehouse')}</th>
                    <th className={`${cls.th} text-end`}>{t('quantity')}</th>
                    <th className={`${cls.th} text-end`}>{t('unit_cost')}</th>
                    <th className={`${cls.th} text-end`}>{t('balance_after')}</th>
                    <th className={`${cls.th} text-end`}>{t('cmup_after')}</th>
                    <th className={cls.th}>{t('reason')}</th>
                    <th className={cls.th}>{t('reference')}</th>
                  </tr></thead>
                  <tbody className="divide-y divide-zinc-100">
                    {p.movements.map(m => {
                      const q = m.type === 'EXIT' ? -Math.abs(Number(m.quantity)) : m.type === 'ENTRY' ? Math.abs(Number(m.quantity)) : Number(m.quantity)
                      return (
                        <tr key={m.id} className="hover:bg-zinc-50">
                          <td className={`${cls.td} whitespace-nowrap text-zinc-500`}>{f.dateTime(m.createdAt)}</td>
                          <td className={cls.td}><MovementBadge type={m.type} /></td>
                          <td className={cls.td}>{m.warehouse?.name ?? '—'}</td>
                          <td className={`${cls.tdNum} font-semibold ${q < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{f.signedQty(q)}</td>
                          <td className={cls.tdNum}>{m.unitPrice !== null ? f.money(m.unitPrice) : '—'}</td>
                          <td className={cls.tdNum}>{m.balanceAfter !== null ? f.qty(m.balanceAfter) : '—'}</td>
                          <td className={cls.tdNum}>{m.costAfter !== null ? f.money(m.costAfter) : '—'}</td>
                          <td className={cls.td}>{reasonLabel(m.reason)}</td>
                          <td className={`${cls.td} font-mono text-xs`}>{m.reference ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          {p.description && <Card title={t('description')}><p className="text-sm text-zinc-600 whitespace-pre-line text-start">{p.description}</p></Card>}
        </div>
      )}
      <MovementFormModal open={modal} onClose={() => setModal(false)} onSaved={() => { setNotice(t('movement_saved')); load() }} products={productOption} warehouses={warehouses} initialProductId={p?.id} />
    </StockPage>
  )
}
