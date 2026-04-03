'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import gsap from 'gsap'
import { supabase } from '@/lib/supabase/client'

function ConfirmContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.fromTo('.confirm-glow', { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, ease: 'power3.out' })
    gsap.fromTo('.confirm-card', { scale: 0.8, opacity: 0, y: 30 }, { scale: 1, opacity: 1, y: 0, duration: 0.8, ease: 'back.out(1.7)', delay: 0.3 })
  }, [])

  useEffect(() => {
    const confirmEmail = async () => {
      if (!token) {
        setStatus('error')
        setMessage('Lien de confirmation invalide ou expiré.')
        return
      }

      try {
        const { error } = await supabase
          .from('User')
          .update({ isActive: true })
          .eq('id', token)

        if (error) throw error

        setStatus('success')
        setMessage('Email confirmé avec succès !')
        gsap.to('.confirm-icon', { scale: 1.2, duration: 0.3, yoyo: true, repeat: 1 })

        setTimeout(() => {
          router.push('/login?confirmed=1')
        }, 2000)
      } catch {
        setStatus('error')
        setMessage('Erreur lors de la confirmation. Veuillez réessayer.')
      }
    }

    confirmEmail()
  }, [token, router])

  return (
    <div ref={containerRef} className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="confirm-glow absolute top-[-100px] left-1/2 -translate-x-1/2 w-[250px] h-[250px] rounded-full bg-gradient-to-br from-emerald-500/25 to-transparent blur-[100px]" />

        <div className="confirm-card bg-slate-800/80 backdrop-blur-xl rounded-3xl p-10 border border-slate-700/50 shadow-2xl shadow-emerald-500/5 text-center">

          {status === 'loading' && (
            <>
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center animate-pulse">
                  <span className="text-4xl">✉️</span>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-3">Confirmation en cours...</h2>
              <p className="text-slate-400 leading-relaxed">
                Vérification de votre adresse email. Veuillez patienter.
              </p>

              <div className="flex justify-center gap-2 mt-6">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="confirm-icon relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-3">Email confirmé !</h2>
              <p className="text-slate-400 mb-6 leading-relaxed">
                Votre adresse email a été confirmée. Vous pouvez maintenant vous connecter.
              </p>

              <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-6">
                <span>Redirection automatique</span>
                <span className="text-emerald-400">↗</span>
              </div>

              <Link href="/login" className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold px-6 py-3 rounded-xl transition-all group">
                <span>Se connecter</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <span className="text-4xl">⚠️</span>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-3">Erreur de confirmation</h2>
              <p className="text-slate-400 mb-8 leading-relaxed">{message}</p>

              <div className="flex flex-col gap-3">
                <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold px-6 py-3 rounded-xl transition-all group">
                  <span>Créer un compte</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>

                <Link href="/login" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">
                  Retour à la connexion
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md text-center">
        <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 animate-pulse">
          <div className="text-5xl mb-4">✉️</div>
          <h1 className="text-2xl font-bold text-white mb-3">Confirmation en cours...</h1>
          <p className="text-slate-400">Veuillez patienter.</p>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ConfirmContent />
    </Suspense>
  )
}