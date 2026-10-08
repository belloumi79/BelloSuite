const queryRaw = jest.fn()
jest.mock('@/lib/db', () => ({ prisma: { $queryRaw: (...a: unknown[]) => queryRaw(...a), $executeRaw: jest.fn(() => Promise.resolve(0)) } }))

import { rateLimitPersistent, enforceRateLimits } from '@/lib/rate-limit-persistent'

describe('rateLimitPersistent', () => {
  beforeEach(() => queryRaw.mockReset())

  it('utilise le compteur Postgres quand la table existe', async () => {
    queryRaw.mockResolvedValueOnce([{ count: 3, windowStart: new Date() }])
    const r = await rateLimitPersistent('login:ip:1.1.1.1', 5, 60)
    expect(r).toMatchObject({ store: 'db', success: true, remaining: 2 })
    queryRaw.mockResolvedValueOnce([{ count: 6, windowStart: new Date() }])
    expect((await rateLimitPersistent('login:ip:1.1.1.1', 5, 60)).success).toBe(false)
  })

  it('ne stocke pas la clé en clair (sha256)', async () => {
    queryRaw.mockResolvedValueOnce([{ count: 1, windowStart: new Date() }])
    await rateLimitPersistent('login:email:a@b.tn', 5, 60)
    const values = queryRaw.mock.calls[0].slice(1)
    expect(values).not.toContain('login:email:a@b.tn')
    expect(values.some((v: unknown) => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v))).toBe(true)
  })

  it('repli en mémoire si la base échoue (table absente)', async () => {
    queryRaw.mockRejectedValue(new Error('relation "RateLimit" does not exist'))
    const key = `k-${Date.now()}`
    for (let i = 0; i < 2; i++) expect((await rateLimitPersistent(key, 2, 60)).store).toBe('memory')
    expect((await rateLimitPersistent(key, 2, 60)).success).toBe(false)
    const res = await enforceRateLimits([{ key, max: 2, windowSeconds: 60 }])
    expect(res?.status).toBe(429)
    expect(res?.headers.get('Retry-After')).toBeTruthy()
  })
})
