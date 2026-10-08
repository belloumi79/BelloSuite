import { NextRequest, NextResponse } from 'next/server'
import { getProducts, createProduct } from '@/services/products'
import { handleApiError } from '@/lib/errors'
import { requirePermission, Permission } from '@/lib/auth'
import { requireTenant } from '@/lib/api-auth'
import { z } from 'zod'

export const createProductSchema = z.object({
  tenantId: z.string().min(1, 'tenantId requis'),
  code: z.string().min(1, 'code requis'),
  name: z.string().min(1, 'name requis'),
  description: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().default('unit'),
  purchasePrice: z.number().min(0).default(0),
  salePrice: z.number().min(0).default(0),
  vatRate: z.number().min(0).max(100).default(19),
  fodec: z.boolean().default(false),
  minStock: z.number().min(0).default(0),
  initialStock: z.number().min(0).default(0),
  barcode: z.string().optional(),
})

// GET /api/stock/products?tenantId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const ctx = await requireTenant(req, searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    requirePermission(ctx.userRole, Permission.READ_PRODUCT)
    const tenantId = ctx.tenantId

    const products = await getProducts(tenantId)
    return NextResponse.json(products)
  } catch (err) {
    return handleApiError(err, 'GET products')
  }
}

// POST /api/stock/products
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ctx = await requireTenant(req, body?.tenantId)
    if (ctx instanceof NextResponse) return ctx
    requirePermission(ctx.userRole, Permission.CREATE_PRODUCT)

    let validatedData
    try {
      validatedData = createProductSchema.parse({ ...body, tenantId: ctx.tenantId })
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json({ error: 'Données invalides', details: validationError.issues }, { status: 400 })
      }
      throw validationError
    }

    // Le tenant vient toujours de la session
    validatedData = { ...validatedData, tenantId: ctx.tenantId }

    const product = await createProduct(validatedData)
    return NextResponse.json(product, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST product')
  }
}
