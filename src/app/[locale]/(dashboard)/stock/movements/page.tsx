'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Plus, Download, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import { StockPage, StockNav, PageHeader, Card, Loading, EmptyState, MovementBadge, Alert, Field, cls, useStockFormat, api, downloadCsv } from '@/components/stock/ui'
import MovementFormModal, { useReasonLabel, type MovementKind, type ProductOption, type WarehouseOption } from '@/components/stock/MovementFormModal'

type Movement = {
  id: string; type: string; quantity: string; unitPrice: string | null; reference: string | null; reason: string | null; notes: string | null
  balanceAfter: string | null; costAfter: string | null; sourceType: string | null; createdAt: string
  product: { id: string; code: string; name: string; unit: string }; warehouse: { id: string; code: string; name: string } | null
}
type Page = { items: Movement[]; total: number; page: number; pageSize: number }
const EMPTY_FILTERS = { productId: '', warehouseId: '', type: '', from: '', to: '', q: '' }

function signed(m: Movement) {
  const q = Number(m.quantity)
  return m.type === 'EXIT' ? -Math.abs(q) : m.type === 'ENTRY' ? Math.abs(q) : q
}

export default function MovementsPage() {
  const t = useTranslations('StockMod')
  const f = useStockFormat()
  const reasonLabel = useReasonLabel()
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [products, setProducts] = useState<ProductOption[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
  const [modal, setModal] = useState<{ open: boolean; type: MovementKind }>({ open: false, type: 'ENTRY' })
  const [ready, setReady] = useState(false)

  // Filtres initiaux depuis l'URL (?productId=&warehouseId=&new=ENTRY)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    setFilters(fl => ({ ...fl, productId: sp.get('productId') || '', warehouseId: sp.get('warehouseId') || '', type: sp.get('type') || '' }))
    const n = sp.get('new')
    if (n === 'ENTRY' || n === 'EXIT' || n === 'ADJUSTMENT') setModal({ open: true, type: n })
    setReady(true)
    Promise.all([api<ProductOption[]>('/api/stock/products'), api<WarehouseOption[]>('/api/stock/warehouses')]).then(([p, w]) => {
      if (p.ok) setProducts(p.data)
      if (w.ok) setWarehouses(w.data)
    })
  }, [])

  const query = useCallback((extra: Record<string, string>) => {
    const sp = new URLSearchParams()
    Object.entries({ ...filters, ...extra }).forEach(([k, v]) => { if (v) sp.set(k, v) })
    return sp.toString()
  }, [filters])

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api<Page>(`/api/stock/movements?${query({ page: String(page), pageSize: '50' })}`)
    if (r.ok) setData(r.data); else setError(r.error || t('error_generic'))
    setLoading(false)
  }, [query, page, t])

  useEffect(() => { if (ready) load() }, [load, ready])

  async function exportCsv() {
    const r = await api<Movement[]>(`/api/stock/movements?${query({ limit: '1000' })}`)
    if (!r.ok) { setError(r.error || t('error_generic')); return }
    downloadCsv('mouvements-stock.csv', [
      [t('date'), t('type'), t('code'), t('product'), t('warehouse'), t('quantity'), t('unit'), t('unit_cost'), t('balance_after'), t('reason'), t('reference'), t('notes')],
      ...r.data.map(m => [new Date(m.createdAt).toISOString(), t(`type_${m.type}`), m.product.code, m.product.name, m.warehouse?.code ?? '', signed(m), m.product.unit, m.unitPrice ?? '', m.balanceAfter ?? '', reasonLabel(m.reason), m.reference ?? '', m.notes ?? '']),
    ])
  }

  const set = (k: keyof typeof EMPTY_FILTERS, v: string) => { setPage(1); setFilters(fl => ({ ...fl, [k]: v })) }
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <StockPage>
      <PageHeader
        title={t('movements_title')}
        description={t('movements_desc')}
        actions={<>
          <button onClick={exportCsv} className={cls.btnSecondary}><Download className="w-4 h-4" /> CSV</button>
          <button onClick={() => setModal({ open: true, type: 'EXIT' })} className={cls.btnSecondary}>{t('new_exit')}</button>
          <button onClick={() => setModal({ open: true, type: 'ENTRY' })} className={cls.btnPrimary}><Plus className="w-4 h-4" /> {t('new_entry')}</button>
        </>}
      />
      <StockNav />
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      {warehouses.length === 0 && ready && products.length > 0 && <Alert tone="amber">{t('need_warehouse')} <Link href="/stock/warehouses?new=1" className="underline font-semibold">{t('create_warehouse')}</Link></Alert>}

      <Card className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <Field label={t('search')}><input className={cls.input} value={filters.q} onChange={e => set('q', e.target.value)} placeholder={t('search_movement')} /></Field>
          <Field label={t('product')}>
            <select className={cls.input} value={filters.productId} onChange={e => set('productId', e.target.value)}>
              <option value="">{t('all')}</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </Field>
          <Field label={t('warehouse')}>
            <select className={cls.input} value={filters.warehouseId} onChange={e => set('warehouseId', e.target.value)}>
              <option value="">{t('all')}</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
          <Field label={t('type')}>
            <select className={cls.input} value={filters.type} onChange={e => set('type', e.target.value)}>
              <option value="">{t('all')}</option>
              {['ENTRY', 'EXIT', 'ADJUSTMENT', 'TRANSFER'].map(k => <option key={k} value={k}>{t(`type_${k}`)}</option>)}
            </select>
          </Field>
          <Field label={t('date_from')}><input type="date" className={cls.input} value={filters.from} onChange={e => set('from', e.target.value)} /></Field>
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Field label={t('date_to')}><input type="date" className={cls.input} value={filters.to} onChange={e => set('to', e.target.value)} /></Field></div>
            <button onClick={() => { setPage(1); setFilters(EMPTY_FILTERS) }} className={cls.btnSecondary} title={t('reset_filters')} aria-label={t('reset_filters')}><RotateCcw className="w-4 h-4" /></button>
          </div>
        </div>
      </Card>

      <Card title={data ? t('movement_count', { count: data.total }) : t('movements_title')} bodyClassName="p-0">
        {loading && !data ? <Loading /> : !data || data.items.length === 0 ? <EmptyState title={t('no_movement')} /> : (
          <>
            <div className="overflow-x-auto">
              <table className={cls.table}>
                <thead className="bg-zinc-50"><tr>
                  <th className={cls.th}>{t('date')}</th>
                  <th className={cls.th}>{t('type')}</th>
                  <th className={cls.th}>{t('product')}</th>
                  <th className={cls.th}>{t('warehouse')}</th>
                  <th className={`${cls.th} text-end`}>{t('quantity')}</th>
                  <th className={`${cls.th} text-end`}>{t('unit_cost')}</th>
                  <th className={`${cls.th} text-end`}>{t('balance_after')}</th>
                  <th className={cls.th}>{t('reason')}</th>
                  <th className={cls.th}>{t('reference')}</th>
                </tr></thead>
                <tbody className="divide-y divide-zinc-100">
                  {data.items.map(m => {
                    const q = signed(m)
                    return (
                      <tr key={m.id} className="hover:bg-zinc-50">
                        <td className={`${cls.td} whitespace-nowrap text-zinc-500`}>{f.dateTime(m.createdAt)}</td>
                        <td className={cls.td}><MovementBadge type={m.type} /></td>
                        <td className={cls.td}>
                          <Link href={`/stock/products/${m.product.id}`} className="font-medium text-zinc-900 hover:text-teal-700">{m.product.name}</Link>
                          <span className="block text-xs text-zinc-400 font-mono">{m.product.code}</span>
                        </td>
                        <td className={cls.td}>{m.warehouse?.name ?? '—'}</td>
                        <td className={`${cls.tdNum} font-semibold ${q < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{f.signedQty(q)} <span className="text-xs text-zinc-400 font-normal">{m.product.unit}</span></td>
                        <td className={cls.tdNum}>{m.unitPrice !== null ? f.money(m.unitPrice) : '—'}</td>
                        <td className={cls.tdNum}>{m.balanceAfter !== null ? f.qty(m.balanceAfter) : '—'}</td>
                        <td className={cls.td}>{reasonLabel(m.reason)}{m.notes && <span className="block text-xs text-zinc-400 truncate max-w-[16rem]">{m.notes}</span>}</td>
                        <td className={`${cls.td} font-mono text-xs`}>{m.reference ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 text-sm text-zinc-600">
              <span>{t('page_of', { page, pages })}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className={cls.btnSecondary} aria-label={t('previous')}><ChevronLeft className="w-4 h-4 rtl:rotate-180" /></button>
                <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className={cls.btnSecondary} aria-label={t('next')}><ChevronRight className="w-4 h-4 rtl:rotate-180" /></button>
              </div>
            </div>
          </>
        )}
      </Card>

      <MovementFormModal
        open={modal.open}
        initialType={modal.type}
        initialProductId={filters.productId || undefined}
        initialWarehouseId={filters.warehouseId || undefined}
        products={products}
        warehouses={warehouses}
        onClose={() => setModal(m => ({ ...m, open: false }))}
        onSaved={() => { load(); api<ProductOption[]>('/api/stock/products').then(p => p.ok && setProducts(p.data)) }}
      />
    </StockPage>
  )
}
