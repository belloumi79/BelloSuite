import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    const productionOrder = await prisma.productionOrder.findUnique({
      where: { 
        id,
        tenantId,
      },
      include: {
        workStation: {
          select: { name: true, code: true }
        }
      }
    })

    if (!productionOrder) {
      return NextResponse.json({ error: 'Production Order not found' }, { status: 404 })
    }

    return NextResponse.json(productionOrder)
  } catch (error) {
    console.error('Error fetching production order:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json()
    const { tenantId, ...updateData } = body

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    if (updateData.quantity) updateData.quantity = Number(updateData.quantity)
    if (updateData.plannedStartDate) updateData.plannedStartDate = new Date(updateData.plannedStartDate)
    if (updateData.plannedEndDate) updateData.plannedEndDate = new Date(updateData.plannedEndDate)
    if (updateData.actualStartDate) updateData.actualStartDate = new Date(updateData.actualStartDate)
    if (updateData.actualEndDate) updateData.actualEndDate = new Date(updateData.actualEndDate)

    const productionOrder = await prisma.productionOrder.update({
      where: {
        id,
        tenantId,
      },
      data: updateData,
      include: {
        workStation: {
          select: { name: true, code: true }
        }
      }
    })

    return NextResponse.json(productionOrder)
  } catch (error) {
    console.error('Error updating production order:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    await prisma.productionOrder.delete({
      where: {
        id,
        tenantId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting production order:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
