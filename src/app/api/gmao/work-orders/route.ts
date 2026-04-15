import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const assetId = searchParams.get('assetId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    const where: any = { tenantId }
    if (assetId) where.assetId = assetId

    const workOrders = await prisma.workOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        asset: {
          select: { name: true, code: true }
        }
      }
    })

    return NextResponse.json(workOrders)
  } catch (error) {
    console.error('Error fetching work orders:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      tenantId, assetId, title, description, type, priority, status, assignedTo, scheduledDate, cost, notes
    } = body

    if (!tenantId || !assetId || !title || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const workOrder = await prisma.workOrder.create({
      data: {
        tenantId,
        assetId,
        title,
        description,
        type,
        priority: priority || 'MEDIUM',
        status: status || 'OPEN',
        assignedTo,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        cost: cost ? Number(cost) : null,
        notes
      },
      include: {
        asset: {
          select: { name: true, code: true }
        }
      }
    })

    return NextResponse.json(workOrder)
  } catch (error: any) {
    console.error('Error creating work order:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
