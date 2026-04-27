import { Suspense } from 'react'
import AuthCallbackInner from './AuthCallbackInner'

function LoadingState() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-10 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-teal-500/20">
          <span className="text-white font-black text-2xl">B</span>
        </div>
        <div className="w-12 h-12 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin mx-auto mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">Chargement...</h1>
        <p className="text-zinc-500 text-sm">Redirection en cours</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AuthCallbackInner />
    </Suspense>
  )
}
