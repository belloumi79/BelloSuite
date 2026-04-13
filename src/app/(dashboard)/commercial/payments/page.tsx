'use client'
import { useState, useEffect } from 'react'
import { Clock, AlertTriangle, CheckCircle, BellRing, Mail, MessageSquare, Phone, RefreshCw, X, User, Calendar, DollarSign } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  DUE_FUTURE:    { label: 'A echoir',             color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200',   icon: Clock },
  DUE_TODAY:     { label: "Echeance aujourd'hui", color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle },
  OVERDUE_30:    { label: '1-30j retard',          color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', icon: AlertTriangle },
  OVERDUE_60:    { label: '31-60j retard',        color: 'text-red-600',   bg: 'bg-red-50 border-red-200',      icon: AlertTriangle },
  OVERDUE_90PLUS:{ label: '90j+ retard',          color: 'text-red-800',   bg: 'bg-red-100 border-red-300',     icon: AlertTriangle },
  NO_DUE:        { label: 'Sans echeance',        color: 'text-stone-500', bg: 'bg-stone-50 border-stone-200',  icon: Clock },
}
const METHOD_ICONS: Record<string, any> = { EMAIL: Mail, SMS: MessageSquare, WHATSAPP: Phone }

export default function PaymentsPage() {
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
      if (res.ok) { const data = await res.json(); setFollowUps(data.followUps || []); setStats(data.stats || {}) }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const sendReminder = async (invoice: any, method: string) => {
    if (!tenantId) return
    setSending(true)
    try {
      const res = await fetch(`/api/commercial/payments/${invoice.id}/remind`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, method }),
      })
      const data = await res.json()
      if (res.ok && data.result?.status === 'sent') {
        setSent(prev => ({ ...prev, [invoice.id + method]: true }))
        setTimeout(() => setSelectedRemind(null), 1500)
      } else { alert(data.result?.error || 'Echec de envoi') }
    } catch (e) { console.error(e) } finally { setSending(false) }
  }

  const fmt = (n: number) => n.toLocaleString('fr-TN', { maximumFractionDigits: 3 }) + ' DT'
  const filtered = filter === 'ALL' ? followUps : followUps.filter((f: any) => f.status === filter)

  const overdueStats = [
    { key: 'overdue30',    label: '1-30j',  color: 'text-orange-600', bg: 'bg-orange-50' },
    { key: 'overdue60',   label: '31-60j', color: 'text-red-600',   bg: 'bg-red-50' },
    { key: 'overdue90plus', label: '90j+', color: 'text-red-800',   bg: 'bg-red-100' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight flex items-center gap-3">📋 Suivi des Paiements</h1>
          <p className="text-stone-500 font-medium mt-1">Relances automatiques - Ne perdez plus un seul dinar</p>
        </div>
        <button onClick={() => fetchData(tenantId)} className="p-2.5 border border-stone-200 rounded-xl hover:bg-stone-50 text-stone-500">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <p className="text-xs font-black text-stone-500 uppercase tracking-widest">En Retard</p>
          <p className="text-2xl font-black text-red-600 mt-1">{fmt(stats.totalOverdue || 0)}</p>
          <p className="text-xs text-stone-400 mt-1">{stats.count || 0} factures</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <p className="text-xs font-black text-stone-500 uppercase tracking-widest">A Echoir</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{fmt(stats.totalDue || 0)}</p>
        </div>
        {overdueStats.map(s => (
          <div key={s.key} className={`${s.bg} rounded-2xl border p-5`}>
            <p className={`text-xs font-black uppercase tracking-widest ${s.color}`}>{s.label}</p>
            <p className={`text-xl font-black ${s.color} mt-1`}>{fmt(stats[s.key] || 0)}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['ALL','Tous','bg-stone-100 text-stone-700'],['OVERDUE_90PLUS','90j+','bg-red-100 text-red-700'],['OVERDUE_60','31-60j','bg-red-50 text-red-600'],['OVERDUE_30','1-30j','bg-orange-50 text-orange-600'],['DUE_TODAY',"Aujourd'hui",'bg-amber-50 text-amber-600'],['DUE_FUTURE','A echoir','bg-blue-50 text-blue-600']].map(([key, label, cls]) => (
          <button key={key} onClick={() => setFilter(key as string)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${filter === key ? cls + ' ring-2 ring-offset-1' : 'bg-white border border-stone-200 text-stone-500 hover:bg-stone-50'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100 text-[10px] font-black text-stone-500 uppercase tracking-widest">
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Facture</th>
                <th className="px-6 py-4">Echeance</th>
                <th className="px-6 py-4">Montant TTC</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Derniere Relance</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center text-stone-400 font-bold">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center text-stone-400 font-bold">Aucune facture impayee</td></tr>
              ) : filtered.map((fu: any) => {
                const cfg = STATUS_CONFIG[fu.status] || STATUS_CONFIG.NO_DUE
                const Icon = cfg.icon
                const lastR = fu.lastReminder
                const LastIcon = lastR ? METHOD_ICONS[lastR.method] : null
                return (
                  <tr key={fu.id} className="hover:bg-stone-50/60 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center"><User className="w-4 h-4 text-stone-400" /></div>
                        <div>
                          <p className="font-bold text-stone-900 text-sm">{fu.client?.name || '---'}</p>
                          <p className="text-[10px] text-stone-400">{fu.client?.phone || fu.client?.email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="font-mono font-bold text-stone-700 text-sm">{fu.invoiceNumber}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <div>
                          <p className={`text-sm font-bold ${fu.daysOverdue && fu.daysOverdue > 0 ? 'text-red-600' : 'text-stone-600'}`}>
                            {fu.dueDate ? new Date(fu.dueDate).toLocaleDateString('fr-TN') : '---'}
                          </p>
                          {fu.daysOverdue !== null && fu.daysOverdue > 0 && <p className="text-[10px] text-red-500 font-black">-{fu.daysOverdue}j</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-stone-400" /><span className="font-black text-stone-900 font-mono">{fmt(fu.totalTTC)}</span></div></td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${cfg.bg} ${cfg.color}`}>
                        <Icon className="w-3 h-3" />{cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {lastR ? (
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                          {LastIcon && <LastIcon className="w-3.5 h-3.5" />}
                          <span>{new Date(lastR.sentAt).toLocaleDateString('fr-TN')}</span>
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                        </div>
                      ) : <span className="text-xs text-stone-400">Jamais relance</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {sent[fu.id + 'EMAIL'] ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle className="w-4 h-4" /> Envoye</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => setSelectedRemind(fu)} className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all" title="Envoyer une relance">
                            <BellRing className="w-3.5 h-3.5" /> Relancer
                          </button>
                          <button className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-xl transition-all" title="Marquer paye"><CheckCircle className="w-4 h-4" /></button>
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

      {selectedRemind && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-stone-900">Envoyer une Relance</h2>
                <p className="text-sm text-stone-500 mt-1">Facture {selectedRemind.invoiceNumber}</p>
              </div>
              <button onClick={() => setSelectedRemind(null)} className="p-2 hover:bg-stone-100 rounded-xl"><X className="w-5 h-5 text-stone-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-stone-50 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-stone-500">Client</span><span className="font-bold text-stone-900">{selectedRemind.client?.name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-stone-500">Montant</span><span className="font-black text-stone-900 font-mono">{fmt(selectedRemind.totalTTC)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-stone-500">Echeance</span><span className={`font-bold ${selectedRemind.daysOverdue > 0 ? 'text-red-600' : 'text-stone-900'}`}>{selectedRemind.dueDate ? new Date(selectedRemind.dueDate).toLocaleDateString('fr-TN') : '---'}</span></div>
                {selectedRemind.daysOverdue > 0 && <div className="flex justify-between text-sm"><span className="text-stone-500">Retard</span><span className="font-black text-red-600">{selectedRemind.daysOverdue} jours</span></div>}
              </div>
              <p className="text-sm font-bold text-stone-700">Methode d'envoi :</p>
              {[{ key: 'EMAIL', label: 'Email', icon: Mail, desc: 'Envoi immediat' }, { key: 'SMS', label: 'SMS', icon: MessageSquare, desc: 'Notification rapide' }, { key: 'WHATSAPP', label: 'WhatsApp', icon: Phone, desc: 'Message direct' }].map(m => {
                const Icon = m.icon
                return (
                  <button key={m.key} onClick={() => !sending && sendReminder(selectedRemind, m.key)} disabled={sending}
                    className="w-full flex items-center gap-4 p-4 bg-stone-50 hover:bg-teal-50 border border-stone-200 hover:border-teal-300 rounded-2xl transition-all disabled:opacity-50">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 flex items-center justify-center"><Icon className="w-6 h-6 text-stone-600" /></div>
                    <div className="text-left"><p className="font-bold text-stone-900">{m.label}</p><p className="text-xs text-stone-500">{m.desc}</p></div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
