import { requireTenant } from '@/lib/api-auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { stripUnsafeUpdateFields } from '@/lib/tenant-scope'

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

    const workstation = await prisma.workStation.findFirst({
      where: { 
        id,
        tenantId,
      },
      include: {
        productionOrders: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!workstation) {
      return NextResponse.json({ error: 'Workstation not found' }, { status: 404 })
    }

    return NextResponse.json(workstation)
  } catch (error) {
    console.error('Error fetching workstation:', error)
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

    if (updateData.capacity) updateData.capacity = Number(updateData.capacity)

    const workstation = await prisma.workStation.update({
      where: {
        id,
        tenantId,
      },
      data: updateData,
    })

    return NextResponse.json(workstation)
  } catch (error) {
    console.error('Error updating workstation:', error)
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

    await prisma.workStation.delete({
      where: {
        id,
        tenantId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting workstation:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
