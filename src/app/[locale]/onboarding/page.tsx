'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Building2, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

export default function OnboardingPage() {
  const t = useTranslations('Onboarding')
  const router = useRouter()
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
      setErrorMsg('Nom de l\'entreprise et sous-domaine requis')
      return
    }
    setErrorMsg('')
    setLoading(true)

    // Get user email from session
    const session = JSON.parse(localStorage.getItem('bello_session') || '{}')
    const userEmail = session?.email

    try {
      const res = await fetch('/api/super-admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, userEmail }),
      })
      const data = await res.json()
      
      if (res.ok && data.tenant) {
        setSuccess(true)
        // Update session with new tenant
        const session = JSON.parse(localStorage.getItem('bello_session') || '{}')
        session.tenantId = data.tenant.id
        session.role = 'ADMIN'
        localStorage.setItem('bello_session', JSON.stringify(session))
        
        // Redirect after short delay
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      } else {
        setErrorMsg(data.error || 'Erreur lors de la création')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur de connexion')
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
          <h1 className="text-2xl font-black text-white mb-2">Entreprise créée!</h1>
          <p className="text-zinc-400 text-sm mb-6">
            Redirection vers le tableau de bord...
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
          <h1 className="text-2xl font-black text-white">Créer votre entreprise</h1>
          <p className="text-zinc-500 mt-1 text-sm">Configurez votre espace de travail</p>
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
              Nom de l'entreprise *
            </label>
            <input
              type="text"
              name="companyName"
              required
              placeholder="Mon Entreprise"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:border-teal-500 transition-colors"
              value={formData.companyName}
              onChange={handleCompanyNameChange}
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1.5 px-1">
              Sous-domaine (URL) *
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
                Matricule Fiscal
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
                Numéro TVA
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
              Adresse
            </label>
            <input
              type="text"
              name="address"
              placeholder="Rue, numéro"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:border-teal-500 transition-colors"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1.5 px-1">
                Ville
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
                Code postal
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
                Téléphone
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
                Email
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
            Créer mon entreprise
          </button>
        </form>
      </div>
    </div>
  )
}