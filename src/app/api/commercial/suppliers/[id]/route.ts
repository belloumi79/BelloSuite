import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { updateSupplier, updateSupplierSchema, deleteSupplier, getSupplierById } from '@/services/suppliers'

// GET /api/commercial/suppliers/[id]?tenantId=
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const { id } = await params
    const supplier = await getSupplierById(id, ctx.tenantId)
    return NextResponse.json(supplier)
  } catch (err) {
    return handleApiError(err, 'GET supplier')
  }
}

// PUT /api/commercial/suppliers/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json()
    const ctx = getApiContext(req, body?.tenantId)
    if (ctx instanceof NextResponse) return ctx

    const data = parseBody(updateSupplierSchema, body)
    if (data instanceof NextResponse) return data

    const { id } = await params
    const supplier = await updateSupplier(id, ctx.tenantId, data)
    return NextResponse.json(supplier)
  } catch (err) {
    return handleApiError(err, 'PUT supplier')
  }
}

// DELETE /api/commercial/suppliers/[id]?tenantId=
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const { id } = await params
    await deleteSupplier(id, ctx.tenantId)
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err, 'DELETE supplier')
  }
}
