import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    // 1. Assets KPIs
    const assets = await prisma.asset.findMany({
      where: { tenantId },
      select: { status: true }
    });

    const totalAssets = assets.length;
    const activeAssets = assets.filter(a => a.status === 'ACTIVE').length;
    const brokenAssets = assets.filter(a => a.status === 'BROKEN').length;
    const maintenanceAssets = assets.filter(a => a.status === 'IN_MAINTENANCE').length;

    // 2. Work Orders KPIs
    const workOrders = await prisma.workOrder.findMany({
      where: { tenantId },
      select: { status: true, priority: true, type: true }
    });

    const totalOrders = workOrders.length;
    const openOrders = workOrders.filter(wo => wo.status === 'OPEN').length;
    const inProgressOrders = workOrders.filter(wo => wo.status === 'IN_PROGRESS').length;
    const criticalOrders = workOrders.filter(wo => wo.priority === 'CRITICAL' && wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED').length;
    
    const correctiveOrders = workOrders.filter(wo => wo.type === 'CORRECTIVE' || wo.type === 'EMERGENCY').length;
    const preventiveOrders = workOrders.filter(wo => wo.type === 'PREVENTIVE').length;

    return NextResponse.json({
      assets: {
        total: totalAssets,
        active: activeAssets,
        broken: brokenAssets,
        maintenance: maintenanceAssets
      },
      workOrders: {
        total: totalOrders,
        open: openOrders,
        inProgress: inProgressOrders,
        critical: criticalOrders,
        corrective: correctiveOrders,
        preventive: preventiveOrders
      }
    })
  } catch (error) {
    console.error('Error fetching GMAO dashboard data:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
