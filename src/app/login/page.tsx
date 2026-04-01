'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const router = useRouter()

  // Check if already logged in - only on mount
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const role = user.user_metadata?.role
        window.location.href = role === 'SUPER_ADMIN' ? '/super-admin' : '/dashboard'
      }
    }
    checkUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role: 'SUPER_ADMIN' }
          }
        })
        
        if (error) throw error
        
        if (data.user) {
          await supabase
            .from('tenants')
            .insert({
              id: data.user.id,
              name: `${email.split('@')[0]} Organization`,
              subdomain: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-'),
            })
        }
        
        setMessage({ type: 'success', text: 'Compte créé !' })
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) throw error
        
        const role = data.user?.user_metadata?.role
        window.location.href = role === 'SUPER_ADMIN' ? '/super-admin' : '/dashboard'
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erreur' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Bello<span className="text-emerald-400">Suite</span>
          </h1>
          <p className="text-zinc-400">ERP Modulaire Tunisien</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <h2 className="text-2xl font-semibold text-white mb-6">
            {isSignUp ? 'Créer un compte' : 'Connexion'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="votre@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.type === 'success' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Chargement...' : isSignUp ? 'Créer le compte' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-zinc-400 hover:text-emerald-400 transition-colors"
            >
              {isSignUp ? 'Déjà un compte ?' : 'Pas de compte ?'}
            </button>
          </div>
        </div>

        <p className="text-center text-zinc-500 text-sm mt-8">
          © 2026 BelloSuite
        </p>
      </div>
    </div>
  )
}
