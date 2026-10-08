/**
 * @jest-environment node
 *
 * Tests du helper d'authentification serveur (src/lib/api-auth.ts) et de la clé de session.
 */
import { resolveTenantContext, checkCronSecret, hasRole } from '@/lib/api-auth'
import { getSessionSecretKey, MissingSessionSecretError } from '@/lib/session-secret'
import type { SessionPayload } from '@/lib/session'

const base: SessionPayload = { id: 'u1', email: 'a@b.tn', role: 'USER', tenantId: 'tenant-A', firstName: 'A' }

describe('resolveTenantContext — tenant toujours issu de la session', () => {
  it('utilise le tenant de la session quand le client n’en envoie pas', () => {
    const ctx = resolveTenantContext(base, null)
    expect(ctx).toMatchObject({ tenantId: 'tenant-A', userRole: 'USER' })
  })

  it('ignore les valeurs vides "null"/"undefined" envoyées par le client', () => {
    expect(resolveTenantContext(base, 'null')).toMatchObject({ tenantId: 'tenant-A' })
    expect(resolveTenantContext(base, 'undefined')).toMatchObject({ tenantId: 'tenant-A' })
  })

  it('refuse (403) un tenantId client différent de celui de la session', () => {
    expect(resolveTenantContext(base, 'tenant-B')).toEqual({ error: 'Accès refusé', status: 403 })
  })

  it('refuse (403) un ADMIN qui cible un autre tenant', () => {
    expect(resolveTenantContext({ ...base, role: 'ADMIN' }, 'tenant-B')).toMatchObject({ status: 403 })
  })

  it('refuse (403) un utilisateur sans tenant, même s’il en fournit un', () => {
    const noTenant = { ...base, tenantId: null }
    expect(resolveTenantContext(noTenant, 'tenant-B')).toMatchObject({ status: 403 })
    expect(resolveTenantContext(noTenant, null)).toMatchObject({ status: 403 })
  })

  it('autorise SUPER_ADMIN à cibler un tenant explicite', () => {
    const sa = { ...base, role: 'SUPER_ADMIN', tenantId: null }
    expect(resolveTenantContext(sa, 'tenant-B')).toMatchObject({ tenantId: 'tenant-B' })
    expect(resolveTenantContext(sa, null)).toMatchObject({ status: 400 })
  })
})

describe('hasRole', () => {
  it('vérifie le rôle de la session', () => {
    expect(hasRole({ role: 'SUPER_ADMIN' }, ['SUPER_ADMIN'])).toBe(true)
    expect(hasRole({ role: 'ADMIN' }, ['SUPER_ADMIN'])).toBe(false)
  })
})

describe('SESSION_SECRET — fail closed', () => {
  const OLD = process.env.SESSION_SECRET
  afterEach(() => {
    if (OLD === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = OLD
  })

  it('lève une erreur claire si SESSION_SECRET est absent (pas de repli)', () => {
    delete process.env.SESSION_SECRET
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'x'.repeat(64) // ne doit PAS servir de repli
    expect(() => getSessionSecretKey()).toThrow(MissingSessionSecretError)
  })

  it('refuse un secret trop court', () => {
    process.env.SESSION_SECRET = 'court'
    expect(() => getSessionSecretKey()).toThrow(MissingSessionSecretError)
  })

  it('accepte un secret de 32+ caractères sans le tronquer', () => {
    process.env.SESSION_SECRET = 's'.repeat(48)
    expect(getSessionSecretKey()).toHaveLength(48)
  })
})

describe('checkCronSecret', () => {
  const OLD = process.env.CRON_SECRET
  afterEach(() => {
    if (OLD === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = OLD
  })
  const req = (headers: Record<string, string>) => new Request('https://x/api/cron/reminders', { headers })

  it('refuse si CRON_SECRET n’est pas configuré', () => {
    delete process.env.CRON_SECRET
    expect(checkCronSecret(req({ authorization: 'Bearer anything' }))?.status).toBe(500)
  })

  it('refuse un mauvais secret et accepte le bon (Bearer ou x-cron-secret)', () => {
    process.env.CRON_SECRET = 'c'.repeat(32)
    expect(checkCronSecret(req({}))?.status).toBe(401)
    expect(checkCronSecret(req({ authorization: 'Bearer wrong' }))?.status).toBe(401)
    expect(checkCronSecret(req({ authorization: `Bearer ${'c'.repeat(32)}` }))).toBeNull()
    expect(checkCronSecret(req({ 'x-cron-secret': 'c'.repeat(32) }))).toBeNull()
  })
})
