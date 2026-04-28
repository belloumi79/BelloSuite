import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getAssets, createAsset, createAssetSchema } from '@/services/operations'

// GET /api/gmao/assets?tenantId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const assets = await getAssets(ctx.tenantId)
    return NextResponse.json(assets)
  } catch (err) {
    return handleApiError(err, 'GET assets')
  }
}

// POST /api/gmao/assets
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ctx = getApiContext(req, body?.tenantId)
    if (ctx instanceof NextResponse) return ctx

    const data = parseBody(createAssetSchema, { ...body, tenantId: ctx.tenantId })
    if (data instanceof NextResponse) return data

    const asset = await createAsset(data)
    return NextResponse.json(asset, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST asset')
  }
}
