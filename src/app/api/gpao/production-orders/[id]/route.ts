import { requireTenant } from '@/lib/api-auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { tenantRefsError, stripUnsafeUpdateFields } from '@/lib/tenant-scope'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url)
    const ctx = await requireTenant(request, searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    const tenantId = ctx.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    const productionOrder = await prisma.productionOrder.findFirst({
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
    const { tenantId: requestedTenantId, ...rawUpdate } = body
    const updateData: Record<string, any> = stripUnsafeUpdateFields(rawUpdate)
    const ctx = await requireTenant(request, requestedTenantId)
    if (ctx instanceof NextResponse) return ctx
    const tenantId = ctx.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }
    const badRef = await tenantRefsError(tenantId, { product: updateData.productId, workStation: updateData.workStationId })
    if (badRef) return badRef

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
    const ctx = await requireTenant(request, searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    const tenantId = ctx.tenantId

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
