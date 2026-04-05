'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const session = localStorage.getItem('bello_session')
    if (!session) {
      router.replace('/login')
      return
    }
    const { role } = JSON.parse(session)
    if (role !== 'SUPER_ADMIN') {
      router.replace('/dashboard')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-zinc-950">
      {children}
    </div>
  )
}
