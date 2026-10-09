'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Modal, Field, Alert, cls, api, useStockFormat } from '@/components/stock/ui'

export type MovementKind = 'ENTRY' | 'EXIT' | 'ADJUSTMENT'
export type ProductOption = { id: string; code: string; name: string; unit: string; barcode?: string | null; averageCost?: string | number; purchasePrice?: string | number; warehouseStock?: Array<{ warehouseId: string; stock: string | number }> }
export type WarehouseOption = { id: string; code: string; name: string; isDefault?: boolean }

export const REASONS: Record<MovementKind, string[]> = {
  ENTRY: ['PURCHASE', 'CUSTOMER_RETURN', 'PRODUCTION', 'OTHER'],
  EXIT: ['SALE', 'CONSUMPTION', 'LOSS', 'DAMAGE', 'SUPPLIER_RETURN', 'OTHER'],
  ADJUSTMENT: ['CORRECTION', 'OTHER'],
}

/** Libellé d'un motif (codes connus traduits, texte libre affiché tel quel). */
export function useReasonLabel() {
  const t = useTranslations('StockMod')
  return (code: string | null | undefined) => {
    if (!code) return '—'
    const key = `reason_${code}`
    return t.has(key) ? t(key) : code
  }
}

export default function MovementFormModal({ open, onClose, onSaved, products, warehouses, initialType = 'ENTRY', initialProductId, initialWarehouseId }: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  products: ProductOption[]
  warehouses: WarehouseOption[]
  initialType?: MovementKind
  initialProductId?: string
  initialWarehouseId?: string
}) {
  const t = useTranslations('StockMod')
  const f = useStockFormat()
  const reasonLabel = useReasonLabel()
  const defaultWh = initialWarehouseId || warehouses.find(w => w.isDefault)?.id || warehouses[0]?.id || ''
  const [type, setType] = useState<MovementKind>(initialType)
  const [productId, setProductId] = useState(initialProductId || '')
  const [warehouseId, setWarehouseId] = useState(defaultWh)
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [reason, setReason] = useState(REASONS[initialType][0])
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setType(initialType); setReason(REASONS[initialType][0]); setProductId(initialProductId || ''); setWarehouseId(defaultWh)
    setQuantity(''); setUnitPrice(''); setReference(''); setNotes(''); setSearch(''); setError('')
  }, [open, initialType, initialProductId, defaultWh])

  const product = products.find(p => p.id === productId)
  const available = Number(product?.warehouseStock?.find(w => w.warehouseId === warehouseId)?.stock ?? 0)
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return products.slice(0, 200)
    return products.filter(p => `${p.code} ${p.name} ${p.barcode ?? ''}`.toLowerCase().includes(s)).slice(0, 200)
  }, [products, search])

  // Scan code-barres / recherche exacte : sélection automatique
  useEffect(() => {
    if (search.trim() && filtered.length === 1) setProductId(filtered[0].id)
  }, [search, filtered])

  useEffect(() => {
    if (type === 'ENTRY' && product && unitPrice === '') {
      const c = Number(product.averageCost || 0) || Number(product.purchasePrice || 0)
      if (c) setUnitPrice(String(c))
    }
  }, [type, product, unitPrice])

  async function submit() {
    setError('')
    const q = Number(quantity)
    if (!productId || !warehouseId || !Number.isFinite(q) || q === 0 || (type !== 'ADJUSTMENT' && q < 0)) { setError(t('invalid_movement')); return }
    setSaving(true)
    const r = await api('/api/stock/movements', {
      method: 'POST',
      body: JSON.stringify({ type, productId, warehouseId, quantity: q, unitPrice: type === 'ENTRY' && unitPrice !== '' ? Number(unitPrice) : undefined, reason, reference: reference || undefined, notes: notes || undefined }),
    })
    setSaving(false)
    if (!r.ok) { setError(r.error || t('error_generic')); return }
    onSaved(); onClose()
  }

  return (
    <Modal open={open} title={t('new_movement')} onClose={onClose} wide
      footer={<>
        <button onClick={onClose} className={cls.btnSecondary}>{t('cancel')}</button>
        <button onClick={submit} disabled={saving} className={cls.btnPrimary}>{t('save')}</button>
      </>}>
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      <div className="flex gap-2 mb-4" role="tablist">
        {(['ENTRY', 'EXIT', 'ADJUSTMENT'] as MovementKind[]).map(k => (
          <button key={k} type="button" role="tab" aria-selected={type === k}
            onClick={() => { setType(k); setReason(REASONS[k][0]) }}
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold border transition ${type === k ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50'}`}>
            {t(`type_${k}`)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label={`${t('product')} *`}>
            <input className={cls.input} value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search_or_scan')} />
          </Field>
          <Field label={'\u00a0'}>
            <select className={cls.input} value={productId} onChange={e => setProductId(e.target.value)} size={1}>
              <option value="">{t('choose_product')}</option>
              {filtered.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label={`${t('warehouse')} *`}>
          <select className={cls.input} value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
          </select>
        </Field>
        <Field label={`${t('quantity')} *`} hint={product ? t('available_in_warehouse', { qty: f.qty(available), unit: product.unit }) : (type === 'ADJUSTMENT' ? t('adjustment_hint') : undefined)}>
          <input type="number" step="any" inputMode="decimal" className={cls.input} value={quantity} onChange={e => setQuantity(e.target.value)} />
        </Field>
        {type === 'ENTRY' && (
          <Field label={t('unit_cost')} hint={t('cmup_hint')}>
            <input type="number" step="0.001" min="0" className={cls.input} value={unitPrice} onChange={e => setUnitPrice(e.target.value)} />
          </Field>
        )}
        <Field label={t('reason')}>
          <select className={cls.input} value={reason} onChange={e => setReason(e.target.value)}>
            {REASONS[type].map(r => <option key={r} value={r}>{reasonLabel(r)}</option>)}
          </select>
        </Field>
        <Field label={t('reference')}><input className={cls.input} value={reference} maxLength={100} onChange={e => setReference(e.target.value)} placeholder={t('reference_placeholder')} /></Field>
        <div className="sm:col-span-2"><Field label={t('notes')}><textarea rows={2} className={cls.input} value={notes} onChange={e => setNotes(e.target.value)} /></Field></div>
      </div>
    </Modal>
  )
}
