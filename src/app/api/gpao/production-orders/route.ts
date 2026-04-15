import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    const productionOrders = await prisma.productionOrder.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        workStation: {
          select: { name: true, code: true }
        }
      }
    })

    return NextResponse.json(productionOrders)
  } catch (error) {
    console.error('Error fetching production orders:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      tenantId, workStationId, productId, quantity, status, plannedStartDate, plannedEndDate, notes
    } = body

    if (!tenantId || !productId || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const productionOrder = await prisma.productionOrder.create({
      data: {
        tenantId,
        workStationId,
        productId,
        quantity: Number(quantity),
        status: status || 'PENDING',
        plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
        plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
        notes
      },
      include: {
        workStation: {
          select: { name: true, code: true }
        }
      }
    })

    return NextResponse.json(productionOrder)
  } catch (error: any) {
    console.error('Error creating production order:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
