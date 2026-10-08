'use client'

/**
 * Session côté client — remplace la lecture de `localStorage('bello_session')` (jamais rempli à la connexion,
 * le cookie de session étant httpOnly).
 *
 * - Dans le layout du tableau de bord, la session est lue côté serveur (getSession) et passée en
 *   `initialSession` : aucune requête réseau, `tenantId` disponible dès le premier rendu.
 * - Sans `initialSession`, la session est chargée UNE fois via GET /api/auth/session (requête partagée).
 *
 * Le tenantId exposé ici sert uniquement à l'affichage / aux clés de cache : les API ne lui font pas
 * confiance, elles relisent toujours le tenant dans le cookie signé.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export interface ClientSession {
  id: string
  email: string
  role: string
  tenantId: string | null
  firstName: string
}

interface SessionContextValue {
  session: ClientSession | null
  /** tenantId de la session, ou '' s'il n'y en a pas (encore). */
  tenantId: string
  loading: boolean
  refresh: () => Promise<ClientSession | null>
}

const SessionContext = createContext<SessionContextValue | null>(null)

let inflight: Promise<ClientSession | null> | null = null

export function fetchClientSession(force = false): Promise<ClientSession | null> {
  if (!inflight || force) {
    inflight = fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<ClientSession | null>) : null))
      .catch(() => null)
  }
  return inflight
}

export function SessionProvider({
  initialSession,
  children,
}: {
  initialSession?: ClientSession | null
  children: React.ReactNode
}) {
  const [session, setSession] = useState<ClientSession | null>(initialSession ?? null)
  const [loading, setLoading] = useState(initialSession === undefined)

  const refresh = useCallback(async () => {
    setLoading(true)
    const s = await fetchClientSession(true)
    setSession(s)
    setLoading(false)
    return s
  }, [])

  useEffect(() => {
    if (initialSession !== undefined) return
    let cancelled = false
    fetchClientSession().then((s) => {
      if (cancelled) return
      setSession(s)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [initialSession])

  const value = useMemo<SessionContextValue>(
    () => ({ session, tenantId: session?.tenantId ?? '', loading, refresh }),
    [session, loading, refresh]
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

/**
 * Session courante. À utiliser sous <SessionProvider> (fourni par le layout du tableau de bord).
 * Hors provider, charge la session via /api/auth/session (une seule requête partagée).
 */
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  const [fallback, setFallback] = useState<ClientSession | null>(null)
  const [fallbackLoading, setFallbackLoading] = useState(ctx === null)

  useEffect(() => {
    if (ctx) return
    let cancelled = false
    fetchClientSession().then((s) => {
      if (cancelled) return
      setFallback(s)
      setFallbackLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [ctx])

  const refresh = useCallback(async () => {
    const s = await fetchClientSession(true)
    setFallback(s)
    return s
  }, [])

  if (ctx) return ctx
  return { session: fallback, tenantId: fallback?.tenantId ?? '', loading: fallbackLoading, refresh }
}
