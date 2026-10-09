'use client'

/** Champs produit liés aux référentiels stock (catégories, unités, dépôts). */
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

type Unit = { code: string; name: string }
type Warehouse = { id: string; code: string; name: string; isDefault?: boolean }

export function useStockReferentials() {
  const [categories, setCategories] = useState<string[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  useEffect(() => {
    Promise.all([
      fetch('/api/stock/categories').then(r => (r.ok ? r.json() : [])),
      fetch('/api/stock/units').then(r => (r.ok ? r.json() : [])),
      fetch('/api/stock/warehouses').then(r => (r.ok ? r.json() : [])),
    ]).then(([c, u, w]) => {
      setCategories((c as Array<{ name: string }>).map(x => x.name))
      setUnits(u as Unit[])
      setWarehouses(w as Warehouse[])
    }).catch(() => {})
  }, [])
  return { categories, units, warehouses }
}

export function CategoryInput({ value, onChange, className, categories }: { value: string; onChange: (v: string) => void; className: string; categories: string[] }) {
  return (
    <>
      <input list="stock-categories" value={value} onChange={e => onChange(e.target.value)} className={className} autoComplete="off" />
      <datalist id="stock-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
    </>
  )
}

export function UnitSelect({ value, onChange, className, units }: { value: string; onChange: (v: string) => void; className: string; units: Unit[] }) {
  const t = useTranslations('StockMod')
  const known = units.some(u => u.code === value)
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={className}>
      {!known && value && <option value={value}>{value}</option>}
      {units.length === 0 && !value && <option value="unit">{t('unit')}</option>}
      {units.map(u => <option key={u.code} value={u.code}>{u.name} ({u.code})</option>)}
    </select>
  )
}
