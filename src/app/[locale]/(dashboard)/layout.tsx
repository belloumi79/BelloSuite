'use client'

import React, { useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    const session = localStorage.getItem('bello_session')
    if (session) {
      const { role } = JSON.parse(session)
      if (role === 'SUPER_ADMIN') {
        router.replace('/super-admin')
      }
    } else {
      router.replace('/login')
    }
  }, [router])

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
