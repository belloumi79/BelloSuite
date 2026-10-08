/**
 * @jest-environment node
 *
 * Signature / vérification du JWT de session : un jeton forgé avec la clé anon ou
 * l'ancien 'fallback-secret' doit être rejeté.
 */
import { SignJWT } from 'jose'

jest.mock('next/headers', () => ({ cookies: jest.fn() }))

import { signSession, verifySessionToken } from '@/lib/session'

const payload = { id: 'u1', email: 'a@b.tn', role: 'USER', tenantId: 'tenant-A', firstName: 'A' }

describe('session JWT', () => {
  beforeAll(() => {
    process.env.SESSION_SECRET = 'k'.repeat(48)
  })

  it('vérifie un jeton signé par le serveur', async () => {
    const token = await signSession(payload)
    await expect(verifySessionToken(token)).resolves.toMatchObject({ id: 'u1', tenantId: 'tenant-A', role: 'USER' })
  })

  it('rejette un jeton SUPER_ADMIN forgé avec l’ancien secret de repli', async () => {
    const forged = await new SignJWT({ ...payload, role: 'SUPER_ADMIN' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('u1')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('fallback-secret-change-in-production'.slice(0, 32)))
    await expect(verifySessionToken(forged)).resolves.toBeNull()
  })

  it('lève une erreur (fail closed) si SESSION_SECRET disparaît', async () => {
    const token = await signSession(payload)
    const old = process.env.SESSION_SECRET
    delete process.env.SESSION_SECRET
    await expect(verifySessionToken(token)).rejects.toThrow(/SESSION_SECRET/)
    process.env.SESSION_SECRET = old
  })
})
