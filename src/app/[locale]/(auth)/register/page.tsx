'use client'

import { useState } from 'react'
import { useRouter, Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const t = useTranslations('Auth')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleRegister = async () => {
    if (!email) { setErrorMsg(t('errors.email_required')); return }
    if (password.length < 6) { setErrorMsg(t('errors.password_min')); return }
    if (password !== confirmPassword) { setErrorMsg(t('errors.password_mismatch')); return }
    setErrorMsg('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
      } else {
        setErrorMsg(data.error || t('errors.generic_error'))
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRegister()
  }

  // ── Success State ────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-teal-500/20">
            <span className="text-white font-black text-2xl">B</span>
          </div>

          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>

          <h1 className="text-2xl font-black text-white mb-2">{t('success_title')}</h1>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            {t('success_description')}<br />
            <strong className="text-teal-400">{email}</strong>
          </p>

          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-2xl p-5 mb-6 text-start space-y-3">
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t('next_step')}</p>
            <div className="space-y-2.5">
              {[
                t('step_1'),
                t('step_2'),
                t('step_3'),
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 text-xs font-black flex-shrink-0 flex items-center justify-center mt-0.5">{i + 1}</span>
                  <p className="text-zinc-300 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: step }} />
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-zinc-700/50">
              <p className="text-zinc-500 text-xs">
                💡 {t('not_received')}{' '}
                <button onClick={() => { setSuccess(false); setEmail(''); setPassword(''); setConfirmPassword('') }}
                  className="text-teal-400 hover:underline font-medium">
                  {t('retry')}
                </button>
              </p>
            </div>
          </div>

          <Link href="/login"
            className="block w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-center transition-all">
            {t('login_link')}
          </Link>

          <p className="text-center text-zinc-600 text-xs mt-4">
            {t('activation_note')}
          </p>
        </div>
      </div>
    )
  }

  // ── Form State ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/20">
            <span className="text-white font-black text-2xl">B</span>
          </div>
          <h1 className="text-3xl font-black text-white">BelloSuite</h1>
          <p className="text-zinc-500 mt-1 font-medium">{t('register_title')}</p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm font-medium">{errorMsg}</p>
          </div>
        )}

        <div className="space-y-4 text-start" onKeyDown={handleKeyDown}>
          <div>
            <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1.5 px-1">{t('email')}</label>
            <input type="email" placeholder="votre@email.com" autoComplete="email"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:border-teal-500 transition-colors placeholder:text-zinc-600"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div>
            <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1.5 px-1">{t('password')}</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" autoComplete="new-password"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:border-teal-500 transition-colors placeholder:text-zinc-600"
                value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-inline-end-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors p-1">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1.5 px-1">{t('confirm_password')}</label>
            <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" autoComplete="new-password"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:border-teal-500 transition-colors placeholder:text-zinc-600"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>

          <button onClick={handleRegister} disabled={loading}
            className="w-full py-4 bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {t('creating_account')}</>
            ) : t('create_account_button')}
          </button>
        </div>

        <p className="text-center text-zinc-500 text-sm mt-8">
          {t('already_have_account')}{' '}
          <Link href="/login" className="text-teal-400 hover:text-teal-300 font-bold transition-colors">
            {t('login_link')}
          </Link>
        </p>

        <p className="text-center text-zinc-600 text-[10px] mt-6 leading-relaxed">
          {t('terms_note')}{' '}
          <a href="/terms" className="text-zinc-500 hover:text-teal-400 underline">{t('terms')}</a>
          {' '}{t('and')}{' '}
          <a href="/privacy" className="text-zinc-500 hover:text-teal-400 underline">{t('privacy')}</a>
        </p>
      </div>
    </div>
  )
}
