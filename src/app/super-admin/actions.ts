'use server'

import { prisma } from '@/lib/db'

export async function getSuperAdminStats() {
  const [
    tenants,
    users,
    modules,
    tenantModules,
    products,
    invoices,
    employees
  ] = await Promise.all([
    prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.module.findMany(),
    prisma.tenantModule.findMany({ include: { module: true } }),
    prisma.product.findMany(),
    prisma.invoice.findMany(),
    prisma.employee.findMany()
  ])

  const activeModuleIds = new Set(tenantModules.filter(tm => tm.isEnabled).map(tm => tm.moduleId))
  
  // Calculer MRR basé sur les modules actifs par tenant
  let mrr = 0
  const tenantMap = new Map<string, { modules: number, price: number }>()
  for (const tm of tenantModules) {
    if (tm.isEnabled && tm.module) {
      const existing = tenantMap.get(tm.tenantId)
      if (existing) {
        existing.modules++
        existing.price += Number(tm.module.monthlyPrice) || 0
      } else {
        tenantMap.set(tm.tenantId, { modules: 1, price: Number(tm.module.monthlyPrice) || 0 })
      }
    }
  }
  mrr = Array.from(tenantMap.values()).reduce((sum, t) => sum + t.price, 0)

  // Users par tenant
  const usersByTenant = new Map<string, number>()
  for (const u of users) {
    if (u.tenantId) {
      usersByTenant.set(u.tenantId, (usersByTenant.get(u.tenantId) || 0) + 1)
    }
  }

  // Modules par tenant
  const modulesByTenant = new Map<string, number>()
  for (const tm of tenantModules) {
    if (tm.isEnabled) {
      modulesByTenant.set(tm.tenantId, (modulesByTenant.get(tm.tenantId) || 0) + 1)
    }
  }

  const tenantsWithStats = tenants.map(t => ({
    ...t,
    userCount: usersByTenant.get(t.id) || 0,
    moduleCount: modulesByTenant.get(t.id) || 0,
    activeModuleIds: tenantModules.filter(tm => tm.tenantId === t.id && tm.isEnabled).map(tm => tm.moduleId)
  }))

  return {
    stats: {
      totalTenants: tenants.length,
      totalUsers: users.length,
      activeModules: activeModuleIds.size,
      totalModules: modules.length,
      totalProducts: products.length,
      totalInvoices: invoices.length,
      totalEmployees: employees.length,
      mrr
    },
    tenants: tenantsWithStats,
    modules,
    recentUsers: users.slice(0, 10)
  }
}

export async function getTenantDetails(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      users: { where: { isActive: true } },
      modules: { include: { module: true } },
      products: { where: { isActive: true } },
      clients: { where: { isActive: true } },
      invoices: { orderBy: { date: 'desc' }, take: 10 },
      employees: { where: { isActive: true } }
    }
  })
  return tenant
}

export async function toggleTenantStatus(tenantId: string, isActive: boolean) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data: { isActive }
  })
}

export async function deleteTenant(tenantId: string) {
  // Supprimer en cascade (ou mettre à jour)
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { isActive: false }
  })
}
export async function toggleTenantModule(tenantId: string, moduleId: string, isEnabled: boolean) {
  return prisma.tenantModule.upsert({
    where: {
      tenantId_moduleId: {
        tenantId,
        moduleId
      }
    },
    update: { isEnabled },
    create: {
      tenantId,
      moduleId,
      isEnabled
    }
  })
}
