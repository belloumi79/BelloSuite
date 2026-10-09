'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Building2, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

type ModuleOption = { name: string; displayName: string; description: string | null }

export default function OnboardingPage() {
  const t = useTranslations('Onboarding')
  const params = useParams<{ locale?: string }>()
  const locale = params?.locale && ['fr', 'ar', 'en'].includes(params.locale) ? params.locale : 'fr'
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    companyName: '',
    subdomain: '',
    matriculeFiscal: '',
    vatNumber: '',
    address: '',
    city: '',
    zipCode: '',
    phone: '',
    email: '',
  })

  const [moduleOptions, setModuleOptions] = useState<ModuleOption[]>([])
  const [selectedModules, setSelectedModules] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/tenant/onboard')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data) return
        setModuleOptions(data.modules || [])
        const available = new Set((data.modules || []).map((m: ModuleOption) => m.name))
        setSelectedModules((data.defaults || []).filter((n: string) => available.has(n)))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const toggleModule = (name: string) => {
    setSelectedModules(prev => (prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]))
  }

  // Auto-generate subdomain from company name
  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    const generatedSubdomain = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20)
    setFormData({ 
      ...formData, 
      companyName: name,
      subdomain: generatedSubdomain
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.companyName || !formData.subdomain) {
      setErrorMsg(t('required'))
      return
    }
    setErrorMsg('')
    setLoading(true)

    try {
      // L'utilisateur est identifié côté serveur par son cookie de session (aucun email envoyé).
      const res = await fetch('/api/tenant/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, modules: selectedModules }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok && data.tenant) {
        setSuccess(true)
        // Le serveur a ré-émis le cookie de session avec le nouveau tenantId :
        // navigation complète pour que le layout serveur relise la session.
        setTimeout(() => {
          window.location.assign(`/${locale}/dashboard`)
        }, 1200)
      } else {
        setErrorMsg(data.error || t('create_error'))
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('connection_error'))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/20">
            <span className="text-white font-black text-2xl">B</span>
          </div>
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">{t('success_title')}</h1>
          <p className="text-zinc-400 text-sm mb-6">
            {t('redirecting')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/20">
            <span className="text-white font-black text-2xl">B</span>
          </div>
          <h1 className="text-2xl font-black text-white">{t('title')}</h1>
          <p className="text-zinc-500 mt-1 text-sm">{t('subtitle')}</p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm font-medium">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1.5 px-1">
              {t('company_name')}
            </label>
            <input
              type="text"
              name="companyName"
              required
              placeholder={t('company_placeholder')}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:border-teal-500 transition-colors"
              value={formData.companyName}
              onChange={handleCompanyNameChange}
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1.5 px-1">
              {t('subdomain')}
            </label>
            <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
              <span className="px-3 text-zinc-500 text-sm">monentreprise.</span>
              <input
                type="text"
                name="subdomain"
                required
                placeholder="bellosuite"
                className="flex-1 px-2 py-3 bg-transparent text-white outline-none focus:border-teal-500"
                value={formData.subdomain}
                onChange={handleChange}
              />
              <span className="px-3 text-zinc-500 text-sm">.tn</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1.5 px-1">
                {t('tax_id')}
              </label>
              <input
                type="text"
                name="matriculeFiscal"
                placeholder="1234567/A"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:border-teal-500 transition-colors"
                value={formData.matriculeFiscal}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1.5 px-1">
                {t('vat_number')}
              </label>
              <input
                type="text"
                name="vatNumber"
                placeholder="1234567"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:border-teal-500 transition-colors"
                value={formData.vatNumber}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1.5 px-1">
              {t('address')}
            </label>
            <input
              type="text"
              name="address"
              placeholder={t('address_placeholder')}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:border-teal-500 transition-colors"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1.5 px-1">
                {t('city')}
              </label>
              <input
                type="text"
                name="city"
                placeholder="Tunis"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:border-teal-500 transition-colors"
                value={formData.city}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1.5 px-1">
                {t('zip')}
              </label>
              <input
                type="text"
                name="zipCode"
                placeholder="1000"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:border-teal-500 transition-colors"
                value={formData.zipCode}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1.5 px-1">
                {t('phone')}
              </label>
              <input
                type="tel"
                name="phone"
                placeholder="+216 12 345 678"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:border-teal-500 transition-colors"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1.5 px-1">
                {t('email')}
              </label>
              <input
                type="email"
                name="email"
                placeholder="contact@entreprise.tn"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:border-teal-500 transition-colors"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          {moduleOptions.length > 0 && (
            <div>
              <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1.5 px-1">
                {t('modules')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {moduleOptions.map(m => (
                  <label
                    key={m.name}
                    className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="accent-teal-500"
                      checked={selectedModules.includes(m.name)}
                      onChange={() => toggleModule(m.name)}
                    />
                    {t.has(`module_names.${m.name}`) ? t(`module_names.${m.name}`) : m.displayName}
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Building2 className="w-4 h-4" />
            )}
            {t('submit')}
          </button>
        </form>
      </div>
    </div>
  )
}