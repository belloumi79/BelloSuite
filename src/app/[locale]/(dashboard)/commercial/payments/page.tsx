'use client'

import { useState, useEffect } from 'react'
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  BellRing, 
  Mail, 
  MessageSquare, 
  Phone, 
  RefreshCw, 
  X, 
  User, 
  Calendar, 
  DollarSign 
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

const STATUS_CONFIG: Record<string, { key: string; color: string; bg: string; icon: any }> = {
  DUE_FUTURE:    { key: 'due_future',    color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',   icon: Clock },
  DUE_TODAY:     { key: 'due_today',     color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', icon: AlertTriangle },
  OVERDUE_30:    { key: 'overdue_30',    color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800', icon: AlertTriangle },
  OVERDUE_60:    { key: 'overdue_60',    color: 'text-red-600 dark:text-red-400',   bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',      icon: AlertTriangle },
  OVERDUE_90PLUS:{ key: 'overdue_90',    color: 'text-red-800 dark:text-red-300',   bg: 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700',     icon: AlertTriangle },
  NO_DUE:        { key: 'all',           color: 'text-stone-500 dark:text-stone-400', bg: 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800',  icon: Clock },
}

const METHOD_ICONS: Record<string, any> = { EMAIL: Mail, SMS: MessageSquare, WHATSAPP: Phone }

export default function PaymentsPage() {
  const t = useTranslations('Commercial.Payments')
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [tenantId, setTenantId] = useState('')
  const [followUps, setFollowUps] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [selectedRemind, setSelectedRemind] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const session = localStorage.getItem('bello_session')
    if (session) {
      const { tenantId: tid } = JSON.parse(session)
      setTenantId(tid)
      fetchData(tid)
    }
  }, [])

  const fetchData = async (tid: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/commercial/payments/follow-up?tenantId=${tid}`)
      if (res.ok) { 
        const data = await res.json()
        setFollowUps(data.followUps || [])
        setStats(data.stats || {}) 
      }
    } catch (e) { 
      console.error(e) 
    } finally { 
      setLoading(false) 
    }
  }

  const sendReminder = async (invoice: any, method: string) => {
    if (!tenantId) return
    setSending(true)
    try {
      const res = await fetch(`/api/commercial/payments/${invoice.id}/remind`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, method }),
      })
      const data = await res.json()
      if (res.ok && data.result?.status === 'sent') {
        setSent(prev => ({ ...prev, [invoice.id + method]: true }))
        setTimeout(() => setSelectedRemind(null), 1500)
      } else { 
        alert(data.result?.error || 'Failed to send') 
      }
    } catch (e) { 
      console.error(e) 
    } finally { 
      setSending(false) 
    }
  }

  const fmt = (n: number) => n.toLocaleString(locale === 'ar' ? 'ar-TN' : 'fr-TN', { 
    maximumFractionDigits: 3,
    minimumFractionDigits: 3,
    style: 'currency',
    currency: 'TND'
  }).replace('TND', '').trim() + ' DT'

  const filtered = filter === 'ALL' ? followUps : followUps.filter((f: any) => f.status === filter)

  const overdueStats = [
    { key: 'overdue30',    label: t('filters.overdue_30'),  color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { key: 'overdue60',   label: t('filters.overdue_60'), color: 'text-red-600 dark:text-red-400',   bg: 'bg-red-50 dark:bg-red-900/20' },
    { key: 'overdue90plus', label: t('filters.overdue_90'), color: 'text-red-800 dark:text-red-300',   bg: 'bg-red-100 dark:bg-red-900/40' },
  ]

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen transition-colors duration-300" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20 group transition-transform hover:scale-105 active:scale-95">
              <Clock className="w-6 h-6" />
            </span>
            {t('title')}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm md:text-base max-w-2xl px-1">
            {t('subtitle')}
          </p>
        </div>
        <button 
          onClick={() => fetchData(tenantId)} 
          className="self-start md:self-center flex items-center gap-2 px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold transition-all active:scale-95"
          title={t('refresh')}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          <span className="hidden sm:inline">{t('refresh')}</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm overflow-hidden relative group transition-all hover:border-red-200 dark:hover:border-red-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
          <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{t('stats.overdue')}</p>
          <p className="text-3xl font-black text-red-600 dark:text-red-400 mt-2 font-mono tracking-tighter tabular-nums drop-shadow-sm">
            {fmt(stats.totalOverdue || 0)}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {t('stats.count_invoices', { count: stats.count || 0 })}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm overflow-hidden relative group transition-all hover:border-blue-200 dark:hover:border-blue-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
          <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{t('stats.due')}</p>
          <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2 font-mono tracking-tighter tabular-nums drop-shadow-sm">
            {fmt(stats.totalDue || 0)}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {t('stats.count_invoices', { count: (followUps.filter(f => f.status === 'DUE_TODAY' || f.status === 'DUE_FUTURE').length) })}
          </p>
        </div>

        {overdueStats.map(s => (
          <div key={s.key} className={`${s.bg} rounded-3xl border border-transparent dark:border-zinc-800 p-6 relative overflow-hidden group transition-all`}>
            <div className={`absolute top-0 right-0 w-24 h-24 bg-current opacity-[0.03] rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110 ${s.color}`} />
            <p className={`text-[10px] font-black uppercase tracking-widest ${s.color}`}>{s.label}</p>
            <p className={`text-2xl font-black ${s.color} mt-2 font-mono tracking-tighter tabular-nums`}>
              {fmt(stats[s.key] || 0)}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center bg-zinc-100/50 dark:bg-zinc-800/30 p-1.5 rounded-2xl w-fit">
        {[
          { id: 'ALL', label: t('filters.all'), cls: 'bg-zinc-900 text-white dark:bg-teal-600' },
          { id: 'OVERDUE_90PLUS', label: t('filters.overdue_90'), cls: 'bg-red-600 text-white' },
          { id: 'OVERDUE_60', label: t('filters.overdue_60'), cls: 'bg-red-500 text-white' },
          { id: 'OVERDUE_30', label: t('filters.overdue_30'), cls: 'bg-orange-500 text-white' },
          { id: 'DUE_TODAY', label: t('filters.due_today'), cls: 'bg-amber-500 text-white' },
          { id: 'DUE_FUTURE', label: t('filters.due_future'), cls: 'bg-blue-600 text-white' }
        ].map(f => (
          <button 
            key={f.id} 
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
              filter === f.id ? f.cls : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-start">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100 dark:bg-zinc-800/50 dark:border-zinc-800 text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                <th className="px-8 py-5 text-start">{t('table.client')}</th>
                <th className="px-6 py-5 text-start">{t('table.invoice')}</th>
                <th className="px-6 py-5 text-start">{t('table.due_date')}</th>
                <th className="px-6 py-5 text-start">{t('table.amount_ttc')}</th>
                <th className="px-6 py-5 text-start">{t('table.status')}</th>
                <th className="px-6 py-5 text-start">{t('table.last_reminder')}</th>
                <th className="px-8 py-5 text-end">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
                      <span className="text-zinc-400 font-bold animate-pulse">{t('refresh')}...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 transition-all animate-in fade-in zoom-in duration-500">
                      <div className="w-20 h-20 rounded-full bg-stone-100 dark:bg-zinc-800 flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-zinc-900 dark:text-white font-black text-xl">Perfecto!</p>
                        <p className="text-zinc-400 font-medium">Aucune facture impayée à traiter.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((fu: any) => {
                const cfg = STATUS_CONFIG[fu.status] || STATUS_CONFIG.NO_DUE
                const Icon = cfg.icon
                const lastR = fu.lastReminder
                const LastIcon = lastR ? METHOD_ICONS[lastR.method] : null
                
                return (
                  <tr key={fu.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors relative overflow-hidden">
                          <User className="w-5 h-5 relative z-10" />
                          <div className="absolute inset-0 bg-teal-600 transition-transform translate-y-full group-hover:translate-y-0 opacity-10" />
                        </div>
                        <div>
                          <p className="font-black text-zinc-900 dark:text-white text-sm tracking-tight">{fu.client?.name || '---'}</p>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wide">{fu.client?.phone || fu.client?.email || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                        <span className="font-mono font-black text-zinc-700 dark:text-zinc-300 text-sm">{fu.invoiceNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-zinc-400 group-hover:text-teal-500 transition-colors" />
                        <div>
                          <p className={`text-sm font-black tracking-tight ${fu.daysOverdue && fu.daysOverdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                            {fu.dueDate ? new Date(fu.dueDate).toLocaleDateString(locale === 'ar' ? 'ar-TN' : 'fr-TN') : '---'}
                          </p>
                          {fu.daysOverdue !== null && fu.daysOverdue > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-[9px] text-red-600 font-black uppercase">
                              {t('table.overdue_days', { days: fu.daysOverdue })}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-zinc-900 dark:text-white font-mono text-base tracking-tighter tabular-nums">
                          {fmt(fu.totalTTC)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider border shadow-sm transition-transform active:scale-95 cursor-default ${cfg.bg} ${cfg.color}`}>
                        <Icon className="w-3 h-3" />
                        {t(`filters.${cfg.key}`)}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      {lastR ? (
                        <div className="flex items-center gap-2 p-2 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl w-fit">
                          {LastIcon && <LastIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            {new Date(lastR.sentAt).toLocaleDateString(locale === 'ar' ? 'ar-TN' : 'fr-TN')}
                          </span>
                          <div className="w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-2.5 h-2.5 text-white" />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-zinc-300 dark:text-zinc-600 uppercase tracking-widest bg-zinc-100/50 dark:bg-zinc-800/50 px-2 py-1 rounded-lg">
                          {t('reminders.never')}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-end">
                      {sent[fu.id + 'EMAIL'] || sent[fu.id + 'SMS'] || sent[fu.id + 'WHATSAPP'] ? (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-2xl font-black text-[10px] uppercase shadow-inner">
                          <CheckCircle className="w-4 h-4" /> 
                          {t('reminders.sent')}
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 translate-x-4">
                          <button 
                            onClick={() => setSelectedRemind(fu)} 
                            className="group/btn flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500 text-white rounded-2xl text-xs font-black transition-all shadow-lg shadow-teal-500/20 active:scale-95"
                          >
                            <BellRing className="w-4 h-4 transition-transform group-hover/btn:rotate-12" /> 
                            {t('reminders.remind_button')}
                          </button>
                          <button 
                            className="p-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-2xl transition-all active:scale-90" 
                            title={t('reminders.mark_paid')}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reminder Modal */}
      {selectedRemind && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedRemind(null)} />
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full -mr-16 -mt-16" />
               <div className="relative z-10">
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{t('modal.title')}</h2>
                <p className="text-zinc-500 dark:text-zinc-400 font-bold mt-1 uppercase text-[10px] tracking-widest">{t('modal.subtitle', { number: selectedRemind.invoiceNumber })}</p>
              </div>
              <button onClick={() => setSelectedRemind(null)} className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors relative z-10">
                <X className="w-6 h-6 text-zinc-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-[2rem] p-6 space-y-3 border border-zinc-100 dark:border-zinc-800 shadow-inner">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 font-medium">{t('table.client')}</span>
                  <span className="font-black text-zinc-900 dark:text-white uppercase tracking-tight">{selectedRemind.client?.name}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 font-medium">{t('table.amount_ttc')}</span>
                  <span className="font-black text-zinc-900 dark:text-white font-mono text-base">{fmt(selectedRemind.totalTTC)}</span>
                </div>
                <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 font-medium">{t('table.due_date')}</span>
                  <span className={`font-black ${selectedRemind.daysOverdue > 0 ? 'text-red-600' : 'text-zinc-900 dark:text-white'}`}>
                    {selectedRemind.dueDate ? new Date(selectedRemind.dueDate).toLocaleDateString(locale === 'ar' ? 'ar-TN' : 'fr-TN') : '---'}
                  </span>
                </div>
                {selectedRemind.daysOverdue > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 font-medium">{t('table.overdue_days', { days: '' }).replace('-', '').trim()}</span>
                    <span className="font-black text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-lg text-xs">
                      {selectedRemind.daysOverdue} {t('stats.days', { days: '' }).replace('{days}', '').trim()}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest px-2">{t('modal.method_label')}</p>
                <div className="grid gap-3">
                  {[
                    { key: 'EMAIL', label: t('modal.methods.email'), icon: Mail, desc: t('modal.send_desc.email'), color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/10' },
                    { key: 'SMS', label: t('modal.methods.sms'), icon: MessageSquare, desc: t('modal.send_desc.sms'), color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
                    { key: 'WHATSAPP', label: t('modal.methods.whatsapp'), icon: Phone, desc: t('modal.send_desc.whatsapp'), color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/10' }
                  ].map(m => {
                    const Icon = m.icon
                    const isSuccess = sent[selectedRemind.id + m.key]
                    return (
                      <button 
                        key={m.key} 
                        onClick={() => !sending && !isSuccess && sendReminder(selectedRemind, m.key)} 
                        disabled={sending || isSuccess}
                        className={`group w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/30 border-2 border-transparent hover:border-teal-500/50 dark:hover:border-teal-500/30 rounded-3xl transition-all duration-300 disabled:opacity-50 active:scale-[0.98] ${isSuccess ? 'border-emerald-500/50 dark:border-emerald-500/30' : ''}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${m.bg} ${m.color}`}>
                            <Icon className="w-7 h-7" />
                          </div>
                          <div className={isRTL ? 'text-right' : 'text-left'}>
                            <p className="font-black text-zinc-900 dark:text-white tracking-tight">{m.label}</p>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">{m.desc}</p>
                          </div>
                        </div>
                        {isSuccess ? (
                          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors">
                            <div className={`w-2 h-2 rounded-full bg-current ${sending ? 'animate-ping' : ''}`} />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer / Progress */}
            {sending && (
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-100 dark:bg-zinc-800">
                <div className="h-full bg-teal-500 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '40%' }} />
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
