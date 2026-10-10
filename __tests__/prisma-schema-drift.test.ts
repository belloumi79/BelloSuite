/**
 * Garde-fou : la colonne clientId n'existe pas en base sur GoodsReceipt / SupplierReturn.
 * Une relation Client ajoutée par erreur au schéma fait échouer toute requête Prisma
 * sur ces tables (500 sur /api/commercial/suppliers/receipts et /returns).
 */
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const dir = join(__dirname, '..', 'prisma', 'schema')
const schema = readdirSync(dir).filter(f => f.endsWith('.prisma')).map(f => readFileSync(join(dir, f), 'utf8')).join('\n')

function modelBody(name: string): string {
  const m = schema.match(new RegExp(`^model ${name} \\{([\\s\\S]*?)^\\}`, 'm'))
  if (!m) throw new Error(`model ${name} introuvable`)
  return m[1]
}

describe('schéma Prisma ↔ base (achats)', () => {
  it.each(['GoodsReceipt', 'SupplierReturn'])('%s ne déclare pas de clientId', (model) => {
    expect(modelBody(model)).not.toMatch(/^\s*clientId\s/m)
  })
})

describe('schéma Prisma ↔ base (bons de livraison)', () => {
  it('Invoice.warehouseId est nullable et créé par une migration additive', () => {
    expect(modelBody('Invoice')).toMatch(/^\s*warehouseId\s+String\?/m)
    const migDir = join(__dirname, '..', 'supabase', 'migrations')
    const sql = readdirSync(migDir).filter(f => f.endsWith('.sql')).map(f => readFileSync(join(migDir, f), 'utf8')).join('\n')
    expect(sql).toMatch(/ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "warehouseId" TEXT;/)
  })
})
