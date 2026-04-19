'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for session in URL params (from OAuth callback)
    const sessionParam = searchParams?.get('session')
    if (sessionParam) {
      try {
        const session = JSON.parse(Buffer.from(sessionParam, 'base64url').toString())
        localStorage.setItem('bello_session', JSON.stringify(session))
        const url = new URL(window.location.href)
        url.searchParams.delete('session')
        window.history.replaceState({}, '', url.toString())
      } catch (e) {
        console.error('Failed to parse session from URL:', e)
      }
    }

    const session = localStorage.getItem('bello_session')
    if (!session) {
      router.replace('/login')
      return
    }
    const { role, tenantId } = JSON.parse(session)
    if (role !== 'SUPER_ADMIN') {
      if (!tenantId) {
        router.replace('/onboarding')
      } else {
        router.replace('/dashboard')
      }
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-zinc-950">
      {children}
    </div>
  )
}
