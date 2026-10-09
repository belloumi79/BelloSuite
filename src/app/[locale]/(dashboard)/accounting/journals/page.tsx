'use client'

import { useState, useEffect, useCallback } from 'react'
import { Settings2, Plus, Save, BookOpen, AlertTriangle } from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { useTranslations } from 'next-intl'

interface Journal {
  id: string
  code: string
  name: string
  type: string
  isActive: boolean
}

export default function JournalsPage() {
  const t = useTranslations('Accounting.journals')
  const { tenantId } = useSession()
  const [journals, setJournals] = useState<Journal[]>([])
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({ code: '', name: '', type: 'GENERAL' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchJournals = useCallback(async (tid: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/accounting/journals`)
      const data = await res.json()
      if (Array.isArray(data)) setJournals(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const tid = tenantId
    fetchJournals(tid)
  }, [fetchJournals])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/accounting/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tenantId })
      })
      if (res.ok) {
        setFormData({ code: '', name: '', type: 'GENERAL' })
        fetchJournals(tenantId)
      } else {
        alert(t('create_error'))
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
        <h1 className="text-3xl font-black text-white tracking-tighter">{t('title')}</h1>
        <p className="text-zinc-400 mt-2 text-sm">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CREATE FORM */}
        <div className="bg-zinc-900 border border-zinc-800/50 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500">
              <Plus className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">{t('new')}</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">{t('code')}</label>
              <input 
                type="text" 
                maxLength={5}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white uppercase focus:border-teal-500 transition-all font-mono" 
                value={formData.code}
                onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">{t('name')}</label>
              <input 
                type="text" 
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:border-teal-500 transition-all" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">{t('type')}</label>
              <select 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:border-teal-500 transition-all"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="PURCHASES">{t('purchases')}</option>
                <option value="SALES">{t('sales')}</option>
                <option value="BANK">{t('bank')}</option>
                <option value="CASH">{t('cash')}</option>
                <option value="GENERAL">{t('general')}</option>
              </select>
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl transition-all"
            >
              {isSubmitting ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span> : <Save className="w-4 h-4" />}
              {t('create')}
            </button>
          </form>
        </div>

        {/* LIST */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800/50 rounded-3xl p-6">
          <h2 className="text-lg font-bold text-white mb-6">{t('configured')}</h2>
          
          {loading ? (
            <div className="flex justify-center py-10"><span className="animate-spin w-6 h-6 border-2 border-teal-500/30 border-t-teal-500 rounded-full"></span></div>
          ) : journals.length === 0 ? (
            <div className="text-center py-12">
              <Settings2 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-white font-medium">{t('empty_title')}</h3>
              <p className="text-zinc-500 text-sm mt-1">{t('empty_desc')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {journals.map(journal => (
                <div key={journal.id} className="group flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-2xl hover:border-teal-500/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-teal-500 font-mono text-lg">
                      {journal.code}
                    </div>
                    <div>
                      <h3 className="text-white font-bold">{journal.name}</h3>
                      <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">{t.has(`types.${journal.type}`) ? t(`types.${journal.type}`) : journal.type}</p>
                    </div>
                  </div>
                  <div>
                    <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {t('active')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
