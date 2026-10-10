/** Route /api/admin/fiscal-kb/ingest : SUPER_ADMIN, validation, clé absente, embeddings. */
import { NextResponse } from 'next/server'

const requireSuperAdmin = jest.fn()
const upsertChunks = jest.fn()
const embedPending = jest.fn()
const fiscalKbStats = jest.fn()

jest.mock('@/lib/api-auth', () => ({ requireSuperAdmin: (...a: unknown[]) => requireSuperAdmin(...a) }))
jest.mock('@/lib/db', () => ({ prisma: {} }))
jest.mock('@/lib/fiscal-kb-ingest', () => {
  const actual = jest.requireActual('@/lib/fiscal-kb-ingest')
  return {
    ...actual,
    upsertChunks: (...a: unknown[]) => upsertChunks(...a),
    embedPending: (...a: unknown[]) => embedPending(...a),
    fiscalKbStats: (...a: unknown[]) => fiscalKbStats(...a),
  }
})

import { GET, POST } from '@/app/api/admin/fiscal-kb/ingest/route'

const req = (body?: unknown) =>
  new Request('http://localhost/api/admin/fiscal-kb/ingest', { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body), headers: { 'content-type': 'application/json' } })
const env = { ...process.env }

const chunk = {
  id: 'abcdef0123456789', code: 'TVA', article: '7', section: null, title: 'Code TVA', version: '2026', lang: 'ar',
  sourceUrl: 'https://jibaya.tn/x.pdf', outdated: false, kind: 'code', part: 1, parts: 1, content: 'نص', contentHash: 'f'.repeat(64), tokens: 1,
}

beforeEach(() => {
  jest.resetAllMocks()
  requireSuperAdmin.mockResolvedValue({ id: 'u1', role: 'SUPER_ADMIN' })
  process.env.GEMINI_API_KEY = 'k'
})
afterEach(() => { process.env = { ...env } })

describe('/api/admin/fiscal-kb/ingest', () => {
  it('refuse sans SUPER_ADMIN', async () => {
    requireSuperAdmin.mockResolvedValue(NextResponse.json({ error: 'x' }, { status: 403 }))
    expect((await POST(req({}))).status).toBe(403)
    expect((await GET(req())).status).toBe(403)
    expect(embedPending).not.toHaveBeenCalled()
  })

  it('400 sur corps invalide', async () => {
    expect((await POST(req({ chunks: [{ id: 'x' }] }))).status).toBe(400)
    expect((await POST(req({ limit: 10_000 }))).status).toBe(400)
  })

  it('upsert sans embedding (embed:false)', async () => {
    upsertChunks.mockResolvedValue(1)
    const res = await POST(req({ chunks: [chunk], embed: false }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ upserted: 1, embedded: 0, remaining: null })
    expect(embedPending).not.toHaveBeenCalled()
  })

  it('503 si GEMINI_API_KEY absente', async () => {
    delete process.env.GEMINI_API_KEY
    const res = await POST(req({}))
    expect(res.status).toBe(503)
  })

  it('embeddé un lot et renvoie le reste', async () => {
    embedPending.mockResolvedValue({ embedded: 20, remaining: 100 })
    const res = await POST(req({ limit: 20 }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ upserted: 0, embedded: 20, remaining: 100 })
    expect(embedPending.mock.calls[0][2]).toMatchObject({ limit: 20, batch: 20, deadlineMs: 45_000 })
  })

  it('502 si le quota bloque dès le premier lot', async () => {
    embedPending.mockResolvedValue({ embedded: 0, remaining: 100, error: { status: 429, message: 'embedding HTTP 429' } })
    expect((await POST(req({}))).status).toBe(502)
  })

  it('GET : statistiques', async () => {
    fiscalKbStats.mockResolvedValue([{ code: 'TVA', version: '2026', lang: 'ar', total: 3, embedded: 0 }])
    const res = await GET(req())
    expect(await res.json()).toEqual({ stats: [{ code: 'TVA', version: '2026', lang: 'ar', total: 3, embedded: 0 }], embeddingsConfigured: true })
  })
})
