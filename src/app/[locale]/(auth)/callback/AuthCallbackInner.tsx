'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from '@/i18n/routing'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function AuthCallbackInner() {
  const searchParams = useSearchParams()
  const [display, setDisplay] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const confirmed = searchParams.get('confirmed')
    const errorParam = searchParams.get('error')
    const errorDesc = searchParams.get('error_description')

    if (errorParam || errorDesc) {
      setDisplay('error')
      setMessage(errorDesc || errorParam || 'Erreur inconnue')
      return
    }

    if (confirmed === '1') {
      setDisplay('success')
      setTimeout(() => { window.location.href = '/fr/dashboard' }, 3000)
      return
    }

    // No params — try to exchange via API
    const code = searchParams.get('code')
    if (!code) {
      setDisplay('error')
      setMessage('Lien de confirmation invalide ou expiré.')
      return
    }

    fetch(`/api/auth/callback?code=${code}`)
      .then(res => {
        if (res.ok) setDisplay('success')
        else setDisplay('error')
      })
      .catch(() => setDisplay('error'))
  }, [searchParams])

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-10 shadow-2xl text-center">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-teal-500/20">
          <span className="text-white font-black text-2xl">B</span>
        </div>

        {display === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-teal-400 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-black text-white mb-2">Confirmation...</h1>
            <p className="text-zinc-500 text-sm">Vérification en cours</p>
          </>
        )}

        {display === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Email confirmé !</h1>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Bienvenue sur <strong className="text-teal-400">BelloSuite</strong>.<br />
              Votre compte est actif. Redirection en cours...
            </p>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-4">
              <p className="text-emerald-400 text-sm font-bold">✓ Inscription réussie</p>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-teal-500 w-full animate-pulse" />
            </div>
            <Link href="/fr/dashboard"
              className="inline-block w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-center transition-all">
              Accéder à mon dashboard
            </Link>
          </>
        )}

        {display === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Confirmation échouée</h1>
            <p className="text-zinc-400 text-sm mb-6">{message}</p>
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
              <p className="text-red-400 text-sm font-bold">Erreur</p>
              <p className="text-zinc-500 text-xs mt-1">{message}</p>
            </div>
            <Link href="/fr/register"
              className="inline-block w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-center transition-all mb-3">
              Recommencer l'inscription
            </Link>
            <Link href="/fr/login"
              className="block w-full py-2.5 border border-zinc-700 hover:border-teal-500 text-zinc-400 hover:text-teal-400 rounded-xl font-bold text-center transition-all">
              Se connecter
            </Link>
          </>
        )}

        <div className="mt-6 pt-6 border-t border-zinc-800">
          <p className="text-zinc-600 text-xs">
            Powered by <span className="text-teal-500 font-bold">BelloSuite ERP</span>
          </p>
        </div>
      </div>
    </div>
  )
}
