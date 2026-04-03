'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import gsap from 'gsap'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase/client'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const showRegistered = searchParams.get('registered')

  useEffect(() => {
    gsap.fromTo('.auth-glow', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, ease: 'power3.out' })
    gsap.fromTo('.brand-text', { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'back.out(1.7)', delay: 0.3 })
    gsap.fromTo('.subtitle-text', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', delay: 0.5 })
    gsap.fromTo('.form-card', { y: 40, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out', delay: 0.6 })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    gsap.to('.submit-btn', { scale: 0.98, duration: 0.1, yoyo: true, repeat: 1 })

    try {
      const { data: users, error: queryError } = await supabase
        .from('User')
        .select('*')
        .eq('email', email)
        .eq('isActive', true)
        .limit(1)

      if (queryError || !users || users.length === 0) {
        throw new Error('Email ou mot de passe incorrect')
      }

      const user = users[0]
      if (!bcrypt.compareSync(password, user.password)) {
        throw new Error('Email ou mot de passe incorrect')
      }

      localStorage.setItem('bello_session', JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      }))

      gsap.to('.form-card', {
        scale: 0.95,
        opacity: 0,
        y: -20,
        duration: 0.3,
        onComplete: () => {
          router.push(user.role === 'SUPER_ADMIN' ? '/super-admin' : '/dashboard')
        }
      })
    } catch (err: any) {
      setError(err.message || 'Erreur')
      gsap.fromTo('.error-box', { x: -10, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <div className="auth-glow absolute top-[-80px] left-1/2 -translate-x-1/2 w-[200px] h-[200px] rounded-full bg-emerald-500/20 blur-[80px]" />

      <div className="text-center mb-10">
        <h1 className="brand-text text-4xl font-bold bg-gradient-to-r from-emerald-400 via-emerald-300 to-amber-400 bg-clip-text text-transparent">
          BelloSuite
        </h1>
        <p className="subtitle-text text-slate-400 mt-3 text-sm tracking-wide">Connexion à votre espace</p>
      </div>

      {showRegistered && (
        <div className="success-banner bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 mb-6 text-sm">
          <span className="inline-block mr-2">✨</span>
          Compte créé ! Vérifiez votre email.
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-card auth-card bg-slate-800/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl shadow-emerald-500/5">

        {error && (
          <div className="error-box bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-6 text-sm flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            {error}
          </div>
        )}

        <div className="mb-5">
          <label className="block text-slate-300 text-sm font-medium mb-2 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-600/50 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            placeholder="you@company.com"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-slate-300 text-sm font-medium mb-2 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-amber-400" />
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-600/50 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="submit-btn w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 mb-5 relative overflow-hidden group"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Connexion...
              </>
            ) : (
              <>
                Se connecter
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </button>

        <div className="text-center">
          <Link href="/forgot-password" className="text-sm text-slate-400 hover:text-amber-400 transition-colors">
            Mot de passe oublié ?
          </Link>
        </div>
      </form>

      <p className="text-center text-slate-500 mt-8 text-sm">
        Pas encore de compte ?{' '}
        <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
          Créer un compte
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Suspense fallback={<div className="text-white">Chargement...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
