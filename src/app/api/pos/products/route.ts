import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { prisma } from '@/lib/db'

// GET /api/pos/products?tenantId=
// Used for quick search in the POS interface
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    const query = searchParams.get('q')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const products = await prisma.product.findMany({
      where: {
        tenantId: ctx.tenantId,
        isActive: true,
        OR: [
          { name: { contains: query || '', mode: 'insensitive' } },
          { code: { contains: query || '', mode: 'insensitive' } },
          { barcode: { contains: query || '', mode: 'insensitive' } },
        ]
      },
      take: 20,
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(products)
  } catch (err) {
    return handleApiError(err, 'GET pos products search')
  }
}
