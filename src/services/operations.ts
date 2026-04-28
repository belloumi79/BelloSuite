import { z } from 'zod'
import { prisma } from '@/lib/db'
import { BusinessError } from '@/lib/errors'
import { AssetStatus, WorkOrderStatus, ProductionStatus, Priority, WorkOrderType } from '@prisma/client'

// ─── Zod Schemas ────────────────────────────────────────────

export const createAssetSchema = z.object({
  tenantId: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  status: z.nativeEnum(AssetStatus).default(AssetStatus.ACTIVE),
})

export type CreateAssetData = z.infer<typeof createAssetSchema>

export const createWorkOrderSchema = z.object({
  tenantId: z.string().min(1),
  assetId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.nativeEnum(WorkOrderType),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
})

export type CreateWorkOrderData = z.infer<typeof createWorkOrderSchema>

export const createProductionOrderSchema = z.object({
  tenantId: z.string().min(1),
  workStationId: z.string().optional().nullable(),
  productId: z.string().min(1),
  quantity: z.coerce.number().min(0.0001),
  plannedStartDate: z.string().optional().nullable(),
  plannedEndDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type CreateProductionOrderData = z.infer<typeof createProductionOrderSchema>

// ─── Service Functions ──────────────────────────────────────

// --- GMAO ---

export async function getAssets(tenantId: string) {
  return prisma.asset.findMany({
    where: { tenantId, isActive: true },
    orderBy: { code: 'asc' },
  })
}

export async function createAsset(data: CreateAssetData) {
  return prisma.asset.create({ data })
}

export async function createWorkOrder(data: CreateWorkOrderData) {
  const { assetId, tenantId } = data

  return prisma.$transaction(async (tx) => {
    // 1. Create work order
    const wo = await tx.workOrder.create({
      data: {
        ...data,
        status: WorkOrderStatus.OPEN,
      },
    })

    // 2. If it's corrective or emergency, mark asset as in maintenance
    if (data.type !== WorkOrderType.PREVENTIVE) {
      await tx.asset.update({
        where: { id: assetId },
        data: { status: AssetStatus.IN_MAINTENANCE },
      })
    }

    return wo
  })
}

// --- GPAO ---

export async function getProductionOrders(tenantId: string) {
  return prisma.productionOrder.findMany({
    where: { tenantId },
    include: { workStation: { select: { name: true, code: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createProductionOrder(data: CreateProductionOrderData) {
  const { plannedStartDate, plannedEndDate, ...rest } = data

  return prisma.productionOrder.create({
    data: {
      ...rest,
      status: ProductionStatus.PENDING,
      plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
      plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
    },
  })
}

export async function getBoms(tenantId: string) {
  return prisma.billOfMaterials.findMany({
    where: { tenantId, isActive: true },
    include: { items: true },
  })
}
