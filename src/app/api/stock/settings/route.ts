import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getStockSettings, updateStockSettings } from '@/services/stock'
import { isStockAdmin, forbidden, readJson, str } from '@/lib/stock-api'

const settingsSchema = z.object({ allowNegativeStock: z.boolean() })

export async function GET(req: NextRequest) {
  try {
    const ctx = await getApiContext(req, new URL(req.url).searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    return NextResponse.json({ ...(await getStockSettings(ctx.tenantId)), canEdit: isStockAdmin(ctx) })
  } catch (err) {
    return handleApiError(err, 'GET stock settings')
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await readJson(req)
    const ctx = await getApiContext(req, str(body.tenantId))
    if (ctx instanceof NextResponse) return ctx
    if (!isStockAdmin(ctx)) return forbidden()
    const data = parseBody(settingsSchema, body)
    if (data instanceof NextResponse) return data
    return NextResponse.json(await updateStockSettings(ctx.tenantId, data))
  } catch (err) {
    return handleApiError(err, 'PUT stock settings')
  }
}
