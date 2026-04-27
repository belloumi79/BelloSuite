'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'

function ConfirmContent() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token')
  const type = params.get('type')

  useEffect(() => {
    if (token && type === 'signup') {
      router.push('/login?confirmed=1')
    } else {
      router.push('/fr/login')
    }
  }, [token, type, router])

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center">
        <h1 className="text-2xl font-black text-white mb-2">Confirmation</h1>
        <p className="text-zinc-500">Redirection...</p>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <ConfirmContent />
    </Suspense>
  )
}
