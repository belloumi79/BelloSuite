'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Plus, ArrowRight } from 'lucide-react'
import { StockPage, StockNav, PageHeader, Card, Loading, EmptyState, StatusBadge, Alert, cls, useStockFormat, api } from '@/components/stock/ui'

type Transfer = {
  id: string; reference: string; date: string; status: string; notes: string | null
  fromWarehouse: { code: string; name: string }; toWarehouse: { code: string; name: string }
  items: Array<{ id: string; quantity: string; product: { code: string; name: string } }>
}
const STATUSES = ['', 'DRAFT', 'TRANSFERRED', 'CANCELLED']

export default function TransfersPage() {
  const t = useTranslations('StockMod')
  const f = useStockFormat()
  const [rows, setRows] = useState<Transfer[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api<Transfer[]>(`/api/stock/transfers${status ? `?status=${status}` : ''}`)
    if (r.ok) setRows(r.data); else setError(r.error || t('error_generic'))
    setLoading(false)
  }, [status, t])
  useEffect(() => { load() }, [load])

  return (
    <StockPage>
      <PageHeader title={t('transfers_title')} description={t('transfers_desc')}
        actions={<Link href="/stock/transfers/new" className={cls.btnPrimary}><Plus className="w-4 h-4" /> {t('new_transfer')}</Link>} />
      <StockNav />
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      <Card
        title={t('transfer_list')}
        actions={<div className="flex gap-1">{STATUSES.map(s => (
          <button key={s || 'all'} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${status === s ? 'bg-teal-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
            {s ? t(`status_${s}`) : t('all')}
          </button>
        ))}</div>}
        bodyClassName="p-0"
      >
        {loading ? <Loading /> : rows.length === 0 ? <EmptyState title={t('no_transfer')} action={<Link href="/stock/transfers/new" className={cls.btnPrimary}><Plus className="w-4 h-4" /> {t('new_transfer')}</Link>} /> : (
          <div className="overflow-x-auto">
            <table className={cls.table}>
              <thead className="bg-zinc-50"><tr>
                <th className={cls.th}>{t('reference')}</th>
                <th className={cls.th}>{t('date')}</th>
                <th className={cls.th}>{t('route')}</th>
                <th className={`${cls.th} text-end`}>{t('lines')}</th>
                <th className={`${cls.th} text-end`}>{t('total_qty')}</th>
                <th className={cls.th}>{t('status')}</th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map(tr => (
                  <tr key={tr.id} className="hover:bg-zinc-50">
                    <td className={cls.td}><Link href={`/stock/transfers/${tr.id}`} className="font-mono text-xs font-semibold text-teal-700 hover:underline">{tr.reference}</Link></td>
                    <td className={`${cls.td} whitespace-nowrap`}>{f.date(tr.date)}</td>
                    <td className={cls.td}>
                      <span className="inline-flex items-center gap-2">{tr.fromWarehouse.name} <ArrowRight className="w-4 h-4 text-zinc-400 rtl:rotate-180" /> {tr.toWarehouse.name}</span>
                    </td>
                    <td className={cls.tdNum}>{tr.items.length}</td>
                    <td className={cls.tdNum}>{f.qty(tr.items.reduce((s, i) => s + Number(i.quantity), 0))}</td>
                    <td className={cls.td}><StatusBadge status={tr.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </StockPage>
  )
}
