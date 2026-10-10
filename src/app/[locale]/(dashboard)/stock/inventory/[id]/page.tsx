'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CheckCircle2, XCircle, Save, Printer, Download, FileText, ScanLine, ClipboardList } from 'lucide-react'
import { StockPage, StockNav, PageHeader, Card, Loading, StatusBadge, Alert, Modal, KpiCard, cls, useStockFormat, api, downloadCsv } from '@/components/stock/ui'
import { inventorySummary } from '@/lib/stock-logic'

type Item = {
  id: string; productId: string; expectedQty: string; actualQty: string; counted: boolean; unitCost: string | null; notes: string | null
  product: { id: string; code: string; barcode: string | null; name: string; category: string | null; unit: string }
}
type Inventory = {
  id: string; reference: string; date: string; status: string; scope: string; category: string | null; notes: string | null; validatedAt: string | null
  warehouse: { id: string; code: string; name: string; address: string | null } | null
  items: Item[]
}
type Filter = 'all' | 'todo' | 'gaps'

export default function InventoryDetailPage() {
  const t = useTranslations('StockMod')
  const f = useStockFormat()
  const { id } = useParams<{ id: string }>()
  const [inv, setInv] = useState<Inventory | null>(null)
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Filter>('all')
  const [scan, setScan] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<'validate' | 'cancel' | null>(null)
  const [uncountedAsZero, setUncountedAsZero] = useState(false)
  const [printMode, setPrintMode] = useState<'sheet' | 'results'>('results')
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  const load = useCallback(async () => {
    const r = await api<Inventory>(`/api/stock/inventory/${id}`)
    if (!r.ok) { setError(r.error || t('error_generic')); return }
    setInv(r.data)
    setCounts(Object.fromEntries(r.data.items.map(i => [i.id, i.counted ? String(Number(i.actualQty)) : ''])))
    setDirty(new Set())
  }, [id, t])
  useEffect(() => { load() }, [load])

  const editable = inv?.status === 'DRAFT' || inv?.status === 'IN_PROGRESS'

  // Lignes avec la saisie en cours (pour les écarts affichés en direct)
  const lines = useMemo(() => (inv?.items ?? []).map(i => {
    const raw = counts[i.id]
    const counted = raw !== undefined && raw !== ''
    const actual = counted ? Number(raw) : Number(i.expectedQty)
    const expected = Number(i.expectedQty)
    const cost = Number(i.unitCost ?? 0)
    const gap = counted ? Math.round((actual - expected) * 1000) / 1000 : 0
    return { ...i, counted, actual, expected, cost, gap, gapValue: gap * cost }
  }), [inv, counts])

  const summary = useMemo(() => inventorySummary(lines.map(l => ({ productId: l.productId, expectedQty: l.expected, actualQty: l.actual, counted: l.counted, unitCost: l.cost }))), [lines])

  const visible = lines.filter(l => filter === 'all' || (filter === 'todo' ? !l.counted : l.counted && l.gap !== 0))

  function setCount(itemId: string, v: string) {
    setCounts(c => ({ ...c, [itemId]: v }))
    setDirty(d => new Set(d).add(itemId))
  }

  function onScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const code = scan.trim().toLowerCase()
    if (!code) return
    const line = lines.find(l => l.product.barcode?.toLowerCase() === code || l.product.code.toLowerCase() === code)
      ?? lines.find(l => l.product.name.toLowerCase().includes(code))
    if (!line) { setError(t('product_not_in_inventory', { code: scan })); return }
    setFilter('all')
    // Scan d'un code-barres exact : +1 ; recherche : focus sur la ligne
    if (line.product.barcode?.toLowerCase() === code || line.product.code.toLowerCase() === code) {
      const current = counts[line.id] === '' || counts[line.id] === undefined ? 0 : Number(counts[line.id])
      setCount(line.id, String(current + 1))
    }
    setScan('')
    setTimeout(() => { const el = inputs.current[line.id]; el?.scrollIntoView({ block: 'center' }); el?.focus(); el?.select() }, 50)
  }

  async function save(silent = false): Promise<boolean> {
    if (!dirty.size) return true
    setBusy(true)
    const payload = { counts: [...dirty].map(itemId => ({ itemId, actualQty: counts[itemId] === '' ? null : Number(counts[itemId]) })) }
    if (payload.counts.some(c => c.actualQty !== null && !(c.actualQty >= 0))) { setBusy(false); setError(t('invalid_count')); return false }
    const r = await api(`/api/stock/inventory/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
    setBusy(false)
    if (!r.ok) { setError(r.error || t('error_generic')); return false }
    setDirty(new Set())
    if (!silent) { setNotice(t('counts_saved')); load() }
    return true
  }

  async function run(action: 'validate' | 'cancel') {
    setConfirm(null)
    if (action === 'validate' && !(await save(true))) return
    setBusy(true)
    const r = await api<{ adjustments?: number }>(`/api/stock/inventory/${id}`, { method: 'PATCH', body: JSON.stringify({ action, uncountedAsZero }) })
    setBusy(false)
    if (!r.ok) { setError(r.error || t('error_generic')); return }
    setNotice(action === 'validate' ? t('inventory_validated', { count: r.data.adjustments ?? 0 }) : t('inventory_cancelled'))
    load()
  }

  function print(mode: 'sheet' | 'results') {
    setPrintMode(mode)
    setTimeout(() => window.print(), 50)
  }

  function exportCsv() {
    if (!inv) return
    downloadCsv(`inventaire-${inv.reference}.csv`, [
      [t('code'), t('product'), t('category'), t('unit'), t('theoretical'), t('counted'), t('gap_qty'), t('unit_cost'), t('gap_value')],
      ...lines.map(l => [l.product.code, l.product.name, l.product.category ?? '', l.product.unit, l.expected, l.counted ? l.actual : '', l.counted ? l.gap : '', l.cost, l.counted ? Math.round(l.gapValue * 1000) / 1000 : '']),
      [],
      [t('gap_value'), '', '', '', '', '', '', '', summary.gapValue],
    ])
  }

  async function exportPdf() {
    if (!inv) return
    if (f.locale === 'ar') { print('results'); return } // police arabe non embarquée dans jsPDF : impression navigateur
    const [{ jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
    const autoTable = autoTableMod.default
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text(`${t('inventory')} ${inv.reference} — ${inv.warehouse?.name ?? ''}`, 14, 15)
    doc.setFontSize(9)
    doc.text(`${t('date')}: ${f.date(inv.date)}   ${t('status')}: ${t(`status_${inv.status}`)}   ${t('gap_value')}: ${f.money(summary.gapValue)}`, 14, 22)
    autoTable(doc, {
      startY: 27,
      head: [[t('code'), t('product'), t('unit'), t('theoretical'), t('counted'), t('gap_qty'), t('unit_cost'), t('gap_value')]],
      body: lines.map(l => [l.product.code, l.product.name, l.product.unit, f.qty(l.expected), l.counted ? f.qty(l.actual) : '—', l.counted ? f.signedQty(l.gap) : '—', f.money(l.cost), l.counted ? f.money(l.gapValue) : '—']),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] },
    })
    doc.save(`inventaire-${inv.reference}.pdf`)
  }

  return (
    <StockPage>
      <PageHeader
        backHref="/stock/inventory"
        title={inv ? `${t('inventory')} ${inv.reference}` : t('inventory')}
        description={inv ? `${inv.warehouse?.name ?? ''} · ${inv.scope === 'CATEGORY' ? `${t('scope_CATEGORY')} : ${inv.category}` : t('scope_FULL')} · ${f.date(inv.date)}` : undefined}
        actions={inv && <>
          <button onClick={() => print('sheet')} className={cls.btnSecondary}><ClipboardList className="w-4 h-4" /> {t('print_count_sheet')}</button>
          <button onClick={() => print('results')} className={cls.btnSecondary}><Printer className="w-4 h-4" /> {t('print_results')}</button>
          <button onClick={exportCsv} className={cls.btnSecondary}><Download className="w-4 h-4" /> CSV</button>
          <button onClick={exportPdf} className={cls.btnSecondary}><FileText className="w-4 h-4" /> PDF</button>
          {editable && <button disabled={busy} onClick={() => setConfirm('cancel')} className={cls.btnSecondary}><XCircle className="w-4 h-4" /> {t('cancel_doc')}</button>}
          {editable && <button disabled={busy || !dirty.size} onClick={() => save()} className={cls.btnSecondary}><Save className="w-4 h-4" /> {t('save')}{dirty.size ? ` (${dirty.size})` : ''}</button>}
          {editable && <button disabled={busy} onClick={() => setConfirm('validate')} className={cls.btnPrimary}><CheckCircle2 className="w-4 h-4" /> {t('validate')}</button>}
        </>}
      />
      <StockNav />
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert tone="green" onClose={() => setNotice('')}>{notice}</Alert>}
      {!inv ? (error ? null : <Loading />) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 no-print">
            <div className={`${cls.card} p-5 flex flex-col justify-between`}>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide text-start">{t('status')}</p>
              <div className="mt-2"><StatusBadge status={inv.status} /></div>
            </div>
            <KpiCard label={t('progress')} value={`${f.qty(summary.counted)} / ${f.qty(summary.lines)}`} sub={t('lines_with_gap', { count: summary.withGap })} tone="blue" />
            <KpiCard label={t('gap_plus')} value={`+${f.qty(summary.gapQtyPlus)}`} tone="emerald" />
            <KpiCard label={t('gap_minus')} value={`−${f.qty(summary.gapQtyMinus)}`} tone="red" />
            <KpiCard label={t('gap_value')} value={f.money(summary.gapValue)} sub={t('theoretical_value', { value: f.money(summary.theoreticalValue) })} tone={summary.gapValue < 0 ? 'red' : 'teal'} />
          </div>

          {/* Impression : en-tête */}
          <div className="print-only">
            <h2 className="text-lg font-bold">{printMode === 'sheet' ? t('count_sheet') : t('inventory_results')} — {inv.reference}</h2>
            <p className="text-sm">{inv.warehouse?.name} · {f.date(inv.date)} · {t('status')}: {t(`status_${inv.status}`)}</p>
            {printMode === 'results' && <p className="text-sm">{t('gap_value')}: {f.money(summary.gapValue)}</p>}
          </div>

          <Card
            title={t('count_entry')}
            actions={<>
              <div className="hidden md:flex gap-1">
                {(['all', 'todo', 'gaps'] as Filter[]).map(k => (
                  <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === k ? 'bg-teal-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>{t(`filter_${k}`)}</button>
                ))}
              </div>
              {editable && (
                <div className="relative">
                  <ScanLine className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input value={scan} onChange={e => setScan(e.target.value)} onKeyDown={onScan} placeholder={t('scan_placeholder')} className={`${cls.input} ps-9 w-64`} autoFocus />
                </div>
              )}
            </>}
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className={cls.table}>
                <thead className="bg-zinc-50"><tr>
                  <th className={cls.th}>{t('code')}</th>
                  <th className={cls.th}>{t('product')}</th>
                  <th className={`${cls.th} text-end`}>{t('theoretical')}</th>
                  <th className={`${cls.th} text-end w-36`}>{t('counted')}</th>
                  <th className={`${cls.th} text-end ${printMode === 'sheet' ? 'print-hide' : ''}`}>{t('gap_qty')}</th>
                  <th className={`${cls.th} text-end ${printMode === 'sheet' ? 'print-hide' : ''}`}>{t('gap_value')}</th>
                </tr></thead>
                <tbody className="divide-y divide-zinc-100">
                  {visible.map(l => (
                    <tr key={l.id} className={l.counted && l.gap !== 0 ? 'bg-amber-50/40' : ''}>
                      <td className={`${cls.td} font-mono text-xs`}>{l.product.code}</td>
                      <td className={cls.td}>{l.product.name}<span className="block text-xs text-zinc-400">{l.product.category ?? ''}</span></td>
                      <td className={cls.tdNum}>{f.qty(l.expected)} <span className="text-xs text-zinc-400">{l.product.unit}</span></td>
                      <td className={cls.td}>
                        {editable ? (
                          <>
                            <input
                              ref={el => { inputs.current[l.id] = el }}
                              type="number" min="0" step="any" inputMode="decimal"
                              className={`${cls.input} text-end no-print ${dirty.has(l.id) ? 'border-teal-500 bg-teal-50/40' : ''}`}
                              value={counts[l.id] ?? ''} placeholder="—"
                              onChange={e => setCount(l.id, e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  const idx = visible.findIndex(v => v.id === l.id)
                                  const next = visible[idx + 1]
                                  if (next) { inputs.current[next.id]?.focus(); inputs.current[next.id]?.select() }
                                }
                              }}
                            />
                            <span className="print-only text-end">{printMode === 'sheet' ? '______' : (l.counted ? f.qty(l.actual) : '—')}</span>
                          </>
                        ) : (
                          <span className="block text-end tabular-nums">{l.counted ? f.qty(l.actual) : '—'}</span>
                        )}
                      </td>
                      <td className={`${cls.tdNum} ${printMode === 'sheet' ? 'print-hide' : ''} ${l.gap < 0 ? 'text-red-700 font-semibold' : l.gap > 0 ? 'text-emerald-700 font-semibold' : 'text-zinc-400'}`}>{l.counted ? f.signedQty(l.gap) : '—'}</td>
                      <td className={`${cls.tdNum} ${printMode === 'sheet' ? 'print-hide' : ''} ${l.gapValue < 0 ? 'text-red-700' : l.gapValue > 0 ? 'text-emerald-700' : 'text-zinc-400'}`}>{l.counted ? f.money(l.gapValue) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          {inv.notes && <p className="text-sm text-zinc-500 text-start">{t('notes')} : {inv.notes}</p>}
        </div>
      )}

      <Modal open={!!confirm} title={confirm === 'validate' ? t('confirm_validate_inventory_title') : t('confirm_cancel_title')} onClose={() => setConfirm(null)}
        footer={<>
          <button onClick={() => setConfirm(null)} className={cls.btnSecondary}>{t('back')}</button>
          <button onClick={() => confirm && run(confirm)} className={confirm === 'validate' ? cls.btnPrimary : cls.btnDanger}>{t('confirm')}</button>
        </>}>
        {confirm === 'validate' ? (
          <div className="space-y-3 text-sm text-zinc-600 text-start">
            <p>{t('confirm_validate_inventory', { gaps: summary.withGap, value: f.money(summary.gapValue) })}</p>
            {summary.counted < summary.lines && (
              <label className="flex items-start gap-2">
                <input type="checkbox" className="accent-teal-600 mt-0.5" checked={uncountedAsZero} onChange={e => setUncountedAsZero(e.target.checked)} />
                <span>{t('uncounted_as_zero', { count: summary.lines - summary.counted })}</span>
              </label>
            )}
          </div>
        ) : <p className="text-sm text-zinc-600 text-start">{t('confirm_cancel_inventory')}</p>}
      </Modal>
    </StockPage>
  )
}
