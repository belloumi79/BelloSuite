'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import gsap from 'gsap'
import { supabase } from '@/lib/supabase/client'

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    gsap.fromTo('.reg-glow',
      { scale: 0.6, opacity: 0 },
      { scale: 1, opacity: 1, duration: 1.2, ease: 'power3.out' }
    )
    gsap.fromTo('.reg-brand',
      { y: -50, opacity: 0, scale: 0.9 },
      { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.7)', delay: 0.2 }
    )
    gsap.fromTo('.reg-subtitle',
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', delay: 0.4 }
    )
    gsap.fromTo('.reg-card',
      { y: 60, opacity: 0, scale: 0.9 },
      { y: 0, opacity: 1, scale: 1, duration: 0.9, ease: 'power3.out', delay: 0.5 }
    )
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      gsap.fromTo('.reg-error', { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' })
      return
    }

    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      gsap.fromTo('.reg-error', { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' })
      return
    }

    setLoading(true)
    gsap.to('.reg-submit-btn', { scale: 0.97, duration: 0.1, yoyo: true, repeat: 1 })

    try {
      const { data: allUsers } = await supabase.from('User').select('id')
      const isFirstUser = !allUsers || allUsers.length === 0
      const role = isFirstUser ? 'SUPER_ADMIN' : 'USER'
      const tenantId = isFirstUser ? 'bello-hq' : `tenant-${Date.now()}`

      const { data, error: insertError } = await supabase
        .from('User')
        .insert({
          email: form.email,
          password: form.password,
          role,
          tenantId,
          isActive: true
        })
        .select()
        .single()

      if (insertError) throw insertError

      gsap.to('.reg-card', {
        scale: 0.95,
        opacity: 0,
        y: -30,
        duration: 0.4,
        ease: 'power2.in',
        onComplete: () => router.push('/login?registered=1')
      })
    } catch (err: any) {
      setError(err.message || 'Erreur')
      gsap.fromTo('.reg-error', { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12">
      <div className="w-full max-w-md px-4">
        <div className="reg-glow absolute top-[-80px] left-1/2 -translate-x-1/2 w-[200px] h-[200px] rounded-full bg-gradient-to-br from-emerald-500/20 to-transparent blur-[80px]" />

        <div className="text-center mb-10">
          <h1 className="reg-brand text-4xl font-bold bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
            BelloSuite
          </h1>
          <p className="reg-subtitle text-slate-400 mt-3 text-sm tracking-wide">
            Créez votre espace de gestion
          </p>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="reg-card bg-slate-800/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl shadow-emerald-500/5">

          {error && (
            <div className="reg-error bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-6 text-sm flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="form-group">
              <label className="block text-slate-300 text-sm font-medium mb-2 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                Prénom
              </label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                className="w-full bg-slate-900/80 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="Ahmed"
              />
            </div>
            <div className="form-group">
              <label className="block text-slate-300 text-sm font-medium mb-2 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                Nom
              </label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                className="w-full bg-slate-900/80 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="Mallek"
              />
            </div>
          </div>

          <div className="mb-4 form-group">
            <label className="block text-slate-300 text-sm font-medium mb-2 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-amber-400" />
              Nom de l'entreprise
            </label>
            <input
              name="companyName"
              value={form.companyName}
              onChange={handleChange}
              className="w-full bg-slate-900/80 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              placeholder="Ma Société SARL"
            />
          </div>

          <div className="mb-4 form-group">
            <label className="block text-slate-300 text-sm font-medium mb-2 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-cyan-400" />
              Email *
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="w-full bg-slate-900/80 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              placeholder="ahmed@masociete.tn"
              required
            />
          </div>

          <div className="mb-4 form-group">
            <label className="block text-slate-300 text-sm font-medium mb-2 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-amber-400" />
              Mot de passe *
            </label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="w-full bg-slate-900/80 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              placeholder="8 caractères minimum"
              minLength={8}
              required
            />
          </div>

          <div className="mb-6 form-group">
            <label className="block text-slate-300 text-sm font-medium mb-2 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-amber-400" />
              Confirmer *
            </label>
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full bg-slate-900/80 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              placeholder="••••••••"
              minLength={8}
              required
            />
          </div>

          {form.password && (
            <div className="mb-4">
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      form.password.length >= 8
                        ? 'bg-emerald-500'
                        : form.password.length >= 4
                        ? 'bg-amber-500'
                        : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {form.password.length >= 8 ? 'Mot de passe robuste' : form.password.length >= 4 ? 'Mot de passe moyen' : 'Trop court'}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="reg-submit-btn w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 mb-4 relative overflow-hidden group"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Création en cours...
                </>
              ) : (
                <>
                  Créer mon compte
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>

          <p className="text-xs text-slate-500 text-center mb-5">
            En créant un compte, vous acceptez nos conditions d'utilisation.
          </p>

          <div className="text-center">
            <Link href="/login" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1 group">
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Déjà un compte ? Se connecter
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}