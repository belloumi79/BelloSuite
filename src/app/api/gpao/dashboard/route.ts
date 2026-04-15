import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    const [
      totalWorkstations,
      totalBoms,
      productionOrdersCount,
      activeOrders
    ] = await Promise.all([
      prisma.workStation.count({ where: { tenantId, isActive: true } }),
      prisma.billOfMaterials.count({ where: { tenantId, isActive: true } }),
      prisma.productionOrder.count({ where: { tenantId } }),
      prisma.productionOrder.count({ where: { tenantId, status: 'IN_PROGRESS' } }),
    ])

    const recentOrders = await prisma.productionOrder.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        workStation: { select: { name: true } }
      }
    })

    return NextResponse.json({
      metrics: {
        totalWorkstations,
        totalBoms,
        productionOrdersCount,
        activeOrders
      },
      recentOrders
    })
  } catch (error) {
    console.error('Error fetching GPAO dashboard data:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
