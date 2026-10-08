import { requireTenant } from '@/lib/api-auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { tenantRefsError } from '@/lib/tenant-scope'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ctx = await requireTenant(request, searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    const tenantId = ctx.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    const boms = await prisma.billOfMaterials.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        _count: {
          select: { items: true }
        }
      }
    })

    return NextResponse.json(boms)
  } catch (error) {
    console.error('Error fetching BOMs:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      tenantId: requestedTenantId, productId, version, isActive, items
    } = body
    const ctx = await requireTenant(request, requestedTenantId)
    if (ctx instanceof NextResponse) return ctx
    const tenantId = ctx.tenantId

    if (!tenantId || !productId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const badRef = await tenantRefsError(tenantId, {
      product: [productId, ...(Array.isArray(items) ? items.map((i: { productId?: string }) => i.productId) : [])],
    })
    if (badRef) return badRef

    // items should be an array of { productId, quantity }
    const bom = await prisma.billOfMaterials.create({
      data: {
        tenantId,
        productId,
        version: version || "1",
        isActive: isActive !== undefined ? isActive : true,
        items: items && items.length > 0 ? {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: Number(item.quantity)
          }))
        } : undefined
      },
      include: {
        items: true
      }
    })

    return NextResponse.json(bom)
  } catch (error: any) {
    console.error('Error creating BOM:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'This version of the Bill of Materials already exists for this product' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
