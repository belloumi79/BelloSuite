import { NextRequest, NextResponse } from 'next/server'
import { getProducts, createProduct } from '@/services/products'
import { handleApiError } from '@/lib/errors'
import { getCurrentUser, requirePermission, Permission } from '@/lib/auth'
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
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    requirePermission(user.role, Permission.READ_PRODUCT)

    const { searchParams } = new URL(req.url)
    let tenantId = searchParams.get('tenantId')

    // Defensive: reject null/undefined/empty tenantId
    if (!tenantId || tenantId === 'null' || tenantId === 'undefined') {
      return NextResponse.json({ error: 'tenantId requis' }, { status: 400 })
    }

    // Ensure user can only access their tenant
    if (user.tenantId && user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const products = await getProducts(tenantId)
    return NextResponse.json(products)
  } catch (err) {
    return handleApiError(err, 'GET products')
  }
}

// POST /api/stock/products
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    requirePermission(user.role, Permission.CREATE_PRODUCT)

    const body = await req.json()

    let validatedData
    try {
      validatedData = createProductSchema.parse(body)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json({ error: 'Données invalides', details: validationError.issues }, { status: 400 })
      }
      throw validationError
    }

    // Ensure user can only create for their tenant
    if (user.tenantId && user.tenantId !== validatedData.tenantId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const product = await createProduct(validatedData)
    return NextResponse.json(product, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST product')
  }
}
