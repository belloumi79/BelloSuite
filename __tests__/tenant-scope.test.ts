jest.mock('@/lib/db', () => ({ prisma: {} }))

import { allBelongToTenant, assertBelongsToTenant, assertAllBelongToTenant, stripUnsafeUpdateFields } from '@/lib/tenant-scope'
import { BusinessError } from '@/lib/errors'

// Faux client Prisma : seuls les ids de OWNED appartiennent au tenant t1
const OWNED = new Set(['p1', 'p2'])
const fakeDb = {
  product: {
    count: jest.fn(async ({ where }: { where: { id: { in: string[] }; tenantId: string } }) =>
      where.tenantId === 't1' ? where.id.in.filter((id) => OWNED.has(id)).length : 0
    ),
  },
} as never

describe('assertBelongsToTenant', () => {
  it('ignore les ids vides (champ optionnel)', async () => {
    await expect(assertBelongsToTenant('product', null, 't1', fakeDb)).resolves.toBeUndefined()
    await expect(assertBelongsToTenant('product', '', 't1', fakeDb)).resolves.toBeUndefined()
  })
  it('accepte un id du tenant', async () => {
    await expect(assertBelongsToTenant('product', 'p1', 't1', fakeDb)).resolves.toBeUndefined()
  })
  it('refuse un id d’un autre tenant (400)', async () => {
    await expect(assertBelongsToTenant('product', 'p1', 't2', fakeDb)).rejects.toBeInstanceOf(BusinessError)
    await expect(assertBelongsToTenant('product', 'x9', 't1', fakeDb)).rejects.toMatchObject({ statusCode: 400 })
  })
  it('liste : dédoublonne et exige que tous soient du tenant', async () => {
    expect(await allBelongToTenant('product', ['p1', 'p1', 'p2', null], 't1', fakeDb)).toBe(true)
    await expect(assertAllBelongToTenant('product', ['p1', 'x9'], 't1', fakeDb)).rejects.toBeInstanceOf(BusinessError)
  })
})

describe('stripUnsafeUpdateFields', () => {
  it('retire id/tenantId et les écritures imbriquées Prisma', () => {
    const out = stripUnsafeUpdateFields({
      id: 'x', tenantId: 't2', name: 'ok', assetId: 'a1', cost: 3, done: false, note: null,
      asset: { connect: { id: 'other' } }, items: [{ a: 1 }],
    })
    expect(out).toEqual({ name: 'ok', assetId: 'a1', cost: 3, done: false, note: null })
  })
})
