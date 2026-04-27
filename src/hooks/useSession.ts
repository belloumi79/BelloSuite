'use client'

import { useEffect, useState } from 'react'

export function useSession() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch('/api/auth/session')
        if (res.ok) {
          const data = await res.json()
          setSession(data)
        }
      } catch (err) {
        console.error('Session fetch failed:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSession()
  }, [])

  return { session, tenantId: session?.tenantId, loading }
}
