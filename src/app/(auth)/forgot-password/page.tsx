'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { supabase } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.fromTo('.fp-glow',
      { scale: 0.5, opacity: 0 },
      { scale: 1, opacity: 1, duration: 1.5, ease: 'power3.out' }
    )
    gsap.fromTo('.fp-brand',
      { y: -40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, ease: 'back.out(1.7)', delay: 0.2 }
    )
    gsap.fromTo('.fp-subtitle',
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.4 }
    )
    gsap.fromTo('.fp-card',
      { y: 50, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out', delay: 0.5 }
    )
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    gsap.to('.fp-submit-btn', { scale: 0.97, duration: 0.1, yoyo: true, repeat: 1 })

    try {
      const { data: users } = await supabase
        .from('User')
        .select('id')
        .eq('email', email)
        .limit(1)

      // Always show success for security (don't reveal if email exists)
      setSent(true)
    } catch {
      setError('Erreur serveur')
      setLoading(false)
    }
  }

  return (
    <div ref={containerRef} className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="fp-glow absolute top-[-100px] left-1/2 -translate-x-1/2 w-[250px] h-[250px] rounded-full bg-gradient-to-br from-amber-500/25 to-transparent blur-[100px]" />

        <div className="text-center mb-10">
          <h1 className="fp-brand text-4xl font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400 bg-clip-text text-transparent">
            BelloSuite
          </h1>
          <p className="fp-subtitle text-slate-400 mt-3 text-sm tracking-wide">
            {sent ? 'Instructions envoyées !' : 'Réinitialisation du mot de passe'}
          </p>
        </div>

        <div className="fp-card bg-slate-800/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl shadow-amber-500/5">
          {sent ? (
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-3">Email envoyé !</h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Si un compte existe avec cette adresse, vous recevrez un lien de réinitialisation.
              </p>

              <Link href="/login" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors group">
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <div className="fp-card-content">
              <div className="flex items-start gap-3 mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
                <span className="text-2xl">🔑</span>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Entrez votre adresse email. Vous recevrez un lien pour réinitialiser votre mot de passe.
                </p>
              </div>

              {error && (
                <div className="fp-error bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-6 text-sm flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label className="block text-slate-300 text-sm font-medium mb-2 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-amber-400" />
                    Adresse email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-600/50 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
                    placeholder="you@company.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="fp-submit-btn w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 mb-5 relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        Envoyer le lien
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </button>

                <div className="text-center">
                  <Link href="/login" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1 group">
                    <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Retour à la connexion
                  </Link>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}