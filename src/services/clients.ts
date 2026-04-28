import { z } from 'zod'
import { prisma } from '@/lib/db'
import { BusinessError } from '@/lib/errors'

// ─── Zod Schemas ────────────────────────────────────────────

export const createClientSchema = z.object({
  tenantId: z.string().min(1, 'tenantId requis'),
  code: z.string().optional(),
  name: z.string().min(1, 'nom requis'),
  email: z.string().email('email invalide').optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  country: z.string().default('Tunisie'),
  matriculeFiscal: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
})

export const updateClientSchema = createClientSchema.partial().omit({ tenantId: true })

export type CreateClientData = z.infer<typeof createClientSchema>
export type UpdateClientData = z.infer<typeof updateClientSchema>

// ─── Service Functions ──────────────────────────────────────

export async function getClients(tenantId: string, activeOnly = false) {
  return prisma.client.findMany({
    where: { tenantId, ...(activeOnly ? { isActive: true } : {}) },
    orderBy: { name: 'asc' },
  })
}

export async function getClientById(id: string, tenantId: string) {
  const client = await prisma.client.findUnique({ where: { id } })
  if (!client || client.tenantId !== tenantId) {
    throw new BusinessError('Client introuvable', 404)
  }
  return client
}

export async function createClient(data: CreateClientData) {
  const { tenantId, code, name, email, phone, address, city, zipCode, country, matriculeFiscal } = data

  // Auto-generate code if not provided
  const finalCode = code?.trim() || `CLT-${Date.now().toString(36).toUpperCase()}`

  // Check uniqueness of code within tenant
  const existing = await prisma.client.findUnique({
    where: { tenantId_code: { tenantId, code: finalCode } },
    select: { id: true },
  })
  if (existing) {
    throw new BusinessError(`Code client "${finalCode}" déjà utilisé`, 409)
  }

  return prisma.client.create({
    data: {
      tenantId,
      code: finalCode,
      name,
      email: email ?? null,
      phone: phone ?? null,
      address: address ?? null,
      city: city ?? null,
      zipCode: zipCode ?? null,
      country,
      matriculeFiscal: matriculeFiscal ?? null,
    },
  })
}

export async function updateClient(id: string, tenantId: string, data: UpdateClientData) {
  await getClientById(id, tenantId) // throws 404 if not found/wrong tenant

  return prisma.client.update({
    where: { id },
    data: {
      ...data,
      email: data.email ?? undefined,
      phone: data.phone ?? undefined,
    },
  })
}

export async function deleteClient(id: string, tenantId: string) {
  await getClientById(id, tenantId)

  // Check for linked invoices before deleting
  const invoiceCount = await prisma.invoice.count({ where: { clientId: id } })
  if (invoiceCount > 0) {
    throw new BusinessError(
      `Impossible de supprimer ce client : ${invoiceCount} facture(s) associée(s)`,
      409
    )
  }

  return prisma.client.delete({ where: { id } })
}
