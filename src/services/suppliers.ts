import { z } from 'zod'
import { prisma } from '@/lib/db'
import { BusinessError } from '@/lib/errors'

// ─── Zod Schemas ────────────────────────────────────────────

export const createSupplierSchema = z.object({
  tenantId: z.string().min(1, 'tenantId requis'),
  code: z.string().optional(),
  name: z.string().min(1, 'nom requis'),
  email: z.string().email('email invalide').optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().default('Tunisie'),
  matriculeFiscal: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
})

export const updateSupplierSchema = createSupplierSchema.partial().omit({ tenantId: true })

export type CreateSupplierData = z.infer<typeof createSupplierSchema>
export type UpdateSupplierData = z.infer<typeof updateSupplierSchema>

// ─── Service Functions ──────────────────────────────────────

export async function getSuppliers(tenantId: string, activeOnly = false) {
  return prisma.supplier.findMany({
    where: { tenantId, ...(activeOnly ? { isActive: true } : {}) },
    orderBy: { name: 'asc' },
  })
}

export async function getSupplierById(id: string, tenantId: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id } })
  if (!supplier || supplier.tenantId !== tenantId) {
    throw new BusinessError('Fournisseur introuvable', 404)
  }
  return supplier
}

export async function createSupplier(data: CreateSupplierData) {
  const { tenantId, code, name, email, phone, address, city, country, matriculeFiscal } = data

  const finalCode = code?.trim() || `SUP-${Date.now().toString(36).toUpperCase()}`

  const existing = await prisma.supplier.findUnique({
    where: { tenantId_code: { tenantId, code: finalCode } },
    select: { id: true },
  })
  if (existing) {
    throw new BusinessError(`Code fournisseur "${finalCode}" déjà utilisé`, 409)
  }

  return prisma.supplier.create({
    data: {
      tenantId,
      code: finalCode,
      name,
      email: email ?? null,
      phone: phone ?? null,
      address: address ?? null,
      city: city ?? null,
      country,
      matriculeFiscal: matriculeFiscal ?? null,
    },
  })
}

export async function updateSupplier(id: string, tenantId: string, data: UpdateSupplierData) {
  await getSupplierById(id, tenantId)

  return prisma.supplier.update({
    where: { id },
    data: {
      ...data,
      email: data.email ?? undefined,
      phone: data.phone ?? undefined,
    },
  })
}

export async function deleteSupplier(id: string, tenantId: string) {
  await getSupplierById(id, tenantId)

  // Check for linked purchase orders if any (future check)
  const poCount = await prisma.purchaseOrder.count({ where: { supplierId: id } })
  if (poCount > 0) {
    throw new BusinessError(
      `Impossible de supprimer ce fournisseur : ${poCount} bon(s) de commande associé(s)`,
      409
    )
  }

  return prisma.supplier.delete({ where: { id } })
}
