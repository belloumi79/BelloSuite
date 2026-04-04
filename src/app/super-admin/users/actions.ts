'use server'

import { prisma } from '@/lib/db'

export async function getAllUsers(tenantId?: string, query?: string) {
  const where: any = {}
  if (tenantId) where.tenantId = tenantId
  if (query) {
    where.OR = [
      { firstName: { contains: query, mode: 'insensitive' } },
      { lastName: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } }
    ]
  }

  return prisma.user.findMany({
    where,
    include: { tenant: true },
    orderBy: { createdAt: 'desc' },
    take: 50 // Limitation for performance
  })
}

export async function toggleUserStatus(userId: string, isActive: boolean) {
  return prisma.user.update({
    where: { id: userId },
    data: { isActive }
  })
}
