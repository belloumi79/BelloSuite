'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import gsap from 'gsap'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabase as ssrBrowserClient } from '@/lib/supabase/client'
import { parseRecoveryParams } from '@/lib/supabase/recovery'
import { useTranslations } from 'next-intl'
type LinkStatus = 'checking' | 'ready' | 'invalid'

function ResetPasswordForm() {
  const t = useTranslations('Auth.reset')
  const router = useRouter()
  const params = useParams<{ locale?: string }>()
  const locale = params?.locale && ['fr', 'ar', 'en'].includes(params.locale) ? params.locale : 'fr'

  const [linkStatus, setLinkStatus] = useState<LinkStatus>('checking')
  const [linkError, setLinkError] = useState('')
  const clientRef = useRef<SupabaseClient | null>(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.fromTo('.rp-glow', { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, ease: 'power3.out' })
    gsap.fromTo('.rp-brand', { y: -40, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.7)', delay: 0.2 })
    gsap.fromTo('.rp-card', { y: 50, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out', delay: 0.4 })
  }, [])

  // Établit la session de récupération Supabase à partir du lien reçu par email.
  useEffect(() => {
    const recovery = parseRecoveryParams(window.location.hash, window.location.search)
    // Ne pas laisser les jetons dans l'URL (historique, en-tête Referer)
    if (window.location.hash || window.location.search) {
      window.history.replaceState(null, '', window.location.pathname)
    }
    const isolated = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const run = async () => {
      try {
        if (recovery.kind === 'tokens') {
          const { error } = await isolated.auth.setSession({ access_token: recovery.accessToken, refresh_token: recovery.refreshToken })
          if (error) throw error
          clientRef.current = isolated
        } else if (recovery.kind === 'token_hash') {
          const { error } = await isolated.auth.verifyOtp({ type: 'recovery', token_hash: recovery.tokenHash })
          if (error) throw error
          clientRef.current = isolated
        } else if (recovery.kind === 'code') {
          // PKCE : le code_verifier est dans les cookies du client navigateur @supabase/ssr
          const { error } = await ssrBrowserClient.auth.exchangeCodeForSession(recovery.code)
          if (error) throw error
          clientRef.current = ssrBrowserClient
        } else {
          if (recovery.kind === 'error') setLinkError(recovery.message)
          setLinkStatus('invalid')
          return
        }
        setLinkStatus('ready')
      } catch (e) {
        setLinkError(e instanceof Error ? e.message : '')
        setLinkStatus('invalid')
      }
    }
    run()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('mismatch'))
      gsap.fromTo('.rp-error', { x: -15, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' })
      return
    }

    if (password.length < 8) {
      setError(t('min_length'))
      gsap.fromTo('.rp-error', { x: -15, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' })
      return
    }

    setLoading(true)
    gsap.to('.rp-submit-btn', { scale: 0.97, duration: 0.1, yoyo: true, repeat: 1 })

    try {
      const client = clientRef.current
      if (!client) throw new Error(t('invalid_link_error'))

      // Mot de passe géré uniquement par Supabase Auth (plus aucune écriture de User.password)
      const { error: updateError } = await client.auth.updateUser({ password })
      if (updateError) throw new Error(updateError.message || t('error'))
      await client.auth.signOut({ scope: 'local' }).catch(() => {})

      setSuccess(true)
      gsap.to('.rp-card', {
        scale: 0.95,
        opacity: 0,
        y: -20,
        duration: 0.4,
        onComplete: () => router.push(`/${locale}/login?reset=success`)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('server_error'))
      gsap.fromTo('.rp-error', { x: -15, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' })
      setLoading(false)
    }
  }

  return (
    <div ref={containerRef} className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="rp-glow absolute top-[-100px] left-1/2 -translate-x-1/2 w-[250px] h-[250px] rounded-full bg-gradient-to-br from-emerald-500/25 to-transparent blur-[100px]" />

        <div className="text-center mb-10">
          <h1 className="rp-brand text-4xl font-bold bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
            BelloSuite
          </h1>
          <p className="text-slate-400 mt-3 text-sm tracking-wide">
            {t('title')}
          </p>
        </div>

        <div className="rp-card bg-slate-800/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl shadow-emerald-500/5">
          {linkStatus === 'checking' ? (
            <p className="text-center text-slate-400 py-8">{t('checking')}</p>
          ) : linkStatus === 'invalid' ? (
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <span className="text-3xl">🔗</span>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-3">{t('invalid_link')}</h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                {t('invalid_link_desc')}
              </p>
              {linkError && <p className="text-slate-500 text-xs -mt-6 mb-8">{linkError}</p>}

              <Link href={`/${locale}/forgot-password`} className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-semibold px-6 py-3 rounded-xl transition-all">
                <span>{t('request_new')}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="flex items-start gap-3 mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
                <span className="text-2xl">🔐</span>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {t('intro')}
                </p>
              </div>

              {error && (
                <div className="rp-error bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-6 text-sm flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-slate-300 text-sm font-medium mb-2 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  {t('title')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-600/50 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="••••••••"
                  minLength={8}
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-slate-300 text-sm font-medium mb-2 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-amber-400" />
                  {t('confirm')}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-600/50 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="••••••••"
                  minLength={8}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="rp-submit-btn w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t('updating')}
                    </>
                  ) : (
                    <>
                      {t('submit')}
                      <svg className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>

              <div className="text-center mt-6">
                <Link href={`/${locale}/login`} className="text-sm text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1 group">
                  <svg className="w-4 h-4 rtl:rotate-180 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  {t('back_to_login')}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="h-10 w-40 bg-slate-700 rounded-lg mx-auto animate-pulse" />
        <div className="h-4 w-48 bg-slate-700 rounded mt-3 mx-auto animate-pulse" />
      </div>
      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-3/4 mb-6" />
        <div className="h-12 bg-slate-700 rounded mb-4" />
        <div className="h-12 bg-slate-700 rounded mb-6" />
        <div className="h-12 bg-slate-700 rounded" />
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Suspense fallback={<LoadingState />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}