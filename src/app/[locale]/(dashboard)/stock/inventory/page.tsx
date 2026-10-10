'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/routing'
import { Plus } from 'lucide-react'
import { StockPage, StockNav, PageHeader, Card, Loading, EmptyState, StatusBadge, Alert, Modal, Field, cls, useStockFormat, api } from '@/components/stock/ui'
import type { WarehouseOption } from '@/components/stock/MovementFormModal'

type Summary = { lines: number; counted: number; withGap: number; gapValue: number; gapValueAbs: number }
type Inventory = { id: string; reference: string; date: string; status: string; scope: string; category: string | null; warehouse: { id: string; code: string; name: string } | null; summary: Summary }
const STATUSES = ['', 'DRAFT', 'IN_PROGRESS', 'VALIDATED', 'CANCELLED']

export default function InventoryListPage() {
  const t = useTranslations('StockMod')
  const f = useStockFormat()
  const router = useRouter()
  const [rows, setRows] = useState<Inventory[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
  const [categories, setCategories] = useState<Array<{ name: string; productCount: number }>>([])
  const [form, setForm] = useState({ warehouseId: '', scope: 'FULL', category: '', date: new Date().toISOString().slice(0, 10), notes: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api<Inventory[]>(`/api/stock/inventory${status ? `?status=${status}` : ''}`)
    if (r.ok) setRows(r.data); else { setRows([]); setError(r.error || t('error_generic')) }
    setLoading(false)
  }, [status, t])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    Promise.all([api<WarehouseOption[]>('/api/stock/warehouses'), api<Array<{ name: string; productCount: number }>>('/api/stock/categories')]).then(([w, c]) => {
      if (w.ok) { setWarehouses(w.data); setForm(fm => ({ ...fm, warehouseId: w.data.find(x => x.isDefault)?.id ?? w.data[0]?.id ?? '' })) }
      if (c.ok) setCategories(c.data)
    })
    if (new URLSearchParams(window.location.search).get('new')) setOpen(true)
  }, [])

  async function create() {
    setSaving(true)
    const r = await api<{ id: string }>('/api/stock/inventory', { method: 'POST', body: JSON.stringify({ ...form, category: form.scope === 'CATEGORY' ? form.category : undefined }) })
    setSaving(false)
    if (!r.ok) { setError(r.error === 'INVENTORY_ALREADY_OPEN' ? t('inventory_already_open') : (r.error || t('error_generic'))); setOpen(false); return }
    router.push(`/stock/inventory/${r.data.id}`)
  }

  return (
    <StockPage>
      <PageHeader title={t('inventory_title')} description={t('inventory_desc')}
        actions={<button onClick={() => setOpen(true)} className={cls.btnPrimary}><Plus className="w-4 h-4" /> {t('new_inventory')}</button>} />
      <StockNav />
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      <Card
        title={t('inventory_sessions')}
        actions={<div className="flex flex-wrap gap-1">{STATUSES.map(s => (
          <button key={s || 'all'} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${status === s ? 'bg-teal-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
            {s ? t(`status_${s}`) : t('all')}
          </button>
        ))}</div>}
        bodyClassName="p-0"
      >
        {loading ? <Loading /> : rows.length === 0 ? <EmptyState title={t('no_inventory')} /> : (
          <div className="overflow-x-auto">
            <table className={cls.table}>
              <thead className="bg-zinc-50"><tr>
                <th className={cls.th}>{t('reference')}</th>
                <th className={cls.th}>{t('date')}</th>
                <th className={cls.th}>{t('warehouse')}</th>
                <th className={cls.th}>{t('scope')}</th>
                <th className={`${cls.th} text-end`}>{t('progress')}</th>
                <th className={`${cls.th} text-end`}>{t('gap_value')}</th>
                <th className={cls.th}>{t('status')}</th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map(inv => (
                  <tr key={inv.id} className="hover:bg-zinc-50">
                    <td className={cls.td}><Link href={`/stock/inventory/${inv.id}`} className="font-mono text-xs font-semibold text-teal-700 hover:underline">{inv.reference}</Link></td>
                    <td className={`${cls.td} whitespace-nowrap`}>{f.date(inv.date)}</td>
                    <td className={cls.td}>{inv.warehouse?.name ?? '—'}</td>
                    <td className={cls.td}>{inv.scope === 'CATEGORY' ? `${t('scope_CATEGORY')} : ${inv.category}` : t('scope_FULL')}</td>
                    <td className={cls.tdNum}>{f.qty(inv.summary.counted)} / {f.qty(inv.summary.lines)}</td>
                    <td className={`${cls.tdNum} ${inv.summary.gapValue < 0 ? 'text-red-700' : inv.summary.gapValue > 0 ? 'text-emerald-700' : ''}`}>{f.money(inv.summary.gapValue)}</td>
                    <td className={cls.td}><StatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={open} title={t('new_inventory')} onClose={() => setOpen(false)}
        footer={<>
          <button onClick={() => setOpen(false)} className={cls.btnSecondary}>{t('cancel')}</button>
          <button onClick={create} disabled={saving || !form.warehouseId || (form.scope === 'CATEGORY' && !form.category)} className={cls.btnPrimary}>{t('open_inventory')}</button>
        </>}>
        <div className="space-y-4">
          <Field label={`${t('warehouse')} *`}>
            <select className={cls.input} value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })}>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('scope')}>
              <select className={cls.input} value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })}>
                <option value="FULL">{t('scope_FULL')}</option>
                <option value="CATEGORY">{t('scope_CATEGORY')}</option>
              </select>
            </Field>
            <Field label={t('date')}><input type="date" className={cls.input} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
          </div>
          {form.scope === 'CATEGORY' && (
            <Field label={`${t('category')} *`}>
              <select className={cls.input} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="">{t('choose')}</option>
                {categories.map(c => <option key={c.name} value={c.name}>{c.name} ({c.productCount})</option>)}
              </select>
            </Field>
          )}
          <Field label={t('notes')}><textarea rows={2} className={cls.input} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
          <p className="text-xs text-zinc-500 text-start">{t('inventory_snapshot_hint')}</p>
        </div>
      </Modal>
    </StockPage>
  )
}
