'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { Plus, Trash2, Save, CheckCircle2, ScanLine } from 'lucide-react'
import { StockPage, StockNav, PageHeader, Card, Alert, Field, Loading, cls, useStockFormat, api } from '@/components/stock/ui'
import type { ProductOption, WarehouseOption } from '@/components/stock/MovementFormModal'

type Line = { key: string; productId: string; quantity: string }
const newLine = (): Line => ({ key: Math.random().toString(36).slice(2), productId: '', quantity: '' })

export default function NewTransferPage() {
  const t = useTranslations('StockMod')
  const f = useStockFormat()
  const router = useRouter()
  const [products, setProducts] = useState<ProductOption[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
  const [allowNegative, setAllowNegative] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([newLine()])
  const [scan, setScan] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(false)
  const scanRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id')
    setEditId(id)
    Promise.all([
      api<ProductOption[]>('/api/stock/products'),
      api<WarehouseOption[]>('/api/stock/warehouses'),
      api<{ allowNegativeStock: boolean }>('/api/stock/settings'),
      id ? api<{ status: string; fromWarehouseId: string; toWarehouseId: string; date: string; notes: string | null; items: Array<{ productId: string; quantity: string }> }>(`/api/stock/transfers/${id}`) : Promise.resolve(null),
    ]).then(([p, w, s, existing]) => {
      if (p.ok) setProducts(p.data.filter(x => (x as ProductOption & { isActive?: boolean }).isActive !== false))
      if (w.ok) {
        setWarehouses(w.data)
        const def = w.data.find(x => x.isDefault) ?? w.data[0]
        setFrom(def?.id ?? '')
        setTo(w.data.find(x => x.id !== def?.id)?.id ?? '')
      }
      if (s.ok) setAllowNegative(s.data.allowNegativeStock)
      if (existing && existing.ok) {
        const e = existing.data
        setFrom(e.fromWarehouseId); setTo(e.toWarehouseId); setDate(e.date.slice(0, 10)); setNotes(e.notes ?? '')
        setLines(e.items.map(i => ({ ...newLine(), productId: i.productId, quantity: String(Number(i.quantity)) })))
      }
      setReady(true)
    })
  }, [])

  const stockIn = (productId: string, warehouseId: string) =>
    Number(products.find(p => p.id === productId)?.warehouseStock?.find(w => w.warehouseId === warehouseId)?.stock ?? 0)

  const totals = useMemo(() => {
    const m: Record<string, number> = {}
    for (const l of lines) if (l.productId) m[l.productId] = (m[l.productId] || 0) + (Number(l.quantity) || 0)
    return m
  }, [lines])

  const sourceProducts = useMemo(() => products.filter(p => stockIn(p.id, from) > 0 || lines.some(l => l.productId === p.id)), [products, from, lines]) // eslint-disable-line react-hooks/exhaustive-deps

  function update(key: string, patch: Partial<Line>) { setLines(ls => ls.map(l => (l.key === key ? { ...l, ...patch } : l))) }

  function onScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const code = scan.trim().toLowerCase()
    if (!code) return
    const p = products.find(x => x.barcode?.toLowerCase() === code || x.code.toLowerCase() === code)
    if (!p) { setError(t('product_not_found', { code: scan })); return }
    setLines(ls => {
      const existing = ls.find(l => l.productId === p.id)
      if (existing) return ls.map(l => (l.key === existing.key ? { ...l, quantity: String((Number(l.quantity) || 0) + 1) } : l))
      const empty = ls.find(l => !l.productId)
      if (empty) return ls.map(l => (l.key === empty.key ? { ...l, productId: p.id, quantity: '1' } : l))
      return [...ls, { ...newLine(), productId: p.id, quantity: '1' }]
    })
    setScan('')
    scanRef.current?.focus()
  }

  async function submit(validate: boolean) {
    setError('')
    const items = lines.filter(l => l.productId).map(l => ({ productId: l.productId, quantity: Number(l.quantity) }))
    if (!from || !to || from === to) { setError(t('transfer_same_warehouse')); return }
    if (!items.length || items.some(i => !(i.quantity > 0))) { setError(t('transfer_invalid_lines')); return }
    if (!allowNegative) {
      const short = Object.entries(totals).filter(([pid, q]) => q > stockIn(pid, from))
      if (short.length) { setError(t('transfer_insufficient', { products: short.map(([pid]) => products.find(p => p.id === pid)?.code).join(', ') })); return }
    }
    setSaving(true)
    const payload = { fromWarehouseId: from, toWarehouseId: to, date, notes: notes || undefined, items }
    let id = editId
    if (editId) {
      const r = await api(`/api/stock/transfers/${editId}`, { method: 'PUT', body: JSON.stringify(payload) })
      if (!r.ok) { setSaving(false); setError(r.error || t('error_generic')); return }
    } else {
      const r = await api<{ id: string }>('/api/stock/transfers', { method: 'POST', body: JSON.stringify(payload) })
      if (!r.ok) { setSaving(false); setError(r.error || t('error_generic')); return }
      id = r.data.id
    }
    if (validate && id) {
      const v = await api(`/api/stock/transfers/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'validate' }) })
      if (!v.ok) { setSaving(false); setEditId(id); setError(v.error || t('error_generic')); return }
    }
    router.push(`/stock/transfers/${id}`)
  }

  return (
    <StockPage>
      <PageHeader backHref="/stock/transfers" title={editId ? t('edit_transfer') : t('new_transfer')} description={t('transfer_form_desc')} />
      <StockNav />
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      {!ready ? <Loading /> : warehouses.length < 2 ? <Alert tone="amber">{t('transfer_need_two')}</Alert> : (
        <div className="space-y-6">
          <Card title={t('general')}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Field label={`${t('from_warehouse')} *`}>
                <select className={cls.input} value={from} onChange={e => setFrom(e.target.value)}>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
                </select>
              </Field>
              <Field label={`${t('to_warehouse')} *`}>
                <select className={cls.input} value={to} onChange={e => setTo(e.target.value)}>
                  {warehouses.filter(w => w.id !== from).map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
                </select>
              </Field>
              <Field label={t('date')}><input type="date" className={cls.input} value={date} onChange={e => setDate(e.target.value)} /></Field>
              <Field label={t('notes')}><input className={cls.input} value={notes} onChange={e => setNotes(e.target.value)} /></Field>
            </div>
          </Card>

          <Card title={t('lines')} actions={
            <div className="relative">
              <ScanLine className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input ref={scanRef} value={scan} onChange={e => setScan(e.target.value)} onKeyDown={onScan} placeholder={t('scan_placeholder')} className={`${cls.input} ps-9 w-64`} />
            </div>
          } bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className={cls.table}>
                <thead className="bg-zinc-50"><tr>
                  <th className={cls.th}>{t('product')}</th>
                  <th className={`${cls.th} text-end`}>{t('available')}</th>
                  <th className={`${cls.th} text-end w-40`}>{t('quantity')}</th>
                  <th className={cls.th}></th>
                </tr></thead>
                <tbody className="divide-y divide-zinc-100">
                  {lines.map(l => {
                    const avail = l.productId ? stockIn(l.productId, from) : 0
                    const over = !!l.productId && (totals[l.productId] || 0) > avail
                    const unit = products.find(p => p.id === l.productId)?.unit
                    return (
                      <tr key={l.key}>
                        <td className={cls.td}>
                          <select className={cls.input} value={l.productId} onChange={e => update(l.key, { productId: e.target.value })}>
                            <option value="">{t('choose_product')}</option>
                            {sourceProducts.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                          </select>
                        </td>
                        <td className={`${cls.tdNum} ${over ? 'text-red-700 font-semibold' : ''}`}>{l.productId ? `${f.qty(avail)} ${unit ?? ''}` : '—'}</td>
                        <td className={cls.td}>
                          <input type="number" min="0" step="any" inputMode="decimal" className={`${cls.input} text-end ${over && !allowNegative ? 'border-red-400' : ''}`} value={l.quantity} onChange={e => update(l.key, { quantity: e.target.value })} />
                        </td>
                        <td className={`${cls.td} text-end`}>
                          <button onClick={() => setLines(ls => (ls.length > 1 ? ls.filter(x => x.key !== l.key) : [newLine()]))} className={`${cls.btnGhost} hover:text-red-700`} aria-label={t('delete')}><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-zinc-100">
              <button onClick={() => setLines(ls => [...ls, newLine()])} className={cls.btnSecondary}><Plus className="w-4 h-4" /> {t('add_line')}</button>
            </div>
          </Card>

          <div className="flex flex-wrap justify-end gap-2">
            <button disabled={saving} onClick={() => submit(false)} className={cls.btnSecondary}><Save className="w-4 h-4" /> {t('save_draft')}</button>
            <button disabled={saving} onClick={() => submit(true)} className={cls.btnPrimary}><CheckCircle2 className="w-4 h-4" /> {t('save_and_validate')}</button>
          </div>
        </div>
      )}
    </StockPage>
  )
}
