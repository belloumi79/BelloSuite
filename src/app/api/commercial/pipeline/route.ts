import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getPipelineData } from '@/services/invoices'

// GET /api/commercial/pipeline?tenantId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const data = await getPipelineData(ctx.tenantId)
    return NextResponse.json(data)
  } catch (err) {
    return handleApiError(err, 'GET pipeline')
  }
}
