import { z } from 'zod'
import { prisma } from '@/lib/db'
import { BusinessError } from '@/lib/errors'
import { UserRole } from '@prisma/client'

// ─── Zod Schemas ────────────────────────────────────────────

export const createTenantSchema = z.object({
  companyName: z.string().min(1),
  subdomain: z.string().optional().nullable(),
  matriculeFiscal: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  userEmail: z.string().email().optional().nullable(),
})

export type CreateTenantData = z.infer<typeof createTenantSchema>

// ─── Service Functions ──────────────────────────────────────

export async function getTenants(requestingUserRole: UserRole) {
  if (requestingUserRole !== UserRole.SUPER_ADMIN) {
    throw new BusinessError('Accès réservé au Super Admin', 403)
  }

  return prisma.tenant.findMany({
    include: {
      users: { 
        where: { isActive: true }, 
        select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true } 
      },
      modules: { include: { module: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function createTenant(data: CreateTenantData, requestingUserRole: UserRole) {
  if (requestingUserRole !== UserRole.SUPER_ADMIN) {
    throw new BusinessError('Accès réservé au Super Admin', 403)
  }

  const { companyName, subdomain, userEmail, ...rest } = data

  // 1. Generate subdomain
  const generatedSubdomain = subdomain 
    ? subdomain.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 20)
    : companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 20) + '-' + Date.now().toString(36)

  return prisma.$transaction(async (tx) => {
    // 2. Create tenant
    const tenant = await tx.tenant.create({
      data: {
        name: companyName,
        subdomain: generatedSubdomain,
        ...rest,
        isActive: true
      }
    })

    // 3. Assign default modules
    const defaultModules = await tx.module.findMany({
      where: { name: { in: ['Stock', 'Commercial', 'Accounting'] } }
    })
    
    if (defaultModules.length > 0) {
      await tx.tenantModule.createMany({
        data: defaultModules.map(m => ({
          tenantId: tenant.id,
          moduleId: m.id,
          isEnabled: true
        }))
      })
    }

    // 4. Link user if provided
    if (userEmail) {
      await tx.user.update({
        where: { email: userEmail },
        data: { 
          tenantId: tenant.id,
          role: UserRole.ADMIN
        }
      })
    }

    return tenant
  })
}

export async function getAllUsers(requestingUserRole: UserRole) {
  if (requestingUserRole !== UserRole.SUPER_ADMIN) {
    throw new BusinessError('Accès réservé au Super Admin', 403)
  }

  return prisma.user.findMany({
    include: { tenant: { select: { name: true, subdomain: true } } },
    orderBy: { createdAt: 'desc' }
  })
}
