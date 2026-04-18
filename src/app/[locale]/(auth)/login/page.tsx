'use client'

import { useState } from 'react'
import { useRouter, Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const t = useTranslations('Auth')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem('bello_session', JSON.stringify(data.session))
        router.push(data.session.role === 'SUPER_ADMIN' ? '/super-admin' : '/dashboard')
      } else {
        alert(data.error || t('invalid_credentials'))
      }
    } catch (err) {
      alert('Erreur: ' + err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/20">
            <span className="text-white font-black text-2xl">B</span>
          </div>
          <h1 className="text-3xl font-black text-white">BelloSuite</h1>
          <p className="text-zinc-500 mt-1 font-medium">{t('login_title')}</p>
        </div>

        <div className="space-y-4 text-start">
          <div>
            <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1 block px-1">
                {t('email')}
            </label>
            <input
                type="email"
                placeholder={t('email')}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:border-teal-500 transition-colors"
                value={email}
                onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1 block px-1">
                {t('password')}
            </label>
            <div className="relative">
                <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('password')}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:border-teal-500 transition-colors"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-inline-end-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors p-1"
                >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
            </div>
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 mt-4 shadow-lg shadow-teal-500/20"
          >
            {loading ? t('logging_in') : t('login_button')}
          </button>
        </div>

        <p className="text-center text-zinc-500 text-sm mt-8">
          {t('no_account')}{' '}
          <Link href="/register" className="text-teal-400 hover:text-teal-300 font-bold transition-colors">
            {t('register_link')}
          </Link>
        </p>
      </div>
    </div>
  )
}