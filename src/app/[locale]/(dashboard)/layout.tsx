'use client'

import React, { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for session in URL params (from OAuth callback)
    const sessionParam = searchParams?.get('session')
    if (sessionParam) {
      try {
        const session = JSON.parse(Buffer.from(sessionParam, 'base64url').toString())
        localStorage.setItem('bello_session', JSON.stringify(session))
        // Remove session param from URL
        const url = new URL(window.location.href)
        url.searchParams.delete('session')
        window.history.replaceState({}, '', url.toString())
      } catch (e) {
        console.error('Failed to parse session from URL:', e)
      }
    }

    const session = localStorage.getItem('bello_session')
    if (session) {
      const { role, tenantId } = JSON.parse(session)
      if (role === 'SUPER_ADMIN') {
        router.replace('/super-admin')
      } else if (!tenantId) {
        router.replace('/onboarding')
      }
    } else {
      router.replace('/login')
    }
  }, [router, searchParams])

  return (
    <div className="flex bg-zinc-950 min-h-screen font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-stone-50 rounded-inline-start-[40px] shadow-[inset_0_35px_60px_-15px_rgba(0,0,0,0.3)] relative z-10 transition-all duration-700 ease-in-out border-inline-start border-zinc-800/50">
        <div className="p-8 pb-16">
          {children}
        </div>
      </main>
    </div>
  )
}
