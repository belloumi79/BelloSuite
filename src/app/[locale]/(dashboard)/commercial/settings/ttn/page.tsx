'use client'

import { useState, useEffect } from 'react'
import {
  Shield, Key, Globe, CheckCircle, XCircle,
  AlertTriangle, ExternalLink, RefreshCw, Zap, Save, Trash2
} from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { useTranslations } from 'next-intl'

const ASP_PROVIDERS = [
  {
    id: 'ttnhub', name: 'TTNHub', logo: '🌐',
    docs: 'https://ttnhub.tn/docs',
    features: ['api_rest_edi', 'sftp', 'webhook_realtime', 'signed_pdf_included'],
  },
  {
    id: 'efacturetn', name: 'eFactureTN', logo: '📄',
    docs: 'https://efacturetn.com/docs',
    features: ['api_rest', 'web_portal', 'signed_pdf', 'stats_dashboard'],
  },
]

export default function TTNSettingsPage() {
  const t = useTranslations('Commercial.TtnSettings')
  const { tenantId } = useSession()
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  const [form, setForm] = useState({
    provider: 'ttnhub',
    apiKey: '',
    apiSecret: '',
    sftpUsername: '',
    sftpPassword: '',
    sftpEndpoint: '',
    webhookSecret: '',
    isActive: false,
  })

  useEffect(() => {
    fetchConfig(tenantId)
  }, [tenantId])

  const fetchConfig = async (tid: string) => {
    try {
      const res = await fetch(`/api/commercial/asp-config`)
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
        if (data) {
          setForm({
            provider: data.provider || 'ttnhub',
            apiKey: '',
            apiSecret: '',
            sftpUsername: data.sftpUsername || '',
            sftpPassword: '',
            sftpEndpoint: data.sftpEndpoint || '',
            // Les secrets ne sont jamais renvoyés par l'API : champ vide = conserver la valeur enregistrée
            webhookSecret: '',
            isActive: data.isActive || false,
          })
        }
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/commercial/asp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, ...form }),
      })
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
        alert(t('saved'))
      }
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/commercial/asp-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      setTestResult(data)
    } catch (e) { console.error(e) }
    finally { setTesting(false) }
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="text-center"><RefreshCw className="w-8 h-8 animate-spin text-teal-500 mx-auto" /><p className="mt-4 text-stone-500 font-bold">{t('loading')}</p></div>
    </div>
  )

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-stone-900 tracking-tight flex items-center gap-3">
          <Shield className="w-8 h-8 text-teal-600" /> {t('title')}
        </h1>
        <p className="text-stone-500 font-medium mt-2">
          {t('intro')}
          {t('compliance')}
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-blue-900 text-sm">{t('prereq_title')}</p>
            <ul className="mt-2 space-y-1 text-sm text-blue-700">
              <li>{t('prereq_cert')}</li>
              <li>{t.rich('prereq_signup', { link: (chunks) => <a href="https://adhesion.elfatoora.tn" target="_blank" className="underline font-bold">{chunks}</a> })}</li>
              <li>{t.rich('prereq_mode', { b: (chunks) => <strong>{chunks}</strong> })}</li>
              <li>{t('prereq_provider')}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Provider Selection */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 space-y-6">
        <div>
          <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-4">{t('provider')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ASP_PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => setForm(f => ({ ...f, provider: p.id }))}
                className={`p-5 rounded-2xl border-2 text-left transition-all ${form.provider === p.id ? 'border-teal-500 bg-teal-50' : 'border-stone-200 hover:border-stone-300'}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{p.logo}</span>
                  <div>
                    <p className="font-black text-stone-900">{p.name}</p>
                    <a href={p.docs} target="_blank" className="text-[10px] text-teal-600 hover:underline flex items-center gap-1">
                      {t('docs')} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <p className="text-xs text-stone-500">{t(`providers.${p.id}`)}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {p.features.map(f => (
                    <span key={f} className="text-[9px] font-black text-stone-500 bg-stone-100 px-2 py-1 rounded-full uppercase tracking-widest">{t(`features.${f}`)}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* API Credentials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block mb-2">{t('api_key')}</label>
              <div className="relative">
                <Key className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                  className="w-full ps-10 pe-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 outline-none font-mono"
                  placeholder={config?.hasApiKey ? t('api_key_saved') : "tk_live_xxxxx"} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block mb-2">{t('api_secret')}</label>
              <div className="relative">
                <Key className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input value={form.apiSecret} onChange={e => setForm(f => ({ ...f, apiSecret: e.target.value }))}
                  type="password" className="w-full ps-10 pe-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 outline-none font-mono"
                  placeholder={config?.hasApiSecret ? t('api_secret_saved') : "sk_live_xxxxx"} />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block mb-2">{t('sftp_user')}</label>
              <input value={form.sftpUsername} onChange={e => setForm(f => ({ ...f, sftpUsername: e.target.value }))}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500" />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block mb-2">{t('sftp_password')}</label>
              <input value={form.sftpPassword} onChange={e => setForm(f => ({ ...f, sftpPassword: e.target.value }))}
                type="password" className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500" />
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block mb-2">{t('sftp_endpoint')}</label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input value={form.sftpEndpoint} onChange={e => setForm(f => ({ ...f, sftpEndpoint: e.target.value }))}
                  className="w-full ps-10 pe-4 py-3 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500"
                  placeholder="sftp.ttnhub.tn" />
              </div>
            </div>
          </div>
        </div>

        {/* Webhook + Active Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest block mb-2">{t('webhook_secret')}</label>
            <input value={form.webhookSecret} onChange={e => setForm(f => ({ ...f, webhookSecret: e.target.value }))}
              type="password" className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500"
              placeholder={t('webhook_placeholder')} />
          </div>
          <div className="flex items-center gap-4 pt-8">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="sr-only peer" />
              <div className="w-14 h-7 bg-stone-200 peer-focus:ring-4 peer-focus:ring-teal-500/20 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-6 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
            <div>
              <p className="font-black text-stone-900 text-sm">{form.isActive ? t('active') : t('inactive')}</p>
              <p className="text-xs text-stone-500">{t('auto_submit')}</p>
            </div>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 ${testResult.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            {testResult.ok
              ? <CheckCircle className="w-5 h-5 text-emerald-600" />
              : <XCircle className="w-5 h-5 text-red-600" />}
            <p className={`text-sm font-bold ${testResult.ok ? 'text-emerald-700' : 'text-red-700'}`}>{testResult.message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4 border-t border-stone-100">
          <button onClick={handleTest} disabled={testing || !form.apiKey}
            className="flex items-center gap-2 px-5 py-3 border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 font-bold text-sm disabled:opacity-40 transition-all">
            {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {t('test_connection')}
          </button>
          <button onClick={handleSave} disabled={saving || (!form.apiKey && !config?.hasApiKey)}
            className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-black text-sm shadow-lg shadow-teal-600/20 disabled:opacity-40 transition-all">
            <Save className="w-4 h-4" />
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </div>
  )
}
