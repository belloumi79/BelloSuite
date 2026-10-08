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

    const workOrder = await prisma.workOrder.findFirst({
      where: { 
        id,
        tenantId,
      },
      include: {
        asset: {
          select: { name: true, code: true }
        }
      }
    })

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    return NextResponse.json(workOrder)
  } catch (error) {
    console.error('Error fetching work order:', error)
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
    const badRef = await tenantRefsError(tenantId, { asset: updateData.assetId })
    if (badRef) return badRef

    if (updateData.scheduledDate) updateData.scheduledDate = new Date(updateData.scheduledDate)
    if (updateData.completedDate) updateData.completedDate = new Date(updateData.completedDate)
    if (updateData.cost) updateData.cost = Number(updateData.cost)

    const workOrder = await prisma.workOrder.update({
      where: {
        id,
        tenantId,
      },
      data: updateData,
      include: {
        asset: {
          select: { name: true, code: true }
        }
      }
    })

    return NextResponse.json(workOrder)
  } catch (error) {
    console.error('Error updating work order:', error)
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

    await prisma.workOrder.delete({
      where: {
        id,
        tenantId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting work order:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
