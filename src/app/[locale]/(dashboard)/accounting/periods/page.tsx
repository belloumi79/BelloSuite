'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Plus, Save, AlertTriangle, CheckCircle2, Lock } from 'lucide-react'

interface Period {
  id: string
  name: string
  startDate: string
  endDate: string
  isClosed: boolean
}

export default function PeriodsPage() {
  const [tenantId, setTenantId] = useState('')
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)

  const currentYear = new Date().getFullYear()
  const [formData, setFormData] = useState({
    name: `Exercice ${currentYear}`,
    startDate: `${currentYear}-01-01`,
    endDate: `${currentYear}-12-31`
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchPeriods = useCallback(async (tid: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/accounting/periods?tenantId=${tid}`)
      const data = await res.json()
      if (Array.isArray(data)) setPeriods(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const session = localStorage.getItem('bello_session')
    if (session) {
      const tid = JSON.parse(session).tenantId
      setTenantId(tid)
      fetchPeriods(tid)
    }
  }, [fetchPeriods])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/accounting/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tenantId })
      })
      if (res.ok) {
        const nextYear = parseInt(formData.name.replace(/[^0-9]/g, '')) + 1 || currentYear + 1
        setFormData({ 
          name: `Exercice ${nextYear}`, 
          startDate: `${nextYear}-01-01`, 
          endDate: `${nextYear}-12-31` 
        })
        fetchPeriods(tenantId)
      } else {
        alert('Erreur lors de la création. Cet exercice existe peut-être déjà.')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tighter">Exercices Comptables</h1>
        <p className="text-zinc-400 mt-2 text-sm">Définissez vos périodes fiscales. (Note: La clôture d'un exercice fige définitivement toutes ses écritures, conformément à la loi tunisienne).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CREATE FORM */}
        <div className="bg-zinc-900 border border-zinc-800/50 rounded-3xl p-6 h-fit">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500">
              <Plus className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Nouvel Exercice</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Nom de l'exercice</label>
              <input 
                type="text" 
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:border-teal-500 transition-all font-mono" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Date d'ouverture</label>
              <input 
                type="date" 
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:border-teal-500 transition-all" 
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Date de clôture</label>
              <input 
                type="date" 
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:border-teal-500 transition-all" 
                value={formData.endDate}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
              />
            </div>
            
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-3 mt-4">
               <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
               <p className="text-xs text-amber-500/90 leading-relaxed">
                 Un exercice ouvert permettra la saisie d'écritures. Veillez à ce que les dates ne se chevauchent pas avec un exercice existant.
               </p>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl transition-all"
            >
              {isSubmitting ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span> : <Save className="w-4 h-4" />}
              Ouvrir l'exercice
            </button>
          </form>
        </div>

        {/* LIST */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800/50 rounded-3xl p-6">
          <h2 className="text-lg font-bold text-white mb-6">Exercices existants</h2>
          
          {loading ? (
            <div className="flex justify-center py-10"><span className="animate-spin w-6 h-6 border-2 border-teal-500/30 border-t-teal-500 rounded-full"></span></div>
          ) : periods.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-white font-medium">Aucun exercice</h3>
              <p className="text-zinc-500 text-sm mt-1">Ouvrez votre premier exercice (ex: 2026).</p>
            </div>
          ) : (
            <div className="space-y-3">
              {periods.map(period => {
                const startDate = new Date(period.startDate).toLocaleDateString('fr-TN')
                const endDate = new Date(period.endDate).toLocaleDateString('fr-TN')
                
                return (
                  <div key={period.id} className={`group flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-2xl transition-all ${!period.isClosed ? 'hover:border-teal-500/30' : 'opacity-80'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${period.isClosed ? 'bg-zinc-900 border-zinc-800 text-zinc-500' : 'bg-teal-500/10 border-teal-500/20 text-teal-500'}`}>
                        {period.isClosed ? <Lock className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="text-white font-bold">{period.name}</h3>
                        <p className="text-xs text-zinc-500 mt-1">Du {startDate} au {endDate}</p>
                      </div>
                    </div>
                    <div>
                      {period.isClosed ? (
                         <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1.5">
                           Clôturé
                         </span>
                      ) : (
                        <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3" /> Ouvert
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
